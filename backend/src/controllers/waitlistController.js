const db = require('../config/database');
const { sendEmail } = require('../services/emailService');

// Adicionar cliente à lista de espera
const addToWaitlist = (req, res) => {
  const { service_id, preferred_date, preferred_time, alternative_dates, notes } = req.body;
  const client_id = req.user.id;

  // Validações
  if (!service_id || !preferred_date || !preferred_time) {
    return res.status(400).json({
      error: 'Campos obrigatórios: service_id, preferred_date, preferred_time'
    });
  }

  // Verificar se já está na lista de espera para o mesmo horário
  db.get(
    `SELECT * FROM waitlist
     WHERE client_id = ?
     AND service_id = ?
     AND preferred_date = ?
     AND preferred_time = ?
     AND status = 'waiting'`,
    [client_id, service_id, preferred_date, preferred_time],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao verificar lista de espera' });
      }

      if (existing) {
        return res.status(400).json({
          error: 'Você já está na lista de espera para este horário'
        });
      }

      // Adicionar à lista
      db.run(
        `INSERT INTO waitlist
         (client_id, service_id, preferred_date, preferred_time, alternative_dates, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          client_id,
          service_id,
          preferred_date,
          preferred_time,
          alternative_dates ? JSON.stringify(alternative_dates) : null,
          notes || null
        ],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Erro ao adicionar à lista de espera' });
          }

          db.get(
            `SELECT
              w.*,
              c.name as client_name,
              c.email as client_email,
              s.name as service_name
             FROM waitlist w
             JOIN clients c ON w.client_id = c.id
             JOIN services s ON w.service_id = s.id
             WHERE w.id = ?`,
            [this.lastID],
            (err, waitlistEntry) => {
              if (err) {
                return res.status(500).json({ error: 'Erro ao buscar entrada da lista' });
              }

              // Contar posição na fila
              db.get(
                `SELECT COUNT(*) as position FROM waitlist
                 WHERE service_id = ?
                 AND preferred_date = ?
                 AND preferred_time = ?
                 AND status = 'waiting'
                 AND id <= ?`,
                [service_id, preferred_date, preferred_time, this.lastID],
                (err, pos) => {
                  waitlistEntry.queue_position = pos ? pos.position : 1;
                  res.status(201).json(waitlistEntry);
                }
              );
            }
          );
        }
      );
    }
  );
};

// Listar entradas da lista de espera
const getWaitlist = (req, res) => {
  const isAdmin = req.user.type === 'admin';
  const { status, date, service_id } = req.query;

  let query = `
    SELECT
      w.*,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      s.name as service_name,
      s.price as service_price
    FROM waitlist w
    JOIN clients c ON w.client_id = c.id
    JOIN services s ON w.service_id = s.id
  `;

  const conditions = [];
  const params = [];

  // Cliente só vê suas próprias entradas
  if (!isAdmin) {
    conditions.push('w.client_id = ?');
    params.push(req.user.id);
  }

  if (status) {
    conditions.push('w.status = ?');
    params.push(status);
  }

  if (date) {
    conditions.push('w.preferred_date = ?');
    params.push(date);
  }

  if (service_id) {
    conditions.push('w.service_id = ?');
    params.push(service_id);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY w.preferred_date, w.preferred_time, w.created_at';

  db.all(query, params, (err, waitlist) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar lista de espera' });
    }
    res.json(waitlist);
  });
};

// Cancelar entrada da lista de espera
const cancelWaitlistEntry = (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.type === 'admin';

  // Verificar se a entrada pertence ao usuário (se não for admin)
  let checkQuery = 'SELECT * FROM waitlist WHERE id = ?';
  const checkParams = [id];

  if (!isAdmin) {
    checkQuery += ' AND client_id = ?';
    checkParams.push(req.user.id);
  }

  db.get(checkQuery, checkParams, (err, entry) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar entrada' });
    }

    if (!entry) {
      return res.status(404).json({ error: 'Entrada não encontrada' });
    }

    if (entry.status !== 'waiting' && entry.status !== 'notified') {
      return res.status(400).json({ error: 'Entrada não pode ser cancelada' });
    }

    db.run(
      `UPDATE waitlist
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao cancelar entrada' });
        }

        res.json({ message: 'Entrada cancelada com sucesso' });
      }
    );
  });
};

