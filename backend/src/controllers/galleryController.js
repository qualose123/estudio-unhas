const db = require('../config/database');
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
    db.run(
      `INSERT INTO gallery
       (title, description, image_url, thumbnail_url, service_id, tags, featured, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        imageUrl,
        thumbnailUrl,
        service_id || null,
        tags || null,
        featured ? 1 : 0,
        uploadedBy
      ],
      function (err) {
        if (err) {
          // Limpar arquivos em caso de erro
          fs.unlinkSync(compressedPath);
          fs.unlinkSync(thumbnailPath);
          return res.status(500).json({ error: 'Erro ao salvar imagem na galeria' });
        }

        db.get('SELECT * FROM gallery WHERE id = ?', [this.lastID], (err, image) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao buscar imagem salva' });
          }
          res.status(201).json(image);
        });
      }
    );
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
const getAllImages = (req, res) => {
  const { service_id, featured, active, limit = 50, offset = 0 } = req.query;
  const isAdmin = req.user?.type === 'admin';

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

  // Não-admins só veem imagens ativas
  if (!isAdmin) {
    conditions.push('g.active = 1');
  }

  if (service_id) {
    conditions.push('g.service_id = ?');
    params.push(service_id);
  }

  if (featured !== undefined) {
    conditions.push('g.featured = ?');
    params.push(featured === 'true' ? 1 : 0);
  }

  if (active !== undefined && isAdmin) {
    conditions.push('g.active = ?');
    params.push(active === 'true' ? 1 : 0);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY g.featured DESC, g.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, images) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar galeria' });
    }
    res.json(images);
  });
};

/**
 * Obter detalhes de uma imagem
 */
const getImageById = (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user?.type === 'admin';

  let query = `
    SELECT
      g.*,
      s.name as service_name,
      a.name as uploaded_by_name
    FROM gallery g
    LEFT JOIN services s ON g.service_id = s.id
    LEFT JOIN admins a ON g.uploaded_by = a.id
    WHERE g.id = ?
  `;

  const params = [id];

  // Não-admins só veem imagens ativas
  if (!isAdmin) {
    query += ' AND g.active = 1';
  }

  db.get(query, params, (err, image) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar imagem' });
    }

    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Incrementar contador de visualizações
    db.run('UPDATE gallery SET views = views + 1 WHERE id = ?', [id]);

    res.json(image);
  });
};

/**
 * Atualizar informações da imagem (admin)
 */
const updateImage = (req, res) => {
  const { id } = req.params;
  const { title, description, service_id, tags, featured, active } = req.body;

  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (service_id !== undefined) {
    updates.push('service_id = ?');
    params.push(service_id);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    params.push(tags);
  }
  if (featured !== undefined) {
    updates.push('featured = ?');
    params.push(featured ? 1 : 0);
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
    `UPDATE gallery SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar imagem' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Imagem não encontrada' });
      }

      db.get('SELECT * FROM gallery WHERE id = ?', [id], (err, image) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar imagem atualizada' });
        }
        res.json(image);
      });
    }
  );
};

/**
 * Deletar imagem (admin)
 */
const deleteImage = (req, res) => {
  const { id } = req.params;

  // Buscar imagem para obter URLs dos arquivos
  db.get('SELECT * FROM gallery WHERE id = ?', [id], (err, image) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar imagem' });
    }

    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // Deletar do banco
    db.run('DELETE FROM gallery WHERE id = ?', [id], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao deletar imagem' });
      }

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
    });
  });
};

/**
 * Incrementar likes (público)
 */
const likeImage = (req, res) => {
  const { id } = req.params;

  db.run(
    'UPDATE gallery SET likes = likes + 1 WHERE id = ? AND active = 1',
    [id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao curtir imagem' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Imagem não encontrada' });
      }

      db.get('SELECT likes FROM gallery WHERE id = ?', [id], (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar likes' });
        }
        res.json({ likes: result.likes });
      });
    }
  );
};

/**
 * Obter estatísticas da galeria (admin)
 */
const getGalleryStats = (req, res) => {
  db.get(
    `SELECT
      COUNT(*) as total_images,
      SUM(views) as total_views,
      SUM(likes) as total_likes,
      COUNT(CASE WHEN featured = 1 THEN 1 END) as featured_images,
      COUNT(CASE WHEN active = 1 THEN 1 END) as active_images
     FROM gallery`,
    [],
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
      }
      res.json(stats);
    }
  );
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
