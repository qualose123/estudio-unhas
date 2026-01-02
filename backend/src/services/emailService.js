const sgMail = require('@sendgrid/mail');

// Configurar SendGrid com a API Key
const setupSendGrid = () => {
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️  SENDGRID_API_KEY não configurada - emails não serão enviados');
    return false;
  }

  sgMail.setApiKey(apiKey);
  console.log('✅ SendGrid configurado com sucesso');
  return true;
};

// Inicializar SendGrid
const isConfigured = setupSendGrid();

/**
 * Enviar email usando SendGrid
 * @param {Object} options - Opções do email
 * @param {string} options.to - Email do destinatário
 * @param {string} options.subject - Assunto do email
 * @param {string} options.text - Texto simples do email
 * @param {string} options.html - HTML do email
 */
const sendEmail = async ({ to, subject, text, html }) => {
  if (!isConfigured) {
    console.warn('⚠️  SendGrid não configurado - email não enviado');
    return { success: false, error: 'SendGrid não configurado' };
  }

  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@estudiounhas.com',
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>')
    };

    await sgMail.send(msg);
    console.log(`✅ Email enviado com sucesso para: ${to}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    
    if (error.response) {
      console.error('Detalhes do erro SendGrid:', error.response.body);
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * Enviar email de boas-vindas para novo cliente
 */
const sendWelcomeEmail = async (clientEmail, clientName) => {
  const subject = '🎉 Bem-vindo ao Estúdio de Unhas!';
  const text = `
Olá ${clientName}!

Seja muito bem-vindo(a) ao Estúdio de Unhas! 💅

Estamos muito felizes em tê-lo(a) conosco. Agora você pode:
✨ Agendar seus horários online
📅 Ver seus agendamentos
⭐ Avaliar nossos serviços

Para começar, faça login em nossa plataforma e agende seu primeiro horário.

Atenciosamente,
Equipe Estúdio de Unhas
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff1f3;">
      <div style="background: linear-gradient(135deg, #f43f75 0%, #e11d5f 100%); padding: 30px; border-radius: 15px; text-align: center;">
        <h1 style="color: white; margin: 0;">🎉 Bem-vindo!</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; margin-top: 20px;">
        <h2 style="color: #f43f75;">Olá ${clientName}!</h2>
        <p style="color: #2a1d2a; line-height: 1.6;">
          Seja muito bem-vindo(a) ao <strong>Estúdio de Unhas</strong>! 💅
        </p>
        
        <p style="color: #2a1d2a; line-height: 1.6;">
          Estamos muito felizes em tê-lo(a) conosco. Agora você pode:
        </p>
        
        <ul style="color: #2a1d2a; line-height: 1.8;">
          <li>✨ Agendar seus horários online</li>
          <li>📅 Ver seus agendamentos</li>
          <li>⭐ Avaliar nossos serviços</li>
        </ul>
        
        <p style="color: #2a1d2a; line-height: 1.6;">
          Para começar, faça login em nossa plataforma e agende seu primeiro horário.
        </p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL}/login" 
             style="background: linear-gradient(135deg, #f43f75 0%, #e11d5f 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 10px; 
                    display: inline-block;
                    font-weight: bold;">
            Fazer Login
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #9b7e9b; font-size: 12px;">
        <p>Atenciosamente,<br>Equipe Estúdio de Unhas</p>
      </div>
    </div>
  `;

  return await sendEmail({ to: clientEmail, subject, text, html });
};

/**
 * Enviar email de confirmação de agendamento
 */
const sendAppointmentConfirmation = async (clientEmail, appointmentDetails) => {
  const { clientName, serviceName, date, time, price } = appointmentDetails;
  
  const subject = '✅ Agendamento Confirmado - Estúdio de Unhas';
  const text = `
Olá ${clientName}!

Seu agendamento foi confirmado com sucesso! 🎉

Detalhes do agendamento:
📋 Serviço: ${serviceName}
📅 Data: ${date}
🕐 Horário: ${time}
💰 Valor: R$ ${price}

Estamos ansiosos para atendê-lo(a)!

Atenciosamente,
Equipe Estúdio de Unhas
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff1f3;">
      <div style="background: linear-gradient(135deg, #f43f75 0%, #e11d5f 100%); padding: 30px; border-radius: 15px; text-align: center;">
        <h1 style="color: white; margin: 0;">✅ Agendamento Confirmado</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; margin-top: 20px;">
        <h2 style="color: #f43f75;">Olá ${clientName}!</h2>
        <p style="color: #2a1d2a; line-height: 1.6;">
          Seu agendamento foi confirmado com sucesso! 🎉
        </p>
        
        <div style="background: #fff1f3; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #f43f75; margin-top: 0;">Detalhes do Agendamento</h3>
          <p style="color: #2a1d2a; margin: 10px 0;"><strong>📋 Serviço:</strong> ${serviceName}</p>
          <p style="color: #2a1d2a; margin: 10px 0;"><strong>📅 Data:</strong> ${date}</p>
          <p style="color: #2a1d2a; margin: 10px 0;"><strong>🕐 Horário:</strong> ${time}</p>
          <p style="color: #2a1d2a; margin: 10px 0;"><strong>💰 Valor:</strong> R$ ${price}</p>
        </div>
        
        <p style="color: #2a1d2a; line-height: 1.6;">
          Estamos ansiosos para atendê-lo(a)! ✨
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #9b7e9b; font-size: 12px;">
        <p>Atenciosamente,<br>Equipe Estúdio de Unhas</p>
      </div>
    </div>
  `;

  return await sendEmail({ to: clientEmail, subject, text, html });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendAppointmentConfirmation
};
