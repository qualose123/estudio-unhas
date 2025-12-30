const { usePG } = require('../config/database');
const { sendEmail } = require('../services/emailService');

// Adicionar cliente à lista de espera
const addToWaitlist = async (req, res) => {
  const { service_id, preferred_date, preferred_time, alternative_dates, notes } = req.body;
  const client_id = req.user.id;

  // Validações
  if (!service_id || !preferred_date || !preferred_time) {
    return res.status(400).json({
      error: 'Campos obrigatórios: service_id, preferred_date, preferred_time'
    });
  }

  try {
    // Verificar se já está na lista de espera para o mesmo horário
    const checkQuery = usePG()
      ? `SELECT * FROM waitlist
         WHERE client_id = $1
         AND service_id = $2
         AND preferred_date = $3
         AND preferred_time = $4
         AND status = 'waiting'`
      : `SELECT * FROM waitlist
         WHERE client_id = ?
         AND service_id = ?
         AND preferred_date = ?
         AND preferred_time = ?
         AND status = 'waiting'`;

    const existing = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(checkQuery, [client_id, service_id, preferred_date, preferred_time], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      return res.status(400).json({
        error: 'Você já está na lista de espera para este horário'
      });
    }

    // Adicionar à lista
    const insertQuery = usePG()
      ? `INSERT INTO waitlist
         (client_id, service_id, preferred_date, preferred_time, alternative_dates, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`
      : `INSERT INTO waitlist
         (client_id, service_id, preferred_date, preferred_time, alternative_dates, notes)
         VALUES (?, ?, ?, ?, ?, ?)`;

    const waitlistId = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(
        insertQuery,
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
            reject(err);
          } else {
            if (usePG()) {
              db.get('SELECT id FROM waitlist WHERE client_id = $1 AND preferred_date = $2 AND preferred_time = $3 ORDER BY id DESC LIMIT 1',
                [client_id, preferred_date, preferred_time], (err, row) => {
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

    const selectQuery = usePG()
      ? `SELECT
          w.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name
         FROM waitlist w
         JOIN clients c ON w.client_id = c.id
         JOIN services s ON w.service_id = s.id
         WHERE w.id = $1`
      : `SELECT
          w.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name
         FROM waitlist w
         JOIN clients c ON w.client_id = c.id
         JOIN services s ON w.service_id = s.id
         WHERE w.id = ?`;

    const waitlistEntry = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [waitlistId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Contar posição na fila
    const positionQuery = usePG()
      ? `SELECT COUNT(*) as position FROM waitlist
         WHERE service_id = $1
         AND preferred_date = $2
         AND preferred_time = $3
         AND status = 'waiting'
         AND id <= $4`
      : `SELECT COUNT(*) as position FROM waitlist
         WHERE service_id = ?
         AND preferred_date = ?
         AND preferred_time = ?
         AND status = 'waiting'
         AND id <= ?`;

    const pos = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(positionQuery, [service_id, preferred_date, preferred_time, waitlistId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    waitlistEntry.queue_position = pos ? pos.position : 1;
    res.status(201).json(waitlistEntry);
  } catch (error) {
    console.error('Erro ao adicionar à lista de espera:', error);
    res.status(500).json({ error: 'Erro ao adicionar à lista de espera' });
  }
};

// Listar entradas da lista de espera
const getWaitlist = async (req, res) => {
  const isAdmin = req.user.type === 'admin';
  const { status, date, service_id } = req.query;

  try {
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
    let paramIndex = 1;

    // Cliente só vê suas próprias entradas
    if (!isAdmin) {
      conditions.push(usePG() ? `w.client_id = $${paramIndex++}` : 'w.client_id = ?');
      params.push(req.user.id);
    }

    if (status) {
      conditions.push(usePG() ? `w.status = $${paramIndex++}` : 'w.status = ?');
      params.push(status);
    }

    if (date) {
      conditions.push(usePG() ? `w.preferred_date = $${paramIndex++}` : 'w.preferred_date = ?');
      params.push(date);
    }

    if (service_id) {
      conditions.push(usePG() ? `w.service_id = $${paramIndex++}` : 'w.service_id = ?');
      params.push(service_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY w.preferred_date, w.preferred_time, w.created_at';

    const waitlist = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(waitlist);
  } catch (error) {
    console.error('Erro ao buscar lista de espera:', error);
    res.status(500).json({ error: 'Erro ao buscar lista de espera' });
  }
};

// Cancelar entrada da lista de espera
const cancelWaitlistEntry = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.type === 'admin';

  try {
    // Verificar se a entrada pertence ao usuário (se não for admin)
    let checkQuery = usePG()
      ? 'SELECT * FROM waitlist WHERE id = $1'
      : 'SELECT * FROM waitlist WHERE id = ?';
    let checkParams = [id];

    if (!isAdmin) {
      checkQuery += usePG() ? ' AND client_id = $2' : ' AND client_id = ?';
      checkParams.push(req.user.id);
    }

    const entry = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(checkQuery, checkParams, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entrada não encontrada' });
    }

    if (entry.status !== 'waiting' && entry.status !== 'notified') {
      return res.status(400).json({ error: 'Entrada não pode ser cancelada' });
    }

    const updateQuery = usePG()
      ? `UPDATE waitlist
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`
      : `UPDATE waitlist
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`;

    await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ message: 'Entrada cancelada com sucesso' });
  } catch (error) {
    console.error('Erro ao cancelar entrada:', error);
    res.status(500).json({ error: 'Erro ao cancelar entrada' });
  }
};

// Notificar clientes quando vaga abrir (chamado quando agendamento é cancelado)
const notifyWaitlist = async (service_id, appointment_date, appointment_time) => {
  try {
    // Buscar primeiro da fila para este horário
    const selectQuery = usePG()
      ? `SELECT
          w.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name
         FROM waitlist w
         JOIN clients c ON w.client_id = c.id
         JOIN services s ON w.service_id = s.id
         WHERE w.service_id = $1
         AND w.preferred_date = $2
         AND w.preferred_time = $3
         AND w.status = 'waiting'
         ORDER BY w.created_at ASC
         LIMIT 1`
      : `SELECT
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
         LIMIT 1`;

    const entry = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [service_id, appointment_date, appointment_time], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!entry) {
      // Ninguém na fila
      return null;
    }

    // Marcar como notificado e definir expiração (24 horas)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const updateQuery = usePG()
      ? `UPDATE waitlist
         SET status = 'notified',
             notified_at = CURRENT_TIMESTAMP,
             expires_at = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`
      : `UPDATE waitlist
         SET status = 'notified',
             notified_at = CURRENT_TIMESTAMP,
             expires_at = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`;

    await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, [expiresAt, entry.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Tentar enviar email (não bloquear se falhar)
    try {
      console.log(`📧 Notificar ${entry.client_email}: Vaga disponível em ${appointment_date} ${appointment_time}`);
      // TODO: Implementar envio de email quando emailService estiver pronto
    } catch (emailError) {
      console.error('Erro ao enviar email de notificação:', emailError);
    }

    return entry;
  } catch (error) {
    console.error('Erro ao notificar lista de espera:', error);
    throw error;
  }
};

// Converter entrada da lista em agendamento (admin)
const convertToAppointment = async (req, res) => {
  const { id } = req.params;

  try {
    const selectQuery = usePG()
      ? 'SELECT * FROM waitlist WHERE id = $1'
      : 'SELECT * FROM waitlist WHERE id = ?';

    const entry = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entrada não encontrada' });
    }

    if (entry.status !== 'notified' && entry.status !== 'waiting') {
      return res.status(400).json({ error: 'Entrada não pode ser convertida' });
    }

    // Verificar se horário ainda está disponível
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
      db.get(checkQuery, [entry.preferred_date, entry.preferred_time], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      return res.status(400).json({ error: 'Horário não está mais disponível' });
    }

    // Criar agendamento
    const insertQuery = usePG()
      ? `INSERT INTO appointments
         (client_id, service_id, appointment_date, appointment_time, notes, status)
         VALUES ($1, $2, $3, $4, $5, 'confirmed')
         RETURNING id`
      : `INSERT INTO appointments
         (client_id, service_id, appointment_date, appointment_time, notes, status)
         VALUES (?, ?, ?, ?, ?, 'confirmed')`;

    const appointmentId = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(
        insertQuery,
        [
          entry.client_id,
          entry.service_id,
          entry.preferred_date,
          entry.preferred_time,
          entry.notes
        ],
        function (err) {
          if (err) {
            reject(err);
          } else {
            if (usePG()) {
              db.get('SELECT id FROM appointments WHERE client_id = $1 AND appointment_date = $2 AND appointment_time = $3 ORDER BY id DESC LIMIT 1',
                [entry.client_id, entry.preferred_date, entry.preferred_time], (err, row) => {
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

    // Marcar entrada como convertida
    const updateQuery = usePG()
      ? `UPDATE waitlist
         SET status = 'converted', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`
      : `UPDATE waitlist
         SET status = 'converted', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`;

    await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      message: 'Agendamento criado com sucesso a partir da lista de espera',
      appointment_id: appointmentId
    });
  } catch (error) {
    console.error('Erro ao converter entrada:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
};

// Expirar notificações antigas (cron job)
const expireOldNotifications = async () => {
  const now = new Date().toISOString();

  try {
    const updateQuery = usePG()
      ? `UPDATE waitlist
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE status = 'notified'
         AND expires_at < $1`
      : `UPDATE waitlist
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE status = 'notified'
         AND expires_at < ?`;

    const changes = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, [now], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (changes > 0) {
      console.log(`✅ ${changes} notificações expiradas`);
    }
  } catch (error) {
    console.error('Erro ao expirar notificações:', error);
  }
};

module.exports = {
  addToWaitlist,
  getWaitlist,
  cancelWaitlistEntry,
  notifyWaitlist,
  convertToAppointment,
  expireOldNotifications
};
