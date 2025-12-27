# Backend - Sistema de Agendamento Estúdio de Unhas

API RESTful desenvolvida com Node.js, Express e SQLite para gerenciamento de agendamentos de salão de unhas.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **SQLite** - Banco de dados
- **JWT** - Autenticação
- **Bcrypt** - Hash de senhas
- **Nodemailer** - Envio de emails
- **Helmet** - Segurança HTTP
- **Express Rate Limit** - Proteção contra DDoS

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/          # Configurações (banco de dados, etc)
│   ├── controllers/     # Lógica de negócio
│   ├── middleware/      # Middlewares (auth, validação, logs)
│   ├── models/          # (Futuro: Models se necessário)
│   ├── routes/          # Rotas da API
│   ├── services/        # Serviços (email, etc)
│   ├── utils/           # Utilitários
│   └── server.js        # Arquivo principal
├── database/            # Banco SQLite
├── .env.example         # Exemplo de variáveis de ambiente
├── .gitignore
├── package.json
└── README.md
```

## 🗄️ Banco de Dados

### Tabelas

- **admins** - Administradores do sistema
- **clients** - Clientes do salão
- **services** - Serviços oferecidos
- **appointments** - Agendamentos
- **time_blocks** - Bloqueios de horário
- **audit_logs** - Logs de auditoria
- **password_reset_codes** - Códigos de recuperação de senha
- **oauth_sessions** - Sessões OAuth (Google)

## 🔧 Configuração e Instalação

### 1. Instalar dependências

```bash
cd backend
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
NODE_ENV=development
PORT=5000
JWT_SECRET=sua_chave_secreta_aqui
DB_PATH=./database/estudio-unhas.db
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_app
EMAIL_FROM=Estúdio de Unhas <seu_email@gmail.com>
FRONTEND_URL=http://localhost:3000
```

### 3. Inicializar banco de dados

```bash
npm run init-db
```

Isso criará:
- Todas as tabelas
- Um admin padrão (email: `admin@estudiounhas.com`, senha: `Admin@123`)
- Serviços de exemplo

**⚠️ IMPORTANTE: Altere a senha do admin após o primeiro login!**

### 4. Executar em desenvolvimento

```bash
npm run dev
```

### 5. Executar em produção

```bash
npm start
```

## 📧 Configuração de Email (Gmail)

Para usar o Gmail para envio de emails:

1. Acesse sua conta Google
2. Vá em "Gerenciar sua Conta do Google" → "Segurança"
3. Ative a verificação em duas etapas
4. Gere uma "Senha de app" em "Senhas de app"
5. Use essa senha no `.env` em `EMAIL_PASSWORD`

## 🔐 API Endpoints

### Autenticação

#### Login Admin
```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "email": "admin@estudiounhas.com",
  "password": "Admin@123"
}
```

#### Login Cliente
```http
POST /api/auth/client/login
Content-Type: application/json

{
  "email": "cliente@email.com",
  "password": "senha123"
}
```

#### Registro Cliente
```http
POST /api/auth/client/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123",
  "phone": "11999999999"
}
```

#### Verificar Token
```http
GET /api/auth/verify
Authorization: Bearer {token}
```

### Serviços

#### Listar Serviços
```http
GET /api/services
GET /api/services?active=true
```

#### Buscar Serviço
```http
GET /api/services/:id
```

#### Criar Serviço (Admin)
```http
POST /api/services
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Manicure",
  "description": "Manicure tradicional",
  "duration": 60,
  "price": 35.00,
  "active": true
}
```

#### Atualizar Serviço (Admin)
```http
PUT /api/services/:id
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "price": 40.00
}
```

#### Deletar Serviço (Admin)
```http
DELETE /api/services/:id
Authorization: Bearer {admin_token}
```

### Agendamentos

#### Listar Agendamentos
```http
GET /api/appointments
Authorization: Bearer {token}

# Admin vê todos, cliente vê apenas os seus
# Filtros opcionais:
GET /api/appointments?status=pending
GET /api/appointments?date=2024-12-25
```

#### Buscar Agendamento
```http
GET /api/appointments/:id
Authorization: Bearer {token}
```

#### Criar Agendamento (Cliente)
```http
POST /api/appointments
Authorization: Bearer {client_token}
Content-Type: application/json

