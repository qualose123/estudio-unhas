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

    // Migration 5: Adicionar colunas faltantes na tabela reviews
    try {
      await db.pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id) ON DELETE CASCADE`);
      await db.pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS professional_id INTEGER REFERENCES professionals(id) ON DELETE SET NULL`);
      await db.pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response TEXT`);
      await db.pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response_date TIMESTAMP`);
      await db.pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`);
      console.log('✅ Migration 5: Colunas faltantes adicionadas em reviews');
    } catch (err) {
      console.log('⚠️  Migration 5: Erro:', err.message);
    }

    // Migration 6: Adicionar constraint UNIQUE em appointment_id na tabela reviews
    await db.pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_appointment_id_key') THEN
          ALTER TABLE reviews ADD CONSTRAINT reviews_appointment_id_key UNIQUE (appointment_id);
        END IF;
      END $$;
    `);
    console.log('✅ Migration 6: Constraint UNIQUE em reviews.appointment_id garantida');

    // Migration 7: Remover coluna 'approved' se existir (substituída por 'active')
    await db.pool.query(`
      ALTER TABLE reviews
      DROP COLUMN IF EXISTS approved
    `);
    console.log('✅ Migration 7: Coluna obsoleta "approved" removida de reviews');

    // Migration 8: Adicionar índices para a tabela reviews
    await db.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON reviews(service_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_professional_id ON reviews(professional_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_active ON reviews(active);
      CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
      CREATE INDEX IF NOT EXISTS idx_reviews_appointment_id ON reviews(appointment_id);
    `);
    console.log('✅ Migration 8: Índices criados para reviews');

    // Migration 9: Adicionar colunas faltantes na tabela waitlist
    try {
      await db.pool.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS alternative_dates TEXT`);
      await db.pool.query(`ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS notes TEXT`);
      console.log('✅ Migration 9: Colunas faltantes adicionadas em waitlist');
    } catch (err) {
      console.log('⚠️  Migration 9: Erro:', err.message);
    }

    // Migration 10: Renomear colunas e adicionar novas na tabela recurring_appointments
    try {
      // Adicionar coluna notes se não existir
      await db.pool.query(`ALTER TABLE recurring_appointments ADD COLUMN IF NOT EXISTS notes TEXT`);

      // Renomear colunas para coincidir com o código (ignorar erros se coluna já foi renomeada)
      try {
        await db.pool.query(`ALTER TABLE recurring_appointments RENAME COLUMN recurrence_type TO frequency`);
      } catch (e) {
        if (!e.message.includes('does not exist')) throw e;
      }
      try {
        await db.pool.query(`ALTER TABLE recurring_appointments RENAME COLUMN preferred_day_of_week TO day_of_week`);
      } catch (e) {
        if (!e.message.includes('does not exist')) throw e;
      }
      try {
        await db.pool.query(`ALTER TABLE recurring_appointments RENAME COLUMN preferred_time TO appointment_time`);
      } catch (e) {
        if (!e.message.includes('does not exist')) throw e;
      }

      console.log('✅ Migration 10: Tabela recurring_appointments atualizada');
    } catch (err) {
      console.log('⚠️  Migration 10: Erro ao atualizar recurring_appointments:', err.message);
    }

    console.log('✅ Todas as migrations executadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao rodar migrations:', error);
    // Não lançar erro para não quebrar a inicialização
  }
};

module.exports = { runMigrations };
