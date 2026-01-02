const db = require('../config/database');
const { usePG } = require('../config/database');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Gallery Controller - Alinhado com schema:
 * gallery (id, image_url, description, category, likes_count, views_count, featured, active, created_at, updated_at)
 */

// Upload de imagem (admin)
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    const { description, category, featured } = req.body;

    // Comprimir imagem
    const originalPath = req.file.path;
    const compressedPath = originalPath.replace(path.extname(originalPath), '-compressed.jpg');

    await sharp(originalPath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(compressedPath);

    fs.unlinkSync(originalPath);

    const imageUrl = `/uploads/gallery/${path.basename(compressedPath)}`;

    const query = usePG
      ? `INSERT INTO gallery (image_url, description, category, featured)
         VALUES ($1, $2, $3, $4) RETURNING id`
      : `INSERT INTO gallery (image_url, description, category, featured)
         VALUES (?, ?, ?, ?)`;

    const result = await db.run(query, [
      imageUrl,
      description || null,
      category || null,
      featured ? (usePG ? true : 1) : (usePG ? false : 0)
    ]);

    const imageId = usePG ? result.lastID : result.lastID;

    const selectQuery = usePG
      ? 'SELECT * FROM gallery WHERE id = $1'
      : 'SELECT * FROM gallery WHERE id = ?';

    const image = await db.get(selectQuery, [imageId]);
    res.status(201).json(image);
  } catch (err) {
    console.error('Erro ao fazer upload:', err);
    res.status(500).json({ error: 'Erro ao processar imagem' });
  }
};

// Listar todas as imagens
const getAllImages = async (req, res) => {
  try {
    const { featured, active, category } = req.query;

    let query = 'SELECT * FROM gallery WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (featured !== undefined) {
      query += usePG ? ` AND featured = $${paramIndex++}` : ' AND featured = ?';
      params.push(featured === 'true' ? (usePG ? true : 1) : (usePG ? false : 0));
    }

    if (active !== undefined) {
      query += usePG ? ` AND active = $${paramIndex++}` : ' AND active = ?';
      params.push(active === 'true' ? (usePG ? true : 1) : (usePG ? false : 0));
    }

    if (category) {
      query += usePG ? ` AND category = $${paramIndex++}` : ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const images = await db.all(query, params);
    res.json(images);
  } catch (err) {
    console.error('Erro ao buscar galeria:', err);
    res.status(500).json({ error: 'Erro ao carregar galeria' });
  }
};

// Buscar imagem por ID
const getImageById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = usePG
      ? 'SELECT * FROM gallery WHERE id = $1'
      : 'SELECT * FROM gallery WHERE id = ?';

    const image = await db.get(query, [id]);

    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Incrementar views
    const updateQuery = usePG
      ? 'UPDATE gallery SET views_count = views_count + 1 WHERE id = $1'
      : 'UPDATE gallery SET views_count = views_count + 1 WHERE id = ?';

    await db.run(updateQuery, [id]);

    image.views_count = (image.views_count || 0) + 1;
    res.json(image);
  } catch (err) {
    console.error('Erro ao buscar imagem:', err);
    res.status(500).json({ error: 'Erro ao buscar imagem' });
  }
};

// Atualizar imagem (admin)
const updateImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, category, featured, active } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (description !== undefined) {
      updates.push(usePG ? `description = $${paramIndex++}` : 'description = ?');
      params.push(description);
    }
    if (category !== undefined) {
      updates.push(usePG ? `category = $${paramIndex++}` : 'category = ?');
      params.push(category);
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

    updates.push(usePG ? 'updated_at = CURRENT_TIMESTAMP' : 'updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = usePG
      ? `UPDATE gallery SET ${updates.join(', ')} WHERE id = $${paramIndex}`
      : `UPDATE gallery SET ${updates.join(', ')} WHERE id = ?`;

    const result = await db.run(query, params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    const selectQuery = usePG
      ? 'SELECT * FROM gallery WHERE id = $1'
      : 'SELECT * FROM gallery WHERE id = ?';

    const image = await db.get(selectQuery, [id]);
    res.json(image);
  } catch (err) {
    console.error('Erro ao atualizar imagem:', err);
    res.status(500).json({ error: 'Erro ao atualizar imagem' });
  }
};

// Deletar imagem (admin)
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar imagem para deletar arquivo
    const selectQuery = usePG
      ? 'SELECT * FROM gallery WHERE id = $1'
      : 'SELECT * FROM gallery WHERE id = ?';

    const image = await db.get(selectQuery, [id]);

    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Deletar arquivo
    const imagePath = path.join(__dirname, '../..', image.image_url);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Deletar do banco
    const deleteQuery = usePG
      ? 'DELETE FROM gallery WHERE id = $1'
      : 'DELETE FROM gallery WHERE id = ?';

    await db.run(deleteQuery, [id]);

    res.json({ message: 'Imagem deletada com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar imagem:', err);
    res.status(500).json({ error: 'Erro ao deletar imagem' });
  }
};

// Dar like em imagem
const likeImage = async (req, res) => {
  try {
    const { id } = req.params;

    const query = usePG
      ? 'UPDATE gallery SET likes_count = likes_count + 1 WHERE id = $1 RETURNING *'
      : 'UPDATE gallery SET likes_count = likes_count + 1 WHERE id = ?';

    if (usePG) {
      const result = await db.pool.query(query, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Imagem não encontrada' });
      }
      res.json(result.rows[0]);
    } else {
      await db.run(query, [id]);
      const image = await db.get('SELECT * FROM gallery WHERE id = ?', [id]);
      res.json(image);
    }
  } catch (err) {
    console.error('Erro ao dar like:', err);
    res.status(500).json({ error: 'Erro ao processar like' });
  }
};

// Estatísticas da galeria
const getGalleryStats = async (req, res) => {
  try {
    const statsQuery = usePG
      ? `SELECT
          COUNT(*) as total_images,
          COUNT(CASE WHEN featured = true THEN 1 END) as featured_images,
          COUNT(CASE WHEN active = true THEN 1 END) as active_images,
          SUM(likes_count) as total_likes,
          SUM(views_count) as total_views
         FROM gallery`
      : `SELECT
          COUNT(*) as total_images,
          COUNT(CASE WHEN featured = 1 THEN 1 END) as featured_images,
          COUNT(CASE WHEN active = 1 THEN 1 END) as active_images,
          SUM(likes_count) as total_likes,
          SUM(views_count) as total_views
         FROM gallery`;

    const stats = await db.get(statsQuery, []);
    res.json(stats);
  } catch (err) {
    console.error('Erro ao buscar estatísticas:', err);
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
