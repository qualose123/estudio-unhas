const db = require('../config/database');
const { usePG } = require('../config/database');

// Listar todos os serviços
const getAllServices = async (req, res) => {
  try {
    const { active } = req.query;

    let query = 'SELECT * FROM services';
    const params = [];

    if (active !== undefined) {
      query += usePG
        ? ' WHERE active = $1'
        : ' WHERE active = ?';
      params.push(usePG ? (active === 'true') : (active === 'true' ? 1 : 0));
    }

    query += ' ORDER BY name ASC';

    const services = await db.all(query, params);
    res.json(services);
  } catch (err) {
    console.error('Erro ao buscar serviços:', err);
    res.status(500).json({ error: 'Erro ao buscar serviços' });
  }
};

// Buscar serviço por ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = usePG
      ? 'SELECT * FROM services WHERE id = $1'
      : 'SELECT * FROM services WHERE id = ?';
    const service = await db.get(query, [id]);

    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json(service);
  } catch (err) {
    console.error('Erro ao buscar serviço:', err);
    res.status(500).json({ error: 'Erro ao buscar serviço' });
  }
};

// Criar novo serviço (admin)
const createService = async (req, res) => {
  try {
    const { name, description, duration, price, active } = req.body;

    const insertQuery = usePG
      ? 'INSERT INTO services (name, description, duration, price, active) VALUES ($1, $2, $3, $4, $5) RETURNING id'
      : 'INSERT INTO services (name, description, duration, price, active) VALUES (?, ?, ?, ?, ?)';
    const activeValue = usePG ? (active !== undefined ? active : true) : (active !== undefined ? (active ? 1 : 0) : 1);
    const result = await db.run(insertQuery, [name, description || null, duration, price, activeValue]);
    const serviceId = result.lastID;

    const selectQuery = usePG
      ? 'SELECT * FROM services WHERE id = $1'
      : 'SELECT * FROM services WHERE id = ?';
    const service = await db.get(selectQuery, [serviceId]);

    res.status(201).json(service);
  } catch (err) {
    console.error('Erro ao criar serviço:', err);
    res.status(500).json({ error: 'Erro ao criar serviço' });
  }
};

// Atualizar serviço (admin)
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration, price, active } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(description);
    }
    if (duration !== undefined) {
      updates.push(`duration = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(duration);
    }
    if (price !== undefined) {
      updates.push(`price = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(price);
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

    const updateQuery = `UPDATE services SET ${updates.join(', ')} WHERE id = ${usePG ? '$' + paramIndex : '?'}`;
    const result = await db.run(updateQuery, params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    const selectQuery = usePG
      ? 'SELECT * FROM services WHERE id = $1'
      : 'SELECT * FROM services WHERE id = ?';
    const service = await db.get(selectQuery, [id]);

    res.json(service);
  } catch (err) {
    console.error('Erro ao atualizar serviço:', err);
    res.status(500).json({ error: 'Erro ao atualizar serviço' });
  }
};

// Deletar serviço (admin)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se existem agendamentos vinculados
    const checkQuery = usePG
      ? 'SELECT COUNT(*) as count FROM appointments WHERE service_id = $1 AND status != \'cancelled\''
      : 'SELECT COUNT(*) as count FROM appointments WHERE service_id = ? AND status != "cancelled"';
    const result = await db.get(checkQuery, [id]);

    if (result.count > 0) {
      return res.status(400).json({
        error: 'Não é possível deletar serviço com agendamentos ativos. Desative o serviço em vez disso.'
      });
    }

    const deleteQuery = usePG
      ? 'DELETE FROM services WHERE id = $1'
      : 'DELETE FROM services WHERE id = ?';
    const deleteResult = await db.run(deleteQuery, [id]);

    if (deleteResult.changes === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json({ message: 'Serviço deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar serviço:', err);
    res.status(500).json({ error: 'Erro ao deletar serviço' });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};
