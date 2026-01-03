/**
 * SERVIDOR PRINCIPAL - Estúdio de Unhas
 *
 * Este arquivo configura e inicia o servidor Express com todas as
 * configurações de segurança, middlewares e rotas da API.
 *
 * Segurança implementada:
 * - Helmet: Proteção contra vulnerabilidades comuns (XSS, clickjacking, etc)
 * - CORS: Controle de acesso entre domínios
 * - Rate Limiting: Proteção contra ataques de força bruta e DDoS
 * - Validação de entrada em todas as rotas
 * - Autenticação JWT para rotas protegidas
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const cron = require('node-cron');

// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config();

// Inicializar configurações
const initDatabase = require('./config/initDatabase');
require('./config/passport'); // Configurar estratégia de autenticação do Google OAuth

// Importar todas as rotas da aplicação
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const timeBlockRoutes = require('./routes/timeBlockRoutes');
const passwordResetRoutes = require('./routes/passwordResetRoutes');
const couponRoutes = require('./routes/couponRoutes');
const waitlistRoutes = require('./routes/waitlistRoutes');
const recurringAppointmentRoutes = require('./routes/recurringAppointmentRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const professionalRoutes = require('./routes/professionalRoutes');
const commissionRoutes = require('./routes/commissionRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
// DESABILITADO EM PRODUÇÃO - Issue de module loading no Railway
// const chatRoutes = require('./routes/liveChatRoutes');
// const whatsappRoutes = require('./routes/whatsappBusinessRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurar trust proxy para ambientes de produção (Railway, Heroku, etc)
// Necessário para rate limiting e logs corretos de IP
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

/* ========================================
   MIDDLEWARES DE SEGURANÇA
   ======================================== */

/**
 * Helmet - Adiciona headers HTTP de segurança
 * Protege contra ataques comuns como:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME type sniffing
 * - Informações sensíveis nos headers
 */
app.use(helmet());

/**
 * CORS - Controle de Acesso entre Domínios
 * Permite que apenas o frontend autorizado acesse a API
 * Em produção, configure FRONTEND_URL para o domínio real
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Lista de origens permitidas
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://estudiunhas.com.br',
      'http://estudiunhas.com.br'
    ].filter(Boolean);

    // Permite requisições sem origin (como apps mobile ou Postman)
    if (!origin) return callback(null, true);

    // Em produção, se FRONTEND_URL não estiver definida, permite todas as origens
    // TEMPORÁRIO para debugging - DEVE ser configurado com domínio específico depois
    if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS bloqueou origem não permitida: ${origin}`);
      callback(new Error('Não permitido pelo CORS'));
    }
  },
  credentials: true, // Permite envio de cookies e credenciais
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

/**
 * Body Parser - Processa requisições JSON e URL-encoded
 * Necessário para ler dados do corpo das requisições POST/PUT
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Servir arquivos estáticos (uploads)
 * Permite acesso público às imagens da galeria
 */
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/**
 * Sanitização de Inputs - Previne XSS e SQL Injection
 * Sanitiza automaticamente body, query params e params de URL
 */
const { sanitizeInput } = require('./middleware/sanitize');
app.use(sanitizeInput);

/**
 * Passport - Inicializa autenticação OAuth
 * Usado para login com Google
 */
app.use(passport.initialize());

/**
 * Rate Limiting - Proteção contra Ataques de Força Bruta e DDoS
 * Limita o número de requisições por IP em um período de tempo
 * Padrão: 100 requisições a cada 15 minutos
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // máximo de requisições
  message: 'Muitas requisições deste IP, tente novamente mais tarde.',
  standardHeaders: true, // Retorna info de rate limit nos headers `RateLimit-*`
  legacyHeaders: false // Desabilita headers `X-RateLimit-*`
});

// Aplicar rate limiting em todas as rotas da API
app.use('/api/', limiter);

/* ========================================
   ROTAS DA APLICAÇÃO
   ======================================== */

