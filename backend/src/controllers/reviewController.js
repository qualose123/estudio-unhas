const db = require('../config/database');

// Criar avaliação (cliente após agendamento concluído)
const createReview = (req, res) => {
  const { appointment_id, rating, comment } = req.body;
  const client_id = req.user.id;

  if (!appointment_id || !rating) {
    return res.status(400).json({ error: 'appointment_id e rating são obrigatórios' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
  }

  // Verificar se agendamento existe e pertence ao cliente
  db.get(
    `SELECT * FROM appointments WHERE id = ? AND client_id = ? AND status = 'completed'`,
    [appointment_id, client_id],
    (err, appointment) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao verificar agendamento' });
      }

      if (!appointment) {
        return res.status(404).json({ error: 'Agendamento não encontrado ou ainda não foi concluído' });
      }

      // Verificar se já foi avaliado
      db.get(
        'SELECT * FROM reviews WHERE appointment_id = ?',
        [appointment_id],
        (err, existing) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao verificar avaliação existente' });
          }

          if (existing) {
            return res.status(400).json({ error: 'Este agendamento já foi avaliado' });
          }

          // Criar avaliação
          db.run(
            `INSERT INTO reviews
             (appointment_id, client_id, service_id, professional_id, rating, comment)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              appointment_id,
              client_id,
              appointment.service_id,
              appointment.professional_id || null,
              rating,
              comment || null
            ],
            function (err) {
              if (err) {
                return res.status(500).json({ error: 'Erro ao criar avaliação' });
              }

              db.get('SELECT * FROM reviews WHERE id = ?', [this.lastID], (err, review) => {
                if (err) {
                  return res.status(500).json({ error: 'Erro ao buscar avaliação criada' });
                }
                res.status(201).json(review);
              });
            }
          );
        }
      );
    }
  );
};

// Listar avaliações (público com filtros)
const getAllReviews = (req, res) => {
  const { service_id, professional_id, rating, limit = 50, offset = 0 } = req.query;
  const isAdmin = req.user?.type === 'admin';

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

  // Não-admins só veem avaliações ativas
  if (!isAdmin) {
    conditions.push('r.active = 1');
  }

  if (service_id) {
    conditions.push('r.service_id = ?');
    params.push(service_id);
  }

  if (professional_id) {
    conditions.push('r.professional_id = ?');
    params.push(professional_id);
  }

  if (rating) {
    conditions.push('r.rating = ?');
    params.push(rating);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, reviews) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar avaliações' });
    }
    res.json(reviews);
  });
};

// Obter avaliação específica
const getReviewById = (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user?.type === 'admin';

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
    WHERE r.id = ?
  `;

  const params = [id];

  if (!isAdmin) {
    query += ' AND r.active = 1';
  }

  db.get(query, params, (err, review) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar avaliação' });
    }

    if (!review) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    res.json(review);
  });
};

// Atualizar avaliação (cliente pode editar própria avaliação)
const updateReview = (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const isAdmin = req.user?.type === 'admin';

  // Verificar permissão
  let checkQuery = 'SELECT * FROM reviews WHERE id = ?';
  const checkParams = [id];

  if (!isAdmin) {
    checkQuery += ' AND client_id = ?';
    checkParams.push(req.user.id);
  }

  db.get(checkQuery, checkParams, (err, review) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar avaliação' });
    }

    if (!review) {
      return res.status(404).json({ error: 'Avaliação não encontrada' });
    }

    const updates = [];
    const params = [];

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating deve ser entre 1 e 5' });
      }
      updates.push('rating = ?');
      params.push(rating);
    }

    if (comment !== undefined) {
      updates.push('comment = ?');
      params.push(comment);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.run(
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`,
      params,
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao atualizar avaliação' });
        }

        db.get('SELECT * FROM reviews WHERE id = ?', [id], (err, updated) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao buscar avaliação atualizada' });
          }
          res.json(updated);
        });
      }
    );
  });
};

// Responder avaliação (admin)
const respondReview = (req, res) => {
  const { id } = req.params;
  const { response } = req.body;

  if (!response) {
    return res.status(400).json({ error: 'Resposta é obrigatória' });
  }

  db.run(
    `UPDATE reviews
     SET response = ?,
         response_date = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [response, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao responder avaliação' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Avaliação não encontrada' });
      }

      db.get('SELECT * FROM reviews WHERE id = ?', [id], (err, review) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar avaliação' });
        }
        res.json(review);
      });
    }
  );
};

// Deletar/desativar avaliação (admin)
const deleteReview = (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE reviews SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao desativar avaliação' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Avaliação não encontrada' });
      }

      res.json({ message: 'Avaliação desativada com sucesso' });
    }
  );
};

// Estatísticas de avaliações
const getReviewStats = (req, res) => {
  const { service_id, professional_id } = req.query;

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
    WHERE active = 1
  `;

  const params = [];

  if (service_id) {
    query += ' AND service_id = ?';
    params.push(service_id);
  }

  if (professional_id) {
    query += ' AND professional_id = ?';
    params.push(professional_id);
  }

  db.get(query, params, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }

    // Arredondar média para 1 casa decimal
    if (stats.average_rating) {
      stats.average_rating = Math.round(stats.average_rating * 10) / 10;
    }

    res.json(stats);
  });
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
