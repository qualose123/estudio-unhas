const db = require('../config/database');
const { notifyWaitlist } = require('./waitlistController');

// Listar todos os agendamentos (admin pode ver todos, cliente vê apenas os seus)
const getAllAppointments = (req, res) => {
  const { status, date } = req.query;
  const isAdmin = req.user.type === 'admin';

  let query = `
    SELECT
      a.*,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN services s ON a.service_id = s.id
  `;

  const params = [];
  const conditions = [];

  // Se não for admin, filtrar apenas agendamentos do próprio cliente
  if (!isAdmin) {
    conditions.push('a.client_id = ?');
    params.push(req.user.id);
  }

  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }

  if (date) {
    conditions.push('a.appointment_date = ?');
    params.push(date);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

  db.all(query, params, (err, appointments) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
    }
    res.json(appointments);
  });
};

// Buscar agendamento por ID
const getAppointmentById = (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.type === 'admin';

  let query = `
    SELECT
      a.*,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      s.name as service_name,
      s.duration as service_duration,
      s.price as service_price
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN services s ON a.service_id = s.id
    WHERE a.id = ?
  `;

  const params = [id];

  // Se não for admin, verificar se o agendamento pertence ao cliente
  if (!isAdmin) {
    query += ' AND a.client_id = ?';
    params.push(req.user.id);
  }

  db.get(query, params, (err, appointment) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar agendamento' });
    }
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    res.json(appointment);
  });
};

// Criar novo agendamento (cliente)
const createAppointment = (req, res) => {
  const { service_id, appointment_date, appointment_time, notes } = req.body;
  const client_id = req.user.id;

  // Verificar se o serviço existe e está ativo
  db.get('SELECT * FROM services WHERE id = ? AND active = 1', [service_id], (err, service) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao verificar serviço' });
    }
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado ou inativo' });
    }

    // Verificar se o horário está bloqueado
    db.get(
      `SELECT * FROM time_blocks
       WHERE block_date = ?
       AND ? >= start_time
       AND ? < end_time`,
      [appointment_date, appointment_time, appointment_time],
      (err, block) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao verificar bloqueios' });
        }
        if (block) {
          return res.status(400).json({ error: 'Horário bloqueado para agendamentos' });
        }

        // Verificar se já existe agendamento no mesmo horário
        db.get(
          `SELECT * FROM appointments
           WHERE appointment_date = ?
           AND appointment_time = ?
           AND status != 'cancelled'`,
          [appointment_date, appointment_time],
          (err, existing) => {
            if (err) {
              return res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
            }
            if (existing) {
              return res.status(400).json({ error: 'Horário já ocupado' });
            }

            // Criar agendamento
            db.run(
              `INSERT INTO appointments (client_id, service_id, appointment_date, appointment_time, notes, status)
               VALUES (?, ?, ?, ?, ?, 'pending')`,
              [client_id, service_id, appointment_date, appointment_time, notes || null],
              function (err) {
                if (err) {
                  return res.status(500).json({ error: 'Erro ao criar agendamento' });
                }

                // Buscar agendamento criado com informações completas
                db.get(
                  `SELECT
                    a.*,
                    c.name as client_name,
                    c.email as client_email,
                    c.phone as client_phone,
                    s.name as service_name,
                    s.duration as service_duration,
                    s.price as service_price
                   FROM appointments a
                   JOIN clients c ON a.client_id = c.id
                   JOIN services s ON a.service_id = s.id
                   WHERE a.id = ?`,
                  [this.lastID],
                  (err, appointment) => {
                    if (err) {
                      return res.status(500).json({ error: 'Erro ao buscar agendamento criado' });
                    }
                    res.status(201).json(appointment);
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

// Atualizar agendamento
const updateAppointment = (req, res) => {
  const { id } = req.params;
  const { status, appointment_date, appointment_time, notes } = req.body;
  const isAdmin = req.user.type === 'admin';

  // Verificar se o agendamento existe
  let checkQuery = 'SELECT * FROM appointments WHERE id = ?';
  const checkParams = [id];

  // Se não for admin, verificar se pertence ao cliente
  if (!isAdmin) {
    checkQuery += ' AND client_id = ?';
    checkParams.push(req.user.id);
  }

  db.get(checkQuery, checkParams, (err, appointment) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar agendamento' });
    }
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Cliente só pode cancelar ou alterar dados/horário (não status)
    if (!isAdmin && status && status !== 'cancelled') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar o status do agendamento' });
    }

    // Verificar antecedência mínima para cancelamento (24 horas)
    if (!isAdmin && status === 'cancelled') {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 24) {
        return res.status(400).json({
          error: 'Cancelamento não permitido. É necessário no mínimo 24 horas de antecedência para cancelar um agendamento.'
        });
      }
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    if (appointment_date !== undefined) {
      updates.push('appointment_date = ?');
      params.push(appointment_date);
    }
    if (appointment_time !== undefined) {
      updates.push('appointment_time = ?');
      params.push(appointment_time);
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
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
      params,
      async function (err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao atualizar agendamento' });
        }

        // Se o agendamento foi cancelado, notificar lista de espera
        if (status === 'cancelled') {
          try {
            await notifyWaitlist(
              appointment.service_id,
              appointment.appointment_date,
              appointment.appointment_time
            );
          } catch (waitlistError) {
            console.error('Erro ao notificar lista de espera:', waitlistError);
            // Não bloquear a resposta por erro na lista de espera
          }
        }

        // Buscar agendamento atualizado
        db.get(
          `SELECT
            a.*,
            c.name as client_name,
            c.email as client_email,
            c.phone as client_phone,
            s.name as service_name,
            s.duration as service_duration,
            s.price as service_price
           FROM appointments a
           JOIN clients c ON a.client_id = c.id
           JOIN services s ON a.service_id = s.id
           WHERE a.id = ?`,
          [id],
          (err, updatedAppointment) => {
            if (err) {
              return res.status(500).json({ error: 'Erro ao buscar agendamento atualizado' });
            }
            res.json(updatedAppointment);
          }
        );
      }
    );
  });
};

// Deletar agendamento (admin apenas)
const deleteAppointment = (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM appointments WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao deletar agendamento' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json({ message: 'Agendamento deletado com sucesso' });
  });
};

