const whatsappService = require('../services/whatsappService');
const db = require('../config/database');
const { usePG } = require('../config/database');

/**
 * Verificar status da integração com WhatsApp
 */
const getWhatsAppStatus = (req, res) => {
  const isConfigured = whatsappService.isWhatsAppConfigured();

  res.json({
    enabled: isConfigured,
    message: isConfigured
      ? 'WhatsApp integrado e configurado'
      : 'WhatsApp não configurado. Configure as variáveis WHATSAPP_ENABLED, WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no .env'
  });
};

/**
 * Enviar mensagem de teste
 */
const sendTestMessage = async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ error: 'Telefone e mensagem são obrigatórios' });
  }

  try {
    const result = await whatsappService.sendTextMessage(phone, message);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Mensagem enviada com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem de teste' });
  }
};

/**
 * Enviar confirmação de agendamento via WhatsApp
 */
const sendAppointmentConfirmationWhatsApp = async (appointmentId) => {
  try {
    // Buscar dados do agendamento
    const query = usePG
      ? `SELECT
          a.*,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name,
          s.price as service_price
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.id = $1`
      : `SELECT
          a.*,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name,
          s.price as service_price
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.id = ?`;

    const appointment = await db.get(query, [appointmentId]);

    if (!appointment) {
      console.error('Agendamento não encontrado');
      return { success: false, error: 'Agendamento não encontrado' };
    }

    if (!appointment.client_phone) {
      console.warn('Cliente não tem telefone cadastrado');
      return { success: false, error: 'Cliente sem telefone' };
    }

    // Enviar mensagem
    const result = await whatsappService.sendAppointmentConfirmation(
      appointment.client_phone,
      {
        clientName: appointment.client_name,
        serviceName: appointment.service_name,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        price: appointment.service_price
      }
    );

    return result;

  } catch (error) {
    console.error('Erro ao enviar confirmação via WhatsApp:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Enviar lembrete via WhatsApp (para cron job)
 */
const sendAppointmentRemindersWhatsApp = async () => {
  try {
    console.log('📱 Enviando lembretes via WhatsApp...');

    if (!whatsappService.isWhatsAppConfigured()) {
      console.log('⚠️  WhatsApp não configurado, pulando envio de lembretes');
      return;
    }

    // Buscar agendamentos nas próximas 24 horas
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const query = usePG
      ? `SELECT
          a.*,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.appointment_date = $1
         AND a.status = 'confirmed'
         AND a.reminder_sent = false
         AND c.phone IS NOT NULL`
      : `SELECT
          a.*,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.appointment_date = ?
         AND a.status = 'confirmed'
         AND a.reminder_sent = 0
         AND c.phone IS NOT NULL`;

    const appointments = await db.all(query, [tomorrowStr]);

    console.log(`📋 Encontrados ${appointments.length} agendamentos para lembrete WhatsApp`);

    for (const appointment of appointments) {
      try {
        const result = await whatsappService.sendAppointmentReminder(
          appointment.client_phone,
          {
            clientName: appointment.client_name,
            serviceName: appointment.service_name,
            date: appointment.appointment_date,
            time: appointment.appointment_time
          }
        );

        if (result.success) {
          console.log(`✅ Lembrete WhatsApp enviado para ${appointment.client_phone}`);
        } else {
          console.error(`❌ Falha ao enviar lembrete WhatsApp: ${result.error}`);
        }

      } catch (error) {
        console.error(`❌ Erro ao enviar lembrete para ${appointment.client_phone}:`, error);
      }
    }

    console.log('✅ Processo de lembretes WhatsApp concluído');
  } catch (err) {
    console.error('Erro ao enviar lembretes WhatsApp:', err);
  }
};

/**
 * Enviar notificação de lista de espera via WhatsApp
 */
const sendWaitlistNotificationWhatsApp = async (waitlistId) => {
  try {
    const query = usePG
      ? `SELECT
          w.*,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name
         FROM waitlist w
         JOIN clients c ON w.client_id = c.id
         JOIN services s ON w.service_id = s.id
         WHERE w.id = $1`
      : `SELECT
          w.*,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name
         FROM waitlist w
         JOIN clients c ON w.client_id = c.id
         JOIN services s ON w.service_id = s.id
         WHERE w.id = ?`;

    const waitlistEntry = await db.get(query, [waitlistId]);

    if (!waitlistEntry || !waitlistEntry.client_phone) {
      return { success: false, error: 'Cliente não encontrado ou sem telefone' };
    }

    const result = await whatsappService.sendWaitlistNotification(
      waitlistEntry.client_phone,
      {
        clientName: waitlistEntry.client_name,
        serviceName: waitlistEntry.service_name,
        date: waitlistEntry.desired_date,
        time: waitlistEntry.desired_time
      }
    );

    return result;

  } catch (error) {
    console.error('Erro ao enviar notificação de waitlist via WhatsApp:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getWhatsAppStatus,
  sendTestMessage,
  sendAppointmentConfirmationWhatsApp,
  sendAppointmentRemindersWhatsApp,
  sendWaitlistNotificationWhatsApp
};
