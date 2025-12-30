const db = require('../config/database');
const { usePG } = require('../config/database');
const { sendEmail } = require('../services/emailService');
const whatsappService = require('../services/whatsappService');

/**
 * Enviar lembretes de agendamentos nas próximas 24 horas
 * Deve ser executado via cron job
 */
const sendAppointmentReminders = async () => {
  try {
    console.log('📧 Enviando lembretes de agendamentos...');

    // Buscar agendamentos nas próximas 24 horas que ainda não foram notificados
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const query = usePG
      ? `SELECT
          a.*,
          c.name as client_name,
          c.email as client_email,
          c.phone as client_phone,
          s.name as service_name,
          s.duration as service_duration,
          p.name as professional_name
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         LEFT JOIN professionals p ON a.professional_id = p.id
         WHERE a.appointment_date = $1
         AND a.status = 'confirmed'
         AND a.reminder_sent = false`
      : `SELECT
          a.*,
          c.name as client_name,
          c.email as client_email,
          c.phone as client_phone,
          s.name as service_name,
          s.duration as service_duration,
          p.name as professional_name
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         LEFT JOIN professionals p ON a.professional_id = p.id
         WHERE a.appointment_date = ?
         AND a.status = 'confirmed'
         AND a.reminder_sent = 0`;

    const appointments = await db.all(query, [tomorrowStr]);

    console.log(`📋 Encontrados ${appointments.length} agendamentos para lembrete`);

    for (const appointment of appointments) {
      try {
        // Enviar email
        await sendEmail({
          to: appointment.client_email,
          subject: 'Lembrete: Seu agendamento é amanhã! 💅',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #e91e63;">Lembrete de Agendamento</h2>
              <p>Olá, ${appointment.client_name}!</p>
              <p>Este é um lembrete de que você tem um agendamento amanhã:</p>

              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Serviço:</strong> ${appointment.service_name}</p>
                <p><strong>Data:</strong> ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}</p>
                <p><strong>Horário:</strong> ${appointment.appointment_time}</p>
                <p><strong>Duração:</strong> ${appointment.service_duration} minutos</p>
                ${appointment.professional_name ? `<p><strong>Profissional:</strong> ${appointment.professional_name}</p>` : ''}
              </div>

              <p>Caso precise cancelar ou reagendar, por favor entre em contato conosco com antecedência.</p>
              <p>Aguardamos você! 💅✨</p>

              <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
              <p style="font-size: 12px; color: #666;">
                Este é um email automático de lembrete. Não responda este email.
              </p>
            </div>
          `
        });

        // Enviar também via WhatsApp se configurado e cliente tiver telefone
        if (whatsappService.isWhatsAppConfigured() && appointment.client_phone) {
          await whatsappService.sendAppointmentReminder(
            appointment.client_phone,
            {
              clientName: appointment.client_name,
              serviceName: appointment.service_name,
              date: appointment.appointment_date,
              time: appointment.appointment_time
            }
          );
        }

        // Marcar como enviado
        const updateQuery = usePG
          ? 'UPDATE appointments SET reminder_sent = true WHERE id = $1'
          : 'UPDATE appointments SET reminder_sent = 1 WHERE id = ?';

        await db.run(updateQuery, [appointment.id]);
        console.log(`✅ Lembrete enviado para ${appointment.client_email} (ID ${appointment.id})`);

      } catch (error) {
        console.error(`❌ Erro ao enviar lembrete para ${appointment.client_email}:`, error);
      }
    }

    console.log('✅ Processo de lembretes concluído');
  } catch (err) {
    console.error('Erro ao enviar lembretes:', err);
  }
};

/**
 * Enviar notificação de agendamento confirmado
 */
const sendAppointmentConfirmation = async (appointmentId) => {
  try {
    const query = usePG
      ? `SELECT
          a.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name,
          s.duration as service_duration,
          s.price as service_price
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.id = $1`
      : `SELECT
          a.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name,
          s.duration as service_duration,
          s.price as service_price
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.id = ?`;

    const appointment = await db.get(query, [appointmentId]);

    if (!appointment) {
      throw new Error('Agendamento não encontrado');
    }

    await sendEmail({
      to: appointment.client_email,
      subject: 'Agendamento Confirmado! 💅',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4caf50;">Agendamento Confirmado! ✅</h2>
          <p>Olá, ${appointment.client_name}!</p>
          <p>Seu agendamento foi confirmado com sucesso:</p>

          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <p><strong>Serviço:</strong> ${appointment.service_name}</p>
            <p><strong>Data:</strong> ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> ${appointment.appointment_time}</p>
            <p><strong>Duração:</strong> ${appointment.service_duration} minutos</p>
            <p><strong>Valor:</strong> R$ ${appointment.service_price.toFixed(2)}</p>
          </div>

          <p>Você receberá um lembrete 24 horas antes do seu horário.</p>
          <p>Aguardamos você! 💅✨</p>

          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #666;">
            Estúdio de Unhas - Beleza e Cuidado
          </p>
        </div>
      `
    });
  } catch (err) {
    console.error('Error sending appointment confirmation:', err);
    throw err;
  }
};

/**
 * Enviar notificação de cancelamento
 */
const sendCancellationNotification = async (appointmentId) => {
  try {
    const query = usePG
      ? `SELECT
          a.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.id = $1`
      : `SELECT
          a.*,
          c.name as client_name,
          c.email as client_email,
          s.name as service_name
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.id = ?`;

    const appointment = await db.get(query, [appointmentId]);

    if (!appointment) {
      throw new Error('Agendamento não encontrado');
    }

    await sendEmail({
      to: appointment.client_email,
      subject: 'Agendamento Cancelado',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Agendamento Cancelado</h2>
          <p>Olá, ${appointment.client_name}!</p>
          <p>Seu agendamento foi cancelado:</p>

          <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
            <p><strong>Serviço:</strong> ${appointment.service_name}</p>
            <p><strong>Data:</strong> ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> ${appointment.appointment_time}</p>
          </div>

          <p>Se você não solicitou este cancelamento, entre em contato conosco imediatamente.</p>
          <p>Esperamos vê-lo em breve! 💅</p>

          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="font-size: 12px; color: #666;">
            Estúdio de Unhas - Beleza e Cuidado
          </p>
        </div>
      `
    });
  } catch (err) {
    console.error('Error sending cancellation notification:', err);
    throw err;
  }
};

module.exports = {
  sendAppointmentReminders,
  sendAppointmentConfirmation,
  sendCancellationNotification
};
