const db = require('../config/database');

/**
 * Migration: Criar tabelas de comissões para manicures
 *
 * Funcionalidades:
 * - Cadastro de manicures/profissionais
 * - Rastreamento de comissões por agendamento
 * - Relatórios de comissões por período
 * - Pagamentos registrados
 */

const createCommissionsTable = () => {
  return new Promise((resolve, reject) => {
    // Tabela de manicures/profissionais
    db.run(`
      CREATE TABLE IF NOT EXISTS professionals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT,
        commission_rate REAL DEFAULT 50.0,
        active INTEGER DEFAULT 1 CHECK(active IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela professionals:', err);
        return reject(err);
      }

      // Adicionar coluna professional_id à tabela appointments
      db.run(`
        ALTER TABLE appointments ADD COLUMN professional_id INTEGER REFERENCES professionals(id)
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Aviso ao adicionar coluna professional_id:', err.message);
        }
      });

      // Tabela de comissões
      db.run(`
        CREATE TABLE IF NOT EXISTS commissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          appointment_id INTEGER NOT NULL,
          professional_id INTEGER NOT NULL,
          service_amount REAL NOT NULL,
          commission_rate REAL NOT NULL,
          commission_amount REAL NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'cancelled')),
          paid_at DATETIME,
          payment_method TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (appointment_id) REFERENCES appointments(id),
          FOREIGN KEY (professional_id) REFERENCES professionals(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Erro ao criar tabela commissions:', err);
          return reject(err);
        }

        // Criar índices
        db.run('CREATE INDEX IF NOT EXISTS idx_professionals_active ON professionals(active)', (err) => {
          if (err) console.error('Erro ao criar índice idx_professionals_active:', err);
        });

        db.run('CREATE INDEX IF NOT EXISTS idx_commissions_professional ON commissions(professional_id)', (err) => {
          if (err) console.error('Erro ao criar índice idx_commissions_professional:', err);
        });

        db.run('CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status)', (err) => {
          if (err) console.error('Erro ao criar índice idx_commissions_status:', err);
        });

        console.log('✅ Tabelas de comissões criadas com sucesso');
        resolve();
      });
    });
  });
};

module.exports = createCommissionsTable;

if (require.main === module) {
  createCommissionsTable()
    .then(() => {
      console.log('Migration de comissões concluída');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na migration:', err);
      process.exit(1);
    });
}
