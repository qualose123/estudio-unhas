# 💅 Estúdio de Unhas - Sistema de Agendamentos

Sistema completo de gerenciamento de agendamentos para estúdios de unhas, desenvolvido com React + Node.js.

## 📋 Sobre o Projeto

Este é um sistema web completo para gerenciamento de agendamentos de serviços de manicure e pedicure. Permite que clientes agendem horários online e que administradores gerenciem serviços, horários e agendamentos.

### ✨ Funcionalidades Principais

**Para Clientes:**
- ✅ Cadastro e login (tradicional ou com Google OAuth)
- ✅ Visualização de serviços disponíveis
- ✅ Agendamento de horários
- ✅ Gerenciamento de seus próprios agendamentos
- ✅ Recuperação de senha

**Para Administradores:**
- ✅ Dashboard com estatísticas
- ✅ Gerenciamento de serviços (CRUD completo)
- ✅ Visualização e gerenciamento de todos os agendamentos
- ✅ Bloqueio de horários indisponíveis
- ✅ Controle de usuários

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **SQLite** - Banco de dados
- **JWT** - Autenticação
- **Passport.js** - OAuth Google
- **Bcrypt** - Criptografia de senhas
- **Nodemailer** - Envio de emails
- **Helmet** - Segurança HTTP
- **Express Rate Limit** - Proteção contra ataques

### Frontend
- **React** - Biblioteca UI
- **React Router** - Roteamento
- **Axios** - Cliente HTTP
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones
- **React Hot Toast** - Notificações

## 🚀 Como Executar o Projeto

### Pré-requisitos

- Node.js (v14 ou superior)
- npm ou yarn
- Conta Google Cloud (para OAuth - opcional)

### Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd estudio-unhas
```

2. **Instale as dependências do backend**
```bash
cd backend
npm install
```

3. **Configure as variáveis de ambiente do backend**
```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure:
- `JWT_SECRET` - Chave secreta para tokens JWT
- `GOOGLE_CLIENT_ID` - ID do cliente Google OAuth (opcional)
- `GOOGLE_CLIENT_SECRET` - Secret do cliente Google OAuth (opcional)
- `EMAIL_USER` e `EMAIL_PASSWORD` - Credenciais para envio de emails

4. **Instale as dependências do frontend**
```bash
cd ../frontend
npm install
```

5. **Configure as variáveis de ambiente do frontend**
```bash
cp .env.example .env
```

### Executando em Desenvolvimento

1. **Inicie o backend**
```bash
cd backend
npm start
```

O servidor estará rodando em `http://localhost:5000`

2. **Inicie o frontend** (em outro terminal)
```bash
cd frontend
npm run dev
```

O frontend estará rodando em `http://localhost:3000`

### Credenciais Padrão

**Administrador:**
- Email: `admin@estudiodefrank.com`
- Senha: `admin123`

⚠️ **IMPORTANTE**: Altere essas credenciais em produção!

## 📁 Estrutura do Projeto

```
estudio-unhas/
├── backend/
│   ├── src/
│   │   ├── config/         # Configurações (DB, Passport, etc)
│   │   ├── controllers/    # Lógica de negócio
│   │   ├── middleware/     # Middlewares (auth, validação, etc)
│   │   ├── routes/         # Rotas da API
│   │   └── server.js       # Arquivo principal do servidor
│   ├── database/           # Arquivo do banco de dados SQLite
│   ├── .env.example        # Exemplo de variáveis de ambiente
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── contexts/       # Contextos React (Auth, etc)
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── services/       # Serviços (API calls)
│   │   └── App.jsx         # Componente raiz
│   ├── .env.example        # Exemplo de variáveis de ambiente
│   └── package.json
│
├── .gitignore
└── README.md
```

## 🔒 Segurança

O projeto implementa diversas camadas de segurança:

- **Helmet.js** - Proteção contra vulnerabilidades web comuns
- **CORS** - Controle de acesso entre domínios
- **Rate Limiting** - Proteção contra ataques de força bruta
- **Bcrypt** - Hash seguro de senhas
- **JWT** - Tokens seguros para autenticação
- **Validação de entrada** - Em todas as rotas da API
- **Sanitização de dados** - Prevenção de SQL Injection e XSS

## 📝 API Endpoints

### Autenticação
- `POST /api/auth/client/login` - Login de cliente
- `POST /api/auth/client/register` - Registro de cliente
- `POST /api/auth/admin/login` - Login de admin
- `GET /api/auth/google` - Iniciar OAuth Google
- `GET /api/auth/google/callback` - Callback OAuth Google

### Serviços
- `GET /api/services` - Listar serviços
- `POST /api/services` - Criar serviço (admin)
- `PUT /api/services/:id` - Atualizar serviço (admin)
- `DELETE /api/services/:id` - Deletar serviço (admin)

### Agendamentos
- `GET /api/appointments` - Listar agendamentos
- `POST /api/appointments` - Criar agendamento
- `PUT /api/appointments/:id` - Atualizar agendamento
- `DELETE /api/appointments/:id` - Cancelar agendamento

### Bloqueios de Horário
- `GET /api/time-blocks` - Listar bloqueios
- `POST /api/time-blocks` - Criar bloqueio (admin)
- `DELETE /api/time-blocks/:id` - Remover bloqueio (admin)

## 🌐 Deploy

### Backend (Render, Railway, etc)

1. Configure as variáveis de ambiente na plataforma
2. Defina o comando de start: `npm start`
3. Certifique-se de que `NODE_ENV=production`

### Frontend (Vercel, Netlify, etc)

1. Configure a variável `VITE_API_URL` com a URL do backend
2. Build command: `npm run build`
3. Output directory: `dist`

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 👥 Autores

- **Seu Nome** - Desenvolvimento inicial

## 🙏 Agradecimentos

- Claude Code - Assistência no desenvolvimento
- Comunidade React e Node.js

---

⭐ Se este projeto foi útil, considere dar uma estrela!