{
  "service_id": 1,
  "appointment_date": "2024-12-25",
  "appointment_time": "14:00",
  "notes": "Preferência por esmalte vermelho"
}
```

#### Atualizar Agendamento
```http
PUT /api/appointments/:id
Authorization: Bearer {token}
Content-Type: application/json

# Cliente pode cancelar ou alterar data/hora:
{
  "status": "cancelled"
}

# Admin pode alterar qualquer campo:
{
  "status": "confirmed",
  "appointment_time": "15:00"
}
```

#### Deletar Agendamento (Admin)
```http
DELETE /api/appointments/:id
Authorization: Bearer {admin_token}
```

#### Verificar Horários Disponíveis
```http
GET /api/appointments/available-times?date=2024-12-25&service_id=1
Authorization: Bearer {token}
```

### Bloqueio de Horários (Admin)

#### Listar Bloqueios
```http
GET /api/time-blocks
Authorization: Bearer {admin_token}

# Filtro opcional:
GET /api/time-blocks?date=2024-12-25
```

#### Criar Bloqueio
```http
POST /api/time-blocks
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "block_date": "2024-12-25",
  "start_time": "12:00",
  "end_time": "14:00",
  "reason": "Almoço"
}
```

#### Atualizar Bloqueio
```http
PUT /api/time-blocks/:id
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "end_time": "13:00"
}
```

#### Deletar Bloqueio
```http
DELETE /api/time-blocks/:id
Authorization: Bearer {admin_token}
```

### Recuperação de Senha

#### Solicitar Recuperação
```http
POST /api/password-reset/request
Content-Type: application/json

{
  "email": "usuario@email.com",
  "userType": "client"
}
```

#### Confirmar com Código
```http
POST /api/password-reset/confirm
Content-Type: application/json

{
  "email": "usuario@email.com",
  "code": "123456",
  "newPassword": "novaSenha123",
  "userType": "client"
}
```

## 🚀 Deploy no Railway

### 1. Preparar para produção

Certifique-se de que o `.env` está configurado corretamente com `NODE_ENV=production`.

### 2. Criar projeto no Railway

1. Acesse [Railway.app](https://railway.app)
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"
5. Escolha o repositório do projeto

### 3. Configurar variáveis de ambiente

No painel do Railway, vá em "Variables" e adicione:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=sua_chave_super_secreta_production
DB_PATH=./database/estudio-unhas.db
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_app
EMAIL_FROM=Estúdio de Unhas <seu_email@gmail.com>
FRONTEND_URL=https://seu-dominio-hostgator.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=sua_session_secret_production
```

### 4. Configurar build

Railway detectará automaticamente o Node.js. Configure os comandos:

- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 5. Inicializar banco de dados

Após o primeiro deploy, execute o comando via Railway CLI ou console:

```bash
npm run init-db
```

### 6. Obter URL

Railway fornecerá uma URL pública (ex: `https://seu-app.up.railway.app`)

### 7. Atualizar CORS

Atualize a variável `FRONTEND_URL` com o domínio do Hostgator.

## 🔒 Segurança

- ✅ Senhas hasheadas com bcrypt
- ✅ Autenticação JWT
- ✅ Rate limiting
- ✅ Helmet para headers de segurança
- ✅ CORS configurável
- ✅ Validação de inputs
- ✅ Logs de auditoria
- ✅ Proteção contra SQL injection (prepared statements)

## 📝 Logs de Auditoria

Todas as operações importantes são registradas na tabela `audit_logs`:

- Login/Registro
- Criação/Atualização/Deleção de agendamentos
- Criação/Atualização/Deleção de serviços
- Criação/Atualização/Deleção de bloqueios

## 🐛 Troubleshooting

### Erro de conexão com o banco

```bash
# Verifique se o diretório database existe
mkdir -p database

# Reinicialize o banco
npm run init-db
```

### Erro no envio de email

- Verifique se a senha de app do Gmail está correta
- Certifique-se de que a verificação em duas etapas está ativada
- Teste a conexão com o SMTP

### Erro de CORS

- Verifique se `FRONTEND_URL` está correto no `.env`
- Certifique-se de que o frontend está fazendo requisições para a URL correta

## 📄 Licença

Este projeto é privado e proprietário.
