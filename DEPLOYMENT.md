# 🚀 Guia de Deployment - Estúdio de Unhas

## 📋 Pré-requisitos

- ✅ Código no GitHub (já configurado)
- ✅ Backend no Railway (auto-deploy ativo)
- ✅ Frontend no Hostgator

---

## 🔧 PARTE 1: Verificar Backend Railway

### 1.1 Acesse o Dashboard Railway
1. Vá para: https://railway.app
2. Acesse seu projeto "estudio-unhas-production"
3. Verifique se o último deploy foi bem-sucedido

### 1.2 Confirmar Variáveis de Ambiente
No Railway, vá em **Variables** e confirme que existem:

```env
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=sua_chave_secreta_aqui
PORT=5000
NODE_ENV=production
```

### 1.3 Adicionar CORS para Hostgator
**IMPORTANTE:** Adicione a variável para permitir requisições do frontend:

```env
CORS_ORIGIN=https://seudominio.com.br
```

> ⚠️ Substitua `seudominio.com.br` pelo seu domínio real do Hostgator

### 1.4 Testar API
Após salvar as variáveis, teste se a API está respondendo:
- Acesse: `https://estudio-unhas-production.up.railway.app/api/services`
- Deve retornar a lista de serviços (ou erro de autenticação se protegido)

---

## 💻 PARTE 2: Build do Frontend

### 2.1 Verificar Arquivo .env.production
O arquivo `.env.production` já está criado na pasta `frontend/`:

```env
VITE_API_URL=https://estudio-unhas-production.up.railway.app/api
VITE_WS_URL=wss://estudio-unhas-production.up.railway.app
```

> ⚠️ Se a URL do Railway for diferente, edite este arquivo antes do build!

### 2.2 Fazer Build de Produção
Abra o terminal na pasta `frontend/` e execute:

```bash
cd frontend
npm run build
```

Isso criará a pasta `dist/` com os arquivos otimizados para produção.

### 2.3 Verificar Arquivos Gerados
Após o build, você terá em `frontend/dist/`:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── (outras imagens e assets)
└── .htaccess (já incluído automaticamente)
```

---

## 📤 PARTE 3: Upload para Hostgator

### 3.1 Acessar cPanel do Hostgator
1. Faça login no cPanel da Hostgator
2. Acesse o **Gerenciador de Arquivos** (File Manager)

### 3.2 Preparar Diretório
3. Navegue até `public_html/` (ou o diretório do seu domínio)
4. **BACKUP:** Se já existir algo, faça backup primeiro!
5. Limpe a pasta (ou crie uma subpasta se preferir)

### 3.3 Upload dos Arquivos
6. Clique em **Upload**
7. Selecione **TODOS** os arquivos de dentro da pasta `frontend/dist/`:
   - `index.html`
   - Pasta `assets/` completa
   - `.htaccess`

**OU** usando FTP (mais rápido para muitos arquivos):
```
Host: ftp.seudominio.com.br
Usuário: seu_usuario_cpanel
Senha: sua_senha_cpanel
Porta: 21
```

Upload toda a pasta `dist/` → `public_html/`

### 3.4 Verificar Estrutura Final
Seu `public_html/` deve ficar assim:
```
public_html/
├── index.html
├── .htaccess
└── assets/
    ├── index-[hash].js
    ├── index-[hash].css
    └── ...
```

---

## ✅ PARTE 4: Configuração Final no Hostgator

### 4.1 Verificar Permissões
No cPanel → Gerenciador de Arquivos:
- `.htaccess` deve ter permissão `644`
- Pastas devem ter `755`
- Arquivos devem ter `644`

### 4.2 Verificar mod_rewrite
No cPanel, procure por **MultiPHP INI Editor** ou **PHP Configuration**:
- Certifique-se que `mod_rewrite` está habilitado
- (Geralmente já vem habilitado na Hostgator)

### 4.3 SSL/HTTPS
1. No cPanel, vá em **SSL/TLS Status**
2. Ative SSL gratuito para seu domínio (Let's Encrypt)
3. Aguarde alguns minutos para propagar

---

## 🧪 PARTE 5: Testar em Produção

### 5.1 Testes Básicos
Acesse: `https://seudominio.com.br`

