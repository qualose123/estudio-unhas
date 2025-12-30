const db = require('../config/database');
const { usePG } = require('../config/database');

// Listar bloqueios de horário
const getAllTimeBlocks = async (req, res) => {
  try {
    const { date } = req.query;

    let query = `
      SELECT
        tb.*,
        a.name as created_by_name
      FROM time_blocks tb
      JOIN admins a ON tb.created_by = a.id
    `;

    const params = [];

    if (date) {
      query += usePG ? ' WHERE tb.block_date = $1' : ' WHERE tb.block_date = ?';
      params.push(date);
    }

    query += ' ORDER BY tb.block_date DESC, tb.start_time ASC';

    const blocks = await db.all(query, params);
    res.json(blocks);
  } catch (err) {
    console.error('Error fetching time blocks:', err);
    res.status(500).json({ error: 'Erro ao buscar bloqueios' });
  }
};

// Buscar bloqueio por ID
const getTimeBlockById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = usePG
      ? `SELECT
          tb.*,
          a.name as created_by_name
         FROM time_blocks tb
         JOIN admins a ON tb.created_by = a.id
         WHERE tb.id = $1`
      : `SELECT
          tb.*,
          a.name as created_by_name
         FROM time_blocks tb
         JOIN admins a ON tb.created_by = a.id
         WHERE tb.id = ?`;

    const block = await db.get(query, [id]);

    if (!block) {
      return res.status(404).json({ error: 'Bloqueio não encontrado' });
    }

    res.json(block);
  } catch (err) {
    console.error('Error fetching time block:', err);
    res.status(500).json({ error: 'Erro ao buscar bloqueio' });
  }
};

// Criar bloqueio de horário (admin)
const createTimeBlock = async (req, res) => {
  try {
    const { block_date, start_time, end_time, reason } = req.body;
    const created_by = req.user.id;

    // Verificar se start_time é menor que end_time
    if (start_time >= end_time) {
      return res.status(400).json({ error: 'Horário inicial deve ser menor que o horário final' });
    }

    // Verificar se já existe bloqueio sobrepondo
    const checkQuery = usePG
      ? `SELECT * FROM time_blocks
         WHERE block_date = $1
         AND ((start_time <= $2 AND end_time > $2)
              OR (start_time < $3 AND end_time >= $3)
              OR (start_time >= $2 AND end_time <= $3))`
      : `SELECT * FROM time_blocks
         WHERE block_date = ?
         AND ((start_time <= ? AND end_time > ?)
              OR (start_time < ? AND end_time >= ?)
              OR (start_time >= ? AND end_time <= ?))`;

    const checkParams = usePG
      ? [block_date, start_time, end_time]
      : [block_date, start_time, start_time, end_time, end_time, start_time, end_time];

    const existing = await db.get(checkQuery, checkParams);

    if (existing) {
      return res.status(400).json({ error: 'Já existe um bloqueio neste período' });
    }

    const insertQuery = usePG
      ? `INSERT INTO time_blocks (block_date, start_time, end_time, reason, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`
      : `INSERT INTO time_blocks (block_date, start_time, end_time, reason, created_by)
         VALUES (?, ?, ?, ?, ?)`;

    const result = await db.run(insertQuery, [block_date, start_time, end_time, reason || null, created_by]);
    const blockId = usePG ? result.id : result.lastID;

    const selectQuery = usePG
      ? `SELECT
          tb.*,
          a.name as created_by_name
         FROM time_blocks tb
         JOIN admins a ON tb.created_by = a.id
         WHERE tb.id = $1`
      : `SELECT
          tb.*,
          a.name as created_by_name
         FROM time_blocks tb
         JOIN admins a ON tb.created_by = a.id
         WHERE tb.id = ?`;

    const block = await db.get(selectQuery, [blockId]);
    res.status(201).json(block);
  } catch (err) {
    console.error('Error creating time block:', err);
    res.status(500).json({ error: 'Erro ao criar bloqueio' });
  }
};

// Atualizar bloqueio (admin)
const updateTimeBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { block_date, start_time, end_time, reason } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (block_date !== undefined) {
      updates.push(usePG ? `block_date = $${paramIndex++}` : 'block_date = ?');
      params.push(block_date);
    }
    if (start_time !== undefined) {
      updates.push(usePG ? `start_time = $${paramIndex++}` : 'start_time = ?');
      params.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push(usePG ? `end_time = $${paramIndex++}` : 'end_time = ?');
      params.push(end_time);
    }
    if (reason !== undefined) {
      updates.push(usePG ? `reason = $${paramIndex++}` : 'reason = ?');
      params.push(reason);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    params.push(id);

    const updateQuery = usePG
      ? `UPDATE time_blocks SET ${updates.join(', ')} WHERE id = $${paramIndex}`
      : `UPDATE time_blocks SET ${updates.join(', ')} WHERE id = ?`;

    const result = await db.run(updateQuery, params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bloqueio não encontrado' });
    }

    const selectQuery = usePG
      ? `SELECT
          tb.*,
          a.name as created_by_name
         FROM time_blocks tb
         JOIN admins a ON tb.created_by = a.id
         WHERE tb.id = $1`
      : `SELECT
          tb.*,
          a.name as created_by_name
         FROM time_blocks tb
         JOIN admins a ON tb.created_by = a.id
         WHERE tb.id = ?`;

    const block = await db.get(selectQuery, [id]);
    res.json(block);
  } catch (err) {
    console.error('Error updating time block:', err);
    res.status(500).json({ error: 'Erro ao atualizar bloqueio' });
  }
};

// Deletar bloqueio (admin)
const deleteTimeBlock = async (req, res) => {
  try {
    const { id } = req.params;

    const query = usePG
      ? 'DELETE FROM time_blocks WHERE id = $1'
      : 'DELETE FROM time_blocks WHERE id = ?';

    const result = await db.run(query, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Bloqueio não encontrado' });
    }

    res.json({ message: 'Bloqueio deletado com sucesso' });
  } catch (err) {
    console.error('Error deleting time block:', err);
    res.status(500).json({ error: 'Erro ao deletar bloqueio' });
  }
};

module.exports = {
  getAllTimeBlocks,
  getTimeBlockById,
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock
};
