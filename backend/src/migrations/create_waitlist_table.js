const db = require('../config/database');

/**
 * Migration: Criar tabela de lista de espera
 *
 * Funcionalidades:
 * - Cliente entra na fila quando horário está lotado
 * - Notificação automática quando vaga abre
 * - Prioridade por ordem de chegada (FIFO)
 * - Status: waiting, notified, converted, expired
 */

const createWaitlistTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        preferred_date DATE NOT NULL,
        preferred_time TIME NOT NULL,
        alternative_dates TEXT,
        status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'notified', 'converted', 'expired', 'cancelled')),
        notified_at DATETIME,
        expires_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela waitlist:', err);
        return reject(err);
      }

      // Criar índices para performance
      db.run('CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status)', (err) => {
        if (err) console.error('Erro ao criar índice idx_waitlist_status:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_waitlist_date ON waitlist(preferred_date, preferred_time)', (err) => {
        if (err) console.error('Erro ao criar índice idx_waitlist_date:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_waitlist_client ON waitlist(client_id)', (err) => {
        if (err) console.error('Erro ao criar índice idx_waitlist_client:', err);
      });

      console.log('✅ Tabela de lista de espera criada com sucesso');
      resolve();
    });
  });
};

module.exports = createWaitlistTable;

// Executar se chamado diretamente
if (require.main === module) {
  createWaitlistTable()
    .then(() => {
      console.log('Migration de lista de espera concluída');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na migration:', err);
      process.exit(1);
    });
}
