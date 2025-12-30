const db = require('../config/database');
const { usePG } = require('../config/database');

// Criar comissão automaticamente quando agendamento é confirmado
const createCommission = async (appointmentId, professionalId, serviceAmount, commissionRate) => {
  try {
    const commissionAmount = (serviceAmount * commissionRate) / 100;

    const insertQuery = usePG
      ? `INSERT INTO commissions
         (appointment_id, professional_id, service_amount, commission_rate, commission_amount)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`
      : `INSERT INTO commissions
         (appointment_id, professional_id, service_amount, commission_rate, commission_amount)
         VALUES (?, ?, ?, ?, ?)`;

    const result = await db.run(insertQuery, [appointmentId, professionalId, serviceAmount, commissionRate, commissionAmount]);
    return result.lastID;
  } catch (err) {
    throw err;
  }
};

// Listar todas as comissões (admin)
const getAllCommissions = async (req, res) => {
  try {
    const { professional_id, status, start_date, end_date } = req.query;

    let query = `
      SELECT
        c.*,
        p.name as professional_name,
        a.appointment_date,
        a.appointment_time,
        s.name as service_name,
        cl.name as client_name
      FROM commissions c
      JOIN professionals p ON c.professional_id = p.id
      JOIN appointments a ON c.appointment_id = a.id
      JOIN services s ON a.service_id = s.id
      JOIN clients cl ON a.client_id = cl.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (professional_id) {
      query += ` AND c.professional_id = ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(professional_id);
    }

    if (status) {
      query += ` AND c.status = ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND a.appointment_date >= ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND a.appointment_date <= ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(end_date);
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const commissions = await db.all(query, params);
    res.json(commissions);
  } catch (err) {
    console.error('Erro ao buscar comissões:', err);
    res.status(500).json({ error: 'Erro ao buscar comissões' });
  }
};

// Obter comissão por ID
const getCommissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = usePG
      ? `SELECT
          c.*,
          p.name as professional_name,
          a.appointment_date,
          a.appointment_time,
          s.name as service_name,
          cl.name as client_name
         FROM commissions c
         JOIN professionals p ON c.professional_id = p.id
         JOIN appointments a ON c.appointment_id = a.id
         JOIN services s ON a.service_id = s.id
         JOIN clients cl ON a.client_id = cl.id
         WHERE c.id = $1`
      : `SELECT
          c.*,
          p.name as professional_name,
          a.appointment_date,
          a.appointment_time,
          s.name as service_name,
          cl.name as client_name
         FROM commissions c
         JOIN professionals p ON c.professional_id = p.id
         JOIN appointments a ON c.appointment_id = a.id
         JOIN services s ON a.service_id = s.id
         JOIN clients cl ON a.client_id = cl.id
         WHERE c.id = ?`;

    const commission = await db.get(query, [id]);

    if (!commission) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    res.json(commission);
  } catch (err) {
    console.error('Erro ao buscar comissão:', err);
    res.status(500).json({ error: 'Erro ao buscar comissão' });
  }
};

// Marcar comissão como paga
const markCommissionAsPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, notes } = req.body;

    const updateQuery = usePG
      ? `UPDATE commissions
         SET status = 'paid',
             paid_at = CURRENT_TIMESTAMP,
             payment_method = $1,
             notes = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND status = 'pending'`
      : `UPDATE commissions
         SET status = 'paid',
             paid_at = CURRENT_TIMESTAMP,
             payment_method = ?,
             notes = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'pending'`;

    const result = await db.run(updateQuery, [payment_method || null, notes || null, id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Comissão não encontrada ou já foi paga' });
    }

    const selectQuery = usePG
      ? 'SELECT * FROM commissions WHERE id = $1'
      : 'SELECT * FROM commissions WHERE id = ?';
    const commission = await db.get(selectQuery, [id]);

    res.json(commission);
  } catch (err) {
    console.error('Erro ao atualizar comissão:', err);
    res.status(500).json({ error: 'Erro ao atualizar comissão' });
  }
};

// Cancelar comissão
const cancelCommission = async (req, res) => {
  try {
    const { id } = req.params;

    const updateQuery = usePG
      ? `UPDATE commissions
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`
      : `UPDATE commissions
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`;

    const result = await db.run(updateQuery, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Comissão não encontrada' });
    }

    res.json({ message: 'Comissão cancelada com sucesso' });
  } catch (err) {
    console.error('Erro ao cancelar comissão:', err);
    res.status(500).json({ error: 'Erro ao cancelar comissão' });
  }
};

// Relatório resumido de comissões
const getCommissionsSummary = async (req, res) => {
  try {
    const { start_date, end_date, professional_id } = req.query;

    let query = `
      SELECT
        c.status,
        COUNT(*) as count,
        SUM(c.commission_amount) as total_amount
      FROM commissions c
      JOIN appointments a ON c.appointment_id = a.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (start_date) {
      query += ` AND a.appointment_date >= ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND a.appointment_date <= ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(end_date);
    }

    if (professional_id) {
      query += ` AND c.professional_id = ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(professional_id);
    }

    query += ' GROUP BY c.status';

    const summary = await db.all(query, params);

    const result = {
      pending: { count: 0, total_amount: 0 },
      paid: { count: 0, total_amount: 0 },
      cancelled: { count: 0, total_amount: 0 }
    };

    summary.forEach(item => {
      result[item.status] = {
        count: item.count,
        total_amount: item.total_amount || 0
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Erro ao gerar resumo:', err);
    res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
};

module.exports = {
  createCommission,
  getAllCommissions,
  getCommissionById,
  markCommissionAsPaid,
  cancelCommission,
  getCommissionsSummary
};
