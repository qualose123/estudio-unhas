# Configuração do WhatsApp Business API

Este sistema possui integração com WhatsApp Business API para envio de notificações automáticas aos clientes.

## Recursos de Notificação WhatsApp

O sistema enviará mensagens WhatsApp nos seguintes casos:

- ✅ **Confirmação de Agendamento**: Quando um agendamento é criado e confirmado
- ⏰ **Lembretes Automáticos**: 24 horas antes do agendamento (via cron job diário)
- ❌ **Cancelamento**: Quando um agendamento é cancelado
- 📋 **Lista de Espera**: Quando uma vaga fica disponível
- 🎉 **Boas-vindas**: Quando um novo cliente se registra (opcional)
- ⭐ **Solicitação de Avaliação**: Após conclusão do serviço (opcional)

## Como Configurar

### Opção 1: WhatsApp Business API (Meta/Facebook)

1. **Criar conta no Meta for Developers**
   - Acesse: https://developers.facebook.com/
   - Crie uma conta e uma aplicação
   - Ative o produto "WhatsApp"

2. **Obter credenciais**
   - Phone Number ID: Encontrado em "WhatsApp > API Setup"
   - Access Token: Gere um token permanente em "WhatsApp > API Setup > Temporary access token"
   - Salve ambos, você precisará deles

3. **Configurar variáveis de ambiente**

   Adicione no arquivo `.env`:
   ```env
   # WhatsApp Business API
   WHATSAPP_ENABLED=true
   WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id_aqui
   WHATSAPP_ACCESS_TOKEN=seu_access_token_aqui
   WHATSAPP_API_VERSION=v18.0
   ```

4. **Verificar configuração**

   Após reiniciar o servidor, você pode verificar o status em:
   ```
   GET /api/whatsapp/status
   ```
   (Apenas admin autenticado)

5. **Enviar mensagem de teste**

   ```bash
   POST /api/whatsapp/test
   {
     "phone": "5511999999999",
     "message": "Teste de integração WhatsApp"
   }
   ```

### Opção 2: Twilio (Alternativa)

Se preferir usar Twilio em vez da API oficial do Meta:

1. **Criar conta no Twilio**
   - Acesse: https://www.twilio.com/
   - Crie uma conta e ative WhatsApp Business

2. **Modificar whatsappService.js**
   - Substitua as chamadas à API do Meta por chamadas à API do Twilio
   - Use a biblioteca `twilio` do npm

3. **Configurar variáveis**
   ```env
   WHATSAPP_ENABLED=true
   TWILIO_ACCOUNT_SID=seu_account_sid
   TWILIO_AUTH_TOKEN=seu_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

### Opção 3: Vonage/Nexmo (Alternativa)

Similar ao Twilio, você pode usar Vonage:

1. Criar conta em https://www.vonage.com/
2. Ativar WhatsApp Business API
3. Modificar `whatsappService.js` para usar API da Vonage

## Usando o Sistema sem WhatsApp

Se você **NÃO** quiser usar WhatsApp:

1. Simplesmente deixe `WHATSAPP_ENABLED=false` ou não configure as variáveis
2. O sistema continuará funcionando normalmente, enviando apenas emails
3. Nenhuma mensagem WhatsApp será enviada

## Templates de Mensagem (Meta)

Para usar templates aprovados (recomendado para produção):

1. Acesse WhatsApp Manager no Meta Business Suite
2. Crie templates de mensagem para cada tipo de notificação
3. Aguarde aprovação do Meta (geralmente 24-48h)
4. Modifique `whatsappService.js` para usar `sendTemplateMessage` em vez de `sendTextMessage`

## Exemplo de Templates

### Template: appointment_confirmation
```
Olá {{1}}! 🎉

Seu agendamento foi confirmado:

📋 Serviço: {{2}}
📅 Data: {{3}}
🕐 Horário: {{4}}
💰 Valor: R$ {{5}}

Aguardamos você! 💅
```

### Template: appointment_reminder
```
⏰ Lembrete!

Olá {{1}}! Você tem um agendamento amanhã:

📋 {{2}}
📅 {{3}}
🕐 {{4}}

Nos vemos em breve! 💅✨
```

## Custos

- **Meta WhatsApp Business API**:
  - Primeiras 1.000 conversas/mês: GRÁTIS
  - Após isso: varia por país (~R$ 0,10 por conversa no Brasil)

- **Twilio**:
  - Pay-as-you-go: ~$0.005 por mensagem

- **Vonage**:
  - Pay-as-you-go: preços similares ao Twilio

## Limitações

- WhatsApp exige que o cliente tenha iniciado contato nas últimas 24h para mensagens livres
- Para mensagens proativas (lembretes, confirmações), você DEVE usar templates aprovados
- Taxa de spam/bloqueio pode resultar em suspensão da conta

## Melhores Práticas

1. ✅ Use templates aprovados para todas as mensagens automáticas
2. ✅ Respeite horários comerciais (não envie às 2h da manhã)
3. ✅ Sempre inclua opt-out (forma de cliente parar de receber)
4. ✅ Monitore taxa de bloqueio/spam
5. ❌ NÃO envie spam ou mensagens não solicitadas
6. ❌ NÃO envie mensagens promocionais sem consentimento

## Suporte

Para mais informações:
- Meta WhatsApp Docs: https://developers.facebook.com/docs/whatsapp
- Twilio WhatsApp Docs: https://www.twilio.com/docs/whatsapp
- Vonage WhatsApp Docs: https://developer.vonage.com/messaging/whatsapp/overview

## Troubleshooting

### "WhatsApp não configurado"
- Verifique se `WHATSAPP_ENABLED=true`
- Confirme que todas as variáveis estão no .env
- Reinicie o servidor após modificar o .env

### "Erro ao enviar mensagem"
- Verifique se o Access Token é válido
- Confirme que o Phone Number ID está correto
- Teste o token diretamente na API do Meta

### "Número inválido"
- O número deve estar no formato internacional: 5511999999999
- Não use parênteses, traços ou espaços
- Inclua o código do país (55 para Brasil)

### "Template não encontrado"
- Certifique-se de que o template foi aprovado pelo Meta
- Verifique o nome exato do template
- Confirme o código de idioma (pt_BR)
