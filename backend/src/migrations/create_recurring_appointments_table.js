const db = require('../config/database');

/**
 * Migration: Criar tabela de agendamentos recorrentes
 *
 * Funcionalidades:
 * - Agendamentos que se repetem automaticamente
 * - Frequências: semanal, quinzenal, mensal
 * - Data de término opcional
 * - Geração automática de próximos agendamentos
 */

const createRecurringAppointmentsTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS recurring_appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly')),
        day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
        appointment_time TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        active INTEGER DEFAULT 1 CHECK(active IN (0, 1)),
        notes TEXT,
        parent_appointment_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (parent_appointment_id) REFERENCES appointments(id)
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela recurring_appointments:', err);
        return reject(err);
      }

      // Adicionar coluna recurring_id à tabela appointments para rastrear origem
      db.run(`
        ALTER TABLE appointments ADD COLUMN recurring_id INTEGER REFERENCES recurring_appointments(id)
      `, (err) => {
        // Ignorar erro se coluna já existir
        if (err && !err.message.includes('duplicate column')) {
          console.error('Aviso ao adicionar coluna recurring_id:', err.message);
        }
      });

      // Criar índices para performance
      db.run('CREATE INDEX IF NOT EXISTS idx_recurring_client ON recurring_appointments(client_id)', (err) => {
        if (err) console.error('Erro ao criar índice idx_recurring_client:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_appointments(active)', (err) => {
        if (err) console.error('Erro ao criar índice idx_recurring_active:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_recurring_start_date ON recurring_appointments(start_date)', (err) => {
        if (err) console.error('Erro ao criar índice idx_recurring_start_date:', err);
      });

      console.log('✅ Tabela de agendamentos recorrentes criada com sucesso');
      resolve();
    });
  });
};

module.exports = createRecurringAppointmentsTable;

// Executar se chamado diretamente
if (require.main === module) {
  createRecurringAppointmentsTable()
    .then(() => {
      console.log('Migration de agendamentos recorrentes concluída');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na migration:', err);
      process.exit(1);
    });
}
