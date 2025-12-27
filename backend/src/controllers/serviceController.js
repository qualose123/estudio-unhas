const db = require('../config/database');

// Listar todos os serviços
const getAllServices = (req, res) => {
  const { active } = req.query;

  let query = 'SELECT * FROM services';
  const params = [];

  if (active !== undefined) {
    query += ' WHERE active = ?';
    params.push(active === 'true' ? 1 : 0);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, services) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar serviços' });
    }
    res.json(services);
  });
};

// Buscar serviço por ID
const getServiceById = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM services WHERE id = ?', [id], (err, service) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar serviço' });
    }
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    res.json(service);
  });
};

// Criar novo serviço (admin)
const createService = (req, res) => {
  const { name, description, duration, price, active } = req.body;

  db.run(
    'INSERT INTO services (name, description, duration, price, active) VALUES (?, ?, ?, ?, ?)',
    [name, description || null, duration, price, active !== undefined ? active : 1],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao criar serviço' });
      }

      db.get('SELECT * FROM services WHERE id = ?', [this.lastID], (err, service) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar serviço criado' });
        }
        res.status(201).json(service);
      });
    }
  );
};

// Atualizar serviço (admin)
const updateService = (req, res) => {
  const { id } = req.params;
  const { name, description, duration, price, active } = req.body;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (duration !== undefined) {
    updates.push('duration = ?');
    params.push(duration);
  }
  if (price !== undefined) {
    updates.push('price = ?');
    params.push(price);
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
    `UPDATE services SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar serviço' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Serviço não encontrado' });
      }

      db.get('SELECT * FROM services WHERE id = ?', [id], (err, service) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar serviço atualizado' });
        }
        res.json(service);
      });
    }
  );
};

// Deletar serviço (admin)
const deleteService = (req, res) => {
  const { id } = req.params;

  // Verificar se existem agendamentos vinculados
  db.get(
    'SELECT COUNT(*) as count FROM appointments WHERE service_id = ? AND status != "cancelled"',
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao verificar agendamentos' });
      }

      if (result.count > 0) {
        return res.status(400).json({
          error: 'Não é possível deletar serviço com agendamentos ativos. Desative o serviço em vez disso.'
        });
      }

      db.run('DELETE FROM services WHERE id = ?', [id], function (err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao deletar serviço' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Serviço não encontrado' });
        }

        res.json({ message: 'Serviço deletado com sucesso' });
      });
    }
  );
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
