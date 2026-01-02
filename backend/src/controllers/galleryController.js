const { usePG } = require('../config/database');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Upload de imagem para a galeria (admin)
 */
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    const { title, description, service_id, tags, featured } = req.body;
    const uploadedBy = req.user.id;

    // Validação
    if (!title) {
      // Remover arquivo se validação falhar
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    // Comprimir imagem original
    const originalPath = req.file.path;
    const compressedPath = originalPath.replace(path.extname(originalPath), '-compressed.jpg');

    await sharp(originalPath)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toFile(compressedPath);

    // Criar thumbnail
    const thumbnailPath = originalPath.replace(path.extname(originalPath), '-thumb.jpg');

    await sharp(originalPath)
      .resize(400, 400, {
        fit: 'cover'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Remover arquivo original não comprimido
    fs.unlinkSync(originalPath);

    // Gerar URLs relativas
    const imageUrl = `/uploads/gallery/${path.basename(compressedPath)}`;
    const thumbnailUrl = `/uploads/gallery/${path.basename(thumbnailPath)}`;

    // Salvar no banco
    const insertQuery = usePG
      ? `INSERT INTO gallery
         (title, description, image_url, thumbnail_url, service_id, tags, featured, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`
      : `INSERT INTO gallery
         (title, description, image_url, thumbnail_url, service_id, tags, featured, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    const imageId = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(
        insertQuery,
        [
          title,
          description || null,
          imageUrl,
          thumbnailUrl,
          service_id || null,
          tags || null,
          featured ? (usePG ? true : 1) : (usePG ? false : 0),
          uploadedBy
        ],
        function (err) {
          if (err) {
            // Limpar arquivos em caso de erro
            if (fs.existsSync(compressedPath)) fs.unlinkSync(compressedPath);
            if (fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
            reject(err);
          } else {
            if (usePG) {
              // For PostgreSQL, get ID from RETURNING clause
              db.get('SELECT id FROM gallery WHERE image_url = $1', [imageUrl], (err, row) => {
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
      ? 'SELECT * FROM gallery WHERE id = $1'
      : 'SELECT * FROM gallery WHERE id = ?';

    const image = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [imageId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(image);
  } catch (error) {
    console.error('Erro ao processar imagem:', error);

    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Erro ao processar imagem' });
  }
};

/**
 * Listar imagens da galeria
 */
const getAllImages = async (req, res) => {
  const { service_id, featured, active, limit = 50, offset = 0 } = req.query;
  const isAdmin = req.user?.type === 'admin';

  try {
    let query = `
      SELECT
        g.*,
        s.name as service_name,
        a.name as uploaded_by_name
      FROM gallery g
      LEFT JOIN services s ON g.service_id = s.id
      LEFT JOIN admins a ON g.uploaded_by = a.id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Não-admins só veem imagens ativas
    if (!isAdmin) {
      conditions.push(usePG ? `g.active = $${paramIndex++}` : 'g.active = ?');
      params.push(usePG ? true : 1);
    }

    if (service_id) {
      conditions.push(usePG ? `g.service_id = $${paramIndex++}` : 'g.service_id = ?');
      params.push(service_id);
    }

    if (featured !== undefined) {
      conditions.push(usePG ? `g.featured = $${paramIndex++}` : 'g.featured = ?');
      params.push(featured === 'true' ? (usePG ? true : 1) : (usePG ? false : 0));
    }

    if (active !== undefined && isAdmin) {
      conditions.push(usePG ? `g.active = $${paramIndex++}` : 'g.active = ?');
      params.push(active === 'true' ? (usePG ? true : 1) : (usePG ? false : 0));
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += usePG
      ? ` ORDER BY g.featured DESC, g.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
      : ' ORDER BY g.featured DESC, g.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const images = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(images);
  } catch (error) {
    console.error('Erro ao buscar galeria:', error);
    res.status(500).json({ error: 'Erro ao buscar galeria' });
  }
};

/**
 * Obter detalhes de uma imagem
 */
const getImageById = async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user?.type === 'admin';

  try {
    let query = `
      SELECT
        g.*,
        s.name as service_name,
        a.name as uploaded_by_name
      FROM gallery g
      LEFT JOIN services s ON g.service_id = s.id
      LEFT JOIN admins a ON g.uploaded_by = a.id
      WHERE g.id = ${usePG ? '$1' : '?'}
    `;

    const params = [id];

    // Não-admins só veem imagens ativas
    if (!isAdmin) {
      query += usePG ? ' AND g.active = $2' : ' AND g.active = ?';
      params.push(usePG ? true : 1);
    }

    const image = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Incrementar contador de visualizações
    const updateQuery = usePG
      ? 'UPDATE gallery SET views = views + 1 WHERE id = $1'
      : 'UPDATE gallery SET views = views + 1 WHERE id = ?';

    await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json(image);
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    res.status(500).json({ error: 'Erro ao buscar imagem' });
  }
};

/**
 * Atualizar informações da imagem (admin)
 */
const updateImage = async (req, res) => {
  const { id } = req.params;
  const { title, description, service_id, tags, featured, active } = req.body;

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(usePG ? `title = $${paramIndex++}` : 'title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push(usePG ? `description = $${paramIndex++}` : 'description = ?');
      params.push(description);
    }
    if (service_id !== undefined) {
      updates.push(usePG ? `service_id = $${paramIndex++}` : 'service_id = ?');
      params.push(service_id);
    }
    if (tags !== undefined) {
      updates.push(usePG ? `tags = $${paramIndex++}` : 'tags = ?');
      params.push(tags);
    }
    if (featured !== undefined) {
      updates.push(usePG ? `featured = $${paramIndex++}` : 'featured = ?');
      params.push(featured ? (usePG ? true : 1) : (usePG ? false : 0));
    }
    if (active !== undefined) {
      updates.push(usePG ? `active = $${paramIndex++}` : 'active = ?');
      params.push(active ? (usePG ? true : 1) : (usePG ? false : 0));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const updateQuery = usePG
      ? `UPDATE gallery SET ${updates.join(', ')} WHERE id = $${paramIndex}`
      : `UPDATE gallery SET ${updates.join(', ')} WHERE id = ?`;

    const changes = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, params, function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    const selectQuery = usePG
      ? 'SELECT * FROM gallery WHERE id = $1'
      : 'SELECT * FROM gallery WHERE id = ?';

    const image = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(image);
  } catch (error) {
    console.error('Erro ao atualizar imagem:', error);
    res.status(500).json({ error: 'Erro ao atualizar imagem' });
  }
};

/**
 * Deletar imagem (admin)
 */
const deleteImage = async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar imagem para obter URLs dos arquivos
    const selectQuery = usePG
      ? 'SELECT * FROM gallery WHERE id = $1'
      : 'SELECT * FROM gallery WHERE id = ?';

    const image = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Deletar do banco
    const deleteQuery = usePG
      ? 'DELETE FROM gallery WHERE id = $1'
      : 'DELETE FROM gallery WHERE id = ?';

    await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(deleteQuery, [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    });

    // Deletar arquivos físicos
    try {
      const uploadsDir = path.join(__dirname, '../../uploads/gallery');
      const imagePath = path.join(uploadsDir, path.basename(image.image_url));
      const thumbPath = path.join(uploadsDir, path.basename(image.thumbnail_url));

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    } catch (fsError) {
      console.error('Erro ao deletar arquivos físicos:', fsError);
    }

    res.json({ message: 'Imagem deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    res.status(500).json({ error: 'Erro ao deletar imagem' });
  }
};

/**
 * Incrementar likes (público)
 */
const likeImage = async (req, res) => {
  const { id } = req.params;

  try {
    const updateQuery = usePG
      ? 'UPDATE gallery SET likes = likes + 1 WHERE id = $1 AND active = $2'
      : 'UPDATE gallery SET likes = likes + 1 WHERE id = ? AND active = ?';

    const changes = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.run(updateQuery, [id, usePG ? true : 1], function (err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    const selectQuery = usePG
      ? 'SELECT likes FROM gallery WHERE id = $1'
      : 'SELECT likes FROM gallery WHERE id = ?';

    const result = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(selectQuery, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({ likes: result.likes });
  } catch (error) {
    console.error('Erro ao curtir imagem:', error);
    res.status(500).json({ error: 'Erro ao curtir imagem' });
  }
};

/**
 * Obter estatísticas da galeria (admin)
 */
const getGalleryStats = async (req, res) => {
  try {
    const query = `SELECT
      COUNT(*) as total_images,
      SUM(views) as total_views,
      SUM(likes) as total_likes,
      COUNT(CASE WHEN featured = ${usePG ? 'true' : '1'} THEN 1 END) as featured_images,
      COUNT(CASE WHEN active = ${usePG ? 'true' : '1'} THEN 1 END) as active_images
     FROM gallery`;

    const stats = await new Promise((resolve, reject) => {
      const db = require('../config/database');
      db.get(query, [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

module.exports = {
  uploadImage,
  getAllImages,
  getImageById,
  updateImage,
  deleteImage,
  likeImage,
  getGalleryStats
};
