const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');
const { validatePasswordReset, validatePasswordResetConfirm } = require('../middleware/validators');

// Solicitar recuperação de senha
router.post('/request', validatePasswordReset, passwordResetController.requestPasswordReset);

// Confirmar recuperação com código
router.post('/confirm', validatePasswordResetConfirm, passwordResetController.confirmPasswordReset);

module.exports = router;