// Notificar clientes quando vaga abrir (chamado quando agendamento é cancelado)
const notifyWaitlist = async (service_id, appointment_date, appointment_time) => {
  return new Promise((resolve, reject) => {
    // Buscar primeiro da fila para este horário
    db.get(
      `SELECT
        w.*,
        c.name as client_name,
        c.email as client_email,
        s.name as service_name
       FROM waitlist w
       JOIN clients c ON w.client_id = c.id
       JOIN services s ON w.service_id = s.id
       WHERE w.service_id = ?
       AND w.preferred_date = ?
       AND w.preferred_time = ?
       AND w.status = 'waiting'
       ORDER BY w.created_at ASC
       LIMIT 1`,
      [service_id, appointment_date, appointment_time],
      async (err, entry) => {
        if (err) {
          console.error('Erro ao buscar lista de espera:', err);
          return reject(err);
        }

        if (!entry) {
          // Ninguém na fila
          return resolve(null);
        }

        // Marcar como notificado e definir expiração (24 horas)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        db.run(
          `UPDATE waitlist
           SET status = 'notified',
               notified_at = CURRENT_TIMESTAMP,
               expires_at = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [expiresAt, entry.id],
          async (err) => {
            if (err) {
              console.error('Erro ao atualizar lista de espera:', err);
              return reject(err);
            }

            // Tentar enviar email (não bloquear se falhar)
            try {
              // TODO: Implementar envio de email quando emailService estiver pronto
              console.log(`📧 Notificar ${entry.client_email}: Vaga disponível em ${appointment_date} ${appointment_time}`);
            } catch (emailError) {
              console.error('Erro ao enviar email de notificação:', emailError);
            }

            resolve(entry);
          }
        );
      }
    );
  });
};

// Converter entrada da lista em agendamento (admin)
const convertToAppointment = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM waitlist WHERE id = ?', [id], (err, entry) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar entrada' });
    }

    if (!entry) {
      return res.status(404).json({ error: 'Entrada não encontrada' });
    }

    if (entry.status !== 'notified' && entry.status !== 'waiting') {
      return res.status(400).json({ error: 'Entrada não pode ser convertida' });
    }

    // Verificar se horário ainda está disponível
    db.get(
      `SELECT * FROM appointments
       WHERE appointment_date = ?
       AND appointment_time = ?
       AND status != 'cancelled'`,
      [entry.preferred_date, entry.preferred_time],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
        }

        if (existing) {
          return res.status(400).json({ error: 'Horário não está mais disponível' });
        }

        // Criar agendamento
        db.run(
          `INSERT INTO appointments
           (client_id, service_id, appointment_date, appointment_time, notes, status)
           VALUES (?, ?, ?, ?, ?, 'confirmed')`,
          [
            entry.client_id,
            entry.service_id,
            entry.preferred_date,
            entry.preferred_time,
            entry.notes
          ],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Erro ao criar agendamento' });
            }

            const appointmentId = this.lastID;

            // Marcar entrada como convertida
            db.run(
              `UPDATE waitlist
               SET status = 'converted', updated_at = CURRENT_TIMESTAMP
               WHERE id = ?`,
              [id],
              (err) => {
                if (err) {
                  console.error('Erro ao atualizar lista de espera:', err);
                }

                res.json({
                  message: 'Agendamento criado com sucesso a partir da lista de espera',
                  appointment_id: appointmentId
                });
              }
            );
          }
        );
      }
    );
  });
};

// Expirar notificações antigas (cron job)
const expireOldNotifications = () => {
  const now = new Date().toISOString();

  db.run(
    `UPDATE waitlist
     SET status = 'expired', updated_at = CURRENT_TIMESTAMP
     WHERE status = 'notified'
     AND expires_at < ?`,
    [now],
    function (err) {
      if (err) {
        console.error('Erro ao expirar notificações:', err);
      } else if (this.changes > 0) {
        console.log(`✅ ${this.changes} notificações expiradas`);
      }
    }
  );
};

module.exports = {
  addToWaitlist,
  getWaitlist,
  cancelWaitlistEntry,
  notifyWaitlist,
  convertToAppointment,
  expireOldNotifications
};
