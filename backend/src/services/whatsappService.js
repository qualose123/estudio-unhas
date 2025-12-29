const axios = require('axios');

/**
 * Serviço de integração com WhatsApp Business API
 *
 * Este serviço permite enviar mensagens via WhatsApp usando a API oficial
 * do WhatsApp Business ou serviços como Twilio, Vonage, etc.
 *
 * Para usar este serviço, você precisa:
 * 1. Configurar uma conta no WhatsApp Business API
 * 2. Obter as credenciais (Phone Number ID, Access Token)
 * 3. Configurar as variáveis de ambiente no .env
 *
 * Variáveis necessárias no .env:
 * - WHATSAPP_ENABLED=true
 * - WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
 * - WHATSAPP_ACCESS_TOKEN=seu_access_token
 * - WHATSAPP_API_VERSION=v18.0
 */

// Configurações
const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === 'true';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v18.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Verificar se o WhatsApp está configurado
 */
const isWhatsAppConfigured = () => {
  return WHATSAPP_ENABLED && PHONE_NUMBER_ID && ACCESS_TOKEN;
};

/**
 * Formatar número de telefone para WhatsApp
 * Remove caracteres especiais e adiciona código do país se necessário
 */
const formatPhoneNumber = (phone) => {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');

  // Se não tem código do país, adiciona +55 (Brasil)
  if (cleaned.length === 11 && cleaned.startsWith('11')) {
    cleaned = '55' + cleaned;
  } else if (cleaned.length === 10) {
    cleaned = '55' + cleaned;
  }

  return cleaned;
};

/**
 * Enviar mensagem de texto simples
 */
const sendTextMessage = async (to, message) => {
  if (!isWhatsAppConfigured()) {
    console.warn('WhatsApp não configurado. Mensagem não enviada.');
    return { success: false, error: 'WhatsApp não configurado' };
  }

  try {
    const formattedPhone = formatPhoneNumber(to);

    const response = await axios.post(
      `${BASE_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Mensagem WhatsApp enviada para ${formattedPhone}`);
    return {
      success: true,
      messageId: response.data.messages[0].id
    };

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Enviar mensagem com template aprovado
 * Templates precisam ser pré-aprovados pelo WhatsApp Business
 */
const sendTemplateMessage = async (to, templateName, language = 'pt_BR', components = []) => {
  if (!isWhatsAppConfigured()) {
    console.warn('WhatsApp não configurado. Mensagem não enviada.');
    return { success: false, error: 'WhatsApp não configurado' };
  }

  try {
    const formattedPhone = formatPhoneNumber(to);

    const response = await axios.post(
      `${BASE_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          },
          components: components
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Template WhatsApp enviado para ${formattedPhone}`);
    return {
      success: true,
      messageId: response.data.messages[0].id
    };

  } catch (error) {
    console.error('❌ Erro ao enviar template WhatsApp:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.error || error.message
    };
  }
};

/**
 * Enviar confirmação de agendamento via WhatsApp
 */
const sendAppointmentConfirmation = async (clientPhone, appointmentData) => {
  const { clientName, serviceName, date, time, price } = appointmentData;

  const message = `
🎉 *Agendamento Confirmado!*

Olá ${clientName}! ✨

Seu agendamento foi confirmado com sucesso:

📋 *Serviço:* ${serviceName}
📅 *Data:* ${new Date(date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${time}
💰 *Valor:* R$ ${parseFloat(price).toFixed(2)}

Aguardamos você! 💅

_Estúdio de Unhas - Beleza e Cuidado_
`.trim();

  return await sendTextMessage(clientPhone, message);
};

/**
 * Enviar lembrete de agendamento
 */
const sendAppointmentReminder = async (clientPhone, appointmentData) => {
  const { clientName, serviceName, date, time } = appointmentData;

  const message = `
⏰ *Lembrete de Agendamento*

Olá ${clientName}!

Este é um lembrete de que você tem um agendamento amanhã:

📋 *Serviço:* ${serviceName}
📅 *Data:* ${new Date(date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${time}

Nos vemos em breve! 💅✨

_Estúdio de Unhas_
`.trim();

  return await sendTextMessage(clientPhone, message);
};

/**
 * Enviar notificação de cancelamento
 */
const sendCancellationNotification = async (clientPhone, appointmentData) => {
  const { clientName, serviceName, date, time } = appointmentData;

  const message = `
❌ *Agendamento Cancelado*

Olá ${clientName},

Seu agendamento foi cancelado:

📋 *Serviço:* ${serviceName}
📅 *Data:* ${new Date(date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${time}

Se você não solicitou este cancelamento, entre em contato conosco.

Esperamos vê-lo em breve! 💅

_Estúdio de Unhas_
`.trim();

  return await sendTextMessage(clientPhone, message);
};

/**
 * Enviar notificação de vaga disponível (waitlist)
 */
const sendWaitlistNotification = async (clientPhone, appointmentData) => {
  const { clientName, serviceName, date, time } = appointmentData;

  const message = `
✨ *Horário Disponível!*

Olá ${clientName}!

Surgiu uma vaga para o horário que você estava aguardando:

📋 *Serviço:* ${serviceName}
📅 *Data:* ${new Date(date).toLocaleDateString('pt-BR')}
🕐 *Horário:* ${time}

⚠️ Esta vaga ficará disponível por tempo limitado!

Acesse o sistema para confirmar seu agendamento.

_Estúdio de Unhas_
`.trim();

  return await sendTextMessage(clientPhone, message);
};

/**
 * Enviar mensagem de boas-vindas
 */
const sendWelcomeMessage = async (clientPhone, clientName) => {
  const message = `
🎉 *Bem-vindo(a) ao Estúdio de Unhas!*

Olá ${clientName}!

Ficamos felizes em ter você conosco! 💅✨

Nossos serviços incluem:
• Manicure
• Pedicure
• Unhas de Gel
• Unha Decorada
• Spa dos Pés

Você pode agendar seus serviços diretamente pelo nosso sistema.

Estamos aqui para cuidar de você! 💖

_Estúdio de Unhas - Beleza e Cuidado_
`.trim();

  return await sendTextMessage(clientPhone, message);
};

/**
 * Enviar solicitação de avaliação
 */
const sendReviewRequest = async (clientPhone, appointmentData) => {
  const { clientName, serviceName } = appointmentData;

  const message = `
⭐ *Avalie sua Experiência*

Olá ${clientName}!

Esperamos que você tenha gostado do serviço de *${serviceName}*! 💅

Sua opinião é muito importante para nós.

Acesse o sistema para deixar sua avaliação e nos ajude a melhorar cada vez mais!

Muito obrigado! 💖

_Estúdio de Unhas_
`.trim();

  return await sendTextMessage(clientPhone, message);
};

module.exports = {
  isWhatsAppConfigured,
  sendTextMessage,
  sendTemplateMessage,
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendCancellationNotification,
  sendWaitlistNotification,
  sendWelcomeMessage,
  sendReviewRequest
};
