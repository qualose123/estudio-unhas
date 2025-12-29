const db = require('../config/database');

/**
 * Criar agendamento recorrente
 */
const createRecurringAppointment = (req, res) => {
  const {
    service_id,
    frequency,
    day_of_week,
    appointment_time,
    start_date,
    end_date,
    notes
  } = req.body;

  const client_id = req.user.id;

  // Validações
  if (!service_id || !frequency || !appointment_time || !start_date) {
    return res.status(400).json({
      error: 'Campos obrigatórios: service_id, frequency, appointment_time, start_date'
    });
  }

  if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
    return res.status(400).json({
      error: 'Frequência inválida. Use: weekly, biweekly ou monthly'
    });
  }

  // Para agendamentos semanais/quinzenais, dia da semana é obrigatório
  if ((frequency === 'weekly' || frequency === 'biweekly') && day_of_week === undefined) {
    return res.status(400).json({
      error: 'day_of_week é obrigatório para agendamentos semanais/quinzenais (0=Domingo, 6=Sábado)'
    });
  }

  // Validar data de término (se fornecida)
  if (end_date && new Date(end_date) <= new Date(start_date)) {
    return res.status(400).json({
      error: 'Data de término deve ser posterior à data de início'
    });
  }

  // Criar agendamento recorrente
  db.run(
    `INSERT INTO recurring_appointments
     (client_id, service_id, frequency, day_of_week, appointment_time, start_date, end_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      client_id,
      service_id,
      frequency,
      day_of_week || null,
      appointment_time,
      start_date,
      end_date || null,
      notes || null
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao criar agendamento recorrente' });
      }

      const recurringId = this.lastID;

      // Gerar próximos agendamentos (próximos 3 meses)
      generateUpcomingAppointments(recurringId)
        .then(() => {
          // Buscar agendamento recorrente criado
          db.get(
            `SELECT
              r.*,
              c.name as client_name,
              c.email as client_email,
              s.name as service_name,
              s.duration as service_duration,
              s.price as service_price
             FROM recurring_appointments r
             JOIN clients c ON r.client_id = c.id
             JOIN services s ON r.service_id = s.id
             WHERE r.id = ?`,
            [recurringId],
            (err, recurring) => {
              if (err) {
                return res.status(500).json({ error: 'Erro ao buscar agendamento recorrente' });
              }
              res.status(201).json(recurring);
            }
          );
        })
        .catch((err) => {
          console.error('Erro ao gerar agendamentos futuros:', err);
          res.status(201).json({
            id: recurringId,
            warning: 'Agendamento recorrente criado, mas houve erro ao gerar ocorrências futuras'
          });
        });
    }
  );
};

/**
 * Listar agendamentos recorrentes
 */
const getRecurringAppointments = (req, res) => {
  const isAdmin = req.user.type === 'admin';
  const { active } = req.query;

  let query = `
    SELECT
      r.*,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price
    FROM recurring_appointments r
    JOIN clients c ON r.client_id = c.id
    JOIN services s ON r.service_id = s.id
  `;

  const conditions = [];
  const params = [];

  // Cliente só vê seus próprios agendamentos
  if (!isAdmin) {
    conditions.push('r.client_id = ?');
    params.push(req.user.id);
  }

  if (active !== undefined) {
    conditions.push('r.active = ?');
    params.push(active === 'true' ? 1 : 0);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY r.created_at DESC';

  db.all(query, params, (err, recurring) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar agendamentos recorrentes' });
    }
    res.json(recurring);
  });
};

/**
 * Obter detalhes de um agendamento recorrente específico
 */
const getRecurringAppointmentById = (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.type === 'admin';

  let query = `
    SELECT
      r.*,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price
    FROM recurring_appointments r
    JOIN clients c ON r.client_id = c.id
    JOIN services s ON r.service_id = s.id
    WHERE r.id = ?
  `;

  const params = [id];

  // Cliente só pode ver seus próprios
  if (!isAdmin) {
    query += ' AND r.client_id = ?';
    params.push(req.user.id);
  }

  db.get(query, params, (err, recurring) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar agendamento recorrente' });
    }

    if (!recurring) {
      return res.status(404).json({ error: 'Agendamento recorrente não encontrado' });
    }

    res.json(recurring);
  });
};

/**
 * Atualizar agendamento recorrente
 */
const updateRecurringAppointment = (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.type === 'admin';
  const { frequency, day_of_week, appointment_time, end_date, active, notes } = req.body;

  // Verificar permissão
  let checkQuery = 'SELECT * FROM recurring_appointments WHERE id = ?';
  const checkParams = [id];

  if (!isAdmin) {
    checkQuery += ' AND client_id = ?';
    checkParams.push(req.user.id);
  }

  db.get(checkQuery, checkParams, (err, recurring) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar agendamento recorrente' });
    }

    if (!recurring) {
      return res.status(404).json({ error: 'Agendamento recorrente não encontrado' });
    }

    const updates = [];
    const params = [];

    if (frequency !== undefined) {
      updates.push('frequency = ?');
      params.push(frequency);
    }
    if (day_of_week !== undefined) {
      updates.push('day_of_week = ?');
      params.push(day_of_week);
    }
    if (appointment_time !== undefined) {
      updates.push('appointment_time = ?');
      params.push(appointment_time);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.run(
      `UPDATE recurring_appointments SET ${updates.join(', ')} WHERE id = ?`,
      params,
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao atualizar agendamento recorrente' });
        }

        // Buscar agendamento atualizado
        db.get(
          `SELECT
            r.*,
            c.name as client_name,
            c.email as client_email,
            s.name as service_name
           FROM recurring_appointments r
           JOIN clients c ON r.client_id = c.id
           JOIN services s ON r.service_id = s.id
           WHERE r.id = ?`,
          [id],
          (err, updated) => {
            if (err) {
              return res.status(500).json({ error: 'Erro ao buscar agendamento atualizado' });
            }
            res.json(updated);
          }
        );
      }
    );
  });
};

/**
 * Cancelar agendamento recorrente (desativa)
 */
const cancelRecurringAppointment = (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.type === 'admin';

  let checkQuery = 'SELECT * FROM recurring_appointments WHERE id = ?';
  const checkParams = [id];

  if (!isAdmin) {
    checkQuery += ' AND client_id = ?';
    checkParams.push(req.user.id);
  }

  db.get(checkQuery, checkParams, (err, recurring) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar agendamento recorrente' });
    }

    if (!recurring) {
      return res.status(404).json({ error: 'Agendamento recorrente não encontrado' });
    }

    db.run(
      'UPDATE recurring_appointments SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao cancelar agendamento recorrente' });
        }

        res.json({ message: 'Agendamento recorrente cancelado com sucesso' });
      }
    );
  });
};

/**
 * Gerar próximos agendamentos baseado na recorrência
 * Gera agendamentos para os próximos 3 meses
 */
const generateUpcomingAppointments = (recurringId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM recurring_appointments WHERE id = ?', [recurringId], (err, recurring) => {
      if (err) return reject(err);
      if (!recurring) return reject(new Error('Agendamento recorrente não encontrado'));

      const appointments = [];
      const startDate = new Date(recurring.start_date);
      const endDate = recurring.end_date ? new Date(recurring.end_date) : null;
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      let currentDate = new Date(startDate);

      // Gerar até 20 ocorrências ou até a data de término
      let count = 0;
      while (count < 20 && currentDate <= threeMonthsFromNow) {
        if (endDate && currentDate > endDate) break;

        // Verificar se é o dia correto (para semanal/quinzenal)
        if (recurring.day_of_week !== null) {
          if (currentDate.getDay() !== recurring.day_of_week) {
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }
        }

        // Formatar data para YYYY-MM-DD
        const appointmentDate = currentDate.toISOString().split('T')[0];

        // Verificar se horário está disponível
        db.get(
          `SELECT * FROM appointments
           WHERE appointment_date = ?
           AND appointment_time = ?
           AND status != 'cancelled'`,
          [appointmentDate, recurring.appointment_time],
          (err, existing) => {
            if (!err && !existing) {
              // Criar agendamento
              db.run(
                `INSERT INTO appointments
                 (client_id, service_id, appointment_date, appointment_time, notes, status, recurring_id)
                 VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`,
                [
                  recurring.client_id,
                  recurring.service_id,
                  appointmentDate,
                  recurring.appointment_time,
                  recurring.notes,
                  recurringId
                ]
              );
            }
          }
        );

        count++;

        // Incrementar data baseado na frequência
        if (recurring.frequency === 'weekly') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (recurring.frequency === 'biweekly') {
          currentDate.setDate(currentDate.getDate() + 14);
        } else if (recurring.frequency === 'monthly') {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }

      resolve();
    });
  });
};

/**
 * Cron job para gerar novos agendamentos recorrentes
 * Deve ser executado diariamente
 */
const generateRecurringAppointments = () => {
  console.log('🔄 Gerando agendamentos recorrentes...');

  db.all(
    'SELECT * FROM recurring_appointments WHERE active = 1',
    [],
    (err, recurringList) => {
      if (err) {
        console.error('Erro ao buscar agendamentos recorrentes:', err);
        return;
      }

      let processed = 0;
      recurringList.forEach((recurring) => {
        generateUpcomingAppointments(recurring.id)
          .then(() => {
            processed++;
            if (processed === recurringList.length) {
              console.log(`✅ ${processed} agendamentos recorrentes processados`);
            }
          })
          .catch((err) => {
            console.error(`Erro ao gerar agendamentos para recurring ${recurring.id}:`, err);
          });
      });
    }
  );
};

module.exports = {
  createRecurringAppointment,
  getRecurringAppointments,
  getRecurringAppointmentById,
  updateRecurringAppointment,
  cancelRecurringAppointment,
  generateRecurringAppointments
};
