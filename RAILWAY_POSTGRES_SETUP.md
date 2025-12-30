# 🐘 Configurar PostgreSQL no Railway - Passo a Passo

## ✅ O QUE JÁ FOI FEITO:
- ✅ Código atualizado para suportar PostgreSQL
- ✅ Push feito para GitHub (Railway vai fazer deploy automático)
- ✅ Senha de admin (`123052Ryan.`) será mantida

---

## 📋 PASSO 1: Adicionar PostgreSQL no Railway

1. **Acesse o Railway:**
   - Vá para: https://railway.app
   - Entre no seu projeto `estudio-unhas`

2. **Adicionar Database:**
   - Clique no botão **"+ New"** (canto superior direito)
   - Selecione **"Database"**
   - Escolha **"Add PostgreSQL"**

3. **Aguardar Provisionamento:**
   - O Railway vai criar o banco PostgreSQL
   - Aguarde 1-2 minutos até aparecer "Active"
   - A variável `DATABASE_URL` será criada **automaticamente**

---

## 🔗 PASSO 2: Conectar ao Serviço Backend

O Railway **conecta automaticamente** o PostgreSQL ao seu backend. Mas vamos verificar:

1. **Verificar Variáveis:**
   - Clique no seu serviço **backend** (não no PostgreSQL)
   - Vá em **"Variables"**
   - Você deve ver uma nova variável: `DATABASE_URL`
   - Ela terá um valor como: `postgresql://postgres:senha@host:5432/database`

2. **SE NÃO APARECER AUTOMATICAMENTE:**
   - Clique em **"+ New Variable"**
   - Escolha **"Add Reference"**
   - Selecione o PostgreSQL
   - Escolha `DATABASE_URL`

---

## ⚙️ PASSO 3: Remover Variável DATABASE_PATH (IMPORTANTE!)

Como agora estamos usando PostgreSQL, a variável `DATABASE_PATH` não é mais necessária:

1. No serviço **backend**, vá em **"Variables"**
2. Encontre a variável **`DATABASE_PATH`**
3. Clique nos **3 pontinhos** → **"Remove"**
4. Confirme a remoção

---

## 🔄 PASSO 4: Aguardar Redeploy Automático

Após adicionar o PostgreSQL e remover `DATABASE_PATH`:

1. O Railway **automaticamente** vai fazer redeploy do backend
2. Aguarde 2-3 minutos
3. Acompanhe os logs em **"Deploy Logs"**

### ✅ **LOGS DE SUCESSO** (o que você deve ver):

```
🐘 Usando PostgreSQL (Produção)
✅ Conexão com PostgreSQL configurada
🔄 Inicializando banco de dados...
🐘 Inicializando PostgreSQL...
📊 Criando índices...
✅ Admin padrão criado com sucesso!
📧 Email: admin@estudiounhas.com
🔑 Senha: (definida na variável DEFAULT_ADMIN_PASSWORD)
⚠️  IMPORTANTE: Altere a senha após o primeiro login!
✅ Serviços de exemplo inseridos com sucesso!
✅ Banco de dados inicializado com sucesso!
```

### ❌ **SE DER ERRO:**

**Erro comum:** "Cannot find module 'pg'"
- **Solução:** Aguarde o deploy completar totalmente
- O Railway instala as dependências automaticamente

**Erro de conexão:**
- Verifique se `DATABASE_URL` está presente nas variáveis
- Verifique se o PostgreSQL está "Active"

---

## 🧪 PASSO 5: Testar a API

Após o deploy bem-sucedido, teste se está funcionando:

1. **Testar Endpoint de Saúde:**
   ```
   https://estudio-unhas-production.up.railway.app/health
   ```
   Deve retornar: `{"status":"ok", ...}`

2. **Testar Login Admin:**
   ```
   POST https://estudio-unhas-production.up.railway.app/api/auth/login
   Body:
   {
     "email": "admin@estudiounhas.com",
     "password": "123052Ryan.",
     "type": "admin"
   }
   ```
   Deve retornar um token JWT

3. **Testar Listar Serviços:**
   ```
   GET https://estudio-unhas-production.up.railway.app/api/services
   ```
   Deve retornar os 5 serviços padrão

---

## 📊 VARIÁVEIS FINAIS NO RAILWAY

Após completar os passos, suas variáveis devem estar assim:

```env
✅ DATABASE_URL=postgresql://... (criado pelo Railway automaticamente)
✅ PORT=5000
✅ NODE_ENV=production
✅ JWT_SECRET=<seu_jwt_secret_aqui>
✅ JWT_EXPIRES_IN=7d
✅ FRONTEND_URL=<seu_dominio_hostgator>
✅ RATE_LIMIT_WINDOW_MS=900000
✅ RATE_LIMIT_MAX_REQUESTS=100
✅ GOOGLE_CLIENT_ID=<seu_google_client_id>
✅ GOOGLE_CLIENT_SECRET=<seu_google_client_secret>
✅ GOOGLE_CALLBACK_URL=https://estudio-unhas-production.up.railway.app/api/auth/google/callback
✅ DEFAULT_ADMIN_PASSWORD=<sua_senha_admin>
✅ SENDGRID_API_KEY=<seu_sendgrid_api_key>
✅ SENDGRID_FROM_EMAIL=<seu_email>

❌ DATABASE_PATH (REMOVER ESTA!)
```

---

## 🎯 RESUMO RÁPIDO

1. ➕ Adicionar PostgreSQL no Railway ("+  New" → "Database" → "PostgreSQL")
2. ✅ Verificar se `DATABASE_URL` apareceu nas variáveis do backend
3. ❌ Remover variável `DATABASE_PATH`
4. ⏳ Aguardar redeploy automático (2-3 min)
5. 🧪 Testar API com login admin

---

## 🆘 PROBLEMAS COMUNS

### 1. Deploy falha com erro "Route.get() requires callback"
**Causa:** Código antigo ainda está em cache
**Solução:** Aguardar deploy completo ou forçar redeploy

### 2. "Cannot connect to PostgreSQL"
**Causa:** `DATABASE_URL` não está configurada
**Solução:** Verificar se o PostgreSQL está "Active" e variável existe

### 3. Admin não consegue fazer login
**Causa:** Banco está vazio
**Solução:**
- Verificar logs: "Admin padrão criado com sucesso!"
- Se não aparecer, verificar `DEFAULT_ADMIN_PASSWORD` nas variáveis

### 4. Serviços não aparecem
**Causa:** Banco não foi inicializado
**Solução:**
- Verificar logs: "Serviços de exemplo inseridos!"
- Pode demorar alguns segundos após primeiro deploy

---

## 🔍 VERIFICAR SE DEU TUDO CERTO

Após completar todos os passos, vá em **Deploy Logs** e procure por:

```
✅ 🐘 Usando PostgreSQL (Produção)
✅ ✅ Conexão com PostgreSQL configurada
✅ ✅ Admin padrão criado com sucesso!
✅ ✅ Serviços de exemplo inseridos com sucesso!
✅ ✅ Banco de dados inicializado com sucesso!
```

Se aparecer tudo isso, **PARABÉNS!** 🎉 Seu banco PostgreSQL está funcionando!

---

## ⏭️ PRÓXIMO PASSO

Depois que o Railway estiver funcionando com PostgreSQL:
1. Faça o build do frontend (veja [DEPLOYMENT.md](DEPLOYMENT.md))
2. Upload para Hostgator
3. Teste o sistema completo

---

**Qualquer dúvida, consulte os logs do Railway em Deploy Logs!**
