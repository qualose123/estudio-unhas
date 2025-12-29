const db = require('../config/database');

// Criar comissão automaticamente quando agendamento é confirmado
const createCommission = (appointmentId, professionalId, serviceAmount, commissionRate) => {
  return new Promise((resolve, reject) => {
    const commissionAmount = (serviceAmount * commissionRate) / 100;

    db.run(
      `INSERT INTO commissions
       (appointment_id, professional_id, service_amount, commission_rate, commission_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [appointmentId, professionalId, serviceAmount, commissionRate, commissionAmount],
      function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.lastID);
      }
    );
  });
};

// Listar todas as comissões (admin)
const getAllCommissions = (req, res) => {
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

  if (professional_id) {
    query += ' AND c.professional_id = ?';
    params.push(professional_id);
  }

  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }

  if (start_date) {
    query += ' AND a.appointment_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND a.appointment_date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

  db.all(query, params, (err, commissions) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar comissões' });
    }
    res.json(commissions);
  });
};

// Obter comissão por ID
const getCommissionById = (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT
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
     WHERE c.id = ?`,
    [id],
    (err, commission) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar comissão' });
      }

      if (!commission) {
        return res.status(404).json({ error: 'Comissão não encontrada' });
      }

      res.json(commission);
    }
  );
};

// Marcar comissão como paga
const markCommissionAsPaid = (req, res) => {
  const { id } = req.params;
  const { payment_method, notes } = req.body;

  db.run(
    `UPDATE commissions
     SET status = 'paid',
         paid_at = CURRENT_TIMESTAMP,
         payment_method = ?,
         notes = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND status = 'pending'`,
    [payment_method || null, notes || null, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar comissão' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Comissão não encontrada ou já foi paga' });
      }

      db.get('SELECT * FROM commissions WHERE id = ?', [id], (err, commission) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar comissão atualizada' });
        }
        res.json(commission);
      });
    }
  );
};

// Cancelar comissão
const cancelCommission = (req, res) => {
  const { id } = req.params;

  db.run(
    `UPDATE commissions
     SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao cancelar comissão' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Comissão não encontrada' });
      }

      res.json({ message: 'Comissão cancelada com sucesso' });
    }
  );
};

// Relatório resumido de comissões
const getCommissionsSummary = (req, res) => {
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

  if (start_date) {
    query += ' AND a.appointment_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND a.appointment_date <= ?';
    params.push(end_date);
  }

  if (professional_id) {
    query += ' AND c.professional_id = ?';
    params.push(professional_id);
  }

  query += ' GROUP BY c.status';

  db.all(query, params, (err, summary) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao gerar resumo' });
    }

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
  });
};

module.exports = {
  createCommission,
  getAllCommissions,
  getCommissionById,
  markCommissionAsPaid,
  cancelCommission,
  getCommissionsSummary
};
