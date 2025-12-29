const sgMail = require('@sendgrid/mail');
require('dotenv').config();

let emailEnabled = false;

// Configurar SendGrid apenas se a API key estiver disponível
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  emailEnabled = true;
  console.log('✅ SendGrid configurado - serviço de email habilitado');
} else {
  console.warn('⚠️  SENDGRID_API_KEY não configurada - funcionalidade de email desabilitada');
}

// Enviar email de recuperação de senha
const sendPasswordResetEmail = async (email, name, code) => {
  if (!emailEnabled) {
    console.warn('⚠️  Email não configurado - não foi possível enviar email de recuperação');
    throw new Error('Serviço de email não disponível no momento');
  }

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@example.com',
    subject: 'Recuperação de Senha - Estúdio de Unhas',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #ff69b4;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 5px 5px;
          }
          .code {
            background-color: #fff;
            border: 2px dashed #ff69b4;
            padding: 20px;
            text-align: center;
            font-size: 32px;
            font-weight: bold;
            color: #ff69b4;
            letter-spacing: 5px;
            margin: 20px 0;
            border-radius: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Recuperação de Senha</h1>
          </div>
          <div class="content">
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Você solicitou a recuperação de senha da sua conta no Estúdio de Unhas.</p>
            <p>Use o código abaixo para redefinir sua senha:</p>
            <div class="code">${code}</div>
            <p><strong>Este código expira em 15 minutos.</strong></p>
            <p>Se você não solicitou esta recuperação, ignore este email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Estúdio de Unhas - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Email de recuperação enviado para:', email);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    if (error.response) {
      console.error('Detalhes do erro SendGrid:', error.response.body);
    }
    throw error;
  }
};

// Enviar email de confirmação de agendamento
const sendAppointmentConfirmation = async (email, name, appointmentDetails) => {
  const { service, date, time, price } = appointmentDetails;

  if (!emailEnabled) {
    console.warn('⚠️  Email não configurado - não foi possível enviar confirmação de agendamento');
    throw new Error('Serviço de email não disponível no momento');
  }

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER || 'noreply@example.com',
    subject: 'Confirmação de Agendamento - Estúdio de Unhas',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #ff69b4;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 5px 5px;
          }
          .details {
            background-color: #fff;
            border-left: 4px solid #ff69b4;
            padding: 15px;
            margin: 20px 0;
          }
          .details p {
            margin: 10px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Agendamento Confirmado!</h1>
          </div>
          <div class="content">
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Seu agendamento foi realizado com sucesso!</p>
            <div class="details">
              <p><strong>Serviço:</strong> ${service}</p>
              <p><strong>Data:</strong> ${new Date(date).toLocaleDateString('pt-BR')}</p>
              <p><strong>Horário:</strong> ${time}</p>
              <p><strong>Valor:</strong> R$ ${price.toFixed(2)}</p>
            </div>
            <p>Aguardamos você! Em caso de imprevistos, por favor entre em contato conosco com antecedência.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Estúdio de Unhas - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Email de confirmação enviado para:', email);
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    if (error.response) {
      console.error('Detalhes do erro SendGrid:', error.response.body);
    }
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendAppointmentConfirmation
};
