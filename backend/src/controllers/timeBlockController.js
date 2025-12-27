const db = require('../config/database');

// Listar bloqueios de horário
const getAllTimeBlocks = (req, res) => {
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
    query += ' WHERE tb.block_date = ?';
    params.push(date);
  }

  query += ' ORDER BY tb.block_date DESC, tb.start_time ASC';

  db.all(query, params, (err, blocks) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar bloqueios' });
    }
    res.json(blocks);
  });
};

// Buscar bloqueio por ID
const getTimeBlockById = (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT
      tb.*,
      a.name as created_by_name
     FROM time_blocks tb
     JOIN admins a ON tb.created_by = a.id
     WHERE tb.id = ?`,
    [id],
    (err, block) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar bloqueio' });
      }
      if (!block) {
        return res.status(404).json({ error: 'Bloqueio não encontrado' });
      }
      res.json(block);
    }
  );
};

// Criar bloqueio de horário (admin)
const createTimeBlock = (req, res) => {
  const { block_date, start_time, end_time, reason } = req.body;
  const created_by = req.user.id;

  // Verificar se start_time é menor que end_time
  if (start_time >= end_time) {
    return res.status(400).json({ error: 'Horário inicial deve ser menor que o horário final' });
  }

  // Verificar se já existe bloqueio sobrepondo
  db.get(
    `SELECT * FROM time_blocks
     WHERE block_date = ?
     AND ((start_time <= ? AND end_time > ?)
          OR (start_time < ? AND end_time >= ?)
          OR (start_time >= ? AND end_time <= ?))`,
    [block_date, start_time, start_time, end_time, end_time, start_time, end_time],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao verificar bloqueios existentes' });
      }
      if (existing) {
        return res.status(400).json({ error: 'Já existe um bloqueio neste período' });
      }

      db.run(
        `INSERT INTO time_blocks (block_date, start_time, end_time, reason, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [block_date, start_time, end_time, reason || null, created_by],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Erro ao criar bloqueio' });
          }

          db.get(
            `SELECT
              tb.*,
              a.name as created_by_name
             FROM time_blocks tb
             JOIN admins a ON tb.created_by = a.id
             WHERE tb.id = ?`,
            [this.lastID],
            (err, block) => {
              if (err) {
                return res.status(500).json({ error: 'Erro ao buscar bloqueio criado' });
              }
              res.status(201).json(block);
            }
          );
        }
      );
    }
  );
};

// Atualizar bloqueio (admin)
const updateTimeBlock = (req, res) => {
  const { id } = req.params;
  const { block_date, start_time, end_time, reason } = req.body;

  const updates = [];
  const params = [];

  if (block_date !== undefined) {
    updates.push('block_date = ?');
    params.push(block_date);
  }
  if (start_time !== undefined) {
    updates.push('start_time = ?');
    params.push(start_time);
  }
  if (end_time !== undefined) {
    updates.push('end_time = ?');
    params.push(end_time);
  }
  if (reason !== undefined) {
    updates.push('reason = ?');
    params.push(reason);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  params.push(id);

  db.run(
    `UPDATE time_blocks SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar bloqueio' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Bloqueio não encontrado' });
      }

      db.get(
        `SELECT
          tb.*,
          a.name as created_by_name
         FROM time_blocks tb
         JOIN admins a ON tb.created_by = a.id
         WHERE tb.id = ?`,
        [id],
        (err, block) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao buscar bloqueio atualizado' });
          }
          res.json(block);
        }
      );
    }
  );
};

// Deletar bloqueio (admin)
const deleteTimeBlock = (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM time_blocks WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao deletar bloqueio' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Bloqueio não encontrado' });
    }

    res.json({ message: 'Bloqueio deletado com sucesso' });
  });
};

module.exports = {
  getAllTimeBlocks,
  getTimeBlockById,
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock
};
