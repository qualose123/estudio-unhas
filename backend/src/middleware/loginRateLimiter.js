const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter Específico para Login
 *
 * Proteção contra ataques de força bruta em endpoints de autenticação
 * Configuração mais restritiva que o rate limit global
 *
 * Configuração:
 * - Máximo 5 tentativas de login por IP
 * - Janela de 15 minutos (900000ms)
 * - Bloqueio temporário após exceder limite
 * - Headers padronizados (draft-6 RFC)
 *
 * Headers de Resposta:
 * - RateLimit-Limit: Número máximo de requisições permitidas
 * - RateLimit-Remaining: Número de requisições restantes
 * - RateLimit-Reset: Timestamp quando o limite será resetado
 * - Retry-After: Segundos até poder tentar novamente (quando bloqueado)
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos em milissegundos
  max: 5, // Máximo de 5 tentativas por janela

  // Mensagem customizada quando limite é excedido
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: '15 minutos'
  },

  // Usar headers padronizados (RateLimit-*)
  standardHeaders: true, // Retorna info de rate limit nos headers `RateLimit-*`
  legacyHeaders: false,  // Desabilita headers antigos `X-RateLimit-*`

  // Identificar usuário por IP
  keyGenerator: (req) => {
    // Prioriza IP real (considerando proxies/load balancers)
    return req.ip || req.connection.remoteAddress;
  },

  // Handler customizado quando limite é excedido
  handler: (req, res) => {
    const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000); // Segundos
    const remainingMinutes = Math.ceil((req.rateLimit.resetTime - Date.now()) / 60000);

    console.warn(`[SECURITY] Rate limit excedido - IP: ${req.ip}, Path: ${req.path}`);

    res.status(429).json({
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
      retryAfter: `${remainingMinutes} minuto(s)`,
      resetTime: new Date(req.rateLimit.resetTime).toISOString()
    });
  },

  // Pular rate limit para IPs confiáveis (opcional - descomentado em produção se necessário)
  // skip: (req) => {
  //   const trustedIPs = ['127.0.0.1', '::1']; // localhost
  //   return trustedIPs.includes(req.ip);
  // },

  // Store em memória (para produção, considere usar Redis)
  // Por padrão usa MemoryStore que é resetado ao reiniciar o servidor
});

module.exports = loginRateLimiter;
