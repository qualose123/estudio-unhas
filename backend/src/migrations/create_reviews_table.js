const db = require('../config/database');

/**
 * Migration: Criar tabela de avaliações
 *
 * Funcionalidades:
 * - Cliente avalia serviço após agendamento concluído
 * - Sistema de estrelas (1-5)
 * - Comentários opcionais
 * - Exibição pública de avaliações
 */

const createReviewsTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id INTEGER UNIQUE NOT NULL,
        client_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        professional_id INTEGER,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        response TEXT,
        response_date DATETIME,
        active INTEGER DEFAULT 1 CHECK(active IN (0, 1)),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id),
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (service_id) REFERENCES services(id),
        FOREIGN KEY (professional_id) REFERENCES professionals(id)
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela reviews:', err);
        return reject(err);
      }

      // Criar índices
      db.run('CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id)', (err) => {
        if (err) console.error('Erro ao criar índice idx_reviews_service:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_reviews_professional ON reviews(professional_id)', (err) => {
        if (err) console.error('Erro ao criar índice idx_reviews_professional:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_reviews_client ON reviews(client_id)', (err) => {
        if (err) console.error('Erro ao criar índice idx_reviews_client:', err);
      });

      db.run('CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating)', (err) => {
        if (err) console.error('Erro ao criar índice idx_reviews_rating:', err);
      });

      console.log('✅ Tabela de avaliações criada com sucesso');
      resolve();
    });
  });
};

module.exports = createReviewsTable;

if (require.main === module) {
  createReviewsTable()
    .then(() => {
      console.log('Migration de avaliações concluída');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na migration:', err);
      process.exit(1);
    });
}