// Verificar horários disponíveis
const getAvailableTimes = (req, res) => {
  const { date, service_id } = req.query;

  if (!date || !service_id) {
    return res.status(400).json({ error: 'Data e serviço são obrigatórios' });
  }

  // Buscar duração do serviço
  db.get('SELECT duration FROM services WHERE id = ?', [service_id], (err, service) => {
    if (err || !service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Horários de funcionamento (7h às 18h, intervalo de 1h30)
    const workHours = {
      start: '07:00',
      end: '18:00',
      interval: 90 // minutos (1h30)
    };

    // Buscar agendamentos e bloqueios do dia
    const queries = [
      new Promise((resolve, reject) => {
        db.all(
          `SELECT appointment_time FROM appointments
           WHERE appointment_date = ? AND status != 'cancelled'`,
          [date],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows.map(r => r.appointment_time));
          }
        );
      }),
      new Promise((resolve, reject) => {
        db.all(
          `SELECT start_time, end_time FROM time_blocks WHERE block_date = ?`,
          [date],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      })
    ];

    Promise.all(queries)
      .then(([bookedTimes, blocks]) => {
        const availableTimes = [];
        let currentTime = workHours.start;

        while (currentTime < workHours.end) {
          // Verificar se está nos horários bloqueados
          const isBlocked = blocks.some(
            block => currentTime >= block.start_time && currentTime < block.end_time
          );

          // Verificar se já está agendado
          const isBooked = bookedTimes.includes(currentTime);

          if (!isBlocked && !isBooked) {
            availableTimes.push(currentTime);
          }

          // Incrementar tempo
          const [hours, minutes] = currentTime.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + workHours.interval;
          const newHours = Math.floor(totalMinutes / 60);
          const newMinutes = totalMinutes % 60;
          currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
        }

        res.json({ date, availableTimes });
      })
      .catch(err => {
        res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
      });
  });
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAvailableTimes
};
