const db = require('../config/database');

// Migration para adicionar campo user_agent na tabela audit_logs
const addUserAgentToAuditLogs = () => {
  return new Promise((resolve, reject) => {
    // Verificar se a coluna já existe
    db.all("PRAGMA table_info(audit_logs)", (err, columns) => {
      if (err) {
        return reject(err);
      }

      const hasUserAgent = columns.some(col => col.name === 'user_agent');

      if (hasUserAgent) {
        console.log('✅ Coluna user_agent já existe na tabela audit_logs');
        return resolve();
      }

      // Adicionar coluna user_agent
      db.run(
        `ALTER TABLE audit_logs ADD COLUMN user_agent TEXT`,
        (err) => {
          if (err) {
            console.error('❌ Erro ao adicionar coluna user_agent:', err);
            return reject(err);
          }
          console.log('✅ Coluna user_agent adicionada à tabela audit_logs');
          resolve();
        }
      );
    });
  });
};

module.exports = addUserAgentToAuditLogs;

// Executar se chamado diretamente
if (require.main === module) {
  addUserAgentToAuditLogs()
    .then(() => {
      console.log('Migration concluída com sucesso');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na migration:', err);
      process.exit(1);
    });
}