/**
 * Health Check - Verifica se o servidor está funcionando
 * Útil para monitoramento e load balancers
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Rotas da API
 * Todas as rotas são prefixadas com /api/
 */
app.use('/api/auth', authRoutes);              // Autenticação (login, registro, OAuth)
app.use('/api/services', serviceRoutes);        // Serviços oferecidos (CRUD)
app.use('/api/appointments', appointmentRoutes); // Agendamentos (CRUD)
app.use('/api/time-blocks', timeBlockRoutes);   // Bloqueios de horário
app.use('/api/password-reset', passwordResetRoutes); // Recuperação de senha
app.use('/api/coupons', couponRoutes);          // Cupons de desconto
app.use('/api/waitlist', waitlistRoutes);       // Lista de espera
app.use('/api/recurring-appointments', recurringAppointmentRoutes); // Agendamentos recorrentes
app.use('/api/gallery', galleryRoutes);         // Galeria de trabalhos
app.use('/api/professionals', professionalRoutes); // Profissionais/Manicures
app.use('/api/commissions', commissionRoutes);  // Comissões
app.use('/api/reviews', reviewRoutes);          // Avaliações
app.use('/api/dashboard', dashboardRoutes);     // Dashboard e estatísticas
// DESABILITADO EM PRODUÇÃO - Issue de module loading no Railway
// app.use('/api/chat', chatRoutes);               // Chat ao vivo
// app.use('/api/whatsapp', whatsappRoutes);       // Integração WhatsApp

/* ========================================
   TRATAMENTO DE ERROS
   ======================================== */

/**
 * Handler 404 - Rota não encontrada
 * Captura todas as requisições que não correspondem a nenhuma rota
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

/**
 * Error Handler Global
 * Captura todos os erros não tratados nas rotas
 * Em produção, não expõe detalhes do erro por segurança
 */
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message
  });
});

/* ========================================
   INICIALIZAÇÃO DO SERVIDOR
   ======================================== */

/**
 * Inicializa o banco de dados e inicia o servidor
 * 1. Cria as tabelas necessárias (se não existirem)
 * 2. Cria usuário admin padrão (se não existir)
 * 3. Inicia o servidor HTTP
 */
const startServer = async () => {
  try {
    // Inicializar banco de dados
    await initDatabase();

    // Iniciar cron jobs
    const { expireOldNotifications } = require('./controllers/waitlistController');
    const { generateRecurringAppointments } = require('./controllers/recurringAppointmentController');
    const { sendAppointmentReminders } = require('./controllers/notificationController');

    // Executar a cada hora para expirar notificações antigas (24h)
    cron.schedule('0 * * * *', () => {
      console.log('🕐 Executando job de expiração de notificações da lista de espera...');
      expireOldNotifications();
    });

    // Executar todos os dias às 2h da manhã para gerar agendamentos recorrentes
    cron.schedule('0 2 * * *', () => {
      console.log('🔄 Executando job de geração de agendamentos recorrentes...');
      generateRecurringAppointments();
    });

    // Executar todos os dias às 9h da manhã para enviar lembretes 24h antes
    cron.schedule('0 9 * * *', () => {
      console.log('📧 Executando job de lembretes de agendamentos...');
      sendAppointmentReminders();
    });

    console.log('✓ Cron jobs configurados');

    // Iniciar servidor HTTP
    const server = app.listen(PORT, () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`✓ Servidor rodando na porta ${PORT}`);
      console.log(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ URL: http://localhost:${PORT}`);
      console.log(`✓ Health Check: http://localhost:${PORT}/health`);
      console.log(`${'='.repeat(50)}\n`);
    });

    // WebSocket desabilitado em produção devido a issue de module loading
    // const { initWebSocket } = require('./services/websocketService');
    // initWebSocket(server);
    // console.log('✓ WebSocket inicializado\n');

  } catch (error) {
    console.error('✗ Erro ao iniciar servidor:', error);
    process.exit(1); // Encerra o processo com código de erro
  }
};

// Iniciar aplicação
startServer();

// Exportar app para testes
module.exports = app;
