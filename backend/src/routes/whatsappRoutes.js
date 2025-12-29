const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * Rotas de integração com WhatsApp
 * Todas as rotas são restritas ao admin
 */

// Verificar status da integração
router.get('/status', authenticateToken, requireAdmin, whatsappController.getWhatsAppStatus);

// Enviar mensagem de teste
router.post('/test', authenticateToken, requireAdmin, whatsappController.sendTestMessage);

module.exports = router;
