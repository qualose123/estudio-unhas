const db = require('../config/database');

// Criar profissional (admin)
const createProfessional = (req, res) => {
  const { name, email, phone, commission_rate } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  db.run(
    `INSERT INTO professionals (name, email, phone, commission_rate)
     VALUES (?, ?, ?, ?)`,
    [name, email || null, phone || null, commission_rate || 50.0],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Email já cadastrado' });
        }
        return res.status(500).json({ error: 'Erro ao criar profissional' });
      }

      db.get('SELECT * FROM professionals WHERE id = ?', [this.lastID], (err, professional) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar profissional criado' });
        }
        res.status(201).json(professional);
      });
    }
  );
};

// Listar profissionais
const getAllProfessionals = (req, res) => {
  const { active } = req.query;

  let query = 'SELECT * FROM professionals';
  const params = [];

  if (active !== undefined) {
    query += ' WHERE active = ?';
    params.push(active === 'true' ? 1 : 0);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, professionals) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar profissionais' });
    }
    res.json(professionals);
  });
};

// Obter profissional por ID
const getProfessionalById = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM professionals WHERE id = ?', [id], (err, professional) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar profissional' });
    }

    if (!professional) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    res.json(professional);
  });
};

// Atualizar profissional
const updateProfessional = (req, res) => {
  const { id } = req.params;
  const { name, email, phone, commission_rate, active } = req.body;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    params.push(email);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone);
  }
  if (commission_rate !== undefined) {
    updates.push('commission_rate = ?');
    params.push(commission_rate);
  }
  if (active !== undefined) {
    updates.push('active = ?');
    params.push(active ? 1 : 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  db.run(
    `UPDATE professionals SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar profissional' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Profissional não encontrado' });
      }

      db.get('SELECT * FROM professionals WHERE id = ?', [id], (err, professional) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar profissional atualizado' });
        }
        res.json(professional);
      });
    }
  );
};

// Deletar profissional
const deleteProfessional = (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM professionals WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao deletar profissional' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    res.json({ message: 'Profissional deletado com sucesso' });
  });
};

// Relatório de comissões de um profissional
const getProfessionalCommissions = (req, res) => {
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
    WHERE c.professional_id = ?
  `;

  const params = [id];

  if (start_date) {
    query += ' AND a.appointment_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND a.appointment_date <= ?';
    params.push(end_date);
  }

  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }

  query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

  db.all(query, params, (err, commissions) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar comissões' });
    }

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
  });
};

module.exports = {
  createProfessional,
  getAllProfessionals,
  getProfessionalById,
  updateProfessional,
  deleteProfessional,
  getProfessionalCommissions
};
