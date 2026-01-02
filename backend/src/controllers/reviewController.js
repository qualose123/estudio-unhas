const { usePG } = require('../config/database');

// Criar avaliação (cliente após agendamento concluído)
const createReview = async (req, res) => {
  const { appointment_id, rating, comment } = req.body;
  const client_id = req.user.id;

  if (!appointment_id || !rating) {
    return res.status(400).json({ error: 'appointment_id e rating são obrigatórios' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
  }

  try {
    // Verificar se agendamento existe e pertence ao cliente
    const appointmentQuery = usePG
      ? `SELECT * FROM appointments WHERE id = $1 AND client_id = $2 AND status = 'completed'`
      : `SELECT * FROM appointments WHERE id = ? AND client_id = ? AND status = 'completed'`;

    const appointment = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(appointmentQuery, [appointment_id, client_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado ou ainda não foi concluído' });
    }

    // Verificar se já foi avaliado
    const existingQuery = usePG
      ? 'SELECT * FROM reviews WHERE appointment_id = $1'
      : 'SELECT * FROM reviews WHERE appointment_id = ?';

    const existing = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(existingQuery, [appointment_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      return res.status(400).json({ error: 'Este agendamento já foi avaliado' });
    }

    // Criar avaliação
    const insertQuery = usePG
      ? `INSERT INTO reviews
         (appointment_id, client_id, service_id, professional_id, rating, comment)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`
      : `INSERT INTO reviews
         (appointment_id, client_id, service_id, professional_id, rating, comment)
         VALUES (?, ?, ?, ?, ?, ?)`;

    const reviewId = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(
        insertQuery,
        [
          appointment_id,
          client_id,
          appointment.service_id,
          appointment.professional_id || null,
          rating,
          comment || null
        ],
        function (err) {
          if (err) reject(err);
          else {
            if (usePG) {
              // For PostgreSQL, this.lastID is not available, need to get from RETURNING
              db.get('SELECT id FROM reviews WHERE appointment_id = $1', [appointment_id], (err, row) => {
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

    const selectQuery = usePG
      ? 'SELECT * FROM reviews WHERE id = $1'
      : 'SELECT * FROM reviews WHERE id = ?';

    const review = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [reviewId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    res.status(500).json({ error: 'Erro ao criar avaliação' });
  }
};

// Listar avaliações (público com filtros)
const getAllReviews = async (req, res) => {
  const { service_id, professional_id, rating, limit = 50, offset = 0 } = req.query;
  const isAdmin = req.user?.type === 'admin';

  try {
    let query = `
      SELECT
        r.*,
        c.name as client_name,
        s.name as service_name,
        p.name as professional_name
      FROM reviews r
      JOIN clients c ON r.client_id = c.id
      JOIN services s ON r.service_id = s.id
      LEFT JOIN professionals p ON r.professional_id = p.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Não-admins só veem avaliações ativas
    if (!isAdmin) {
      conditions.push(usePG ? `r.active = $${paramIndex++}` : 'r.active = ?');
      params.push(usePG ? true : 1);
    }

    if (service_id) {
      conditions.push(usePG ? `r.service_id = $${paramIndex++}` : 'r.service_id = ?');
      params.push(service_id);
    }

    if (professional_id) {
      conditions.push(usePG ? `r.professional_id = $${paramIndex++}` : 'r.professional_id = ?');
      params.push(professional_id);
    }

    if (rating) {
      conditions.push(usePG ? `r.rating = $${paramIndex++}` : 'r.rating = ?');
      params.push(rating);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += usePG
      ? ` ORDER BY r.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      : ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const reviews = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(reviews);
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({ error: 'Erro ao buscar avaliações' });
  }
};

// Obter avaliação específica
const getReviewById = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user?.type === 'admin';

  try {
    let query = `
      SELECT
        r.*,
        c.name as client_name,
        s.name as service_name,
        p.name as professional_name
      FROM reviews r
      JOIN clients c ON r.client_id = c.id
      JOIN services s ON r.service_id = s.id
      LEFT JOIN professionals p ON r.professional_id = p.id
      WHERE r.id = ${usePG ? '$1' : '?'}
    `;

    const params = [id];

    if (!isAdmin) {
      query += usePG ? ' AND r.active = $2' : ' AND r.active = ?';
      params.push(usePG ? true : 1);
    }

    const review = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!review) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    res.json(review);
  } catch (error) {
    console.error('Erro ao buscar avaliação:', error);
    res.status(500).json({ error: 'Erro ao buscar avaliação' });
  }
};

// Atualizar avaliação (cliente pode editar própria avaliação)
const updateReview = async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const isAdmin = req.user?.type === 'admin';

  try {
    // Verificar permissão
    let checkQuery = usePG
      ? 'SELECT * FROM reviews WHERE id = $1'
      : 'SELECT * FROM reviews WHERE id = ?';
    let checkParams = [id];

    if (!isAdmin) {
      checkQuery += usePG ? ' AND client_id = $2' : ' AND client_id = ?';
      checkParams.push(req.user.id);
    }

    const review = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(checkQuery, checkParams, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!review) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
      }
      updates.push(usePG ? `rating = $${paramIndex++}` : 'rating = ?');
      params.push(rating);
    }

    if (comment !== undefined) {
      updates.push(usePG ? `comment = $${paramIndex++}` : 'comment = ?');
      params.push(comment);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateQuery = usePG
      ? `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${paramIndex}`
      : `UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`;

    await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, params, function (err) {
        if (err) reject(err);
        else resolve();
      });
    });

    const selectQuery = usePG
      ? 'SELECT * FROM reviews WHERE id = $1'
      : 'SELECT * FROM reviews WHERE id = ?';

    const updated = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar avaliação:', error);
    res.status(500).json({ error: 'Erro ao atualizar avaliação' });
  }
};

// Responder avaliação (admin)
const respondReview = async (req, res) => {
  const { id } = req.params;
  const { response } = req.body;

  if (!response) {
    return res.status(400).json({ error: 'Resposta é obrigatória' });
  }

  try {
    const updateQuery = usePG
      ? `UPDATE reviews
         SET response = $1,
             response_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`
      : `UPDATE reviews
         SET response = ?,
             response_date = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`;

    const changes = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, [response, id], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    const selectQuery = usePG
      ? 'SELECT * FROM reviews WHERE id = $1'
      : 'SELECT * FROM reviews WHERE id = ?';

    const review = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(review);
  } catch (error) {
    console.error('Erro ao responder avaliação:', error);
    res.status(500).json({ error: 'Erro ao responder avaliação' });
  }
};

// Deletar/desativar avaliação (admin)
const deleteReview = async (req, res) => {
  const { id } = req.params;

  try {
    const updateQuery = usePG
      ? 'UPDATE reviews SET active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2'
      : 'UPDATE reviews SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

    const changes = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, [usePG ? false : 0, id], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    res.json({ message: 'Avaliação desativada com sucesso' });
  } catch (error) {
    console.error('Erro ao desativar avaliação:', error);
    res.status(500).json({ error: 'Erro ao desativar avaliação' });
  }
};

// Estatísticas de avaliações
const getReviewStats = async (req, res) => {
  const { service_id, professional_id } = req.query;

  try {
    let query = `
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews
      WHERE active = ${usePG ? '$1' : '?'}
    `;

    const params = [usePG ? true : 1];
    let paramIndex = 2;

    if (service_id) {
      query += usePG ? ` AND service_id = $${paramIndex++}` : ' AND service_id = ?';
      params.push(service_id);
    }

    if (professional_id) {
      query += usePG ? ` AND professional_id = $${paramIndex++}` : ' AND professional_id = ?';
      params.push(professional_id);
    }

    const stats = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Arredondar média para 1 casa decimal
    if (stats.average_rating) {
      stats.average_rating = Math.round(stats.average_rating * 10) / 10;
    }

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

module.exports = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  respondReview,
  deleteReview,
  getReviewStats
};
