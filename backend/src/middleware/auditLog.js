const db = require('../config/database');

// Middleware para registrar logs de auditoria
const auditLog = (action, entityType = null) => {
  return (req, res, next) => {
    // Salvar a função original res.json
    const originalJson = res.json.bind(res);

    // Sobrescrever res.json para capturar a resposta
    res.json = function (data) {
      // Determinar se foi sucesso ou falha
      const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
      const isAuthAction = action.includes('login') || action.includes('register') || action.includes('password');

      // Registrar sucessos OU falhas em ações de autenticação/segurança
      if (isSuccess || isAuthAction) {
        const sanitizedBody = { ...req.body };
        // Remover senhas dos logs
        if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
        if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[REDACTED]';
        if (sanitizedBody.currentPassword) sanitizedBody.currentPassword = '[REDACTED]';

        const logData = {
          user_type: req.user?.type || 'anonymous',
          user_id: req.user?.id || 0,
          action: isSuccess ? action : `${action}_failed`,
          entity_type: entityType,
          entity_id: data?.id || req.params?.id || null,
          details: JSON.stringify({
            method: req.method,
            path: req.path,
            body: sanitizedBody,
            params: req.params,
            status: res.statusCode,
            error: !isSuccess && data?.error ? data.error : null
          }),
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.headers['user-agent'] || null
        };

        db.run(
          `INSERT INTO audit_logs (user_type, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            logData.user_type,
            logData.user_id,
            logData.action,
            logData.entity_type,
            logData.entity_id,
            logData.details,
            logData.ip_address,
            logData.user_agent
          ],
          (err) => {
            if (err) {
              console.error('Erro ao registrar log de auditoria:', err);
            }
          }
        );
      }

      // Chamar o json original
      return originalJson(data);
    };

    next();
  };
};

// Função auxiliar para registrar eventos de segurança críticos
const logSecurityEvent = (eventType, details, req) => {
  const logData = {
    user_type: req.user?.type || 'anonymous',
    user_id: req.user?.id || 0,
    action: `security_${eventType}`,
    entity_type: 'security',
    entity_id: null,
    details: JSON.stringify({
      ...details,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent'] || null,
      timestamp: new Date().toISOString()
    }),
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.headers['user-agent'] || null
  };

  db.run(
    `INSERT INTO audit_logs (user_type, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      logData.user_type,
      logData.user_id,
      logData.action,
      logData.entity_type,
      logData.entity_id,
      logData.details,
      logData.ip_address,
      logData.user_agent
    ],
    (err) => {
      if (err) {
        console.error('Erro ao registrar evento de segurança:', err);
      }
    }
  );
};

module.exports = auditLog;
module.exports.logSecurityEvent = logSecurityEvent;
