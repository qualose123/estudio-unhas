const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Rate limiter para login - máximo 5 tentativas por 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  message: {
    error: 'Muitas tentativas de login. Por favor, tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Identificar por IP + email (se fornecido)
  keyGenerator: (req) => {
    return req.body.email ? `${req.ip}-${req.body.email}` : req.ip;
  },
  // Não contar requisições bem-sucedidas
  skipSuccessfulRequests: true
});

// Rate limiter para recuperação de senha - máximo 3 tentativas por hora
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 tentativas
  message: {
    error: 'Muitas solicitações de recuperação de senha. Por favor, tente novamente em 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.email ? `${req.ip}-${req.body.email}` : req.ip;
  }
});

// Rate limiter para registro - máximo 3 cadastros por dia por IP
const registerLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 horas
  max: 3, // 3 cadastros
  message: {
    error: 'Muitos cadastros realizados. Por favor, tente novamente amanhã.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para criação de agendamentos - máximo 10 por hora
const appointmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 agendamentos
  message: {
    error: 'Muitas tentativas de agendamento. Por favor, aguarde alguns minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Por usuário autenticado ou IP
  keyGenerator: (req) => {
    return req.user ? `user-${req.user.id}` : req.ip;
  }
});

// Slow down para API em geral - desacelera após muitas requisições
const apiSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // Começa a desacelerar após 50 requisições
  delayMs: 500, // Adiciona 500ms de delay por requisição adicional
  maxDelayMs: 5000 // Máximo 5 segundos de delay
});

module.exports = {
  loginLimiter,
  passwordResetLimiter,
  registerLimiter,
  appointmentLimiter,
  apiSlowDown
};
