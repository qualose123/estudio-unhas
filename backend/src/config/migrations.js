const db = require('./database');
const { usePG } = require('./database');

/**
 * Migrations para corrigir tabelas existentes no PostgreSQL
 */

const runMigrations = async () => {
  if (!usePG) {
    console.log('⏭️  Migrations só rodam no PostgreSQL (produção)');
    return;
  }

  console.log('🔄 Rodando migrations...');

  try {
    // Migration 1: Adicionar coluna description na tabela coupons
    await db.pool.query(`
      ALTER TABLE coupons
      ADD COLUMN IF NOT EXISTS description TEXT
    `);
    console.log('✅ Migration 1: Coluna description adicionada em coupons');

    // Migration 2: Adicionar coluna expires_at na tabela coupons (se não existir)
    await db.pool.query(`
      ALTER TABLE coupons
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP
    `);
    console.log('✅ Migration 2: Coluna expires_at adicionada em coupons');

    // Migration 3: Garantir que professionals.email seja UNIQUE
    // Primeiro, remover constraint antiga se existir
    await db.pool.query(`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professionals_email_key') THEN
          ALTER TABLE professionals DROP CONSTRAINT professionals_email_key;
        END IF;
      END $$;
    `);
    
    // Agora adicionar a constraint correta
    await db.pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'professionals_email_key') THEN
          ALTER TABLE professionals ADD CONSTRAINT professionals_email_key UNIQUE (email);
        END IF;
      END $$;
    `);
    console.log('✅ Migration 3: Constraint UNIQUE em professionals.email garantida');

    // Migration 4: Adicionar índices para melhorar performance
    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery(category);
      CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
      CREATE INDEX IF NOT EXISTS idx_commissions_professional_id ON commissions(professional_id);
      CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
    `);
    console.log('✅ Migration 4: Índices criados para melhor performance');

    console.log('✅ Todas as migrations executadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao rodar migrations:', error);
    // Não lançar erro para não quebrar a inicialização
  }
};

module.exports = { runMigrations };
