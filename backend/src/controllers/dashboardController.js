const db = require('../config/database');
const { usePG } = require('../config/database');

/**
 * Dashboard principal com estatísticas gerais
 */
const getDashboardStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const stats = {};

    // Total de clientes
    const query1 = 'SELECT COUNT(*) as total FROM clients';
    const result1 = await db.get(query1, []);
    stats.total_clients = result1 ? result1.total : 0;

    // Total de agendamentos
    let query2 = 'SELECT COUNT(*) as total FROM appointments';
    const params2 = [];
    let paramIndex2 = 1;

    if (start_date || end_date) {
      const conditions = [];
      if (start_date) {
        conditions.push(usePG ? `appointment_date >= $${paramIndex2++}` : 'appointment_date >= ?');
        params2.push(start_date);
      }
      if (end_date) {
        conditions.push(usePG ? `appointment_date <= $${paramIndex2++}` : 'appointment_date <= ?');
        params2.push(end_date);
      }
      query2 += ' WHERE ' + conditions.join(' AND ');
    }

    const result2 = await db.get(query2, params2);
    stats.total_appointments = result2 ? result2.total : 0;

    // Agendamentos por status
    let query3 = 'SELECT status, COUNT(*) as count FROM appointments';
    const params3 = [];
    let paramIndex3 = 1;

    if (start_date || end_date) {
      const conditions = [];
      if (start_date) {
        conditions.push(usePG ? `appointment_date >= $${paramIndex3++}` : 'appointment_date >= ?');
        params3.push(start_date);
      }
      if (end_date) {
        conditions.push(usePG ? `appointment_date <= $${paramIndex3++}` : 'appointment_date <= ?');
        params3.push(end_date);
      }
      query3 += ' WHERE ' + conditions.join(' AND ');
    }

    query3 += ' GROUP BY status';

    const results3 = await db.all(query3, params3);
    stats.appointments_by_status = {};
    if (results3) {
      results3.forEach(r => {
        stats.appointments_by_status[r.status] = r.count;
      });
    }

    // Receita total (agendamentos confirmed e completed)
    let query4 = `
      SELECT SUM(s.price) as total
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status IN ('confirmed', 'completed')
    `;
    const params4 = [];
    let paramIndex4 = 1;

    if (start_date || end_date) {
      if (start_date) {
        query4 += usePG ? ` AND a.appointment_date >= $${paramIndex4++}` : ' AND a.appointment_date >= ?';
        params4.push(start_date);
      }
      if (end_date) {
        query4 += usePG ? ` AND a.appointment_date <= $${paramIndex4++}` : ' AND a.appointment_date <= ?';
        params4.push(end_date);
      }
    }

    const result4 = await db.get(query4, params4);
    stats.total_revenue = result4 && result4.total ? parseFloat(result4.total.toFixed(2)) : 0;

    // Serviços mais populares
    let query5 = `
      SELECT
        s.id,
        s.name,
        COUNT(*) as count,
        SUM(s.price) as revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status IN ('confirmed', 'completed')
    `;
    const params5 = [];
    let paramIndex5 = 1;

    if (start_date || end_date) {
      if (start_date) {
        query5 += usePG ? ` AND a.appointment_date >= $${paramIndex5++}` : ' AND a.appointment_date >= ?';
        params5.push(start_date);
      }
      if (end_date) {
        query5 += usePG ? ` AND a.appointment_date <= $${paramIndex5++}` : ' AND a.appointment_date <= ?';
        params5.push(end_date);
      }
    }

    query5 += ' GROUP BY s.id, s.name ORDER BY count DESC LIMIT 5';

    const results5 = await db.all(query5, params5);
    stats.popular_services = results5 || [];

    // Média de avaliações
    const query6 = usePG
      ? 'SELECT AVG(rating) as average, COUNT(*) as total FROM reviews WHERE active = true'
      : 'SELECT AVG(rating) as average, COUNT(*) as total FROM reviews WHERE active = 1';

    const result6 = await db.get(query6, []);
    stats.reviews_average = result6 && result6.average
      ? Math.round(result6.average * 10) / 10
      : 0;
    stats.reviews_count = result6 ? result6.total : 0;

    // Comissões pendentes
    const query7 = `SELECT
        COUNT(*) as count,
        SUM(commission_amount) as total
       FROM commissions
       WHERE status = 'pending'`;

    const result7 = await db.get(query7, []);
    stats.pending_commissions = {
      count: result7 ? result7.count : 0,
      total: result7 && result7.total ? parseFloat(result7.total.toFixed(2)) : 0
    };

    // Lista de espera ativa
    const query8 = 'SELECT COUNT(*) as count FROM waitlist WHERE status = \'waiting\'';
    const result8 = await db.get(query8, []);
    stats.active_waitlist = result8 ? result8.count : 0;

    // Agendamentos recorrentes ativos
    const query9 = usePG
      ? 'SELECT COUNT(*) as count FROM recurring_appointments WHERE active = true'
      : 'SELECT COUNT(*) as count FROM recurring_appointments WHERE active = 1';

    const result9 = await db.get(query9, []);
    stats.active_recurring = result9 ? result9.count : 0;

    // Agendamentos por dia (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const query10 = usePG
      ? `SELECT
          appointment_date as date,
          COUNT(*) as count
         FROM appointments
         WHERE appointment_date >= $1
         GROUP BY appointment_date
         ORDER BY appointment_date ASC`
      : `SELECT
          appointment_date as date,
          COUNT(*) as count
         FROM appointments
         WHERE appointment_date >= ?
         GROUP BY appointment_date
         ORDER BY appointment_date ASC`;

    const results10 = await db.all(query10, [dateStr]);
    stats.appointments_by_day = results10 || [];

    // Total de imagens na galeria
    const query11 = usePG
      ? 'SELECT COUNT(*) as count, SUM(views) as views, SUM(likes) as likes FROM gallery WHERE active = true'
      : 'SELECT COUNT(*) as count, SUM(views) as views, SUM(likes) as likes FROM gallery WHERE active = 1';

    const result11 = await db.get(query11, []);
    stats.gallery = {
      total_images: result11 ? result11.count : 0,
      total_views: result11 ? result11.views || 0 : 0,
      total_likes: result11 ? result11.likes || 0 : 0
    };

    res.json(stats);
  } catch (err) {
    console.error('Erro ao gerar estatísticas:', err);
    res.status(500).json({ error: 'Erro ao gerar estatísticas do dashboard' });
  }
};

