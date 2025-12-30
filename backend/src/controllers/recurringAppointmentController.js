const { usePG } = require('../config/database');

/**
 * Criar agendamento recorrente
 */
const createRecurringAppointment = async (req, res) => {
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

  try {
    // Criar agendamento recorrente
    const insertQuery = usePG()
      ? `INSERT INTO recurring_appointments
         (client_id, service_id, frequency, day_of_week, appointment_time, start_date, end_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`
      : `INSERT INTO recurring_appointments
         (client_id, service_id, frequency, day_of_week, appointment_time, start_date, end_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const recurringId = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(
        insertQuery,
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
            reject(err);
          } else {
            if (usePG()) {
              db.get('SELECT id FROM recurring_appointments WHERE client_id = $1 AND start_date = $2 ORDER BY id DESC LIMIT 1', [client_id, start_date], (err, row) => {
                if (err) reject(err);
                else resolve(row.id);
              });
            } else {
              resolve(this.lastID);
            }
          }
        }
      );
    });

    // Gerar próximos agendamentos (próximos 3 meses)
    try {
      await generateUpcomingAppointments(recurringId);
    } catch (err) {
      console.error('Erro ao gerar agendamentos futuros:', err);
    }

    // Buscar agendamento recorrente criado
    const selectQuery = usePG()
      ? `SELECT
          r.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name,
          s.duration as service_duration,
          s.price as service_price
         FROM recurring_appointments r
         JOIN clients c ON r.client_id = c.id
         JOIN services s ON r.service_id = s.id
         WHERE r.id = $1`
      : `SELECT
          r.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name,
          s.duration as service_duration,
          s.price as service_price
         FROM recurring_appointments r
         JOIN clients c ON r.client_id = c.id
         JOIN services s ON r.service_id = s.id
         WHERE r.id = ?`;

    const recurring = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [recurringId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(recurring);
  } catch (error) {
    console.error('Erro ao criar agendamento recorrente:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento recorrente' });
  }
};

/**
 * Listar agendamentos recorrentes
 */
const getRecurringAppointments = async (req, res) => {
  const isAdmin = req.user.type === 'admin';
  const { active } = req.query;

  try {
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
    let paramIndex = 1;

    // Cliente só vê seus próprios agendamentos
    if (!isAdmin) {
      conditions.push(usePG() ? `r.client_id = $${paramIndex++}` : 'r.client_id = ?');
      params.push(req.user.id);
    }

    if (active !== undefined) {
      conditions.push(usePG() ? `r.active = $${paramIndex++}` : 'r.active = ?');
      params.push(active === 'true' ? (usePG() ? true : 1) : (usePG() ? false : 0));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY r.created_at DESC';

    const recurring = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(recurring);
  } catch (error) {
    console.error('Erro ao buscar agendamentos recorrentes:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos recorrentes' });
  }
};

/**
 * Obter detalhes de um agendamento recorrente específico
 */
const getRecurringAppointmentById = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.type === 'admin';

  try {
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
      WHERE r.id = ${usePG() ? '$1' : '?'}
    `;

    const params = [id];

    // Cliente só pode ver seus próprios
    if (!isAdmin) {
      query += usePG() ? ' AND r.client_id = $2' : ' AND r.client_id = ?';
      params.push(req.user.id);
    }

    const recurring = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Agendamento recorrente não encontrado' });
    }

    res.json(recurring);
  } catch (error) {
    console.error('Erro ao buscar agendamento recorrente:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento recorrente' });
  }
};

/**
 * Atualizar agendamento recorrente
 */
const updateRecurringAppointment = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.type === 'admin';
  const { frequency, day_of_week, appointment_time, end_date, active, notes } = req.body;

  try {
    // Verificar permissão
    let checkQuery = usePG()
      ? 'SELECT * FROM recurring_appointments WHERE id = $1'
      : 'SELECT * FROM recurring_appointments WHERE id = ?';
    let checkParams = [id];

    if (!isAdmin) {
      checkQuery += usePG() ? ' AND client_id = $2' : ' AND client_id = ?';
      checkParams.push(req.user.id);
    }

    const recurring = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(checkQuery, checkParams, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Agendamento recorrente não encontrado' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (frequency !== undefined) {
      updates.push(usePG() ? `frequency = $${paramIndex++}` : 'frequency = ?');
      params.push(frequency);
    }
    if (day_of_week !== undefined) {
      updates.push(usePG() ? `day_of_week = $${paramIndex++}` : 'day_of_week = ?');
      params.push(day_of_week);
    }
    if (appointment_time !== undefined) {
      updates.push(usePG() ? `appointment_time = $${paramIndex++}` : 'appointment_time = ?');
      params.push(appointment_time);
    }
    if (end_date !== undefined) {
      updates.push(usePG() ? `end_date = $${paramIndex++}` : 'end_date = ?');
      params.push(end_date);
    }
    if (active !== undefined) {
      updates.push(usePG() ? `active = $${paramIndex++}` : 'active = ?');
      params.push(active ? (usePG() ? true : 1) : (usePG() ? false : 0));
    }
    if (notes !== undefined) {
      updates.push(usePG() ? `notes = $${paramIndex++}` : 'notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateQuery = usePG()
      ? `UPDATE recurring_appointments SET ${updates.join(', ')} WHERE id = $${paramIndex}`
      : `UPDATE recurring_appointments SET ${updates.join(', ')} WHERE id = ?`;

    await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, params, function (err) {
        if (err) reject(err);
        else resolve();
      });
    });

    // Buscar agendamento atualizado
    const selectQuery = usePG()
      ? `SELECT
          r.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name
         FROM recurring_appointments r
         JOIN clients c ON r.client_id = c.id
         JOIN services s ON r.service_id = s.id
         WHERE r.id = $1`
      : `SELECT
          r.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name
         FROM recurring_appointments r
         JOIN clients c ON r.client_id = c.id
         JOIN services s ON r.service_id = s.id
         WHERE r.id = ?`;

    const updated = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar agendamento recorrente:', error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento recorrente' });
  }
};

