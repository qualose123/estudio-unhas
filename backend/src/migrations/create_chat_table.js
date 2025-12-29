const db = require('../config/database');

/**
 * Migration: Criar tabela de chat ao vivo
 */

const createChatTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        admin_id INTEGER,
        message TEXT NOT NULL,
        sender_type TEXT NOT NULL CHECK(sender_type IN ('client', 'admin')),
        is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela chat_messages:', err);
        return reject(err);
      }

      console.log('✅ Tabela chat_messages criada com sucesso');
      resolve();
    });
  });
};

module.exports = createChatTable;

if (require.main === module) {
  createChatTable()
    .then(() => {
      console.log('Migration chat_messages concluída');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na migration:', err);
      process.exit(1);
    });
}
