const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * Rotas de Chat ao Vivo
 */

// Obter histórico de mensagens (cliente vê só suas, admin vê todas)
router.get('/history', authenticateToken, chatController.getChatHistory);

// Obter conversas ativas (apenas admin)
router.get('/conversations', authenticateToken, requireAdmin, chatController.getActiveConversations);

// Marcar mensagens como lidas
router.post('/mark-read', authenticateToken, chatController.markMessagesAsRead);

// Deletar histórico de chat (apenas admin)
router.delete('/history/:client_id', authenticateToken, requireAdmin, chatController.deleteChatHistory);

module.exports = router;
