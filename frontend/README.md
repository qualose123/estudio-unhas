# Frontend - Sistema de Agendamento Estúdio de Unhas

Interface web moderna e responsiva desenvolvida com React e Tailwind CSS para o sistema de agendamento.

## 🎨 Design

O frontend foi desenvolvido com um tema **feminino e elegante**, utilizando:

- **Paleta de cores rosa** (#f83d7d) como cor primária
- **Gradientes suaves** para criar profundidade
- **Sombras delicadas** para dar destaque aos elementos
- **Animações suaves** para melhorar a experiência do usuário
- **Ícones Lucide React** para interface moderna
- **Fonte Poppins** para títulos e **Inter** para texto

## 🚀 Tecnologias

- **React 18** - Biblioteca JavaScript
- **Vite** - Build tool super rápido
- **Tailwind CSS** - Framework CSS utilitário
- **React Router** - Navegação entre páginas
- **Axios** - Cliente HTTP
- **React Hot Toast** - Notificações elegantes
- **Lucide React** - Ícones modernos
- **Date-fns** - Manipulação de datas

## 📁 Estrutura

```
frontend/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── Badge.jsx
│   │   ├── Button.jsx
│   │   ├── Card.jsx
│   │   ├── Input.jsx
│   │   ├── Loading.jsx
│   │   ├── Navbar.jsx
│   │   └── ProtectedRoute.jsx
│   ├── contexts/            # Context API
│   │   └── AuthContext.jsx
│   ├── pages/               # Páginas
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── ServiceManagementModal.jsx
│   │   │   └── TimeBlockModal.jsx
│   │   ├── client/
│   │   │   ├── ClientDashboard.jsx
│   │   │   └── NewAppointmentModal.jsx
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── services/            # API service
│   │   └── api.js
│   ├── App.jsx             # Componente principal
│   ├── main.jsx            # Entrada da aplicação
│   └── index.css           # Estilos globais
├── public/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 🔧 Instalação e Execução

### 1. Instalar Dependências

```bash
cd frontend
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Para produção, use a URL do Railway:

```env
VITE_API_URL=https://sua-url-railway.up.railway.app/api
```

### 3. Executar em Desenvolvimento

```bash
npm run dev
```

Acesse: `http://localhost:3000`

### 4. Build para Produção

```bash
npm run build
```

Isso criará a pasta `build/` com os arquivos otimizados.

## 📱 Páginas e Funcionalidades

### Páginas Públicas

#### Home (`/`)
- Hero section com chamada para ação
- Apresentação de funcionalidades
- Lista de serviços
- Footer

#### Login (`/login`)
- Login separado para Cliente e Admin
- Opção para registro
- Recuperação de senha (link)
- Validação de formulário

#### Registro (`/register`)
- Cadastro de novos clientes
- Campos: nome, email, telefone, senha
- Validação de senha
- Confirmação de senha

### Área do Cliente (`/client/dashboard`)

**Funcionalidades:**
- ✅ Ver todos os agendamentos
- ✅ Filtrar por status (pendente, confirmado, concluído, cancelado)
- ✅ Criar novo agendamento
- ✅ Ver horários disponíveis em tempo real
- ✅ Cancelar agendamentos pendentes
- ✅ Estatísticas de agendamentos

**Novo Agendamento:**
- Seleção de serviço
- Escolha de data
- Horários disponíveis em tempo real
- Observações opcionais
- Resumo antes de confirmar

### Área Administrativa (`/admin/dashboard`)

**Funcionalidades:**
- ✅ Ver todos os agendamentos de todos os clientes
- ✅ Confirmar agendamentos pendentes
- ✅ Cancelar agendamentos
- ✅ Marcar como concluído
- ✅ Estatísticas em tempo real
- ✅ Gerenciar serviços (CRUD completo)
- ✅ Bloquear horários

**Gerenciamento de Serviços:**
- Criar novos serviços
- Editar serviços existentes
- Ativar/desativar serviços
- Deletar serviços

**Bloqueio de Horários:**
- Bloquear períodos específicos
- Adicionar motivo do bloqueio
- Prevenir agendamentos em horários bloqueados

## 🎨 Componentes Reutilizáveis

### Button
```jsx
<Button variant="primary" icon={Icon} onClick={handleClick} loading={loading}>
  Texto do Botão
</Button>
```

Variantes: `primary`, `secondary`, `outline`

### Input
```jsx
<Input
  label="Email"
  type="email"
  name="email"
  value={value}
  onChange={handleChange}
  icon={Mail}
  error={error}
  required
/>
```

### Card
```jsx
<Card hover className="custom-class">
  Conteúdo do card
</Card>
```

### Badge
```jsx
<Badge variant="success">Confirmado</Badge>
```

Variantes: `success`, `warning`, `danger`, `info`, `primary`

### Loading
```jsx
<Loading message="Carregando dados..." />
```

## 🔐 Autenticação

O sistema usa Context API para gerenciar autenticação:

```jsx
import { useAuth } from '../contexts/AuthContext';

function Component() {
  const { user, login, logout, isAuthenticated, isAdmin, isClient } = useAuth();

  // user contém: id, name, email, type
  // isAdmin: true se for admin
  // isClient: true se for cliente
}
```

### Rotas Protegidas

```jsx
<ProtectedRoute>
  <ClientDashboard />
</ProtectedRoute>

<ProtectedRoute requireAdmin>
  <AdminDashboard />
</ProtectedRoute>
```

## 🌈 Customização de Cores

As cores podem ser alteradas em `tailwind.config.js`:

```js
colors: {
  primary: {
    500: '#f83d7d', // Cor principal
    600: '#e51d64',
    // ...
  }
}
```

## 🚀 Deploy no Hostgator

### 1. Build de Produção

```bash
# Configurar API URL de produção
echo "VITE_API_URL=https://sua-url-railway.up.railway.app/api" > .env

# Build
npm run build
```

### 2. Upload dos Arquivos

1. Acesse o cPanel do Hostgator
2. Vá em "Gerenciador de Arquivos"
3. Navegue até `public_html`
4. **Delete todos os arquivos** (ou faça backup)
5. Upload de **TODOS** os arquivos da pasta `build/`

### 3. Criar .htaccess

Crie o arquivo `.htaccess` em `public_html/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Compressão GZIP
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### 4. Configurar SSL

1. No cPanel, vá em "SSL/TLS Status"
2. Execute "AutoSSL" para seu domínio
3. Aguarde o certificado ser gerado

### 5. Atualizar CORS no Backend

No Railway, configure:

```env
FRONTEND_URL=https://seudominio.com.br
```

## 🛠️ Desenvolvimento

### Adicionar Nova Página

1. Crie o componente em `src/pages/`
2. Adicione a rota em `App.jsx`
3. Se for protegida, use `<ProtectedRoute>`

### Adicionar Nova API Endpoint

1. Abra `src/services/api.js`
2. Adicione o novo endpoint no objeto apropriado

```js
export const novoAPI = {
  getAll: () => api.get('/novo'),
  create: (data) => api.post('/novo', data),
};
```

### Criar Novo Componente

```jsx
import React from 'react';

const MeuComponente = ({ prop1, prop2 }) => {
  return (
    <div className="card">
      {/* Conteúdo */}
    </div>
  );
};

export default MeuComponente;
```

## 📊 Notificações Toast

```jsx
import { toast } from 'react-hot-toast';

// Sucesso
toast.success('Operação realizada com sucesso!');

// Erro
toast.error('Ocorreu um erro!');

// Info
toast('Informação importante');

// Loading
const loadingToast = toast.loading('Carregando...');
// ... operação assíncrona
toast.dismiss(loadingToast);
toast.success('Concluído!');
```

## 🐛 Troubleshooting

### Erro de CORS

**Sintoma:** Console mostra erro de CORS

**Solução:**
1. Verifique se `VITE_API_URL` está correto
2. Certifique-se de que o backend tem `FRONTEND_URL` configurado
3. Use HTTPS em produção

### Página em branco após build

**Sintoma:** Depois do build, página não carrega

**Solução:**
1. Verifique se o `.htaccess` está configurado
2. Confirme que todos os arquivos da pasta `build/` foram enviados
3. Verifique o console do navegador para erros

### Variáveis de ambiente não funcionam

**Sintoma:** `import.meta.env.VITE_API_URL` é undefined

**Solução:**
1. Variáveis devem começar com `VITE_`
2. Reinicie o servidor de desenvolvimento após alterar `.env`
3. No build, certifique-se de que o `.env` existe

## 📄 Licença

Este projeto é privado e proprietário.

---

**Desenvolvido com 💅 para facilitar a gestão de salões de beleza**
