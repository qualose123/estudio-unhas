const db = require('../config/database');

/**
 * Migration: Adicionar coluna reminder_sent à tabela appointments
 */

const addReminderSentColumn = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER DEFAULT 0 CHECK(reminder_sent IN (0, 1))
    `, (err) => {
      if (err && !err.message.includes('duplicate column')) {
        console.error('❌ Erro ao adicionar coluna reminder_sent:', err);
        return reject(err);
      }

      console.log('✅ Coluna reminder_sent adicionada com sucesso');
      resolve();
    });
  });
};

module.exports = addReminderSentColumn;

if (require.main === module) {
  addReminderSentColumn()
    .then(() => {
      console.log('Migration reminder_sent concluída');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na migration:', err);
      process.exit(1);
    });
}
