const db = require('../config/database');
const { usePG } = require('../config/database');
const { notifyWaitlist } = require('./waitlistController');
const cache = require('../utils/cache');

// Listar todos os agendamentos (admin pode ver todos, cliente vê apenas os seus)
const getAllAppointments = async (req, res) => {
  try {
    const { status, date } = req.query;
    const isAdmin = req.user.type === 'admin';

    let query = `
      SELECT
        a.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        s.name as service_name,
        s.duration as service_duration,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
    `;

    const params = [];
    const conditions = [];
    let paramIndex = 1;

    // Se não for admin, filtrar apenas agendamentos do próprio cliente
    if (!isAdmin) {
      conditions.push(`a.client_id = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(req.user.id);
    }

    if (status) {
      conditions.push(`a.status = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(status);
    }

    if (date) {
      conditions.push(`a.appointment_date = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(date);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';

    const appointments = await db.all(query, params);
    res.json(appointments);
  } catch (err) {
    console.error('Erro ao buscar agendamentos:', err);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
};

// Buscar agendamento por ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.type === 'admin';

    let query = `
      SELECT
        a.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        s.name as service_name,
        s.duration as service_duration,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      WHERE a.id = ${usePG ? '$1' : '?'}
    `;

    const params = [id];

    // Se não for admin, verificar se o agendamento pertence ao cliente
    if (!isAdmin) {
      query += ` AND a.client_id = ${usePG ? '$2' : '?'}`;
      params.push(req.user.id);
    }

    const appointment = await db.get(query, params);

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json(appointment);
  } catch (err) {
    console.error('Erro ao buscar agendamento:', err);
    res.status(500).json({ error: 'Erro ao buscar agendamento' });
  }
};

// Criar novo agendamento (cliente)
const createAppointment = async (req, res) => {
  try {
    const { service_id, appointment_date, appointment_time, notes } = req.body;
    const client_id = req.user.id;

    // Verificar se o serviço existe e está ativo
    const serviceQuery = usePG
      ? 'SELECT * FROM services WHERE id = $1 AND active = true'
      : 'SELECT * FROM services WHERE id = ? AND active = 1';
    const service = await db.get(serviceQuery, [service_id]);

    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado ou inativo' });
    }

    // Verificar se o horário está bloqueado
    const blockQuery = usePG
      ? `SELECT * FROM time_blocks
         WHERE block_date = $1
         AND $2 >= start_time
         AND $2 < end_time`
      : `SELECT * FROM time_blocks
         WHERE block_date = ?
         AND ? >= start_time
         AND ? < end_time`;
    const blockParams = usePG
      ? [appointment_date, appointment_time]
      : [appointment_date, appointment_time, appointment_time];
    const block = await db.get(blockQuery, blockParams);

    if (block) {
      return res.status(400).json({ error: 'Horário bloqueado para agendamentos' });
    }

    // Verificar se já existe agendamento no mesmo horário
    const existingQuery = usePG
      ? `SELECT * FROM appointments
         WHERE appointment_date = $1
         AND appointment_time = $2
         AND status != 'cancelled'`
      : `SELECT * FROM appointments
         WHERE appointment_date = ?
         AND appointment_time = ?
         AND status != 'cancelled'`;
    const existing = await db.get(existingQuery, [appointment_date, appointment_time]);

    if (existing) {
      return res.status(400).json({ error: 'Horário já ocupado' });
    }

    // Criar agendamento
    const insertQuery = usePG
      ? `INSERT INTO appointments (client_id, service_id, appointment_date, appointment_time, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`
      : `INSERT INTO appointments (client_id, service_id, appointment_date, appointment_time, notes)
         VALUES (?, ?, ?, ?, ?)`;
    const result = await db.run(insertQuery, [client_id, service_id, appointment_date, appointment_time, notes || null]);
    const appointmentId = result.lastID;

    // Invalidar cache de horários disponíveis
    cache.del(`available_times:${appointment_date}:${service_id}`);

    // Buscar agendamento criado com informações completas
    const selectQuery = usePG
      ? `SELECT
          a.*,
          c.name as client_name,
          c.email as client_email,
          c.phone as client_phone,
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
          c.phone as client_phone,
          s.name as service_name,
          s.duration as service_duration,
          s.price as service_price
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.id = ?`;
    const appointment = await db.get(selectQuery, [appointmentId]);

    res.status(201).json(appointment);
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
};

// Atualizar agendamento
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, appointment_date, appointment_time, notes } = req.body;
    const isAdmin = req.user.type === 'admin';

    // Verificar se o agendamento existe
    let checkQuery = usePG
      ? 'SELECT * FROM appointments WHERE id = $1'
      : 'SELECT * FROM appointments WHERE id = ?';
    const checkParams = [id];

    // Se não for admin, verificar se pertence ao cliente
    if (!isAdmin) {
      checkQuery += usePG ? ' AND client_id = $2' : ' AND client_id = ?';
      checkParams.push(req.user.id);
    }

    const appointment = await db.get(checkQuery, checkParams);

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Cliente só pode cancelar ou alterar dados/horário (não status)
    if (!isAdmin && status && status !== 'cancelled') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar o status do agendamento' });
    }

    // Verificar antecedência mínima para cancelamento (24 horas)
    if (!isAdmin && status === 'cancelled') {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 24) {
        return res.status(400).json({
          error: 'Cancelamento não permitido. É necessário no mínimo 24 horas de antecedência para cancelar um agendamento.'
        });
      }
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(status);
    }
    if (appointment_date !== undefined) {
      updates.push(`appointment_date = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(appointment_date);
    }
    if (appointment_time !== undefined) {
      updates.push(`appointment_time = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(appointment_time);
    }
    if (notes !== undefined) {
      updates.push(`notes = ${usePG ? '$' + paramIndex++ : '?'}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const updateQuery = `UPDATE appointments SET ${updates.join(', ')} WHERE id = ${usePG ? '$' + paramIndex : '?'}`;
    await db.run(updateQuery, params);

    // Invalidar cache de horários disponíveis
    cache.del(`available_times:${appointment.appointment_date}:${appointment.service_id}`);

    // Se o agendamento foi cancelado, notificar lista de espera
    if (status === 'cancelled') {
      try {
        await notifyWaitlist(
          appointment.service_id,
          appointment.appointment_date,
          appointment.appointment_time
        );
      } catch (waitlistError) {
        console.error('Erro ao notificar lista de espera:', waitlistError);
        // Não bloquear a resposta por erro na lista de espera
      }
    }

    // Buscar agendamento atualizado
    const selectQuery = usePG
      ? `SELECT
          a.*,
          c.name as client_name,
          c.email as client_email,
          c.phone as client_phone,
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
          c.phone as client_phone,
          s.name as service_name,
          s.duration as service_duration,
          s.price as service_price
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         WHERE a.id = ?`;
    const updatedAppointment = await db.get(selectQuery, [id]);

    res.json(updatedAppointment);
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
};

// Deletar agendamento (admin apenas)
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const deleteQuery = usePG
      ? 'DELETE FROM appointments WHERE id = $1'
      : 'DELETE FROM appointments WHERE id = ?';
    const result = await db.run(deleteQuery, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json({ message: 'Agendamento deletado com sucesso' });
  } catch (err) {
    console.error('Erro ao deletar agendamento:', err);
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
};

// Verificar horários disponíveis
const getAvailableTimes = async (req, res) => {
  try {
    const { date, service_id } = req.query;

    if (!date || !service_id) {
      return res.status(400).json({ error: 'Data e serviço são obrigatórios' });
    }

    // Verificar cache primeiro
    const cacheKey = `available_times:${date}:${service_id}`;
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json({ ...cachedData, cached: true });
    }

    // Buscar duração do serviço
    const serviceQuery = usePG
      ? 'SELECT duration FROM services WHERE id = $1'
      : 'SELECT duration FROM services WHERE id = ?';
    const service = await db.get(serviceQuery, [service_id]);

    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Horários de funcionamento (7h às 18h, intervalo de 1h30)
    const workHours = {
      start: '07:00',
      end: '18:00',
      interval: 90 // minutos (1h30)
    };

    // Buscar agendamentos e bloqueios do dia
    const appointmentsQuery = usePG
      ? `SELECT appointment_time FROM appointments
         WHERE appointment_date = $1 AND status != 'cancelled'`
      : `SELECT appointment_time FROM appointments
         WHERE appointment_date = ? AND status != 'cancelled'`;
    const bookedTimes = await db.all(appointmentsQuery, [date]);

    const blocksQuery = usePG
      ? `SELECT start_time, end_time FROM time_blocks WHERE block_date = $1`
      : `SELECT start_time, end_time FROM time_blocks WHERE block_date = ?`;
    const blocks = await db.all(blocksQuery, [date]);

    const availableTimes = [];
    let currentTime = workHours.start;

    while (currentTime < workHours.end) {
      // Verificar se está nos horários bloqueados
      const isBlocked = blocks.some(
        block => currentTime >= block.start_time && currentTime < block.end_time
      );

      // Verificar se já está agendado
      const isBooked = bookedTimes.some(b => b.appointment_time === currentTime);

      if (!isBlocked && !isBooked) {
        availableTimes.push(currentTime);
      }

      // Incrementar tempo
      const [hours, minutes] = currentTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + workHours.interval;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    }

    const result = { date, availableTimes };

    // Salvar no cache (TTL de 5 minutos)
    cache.set(cacheKey, result, 300);

    res.json(result);
  } catch (err) {
    console.error('Erro ao buscar horários disponíveis:', err);
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' });
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAvailableTimes
};
