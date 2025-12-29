const db = require('../config/database');

/**
 * Dashboard principal com estatísticas gerais
 */
const getDashboardStats = (req, res) => {
  const { start_date, end_date } = req.query;

  const stats = {};
  const promises = [];

  // Total de clientes
  promises.push(
    new Promise((resolve) => {
      db.get('SELECT COUNT(*) as total FROM clients', [], (err, result) => {
        stats.total_clients = result ? result.total : 0;
        resolve();
      });
    })
  );

  // Total de agendamentos
  promises.push(
    new Promise((resolve) => {
      let query = 'SELECT COUNT(*) as total FROM appointments';
      const params = [];

      if (start_date || end_date) {
        const conditions = [];
        if (start_date) {
          conditions.push('appointment_date >= ?');
          params.push(start_date);
        }
        if (end_date) {
          conditions.push('appointment_date <= ?');
          params.push(end_date);
        }
        query += ' WHERE ' + conditions.join(' AND ');
      }

      db.get(query, params, (err, result) => {
        stats.total_appointments = result ? result.total : 0;
        resolve();
      });
    })
  );

  // Agendamentos por status
  promises.push(
    new Promise((resolve) => {
      let query = 'SELECT status, COUNT(*) as count FROM appointments';
      const params = [];

      if (start_date || end_date) {
        const conditions = [];
        if (start_date) {
          conditions.push('appointment_date >= ?');
          params.push(start_date);
        }
        if (end_date) {
          conditions.push('appointment_date <= ?');
          params.push(end_date);
        }
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' GROUP BY status';

      db.all(query, params, (err, results) => {
        stats.appointments_by_status = {};
        if (results) {
          results.forEach(r => {
            stats.appointments_by_status[r.status] = r.count;
          });
        }
        resolve();
      });
    })
  );

  // Receita total (agendamentos confirmed e completed)
  promises.push(
    new Promise((resolve) => {
      let query = `
        SELECT SUM(s.price) as total
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.status IN ('confirmed', 'completed')
      `;
      const params = [];

      if (start_date || end_date) {
        if (start_date) {
          query += ' AND a.appointment_date >= ?';
          params.push(start_date);
        }
        if (end_date) {
          query += ' AND a.appointment_date <= ?';
          params.push(end_date);
        }
      }

      db.get(query, params, (err, result) => {
        stats.total_revenue = result && result.total ? parseFloat(result.total.toFixed(2)) : 0;
        resolve();
      });
    })
  );

  // Serviços mais populares
  promises.push(
    new Promise((resolve) => {
      let query = `
        SELECT
          s.id,
          s.name,
          COUNT(*) as count,
          SUM(s.price) as revenue
        FROM appointments a
        JOIN services s ON a.service_id = s.id
        WHERE a.status IN ('confirmed', 'completed')
      `;
      const params = [];

      if (start_date || end_date) {
        if (start_date) {
          query += ' AND a.appointment_date >= ?';
          params.push(start_date);
        }
        if (end_date) {
          query += ' AND a.appointment_date <= ?';
          params.push(end_date);
        }
      }

      query += ' GROUP BY s.id ORDER BY count DESC LIMIT 5';

      db.all(query, params, (err, results) => {
        stats.popular_services = results || [];
        resolve();
      });
    })
  );

  // Média de avaliações
  promises.push(
    new Promise((resolve) => {
      db.get(
        'SELECT AVG(rating) as average, COUNT(*) as total FROM reviews WHERE active = 1',
        [],
        (err, result) => {
          stats.reviews_average = result && result.average
            ? Math.round(result.average * 10) / 10
            : 0;
          stats.reviews_count = result ? result.total : 0;
          resolve();
        }
      );
    })
  );

  // Comissões pendentes
  promises.push(
    new Promise((resolve) => {
      db.get(
        `SELECT
          COUNT(*) as count,
          SUM(commission_amount) as total
         FROM commissions
         WHERE status = 'pending'`,
        [],
        (err, result) => {
          stats.pending_commissions = {
            count: result ? result.count : 0,
            total: result && result.total ? parseFloat(result.total.toFixed(2)) : 0
          };
          resolve();
        }
      );
    })
  );

  // Lista de espera ativa
  promises.push(
    new Promise((resolve) => {
      db.get(
        'SELECT COUNT(*) as count FROM waitlist WHERE status = \'waiting\'',
        [],
        (err, result) => {
          stats.active_waitlist = result ? result.count : 0;
          resolve();
        }
      );
    })
  );

  // Agendamentos recorrentes ativos
  promises.push(
    new Promise((resolve) => {
      db.get(
        'SELECT COUNT(*) as count FROM recurring_appointments WHERE active = 1',
        [],
        (err, result) => {
          stats.active_recurring = result ? result.count : 0;
          resolve();
        }
      );
    })
  );

  // Agendamentos por dia (últimos 30 dias)
  promises.push(
    new Promise((resolve) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      db.all(
        `SELECT
          appointment_date as date,
          COUNT(*) as count
         FROM appointments
         WHERE appointment_date >= ?
         GROUP BY appointment_date
         ORDER BY appointment_date ASC`,
        [dateStr],
        (err, results) => {
          stats.appointments_by_day = results || [];
          resolve();
        }
      );
    })
  );

  // Total de imagens na galeria
  promises.push(
    new Promise((resolve) => {
      db.get(
        'SELECT COUNT(*) as count, SUM(views) as views, SUM(likes) as likes FROM gallery WHERE active = 1',
        [],
        (err, result) => {
          stats.gallery = {
            total_images: result ? result.count : 0,
            total_views: result ? result.views || 0 : 0,
            total_likes: result ? result.likes || 0 : 0
          };
          resolve();
        }
      );
    })
  );

  Promise.all(promises)
    .then(() => {
      res.json(stats);
    })
    .catch((err) => {
      console.error('Erro ao gerar estatísticas:', err);
      res.status(500).json({ error: 'Erro ao gerar estatísticas do dashboard' });
    });
};

/**
 * Relatório financeiro detalhado
 */
const getFinancialReport = (req, res) => {
  const { start_date, end_date, group_by = 'day' } = req.query;

  let dateGroup;
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

  if (start_date) {
    query += ' AND a.appointment_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND a.appointment_date <= ?';
    params.push(end_date);
  }

  query += ` GROUP BY ${dateGroup} ORDER BY period ASC`;

  db.all(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao gerar relatório financeiro' });
    }

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
  });
};

/**
 * Próximos agendamentos (hoje e próximos dias)
 */
const getUpcomingAppointments = (req, res) => {
  const { limit = 10 } = req.query;
  const today = new Date().toISOString().split('T')[0];

  db.all(
    `SELECT
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
     LIMIT ?`,
    [today, parseInt(limit)],
    (err, appointments) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar próximos agendamentos' });
      }
      res.json(appointments);
    }
  );
};

module.exports = {
  getDashboardStats,
  getFinancialReport,
  getUpcomingAppointments
};
