const nodemailer = require('nodemailer');
require('dotenv').config();

let emailEnabled = false;
let transporter = null;

// Configurar transporter apenas se as credenciais estiverem disponíveis
if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Verificar conexão ao iniciar (sem bloquear o servidor)
  transporter.verify((error, success) => {
    if (error) {
      console.error('⚠️  Erro na configuração do email:', error.message);
      console.warn('⚠️  Funcionalidade de email desabilitada - verifique as configurações SMTP');
      emailEnabled = false;
    } else {
      console.log('✅ Servidor de email SMTP pronto para enviar mensagens');
      emailEnabled = true;
    }
  });
} else {
  console.warn('⚠️  Credenciais de email não configuradas - funcionalidade de email desabilitada');
}

// Enviar email de recuperação de senha
const sendPasswordResetEmail = async (email, name, code) => {
  if (!emailEnabled || !transporter) {
    console.warn('⚠️  Email não configurado - não foi possível enviar email de recuperação');
    throw new Error('Serviço de email não disponível no momento');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
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
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de recuperação enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    throw error;
  }
};

// Enviar email de confirmação de agendamento
const sendAppointmentConfirmation = async (email, name, appointmentDetails) => {
  const { service, date, time, price } = appointmentDetails;

  if (!emailEnabled || !transporter) {
    console.warn('⚠️  Email não configurado - não foi possível enviar confirmação de agendamento');
    throw new Error('Serviço de email não disponível no momento');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
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
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de confirmação enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendAppointmentConfirmation
};
