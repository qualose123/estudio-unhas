const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { verifyToken, verifyAdmin, optionalAuth } = require('../middleware/auth');
const { validateId } = require('../middleware/validators');
const upload = require('../middleware/upload');
const auditLog = require('../middleware/auditLog');

// Upload de imagem (admin apenas)
router.post(
  '/',
  verifyToken,
  verifyAdmin,
  upload.single('image'),
  auditLog('upload_gallery_image', 'gallery'),
  galleryController.uploadImage
);

// Listar imagens (público, mas com filtros para admin)
router.get('/', optionalAuth, galleryController.getAllImages);

// Estatísticas da galeria (admin apenas)
router.get('/stats', verifyToken, verifyAdmin, galleryController.getGalleryStats);

// Obter imagem específica (público)
router.get('/:id', optionalAuth, validateId, galleryController.getImageById);

// Curtir imagem (público)
router.post('/:id/like', validateId, galleryController.likeImage);

// Atualizar imagem (admin apenas)
router.put(
  '/:id',
  verifyToken,
  verifyAdmin,
  validateId,
  auditLog('update_gallery_image', 'gallery'),
  galleryController.updateImage
);

// Deletar imagem (admin apenas)
router.delete(
  '/:id',
  verifyToken,
  verifyAdmin,
  validateId,
  auditLog('delete_gallery_image', 'gallery'),
  galleryController.deleteImage
);

module.exports = router;
