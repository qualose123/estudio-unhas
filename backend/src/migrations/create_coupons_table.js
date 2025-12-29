const db = require('../config/database');

/**
 * Migration: Criar tabela de cupons de desconto
 *
 * Funcionalidades:
 * - Cupons com código único
 * - Desconto percentual ou valor fixo
 * - Data de validade
 * - Limite de uso (total e por usuário)
 * - Valor mínimo de compra
 * - Serviços específicos ou todos
 */

const createCouponsTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        discount_type TEXT NOT NULL CHECK(discount_type IN ('percentage', 'fixed')),
        discount_value REAL NOT NULL CHECK(discount_value > 0),
        min_purchase_value REAL DEFAULT 0,
        max_discount_value REAL,
        valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
        valid_until DATETIME,
        usage_limit INTEGER DEFAULT NULL,
        usage_limit_per_user INTEGER DEFAULT 1,
        times_used INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1 CHECK(active IN (0, 1)),
        applies_to_services TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela coupons:', err);
        return reject(err);
      }

      // Criar tabela de histórico de uso de cupons
      db.run(`
        CREATE TABLE IF NOT EXISTS coupon_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          coupon_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          appointment_id INTEGER,
          discount_applied REAL NOT NULL,
          used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (coupon_id) REFERENCES coupons(id),
          FOREIGN KEY (user_id) REFERENCES clients(id),
          FOREIGN KEY (appointment_id) REFERENCES appointments(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Erro ao criar tabela coupon_usage:', err);
          return reject(err);
        }

        // Criar índices para performance
        db.run('CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code)', (err) => {
          if (err) console.error('Erro ao criar índice idx_coupons_code:', err);
        });

        db.run('CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(active)', (err) => {
          if (err) console.error('Erro ao criar índice idx_coupons_active:', err);
        });

        db.run('CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id)', (err) => {
          if (err) console.error('Erro ao criar índice idx_coupon_usage_user:', err);
        });

        console.log('✅ Tabelas de cupons criadas com sucesso');

        // Inserir cupons de exemplo
        insertSampleCoupons()
          .then(() => resolve())
          .catch((err) => reject(err));
      });
    });
  });
};

// Inserir cupons de exemplo
const insertSampleCoupons = () => {
  return new Promise((resolve) => {
    const sampleCoupons = [
      {
        code: 'PRIMEIRA10',
        description: 'Desconto de 10% para primeira compra',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase_value: 0,
        usage_limit_per_user: 1,
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 ano
      },
      {
        code: 'BEMVINDA',
        description: 'R$ 20 de desconto para novos clientes',
        discount_type: 'fixed',
        discount_value: 20,
        min_purchase_value: 80,
        usage_limit_per_user: 1,
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        code: 'FIDELIDADE',
        description: '15% de desconto para clientes fiéis',
        discount_type: 'percentage',
        discount_value: 15,
        min_purchase_value: 100,
        max_discount_value: 50,
        usage_limit_per_user: 999,
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    let inserted = 0;

    sampleCoupons.forEach((coupon) => {
      db.run(`
        INSERT OR IGNORE INTO coupons
        (code, description, discount_type, discount_value, min_purchase_value, max_discount_value, usage_limit_per_user, valid_until)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        coupon.code,
        coupon.description,
        coupon.discount_type,
        coupon.discount_value,
        coupon.min_purchase_value,
        coupon.max_discount_value || null,
        coupon.usage_limit_per_user,
        coupon.valid_until
      ], (err) => {
        if (!err) {
          console.log(`✅ Cupom de exemplo criado: ${coupon.code}`);
        }
        inserted++;
        if (inserted === sampleCoupons.length) {
          resolve();
        }
      });
    });
  });
};

module.exports = createCouponsTable;

// Executar se chamado diretamente
if (require.main === module) {
  createCouponsTable()
    .then(() => {
      console.log('Migration de cupons concluída');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Erro na migration:', err);
      process.exit(1);
    });
}
