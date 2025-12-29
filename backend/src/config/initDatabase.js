const db = require('./database');
const bcrypt = require('bcryptjs');

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabela de admins
      db.run(`
        CREATE TABLE IF NOT EXISTS admins (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Erro ao criar tabela admins:', err);
      });

      // Tabela de clientes
      db.run(`
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
      `, (err) => {
        if (err) console.error('Erro ao criar tabela clients:', err);
      });

      // Tabela de serviços
      db.run(`
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
      `, (err) => {
        if (err) console.error('Erro ao criar tabela services:', err);
      });

      // Tabela de agendamentos
      db.run(`
        CREATE TABLE IF NOT EXISTS appointments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id INTEGER NOT NULL,
          service_id INTEGER NOT NULL,
          appointment_date DATE NOT NULL,
          appointment_time TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
          FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) console.error('Erro ao criar tabela appointments:', err);
      });

      // Tabela de bloqueio de horários
      db.run(`
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
      `, (err) => {
        if (err) console.error('Erro ao criar tabela time_blocks:', err);
      });

      // Tabela de logs de auditoria
      db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_type TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Erro ao criar tabela audit_logs:', err);
      });

      // Tabela de códigos de recuperação de senha
      db.run(`
        CREATE TABLE IF NOT EXISTS password_reset_codes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_type TEXT NOT NULL,
          email TEXT NOT NULL,
          code TEXT NOT NULL,
          expires_at DATETIME NOT NULL,
          used BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) console.error('Erro ao criar tabela password_reset_codes:', err);
      });

      // Tabela de sessões OAuth
      db.run(`
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
      `, (err) => {
        if (err) console.error('Erro ao criar tabela oauth_sessions:', err);
      });

      // Criar índices para melhor performance
      db.run('CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_time_blocks_date ON time_blocks(block_date)');
      db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_type, user_id)');

      // Inserir admin padrão se não existir
      const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@estudiounhas.com';
      const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

      // Só cria admin padrão se a senha estiver configurada no .env
      if (defaultAdminPassword) {
        db.get('SELECT id FROM admins WHERE email = ?', [defaultAdminEmail], async (err, row) => {
          if (err) {
            console.error('Erro ao verificar admin padrão:', err);
            return;
          }

          if (!row) {
            const hashedPassword = await bcrypt.hash(defaultAdminPassword, 10);
            db.run(
              'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
              ['Administrador', defaultAdminEmail, hashedPassword],
              (err) => {
                if (err) {
                  console.error('Erro ao criar admin padrão:', err);
                } else {
                  console.log('✅ Admin padrão criado com sucesso!');
                  console.log(`📧 Email: ${defaultAdminEmail}`);
                  console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
                }
              }
            );
          }
        });
      } else {
        console.warn('⚠️  DEFAULT_ADMIN_PASSWORD não configurado - admin padrão não foi criado');
      }

      // Inserir serviços de exemplo se não existirem
      db.get('SELECT COUNT(*) as count FROM services', [], (err, row) => {
        if (err) {
          console.error('Erro ao verificar serviços:', err);
          return;
        }

        if (row.count === 0) {
          const defaultServices = [
            { name: 'Manicure', description: 'Manicure tradicional', duration: 60, price: 35.00 },
            { name: 'Pedicure', description: 'Pedicure completa', duration: 60, price: 40.00 },
            { name: 'Unhas de Gel', description: 'Aplicação de unhas em gel', duration: 90, price: 80.00 },
            { name: 'Unha Decorada', description: 'Decoração artística nas unhas', duration: 120, price: 100.00 },
            { name: 'Spa dos Pés', description: 'Tratamento completo para os pés', duration: 90, price: 70.00 }
          ];

          const stmt = db.prepare('INSERT INTO services (name, description, duration, price) VALUES (?, ?, ?, ?)');
          defaultServices.forEach(service => {
            stmt.run(service.name, service.description, service.duration, service.price);
          });
          stmt.finalize(() => {
            console.log('Serviços de exemplo inseridos com sucesso!');
          });
        }
      });

      console.log('Banco de dados inicializado com sucesso!');

      // Executar migrations
      const addUserAgentToAuditLogs = require('../migrations/add_user_agent_to_audit_logs');
      const createCouponsTable = require('../migrations/create_coupons_table');
      const createWaitlistTable = require('../migrations/create_waitlist_table');
      const createRecurringAppointmentsTable = require('../migrations/create_recurring_appointments_table');
      const createGalleryTable = require('../migrations/create_gallery_table');
      const createCommissionsTable = require('../migrations/create_commissions_table');
      const createReviewsTable = require('../migrations/create_reviews_table');
      const addReminderSentColumn = require('../migrations/add_reminder_sent_column');
      const createChatTable = require('../migrations/create_chat_table');

      Promise.all([
        addUserAgentToAuditLogs(),
        createCouponsTable(),
        createWaitlistTable(),
        createRecurringAppointmentsTable(),
        createGalleryTable(),
        createCommissionsTable(),
        createReviewsTable(),
        addReminderSentColumn(),
        createChatTable()
      ])
        .then(() => {
          console.log('✅ Migrations executadas com sucesso!');
          resolve();
        })
        .catch((err) => {
          console.error('❌ Erro ao executar migrations:', err);
          resolve(); // Não rejeitar para não bloquear inicialização
        });
    });
  });
};

// Se executado diretamente
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Inicialização concluída!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Erro na inicialização:', err);
      process.exit(1);
    });
}

module.exports = initDatabase;