/**
 * Cancelar agendamento recorrente (desativa)
 */
const cancelRecurringAppointment = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.type === 'admin';

  try {
    let checkQuery = usePG()
      ? 'SELECT * FROM recurring_appointments WHERE id = $1'
      : 'SELECT * FROM recurring_appointments WHERE id = ?';
    let checkParams = [id];

    if (!isAdmin) {
      checkQuery += usePG() ? ' AND client_id = $2' : ' AND client_id = ?';
      checkParams.push(req.user.id);
    }

    const recurring = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(checkQuery, checkParams, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Agendamento recorrente não encontrado' });
    }

    const updateQuery = usePG()
      ? 'UPDATE recurring_appointments SET active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2'
      : 'UPDATE recurring_appointments SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

    await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, [usePG() ? false : 0, id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Agendamento recorrente cancelado com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar agendamento recorrente:', error);
    res.status(500).json({ error: 'Erro ao cancelar agendamento recorrente' });
  }
};

/**
 * Gerar próximos agendamentos baseado na recorrência
 * Gera agendamentos para os próximos 3 meses
 */
const generateUpcomingAppointments = async (recurringId) => {
  const selectQuery = usePG()
    ? 'SELECT * FROM recurring_appointments WHERE id = $1'
    : 'SELECT * FROM recurring_appointments WHERE id = ?';

  const recurring = await new Promise((resolve, reject) => {
    const db = require('../config/database');
    db.get(selectQuery, [recurringId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!recurring) {
    throw new Error('Agendamento recorrente não encontrado');
  }

  const startDate = new Date(recurring.start_date);
  const endDate = recurring.end_date ? new Date(recurring.end_date) : null;
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  let currentDate = new Date(startDate);

  // Gerar até 20 ocorrências ou até a data de término
  let count = 0;
  const appointmentsToCreate = [];

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
    const checkQuery = usePG()
      ? `SELECT * FROM appointments
         WHERE appointment_date = $1
         AND appointment_time = $2
         AND status != 'cancelled'`
      : `SELECT * FROM appointments
         WHERE appointment_date = ?
         AND appointment_time = ?
         AND status != 'cancelled'`;

    const existing = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(checkQuery, [appointmentDate, recurring.appointment_time], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existing) {
      appointmentsToCreate.push({
        date: appointmentDate,
        time: recurring.appointment_time
      });
    }

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

  // Criar todos os agendamentos
  for (const apt of appointmentsToCreate) {
    const insertQuery = usePG()
      ? `INSERT INTO appointments
         (client_id, service_id, appointment_date, appointment_time, notes, status, recurring_id)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', $6)`
      : `INSERT INTO appointments
         (client_id, service_id, appointment_date, appointment_time, notes, status, recurring_id)
         VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`;

    await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(
        insertQuery,
        [
          recurring.client_id,
          recurring.service_id,
          apt.date,
          apt.time,
          recurring.notes,
          recurringId
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
};

/**
 * Cron job para gerar novos agendamentos recorrentes
 * Deve ser executado diariamente
 */
const generateRecurringAppointments = async () => {
  console.log('🔄 Gerando agendamentos recorrentes...');

  try {
    const selectQuery = usePG()
      ? 'SELECT * FROM recurring_appointments WHERE active = $1'
      : 'SELECT * FROM recurring_appointments WHERE active = ?';

    const recurringList = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.all(selectQuery, [usePG() ? true : 1], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let processed = 0;
    for (const recurring of recurringList) {
      try {
        await generateUpcomingAppointments(recurring.id);
        processed++;
      } catch (err) {
        console.error(`Erro ao gerar agendamentos para recurring ${recurring.id}:`, err);
      }
    }

    console.log(`✅ ${processed} agendamentos recorrentes processados`);
  } catch (error) {
    console.error('Erro ao buscar agendamentos recorrentes:', error);
  }
};

module.exports = {
  createRecurringAppointment,
  getRecurringAppointments,
  getRecurringAppointmentById,
  updateRecurringAppointment,
  cancelRecurringAppointment,
  generateRecurringAppointments
};