/**
 * Relatório financeiro detalhado
 */
const getFinancialReport = async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    let dateGroup;
    if (usePG) {
      switch (group_by) {
        case 'month':
          dateGroup = "TO_CHAR(appointment_date, 'YYYY-MM')";
          break;
        case 'week':
          dateGroup = "TO_CHAR(appointment_date, 'YYYY-IW')";
          break;
        default:
          dateGroup = 'appointment_date';
      }
    } else {
      switch (group_by) {
        case 'month':
          dateGroup = "strftime('%Y-%m', appointment_date)";
          break;
        case 'week':
          dateGroup = "strftime('%Y-W%W', appointment_date)";
          break;
        default:
          dateGroup = 'appointment_date';
      }
    }

    let query = `
      SELECT
        ${dateGroup} as period,
        COUNT(*) as total_appointments,
        SUM(s.price) as revenue,
        AVG(s.price) as average_ticket
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.status IN ('confirmed', 'completed')
    `;

    const params = [];
    let paramIndex = 1;

    if (start_date) {
      query += usePG ? ` AND a.appointment_date >= $${paramIndex++}` : ' AND a.appointment_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += usePG ? ` AND a.appointment_date <= $${paramIndex++}` : ' AND a.appointment_date <= ?';
      params.push(end_date);
    }

    query += ` GROUP BY ${dateGroup} ORDER BY period ASC`;

    const results = await db.all(query, params);

    // Calcular totais
    const totals = results.reduce((acc, row) => {
      acc.total_revenue += row.revenue || 0;
      acc.total_appointments += row.total_appointments || 0;
      return acc;
    }, { total_revenue: 0, total_appointments: 0 });

    res.json({
      data: results,
      totals: {
        total_revenue: parseFloat(totals.total_revenue.toFixed(2)),
        total_appointments: totals.total_appointments,
        average_ticket: totals.total_appointments > 0
          ? parseFloat((totals.total_revenue / totals.total_appointments).toFixed(2))
          : 0
      }
    });
  } catch (err) {
    console.error('Error generating financial report:', err);
    res.status(500).json({ error: 'Erro ao gerar relatório financeiro' });
  }
};

/**
 * Próximos agendamentos (hoje e próximos dias)
 */
const getUpcomingAppointments = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const today = new Date().toISOString().split('T')[0];

    const query = usePG
      ? `SELECT
          a.*,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name,
          s.duration as service_duration,
          p.name as professional_name
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         LEFT JOIN professionals p ON a.professional_id = p.id
         WHERE a.appointment_date >= $1
         AND a.status = 'confirmed'
         ORDER BY a.appointment_date ASC, a.appointment_time ASC
         LIMIT $2`
      : `SELECT
          a.*,
          c.name as client_name,
          c.phone as client_phone,
          s.name as service_name,
          s.duration as service_duration,
          p.name as professional_name
         FROM appointments a
         JOIN clients c ON a.client_id = c.id
         JOIN services s ON a.service_id = s.id
         LEFT JOIN professionals p ON a.professional_id = p.id
         WHERE a.appointment_date >= ?
         AND a.status = 'confirmed'
         ORDER BY a.appointment_date ASC, a.appointment_time ASC
         LIMIT ?`;

    const appointments = await db.all(query, [today, parseInt(limit)]);
    res.json(appointments);
  } catch (err) {
    console.error('Error fetching upcoming appointments:', err);
    res.status(500).json({ error: 'Erro ao buscar próximos agendamentos' });
  }
};

module.exports = {
  getDashboardStats,
  getFinancialReport,
  getUpcomingAppointments
};
