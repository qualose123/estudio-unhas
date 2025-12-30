const db = require('../config/database');
const { usePG } = require('../config/database');

// Criar profissional (admin)
const createProfessional = async (req, res) => {
  try {
    const { name, email, phone, commission_rate } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const insertQuery = usePG
      ? `INSERT INTO professionals (name, email, phone, commission_rate)
         VALUES ($1, $2, $3, $4) RETURNING id`
      : `INSERT INTO professionals (name, email, phone, commission_rate)
         VALUES (?, ?, ?, ?)`;
    const result = await db.run(insertQuery, [name, email || null, phone || null, commission_rate || 50.0]);
    const professionalId = result.lastID;

    const selectQuery = usePG
      ? 'SELECT * FROM professionals WHERE id = $1'
      : 'SELECT * FROM professionals WHERE id = ?';
    const professional = await db.get(selectQuery, [professionalId]);

    res.status(201).json(professional);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    console.error('Erro ao criar profissional:', err);
    res.status(500).json({ error: 'Erro ao criar profissional' });
  }
};

// Listar profissionais
const getAllProfessionals = async (req, res) => {
  try {
    const { active } = req.query;

    let query = 'SELECT * FROM professionals';
    const params = [];

    if (active !== undefined) {
      query += usePG
        ? ' WHERE active = $1'
        : ' WHERE active = ?';
      params.push(usePG ? (active === 'true') : (active === 'true' ? 1 : 0));
    }

    query += ' ORDER BY name ASC';

    const professionals = await db.all(query, params);
    res.json(professionals);
  } catch (err) {
    console.error('Erro ao buscar profissionais:', err);
    res.status(500).json({ error: 'Erro ao buscar profissionais' });
  }
};

// Obter profissional por ID
const getProfessionalById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = usePG
      ? 'SELECT * FROM professionals WHERE id = $1'
      : 'SELECT * FROM professionals WHERE id = ?';
    const professional = await db.get(query, [id]);

    if (!professional) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    res.json(professional);
  } catch (err) {
    console.error('Erro ao buscar profissional:', err);
    res.status(500).json({ error: 'Erro ao buscar profissional' });
  }
};

// Atualizar profissional
const updateProfessional = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, commission_rate, active } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(email);
    }
    if (phone !== undefined) {
      updates.push(`phone = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(phone);
    }
    if (commission_rate !== undefined) {
      updates.push(`commission_rate = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(commission_rate);
    }
    if (active !== undefined) {
      updates.push(`active = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(usePG ? active : (active ? 1 : 0));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateQuery = `UPDATE professionals SET ${updates.join(', ')} WHERE id = ${usePG ? '$' + paramIndex : '?'}`;
    const result = await db.run(updateQuery, params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    const selectQuery = usePG
      ? 'SELECT * FROM professionals WHERE id = $1'
      : 'SELECT * FROM professionals WHERE id = ?';
    const professional = await db.get(selectQuery, [id]);

    res.json(professional);
  } catch (err) {
    console.error('Erro ao atualizar profissional:', err);
    res.status(500).json({ error: 'Erro ao atualizar profissional' });
  }
};

// Deletar profissional
const deleteProfessional = async (req, res) => {
  try {
    const { id } = req.params;

    const deleteQuery = usePG
      ? 'DELETE FROM professionals WHERE id = $1'
      : 'DELETE FROM professionals WHERE id = ?';
    const result = await db.run(deleteQuery, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    res.json({ message: 'Profissional deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar profissional:', err);
    res.status(500).json({ error: 'Erro ao deletar profissional' });
  }
};

// Relatório de comissões de um profissional
const getProfessionalCommissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, status } = req.query;

    let query = `
      SELECT
        c.*,
        a.appointment_date,
        a.appointment_time,
        s.name as service_name,
        cl.name as client_name
      FROM commissions c
      JOIN appointments a ON c.appointment_id = a.id
      JOIN services s ON a.service_id = s.id
      JOIN clients cl ON a.client_id = cl.id
      WHERE c.professional_id = ${usePG ? '$1' : '?'}
    `;

    const params = [id];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND a.appointment_date >= ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND a.appointment_date <= ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(end_date);
    }

    if (status) {
      query += ` AND c.status = ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(status);
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const commissions = await db.all(query, params);

    // Calcular totais
    const totals = {
      total_commissions: 0,
      pending_amount: 0,
      paid_amount: 0,
      count: commissions.length
    };

    commissions.forEach(c => {
      totals.total_commissions += c.commission_amount;
      if (c.status === 'pending') {
        totals.pending_amount += c.commission_amount;
      } else if (c.status === 'paid') {
        totals.paid_amount += c.commission_amount;
      }
    });

    res.json({ commissions, totals });
  } catch (err) {
    console.error('Erro ao buscar comissões:', err);
    res.status(500).json({ error: 'Erro ao buscar comissões' });
  }
};

module.exports = {
  createProfessional,
  getAllProfessionals,
  getProfessionalById,
  updateProfessional,
  deleteProfessional,
  getProfessionalCommissions
};