✅ Verificar:
- [ ] Página carrega sem erros
- [ ] Dark mode funciona
- [ ] Navegação entre páginas funciona (sem 404)
- [ ] Imagens e estilos carregam

### 5.2 Testar Autenticação
- [ ] Fazer login com usuário existente
- [ ] Verificar se token é salvo
- [ ] Logout funciona

### 5.3 Testar Funcionalidades Principais
**Cliente:**
- [ ] Criar novo agendamento
- [ ] Aplicar cupom de desconto
- [ ] Ver lista de espera
- [ ] Ver agendamentos recorrentes
- [ ] Editar perfil
- [ ] Alterar senha

**Admin:**
- [ ] Dashboard com estatísticas
- [ ] Gerenciar galeria (upload de imagens)
- [ ] Gerenciar profissionais
- [ ] Ver e pagar comissões
- [ ] Criar/editar cupons
- [ ] Ver relatório financeiro
- [ ] Chat com clientes (WebSocket)

### 5.4 Testar Responsividade
Teste em:
- [ ] Mobile (iPhone/Android)
- [ ] Tablet
- [ ] Desktop
- [ ] Orientação portrait e landscape

---

## 🐛 Troubleshooting

### Problema: Página 404 ao navegar
**Solução:** Verificar se `.htaccess` foi enviado corretamente

### Problema: Erro de CORS
**Solução:**
1. Verificar variável `CORS_ORIGIN` no Railway
2. Certificar-se que a URL está correta (com https://)
3. Reiniciar o servidor Railway se necessário

### Problema: API não responde
**Solução:**
1. Verificar logs no Railway
2. Testar URL diretamente: `https://estudio-unhas-production.up.railway.app/api/health`
3. Verificar se banco de dados está conectado

### Problema: Chat não funciona (WebSocket)
**Solução:**
1. Verificar se Railway suporta WebSocket (suporta!)
2. Confirmar URL no `.env.production`: `wss://...` (não `ws://`)
3. Verificar logs do navegador (Console → Network → WS)

### Problema: Estilos não carregam
**Solução:**
1. Limpar cache do navegador (Ctrl+Shift+R)
2. Verificar se pasta `assets/` foi enviada completa
3. Verificar permissões dos arquivos (644)

### Problema: Build falha
**Solução:**
```bash
# Limpar cache e reinstalar dependências
cd frontend
rm -rf node_modules dist
npm install
npm run build
```

---

## 🔄 Atualizações Futuras

### Para atualizar o sistema depois:

1. **Backend (Railway):**
   - Faça commit e push no GitHub
   - Railway faz deploy automático ✅

2. **Frontend (Hostgator):**
   ```bash
   cd frontend
   npm run build
   ```
   - Upload novamente a pasta `dist/` para o Hostgator
   - ⚠️ Não esqueça de limpar cache do navegador após atualizar!

---

## 📞 Contatos de Suporte

- **Railway:** https://railway.app/help
- **Hostgator:** https://suporte.hostgator.com.br
- **GitHub:** https://github.com/seu-usuario/estudio-unhas

---

## ✨ Checklist Final

Antes de considerar o deployment completo:

- [ ] Backend no Railway está rodando sem erros
- [ ] Variável CORS_ORIGIN configurada corretamente
- [ ] Build do frontend concluído com sucesso
- [ ] Todos os arquivos enviados para Hostgator
- [ ] `.htaccess` está no lugar correto
- [ ] SSL/HTTPS ativo
- [ ] Login/Logout funcionando
- [ ] Todas as 16 funcionalidades testadas
- [ ] Responsividade verificada em 3 dispositivos
- [ ] Chat ao vivo (WebSocket) funcionando
- [ ] Sistema de cupons validando corretamente

---

**🎉 Parabéns! Seu sistema está em produção!**

Se precisar de ajuda, revise a seção de Troubleshooting acima.
