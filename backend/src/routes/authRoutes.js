const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { validateLogin, validateRegister } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');

// Login Admin - Com rate limiting específico (5 tentativas/15min por IP+email)
router.post('/admin/login', loginLimiter, validateLogin, auditLog('admin_login'), authController.adminLogin);

// Login Cliente - Com rate limiting específico (5 tentativas/15min por IP+email)
router.post('/client/login', loginLimiter, validateLogin, auditLog('client_login'), authController.clientLogin);

// Registro de Cliente - Com rate limiting (3 cadastros/24h por IP)
router.post('/client/register', registerLimiter, validateRegister, auditLog('client_register'), authController.clientRegister);

// Verificar token
router.get('/verify', verifyToken, authController.verifyTokenEndpoint);

// Alterar senha (requer autenticação)
router.post('/change-password', verifyToken, authController.changePassword);

// Google OAuth Routes
router.get('/google', (req, res, next) => {
  const prompt = req.query.prompt || 'consent';
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: prompt // 'select_account' força seleção de conta, 'consent' usa conta logada
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Gerar token JWT para o usuário
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email, type: 'client' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Redirecionar para frontend com token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/google/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      type: 'client'
    }))}`);
  }
);

module.exports = router;
