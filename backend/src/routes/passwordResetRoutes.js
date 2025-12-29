const express = require('express');
const router = express.Router();
const passwordResetController = require('../controllers/passwordResetController');
const { validatePasswordReset, validatePasswordResetConfirm } = require('../middleware/validators');
const { passwordResetLimiter } = require('../middleware/rateLimiters');

// Solicitar recuperação de senha - Com rate limiting (3 tentativas/hora)
router.post('/request', passwordResetLimiter, validatePasswordReset, passwordResetController.requestPasswordReset);

// Confirmar recuperação com código - Com rate limiting (3 tentativas/hora)
router.post('/confirm', passwordResetLimiter, validatePasswordResetConfirm, passwordResetController.confirmPasswordReset);

module.exports = router;
