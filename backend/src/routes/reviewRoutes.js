const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken, verifyAdmin, verifyClient, optionalAuth } = require('../middleware/auth');
const { validateId } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');

// Criar avaliação (cliente após serviço concluído)
router.post('/', verifyToken, verifyClient, auditLog('create_review', 'review'), reviewController.createReview);

// Listar avaliações (público)
router.get('/', optionalAuth, reviewController.getAllReviews);

// Estatísticas de avaliações (público)
router.get('/stats', optionalAuth, reviewController.getReviewStats);

// Obter avaliação específica (público)
router.get('/:id', optionalAuth, validateId, reviewController.getReviewById);

// Atualizar avaliação (cliente pode editar própria)
router.put('/:id', verifyToken, validateId, auditLog('update_review', 'review'), reviewController.updateReview);

// Responder avaliação (admin)
router.post('/:id/respond', verifyToken, verifyAdmin, validateId, auditLog('respond_review', 'review'), reviewController.respondReview);

// Desativar avaliação (admin)
router.delete('/:id', verifyToken, verifyAdmin, validateId, auditLog('delete_review', 'review'), reviewController.deleteReview);

module.exports = router;
