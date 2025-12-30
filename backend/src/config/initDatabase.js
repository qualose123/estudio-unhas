const db = require('./database');
const { usePG } = require('./database');
const bcrypt = require('bcryptjs');

/**
 * Inicialização do Banco de Dados
 *
 * Cria todas as tabelas necessárias e insere dados iniciais
 * Compatível com SQLite (desenvolvimento) e PostgreSQL (produção)
 */

const initDatabase = async () => {
  try {
    console.log('🔄 Inicializando banco de dados...');

    if (usePG) {
      await initPostgreSQL();
    } else {
      await initSQLite();
    }

    console.log('✅ Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  }
};

/**
 * Inicializar PostgreSQL (Produção)
 */
const initPostgreSQL = async () => {
  console.log('🐘 Inicializando PostgreSQL...');

  // Criar extensão para UUID (se disponível)
  try {
    await db.pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  } catch (err) {
    console.log('⚠️  Extensão UUID não disponível (opcional)');
  }

  // Tabela de admins
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de clientes
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      google_id VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de serviços
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      duration INTEGER NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de agendamentos
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      appointment_date DATE NOT NULL,
      appointment_time VARCHAR(10) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      reminder_sent BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de bloqueio de horários
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS time_blocks (
      id SERIAL PRIMARY KEY,
      block_date DATE NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      reason TEXT,
      created_by INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de logs de auditoria
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_type VARCHAR(50) NOT NULL,
      user_id INTEGER NOT NULL,
      action VARCHAR(255) NOT NULL,
      entity_type VARCHAR(100),
      entity_id INTEGER,
      details TEXT,
      ip_address VARCHAR(50),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de códigos de recuperação de senha
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id SERIAL PRIMARY KEY,
      user_type VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de sessões OAuth
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_sessions (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de cupons
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) UNIQUE NOT NULL,
      discount_type VARCHAR(20) NOT NULL,
      discount_value DECIMAL(10,2) NOT NULL,
      min_value DECIMAL(10,2) DEFAULT 0,
      max_uses INTEGER,
      used_count INTEGER DEFAULT 0,
      valid_from TIMESTAMP,
      valid_until TIMESTAMP,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de lista de espera
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      preferred_date DATE,
      preferred_time VARCHAR(10),
      status VARCHAR(50) DEFAULT 'waiting',
      notified_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de agendamentos recorrentes
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS recurring_appointments (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      recurrence_type VARCHAR(20) NOT NULL,
      preferred_day_of_week INTEGER,
      preferred_time VARCHAR(10) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      last_generated_date DATE,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de galeria
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS gallery (
      id SERIAL PRIMARY KEY,
      image_url VARCHAR(500) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      likes_count INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      featured BOOLEAN DEFAULT false,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de profissionais
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS professionals (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      specialty VARCHAR(255),
      commission_rate DECIMAL(5,2) DEFAULT 0,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Adicionar coluna professional_id em appointments (se não existir)
  await db.pool.query(`
    ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS professional_id INTEGER REFERENCES professionals(id) ON DELETE SET NULL
  `);

  // Tabela de comissões
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS commissions (
      id SERIAL PRIMARY KEY,
      appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      professional_id INTEGER NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
      service_amount DECIMAL(10,2) NOT NULL,
      commission_rate DECIMAL(5,2) NOT NULL,
      commission_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de avaliações
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      approved BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de mensagens de chat
  await db.pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
      message TEXT NOT NULL,
      sender_type VARCHAR(20) NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Criar índices
  console.log('📊 Criando índices...');
  await db.pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)');
  await db.pool.query('CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id)');
  await db.pool.query('CREATE INDEX IF NOT EXISTS idx_time_blocks_date ON time_blocks(block_date)');
  await db.pool.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_type, user_id)');
  await db.pool.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_client ON chat_messages(client_id)');
  await db.pool.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(is_read)');

  // Inserir admin padrão
  await insertDefaultAdmin();

  // Inserir serviços padrão
  await insertDefaultServices();
};

/**
 * Inicializar SQLite (Desenvolvimento)
 */
const initSQLite = () => {
  return new Promise((resolve, reject) => {
    db._raw.serialize(async () => {
      try {
        // Tabelas base (já existentes no código original)
        await db.run(`
          CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            google_id TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            duration INTEGER NOT NULL,
            price REAL NOT NULL,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            professional_id INTEGER,
            appointment_date DATE NOT NULL,
            appointment_time TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            reminder_sent BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
            FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE SET NULL
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS time_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            block_date DATE NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            reason TEXT,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_type TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS password_reset_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_type TEXT NOT NULL,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            used BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS oauth_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            provider TEXT NOT NULL,
            access_token TEXT,
            refresh_token TEXT,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            discount_type TEXT NOT NULL,
            discount_value REAL NOT NULL,
            min_value REAL DEFAULT 0,
            max_uses INTEGER,
            used_count INTEGER DEFAULT 0,
            valid_from DATETIME,
            valid_until DATETIME,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS waitlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            preferred_date DATE,
            preferred_time TEXT,
            status TEXT DEFAULT 'waiting',
            notified_at DATETIME,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS recurring_appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            recurrence_type TEXT NOT NULL,
            preferred_day_of_week INTEGER,
            preferred_time TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE,
            last_generated_date DATE,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_url TEXT NOT NULL,
            description TEXT,
            category TEXT,
            likes_count INTEGER DEFAULT 0,
            views_count INTEGER DEFAULT 0,
            featured BOOLEAN DEFAULT 0,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS professionals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            specialty TEXT,
            commission_rate REAL DEFAULT 0,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS commissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            appointment_id INTEGER NOT NULL,
            professional_id INTEGER NOT NULL,
            service_amount REAL NOT NULL,
            commission_rate REAL NOT NULL,
            commission_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            paid_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
            FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            appointment_id INTEGER,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            approved BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
          )
        `);

        await db.run(`
          CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            admin_id INTEGER,
            message TEXT NOT NULL,
            sender_type TEXT NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
            FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
          )
        `);

        // Criar índices
        console.log('📊 Criando índices...');
        await db.run('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_time_blocks_date ON time_blocks(block_date)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_type, user_id)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_chat_messages_client ON chat_messages(client_id)');
        await db.run('CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(is_read)');

        // Inserir dados padrão
        await insertDefaultAdmin();
        await insertDefaultServices();

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Inserir admin padrão
 */
const insertDefaultAdmin = async () => {
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@estudiounhas.com';
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!defaultAdminPassword) {
    console.warn('⚠️  DEFAULT_ADMIN_PASSWORD não configurado - admin padrão não foi criado');
    return;
  }

  try {
    const existing = await db.get('SELECT id FROM admins WHERE email = $1', [defaultAdminEmail]);

    if (!existing) {
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);

      if (usePG) {
        await db.pool.query(
          'INSERT INTO admins (name, email, password) VALUES ($1, $2, $3)',
          ['Administrador', defaultAdminEmail, hashedPassword]
        );
      } else {
        await db.run(
          'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
          ['Administrador', defaultAdminEmail, hashedPassword]
        );
      }

      console.log('✅ Admin padrão criado com sucesso!');
      console.log(`📧 Email: ${defaultAdminEmail}`);
      console.log('🔑 Senha: (definida na variável DEFAULT_ADMIN_PASSWORD)');
      console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    } else {
      console.log('ℹ️  Admin padrão já existe');
    }
  } catch (error) {
    console.error('❌ Erro ao criar admin padrão:', error);
  }
};

/**
 * Inserir serviços padrão
 */
const insertDefaultServices = async () => {
  try {
    const count = await db.get('SELECT COUNT(*) as count FROM services');

    if (count && count.count === 0) {
      const defaultServices = [
        { name: 'Manicure', description: 'Manicure tradicional', duration: 60, price: 35.00 },
        { name: 'Pedicure', description: 'Pedicure completa', duration: 60, price: 40.00 },
        { name: 'Unhas de Gel', description: 'Aplicação de unhas em gel', duration: 90, price: 80.00 },
        { name: 'Unha Decorada', description: 'Decoração artística nas unhas', duration: 120, price: 100.00 },
        { name: 'Spa dos Pés', description: 'Tratamento completo para os pés', duration: 90, price: 70.00 }
      ];

      for (const service of defaultServices) {
        if (usePG) {
          await db.pool.query(
            'INSERT INTO services (name, description, duration, price) VALUES ($1, $2, $3, $4)',
            [service.name, service.description, service.duration, service.price]
          );
        } else {
          await db.run(
            'INSERT INTO services (name, description, duration, price) VALUES (?, ?, ?, ?)',
            [service.name, service.description, service.duration, service.price]
          );
        }
      }

      console.log('✅ Serviços de exemplo inseridos com sucesso!');
    } else {
      console.log('ℹ️  Serviços já existem no banco');
    }
  } catch (error) {
    console.error('❌ Erro ao inserir serviços padrão:', error);
  }
};

// Se executado diretamente
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('🎉 Inicialização concluída!');
      process.exit(0);
    })
    .catch(err => {
      console.error('💥 Erro na inicialização:', err);
      process.exit(1);
    });
}

module.exports = initDatabase;
