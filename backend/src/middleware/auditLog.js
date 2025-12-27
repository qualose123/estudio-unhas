const db = require('../config/database');

// Middleware para registrar logs de auditoria
const auditLog = (action, entityType = null) => {
  return (req, res, next) => {
    // Salvar a função original res.json
    const originalJson = res.json.bind(res);

    // Sobrescrever res.json para capturar a resposta
    res.json = function (data) {
      // Registrar log apenas se a operação foi bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logData = {
          user_type: req.user?.type || 'anonymous',
          user_id: req.user?.id || 0,
          action: action,
          entity_type: entityType,
          entity_id: data?.id || req.params?.id || null,
          details: JSON.stringify({
            method: req.method,
            path: req.path,
            body: req.body,
            params: req.params
          }),
          ip_address: req.ip || req.connection.remoteAddress
        };

        db.run(
          `INSERT INTO audit_logs (user_type, user_id, action, entity_type, entity_id, details, ip_address)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            logData.user_type,
            logData.user_id,
            logData.action,
            logData.entity_type,
            logData.entity_id,
            logData.details,
            logData.ip_address
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

module.exports = auditLog;
