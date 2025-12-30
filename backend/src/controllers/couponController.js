const db = require('../config/database');
const { usePG } = require('../config/database');

// Validar cupom (usado pelo cliente ao fazer agendamento)
const validateCoupon = async (req, res) => {
  try {
    const { code, service_id, total_value } = req.body;
    const user_id = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Código do cupom é obrigatório' });
    }

    // Buscar cupom
    const query1 = usePG
      ? 'SELECT * FROM coupons WHERE code = $1 AND active = true'
      : 'SELECT * FROM coupons WHERE code = ? AND active = 1';

    const coupon = await db.get(query1, [code.toUpperCase()]);

    if (!coupon) {
      return res.status(404).json({ error: 'Cupom inválido ou expirado' });
    }

    // Validar data de validade
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return res.status(400).json({ error: 'Cupom expirado' });
    }

    if (coupon.valid_from && new Date(coupon.valid_from) > new Date()) {
      return res.status(400).json({ error: 'Cupom ainda não está válido' });
    }

    // Validar limite de uso total
    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return res.status(400).json({ error: 'Cupom esgotado' });
    }

    // Verificar quantas vezes o usuário já usou este cupom
    const query2 = usePG
      ? 'SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = $1 AND user_id = $2'
      : 'SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ? AND user_id = ?';

    const usage = await db.get(query2, [coupon.id, user_id]);

    if (usage.count >= coupon.usage_limit_per_user) {
      return res.status(400).json({ error: 'Você já atingiu o limite de uso deste cupom' });
    }

    // Validar valor mínimo de compra
    if (total_value < coupon.min_purchase_value) {
      return res.status(400).json({
        error: `Valor mínimo de compra para este cupom: R$ ${coupon.min_purchase_value.toFixed(2)}`
      });
    }

    // Validar se cupom aplica ao serviço específico
    if (coupon.applies_to_services) {
      const allowedServices = JSON.parse(coupon.applies_to_services);
      if (!allowedServices.includes(service_id)) {
        return res.status(400).json({ error: 'Este cupom não é válido para o serviço selecionado' });
      }
    }

    // Calcular desconto
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (total_value * coupon.discount_value) / 100;
      // Aplicar desconto máximo se definido
      if (coupon.max_discount_value && discount > coupon.max_discount_value) {
        discount = coupon.max_discount_value;
      }
    } else {
      // Desconto fixo
      discount = coupon.discount_value;
    }

    // Desconto não pode ser maior que o valor total
    discount = Math.min(discount, total_value);

    const final_value = Math.max(0, total_value - discount);

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      },
      discount: parseFloat(discount.toFixed(2)),
      original_value: parseFloat(total_value.toFixed(2)),
      final_value: parseFloat(final_value.toFixed(2))
    });
  } catch (err) {
    console.error('Error validating coupon:', err);
    res.status(500).json({ error: 'Erro ao validar cupom' });
  }
};

// Aplicar cupom (quando agendamento é criado)
const applyCoupon = async (coupon_id, user_id, appointment_id, discount_applied) => {
  try {
    // Registrar uso do cupom
    const query1 = usePG
      ? `INSERT INTO coupon_usage (coupon_id, user_id, appointment_id, discount_applied)
         VALUES ($1, $2, $3, $4) RETURNING id`
      : `INSERT INTO coupon_usage (coupon_id, user_id, appointment_id, discount_applied)
         VALUES (?, ?, ?, ?)`;

    const result = await db.run(query1, [coupon_id, user_id, appointment_id, discount_applied]);
    const usageId = usePG ? result.id : result.lastID;

    // Incrementar contador de uso
    const query2 = usePG
      ? 'UPDATE coupons SET times_used = times_used + 1 WHERE id = $1'
      : 'UPDATE coupons SET times_used = times_used + 1 WHERE id = ?';

    await db.run(query2, [coupon_id]);

    return usageId;
  } catch (err) {
    console.error('Error applying coupon:', err);
    throw err;
  }
};

// Listar todos os cupons (admin)
const getAllCoupons = async (req, res) => {
  try {
    const { active } = req.query;

    let query = 'SELECT * FROM coupons';
    const params = [];

    if (active !== undefined) {
      if (usePG) {
        query += ' WHERE active = $1';
        params.push(active === 'true');
      } else {
        query += ' WHERE active = ?';
        params.push(active === 'true' ? 1 : 0);
      }
    }

    query += ' ORDER BY created_at DESC';

    const coupons = await db.all(query, params);
    res.json(coupons);
  } catch (err) {
    console.error('Error fetching coupons:', err);
    res.status(500).json({ error: 'Erro ao buscar cupons' });
  }
};

// Criar cupom (admin)
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discount_type,
      discount_value,
      min_purchase_value,
      max_discount_value,
      valid_from,
      valid_until,
      usage_limit,
      usage_limit_per_user,
      applies_to_services
    } = req.body;

    // Validações
    if (!code || !discount_type || !discount_value) {
      return res.status(400).json({ error: 'Campos obrigatórios: code, discount_type, discount_value' });
    }

    if (!['percentage', 'fixed'].includes(discount_type)) {
      return res.status(400).json({ error: 'discount_type deve ser "percentage" ou "fixed"' });
    }

    if (discount_value <= 0) {
      return res.status(400).json({ error: 'discount_value deve ser maior que 0' });
    }

    if (discount_type === 'percentage' && discount_value > 100) {
      return res.status(400).json({ error: 'Desconto percentual não pode ser maior que 100%' });
    }

    const query = usePG
      ? `INSERT INTO coupons
         (code, description, discount_type, discount_value, min_purchase_value, max_discount_value,
          valid_from, valid_until, usage_limit, usage_limit_per_user, applies_to_services)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`
      : `INSERT INTO coupons
         (code, description, discount_type, discount_value, min_purchase_value, max_discount_value,
          valid_from, valid_until, usage_limit, usage_limit_per_user, applies_to_services)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const result = await db.run(query, [
      code.toUpperCase(),
      description || null,
      discount_type,
      discount_value,
      min_purchase_value || 0,
      max_discount_value || null,
      valid_from || null,
      valid_until || null,
      usage_limit || null,
      usage_limit_per_user || 1,
      applies_to_services ? JSON.stringify(applies_to_services) : null
    ]);

    const couponId = usePG ? result.id : result.lastID;

    const query2 = usePG
      ? 'SELECT * FROM coupons WHERE id = $1'
      : 'SELECT * FROM coupons WHERE id = ?';

    const coupon = await db.get(query2, [couponId]);
    res.status(201).json(coupon);
  } catch (err) {
    console.error('Error creating coupon:', err);
    if (err.message.includes('UNIQUE') || err.message.includes('unique')) {
      return res.status(400).json({ error: 'Código de cupom já existe' });
    }
    res.status(500).json({ error: 'Erro ao criar cupom' });
  }
};

// Atualizar cupom (admin)
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      description,
      discount_type,
      discount_value,
      min_purchase_value,
      max_discount_value,
      valid_from,
      valid_until,
      usage_limit,
      usage_limit_per_user,
      active,
      applies_to_services
    } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (description !== undefined) {
      updates.push(usePG ? `description = $${paramIndex++}` : 'description = ?');
      params.push(description);
    }
    if (discount_type !== undefined) {
      updates.push(usePG ? `discount_type = $${paramIndex++}` : 'discount_type = ?');
      params.push(discount_type);
    }
    if (discount_value !== undefined) {
      updates.push(usePG ? `discount_value = $${paramIndex++}` : 'discount_value = ?');
      params.push(discount_value);
    }
    if (min_purchase_value !== undefined) {
      updates.push(usePG ? `min_purchase_value = $${paramIndex++}` : 'min_purchase_value = ?');
      params.push(min_purchase_value);
    }
    if (max_discount_value !== undefined) {
      updates.push(usePG ? `max_discount_value = $${paramIndex++}` : 'max_discount_value = ?');
      params.push(max_discount_value);
    }
    if (valid_from !== undefined) {
      updates.push(usePG ? `valid_from = $${paramIndex++}` : 'valid_from = ?');
      params.push(valid_from);
    }
    if (valid_until !== undefined) {
      updates.push(usePG ? `valid_until = $${paramIndex++}` : 'valid_until = ?');
      params.push(valid_until);
    }
    if (usage_limit !== undefined) {
      updates.push(usePG ? `usage_limit = $${paramIndex++}` : 'usage_limit = ?');
      params.push(usage_limit);
    }
    if (usage_limit_per_user !== undefined) {
      updates.push(usePG ? `usage_limit_per_user = $${paramIndex++}` : 'usage_limit_per_user = ?');
      params.push(usage_limit_per_user);
    }
    if (active !== undefined) {
      updates.push(usePG ? `active = $${paramIndex++}` : 'active = ?');
      params.push(usePG ? active : (active ? 1 : 0));
    }
    if (applies_to_services !== undefined) {
      updates.push(usePG ? `applies_to_services = $${paramIndex++}` : 'applies_to_services = ?');
      params.push(applies_to_services ? JSON.stringify(applies_to_services) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push(usePG ? `updated_at = CURRENT_TIMESTAMP` : 'updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = usePG
      ? `UPDATE coupons SET ${updates.join(', ')} WHERE id = $${paramIndex}`
      : `UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`;

    const result = await db.run(query, params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cupom não encontrado' });
    }

    const query2 = usePG
      ? 'SELECT * FROM coupons WHERE id = $1'
      : 'SELECT * FROM coupons WHERE id = ?';

    const coupon = await db.get(query2, [id]);
    res.json(coupon);
  } catch (err) {
    console.error('Error updating coupon:', err);
    res.status(500).json({ error: 'Erro ao atualizar cupom' });
  }
};

// Deletar cupom (admin)
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;

    const query = usePG
      ? 'DELETE FROM coupons WHERE id = $1'
      : 'DELETE FROM coupons WHERE id = ?';

    const result = await db.run(query, [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cupom não encontrado' });
    }

    res.json({ message: 'Cupom deletado com sucesso' });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ error: 'Erro ao deletar cupom' });
  }
};

// Histórico de uso de cupons
const getCouponUsageHistory = async (req, res) => {
  try {
    const { coupon_id } = req.params;

    const query = usePG
      ? `SELECT
          cu.*,
          c.name as client_name,
          c.email as client_email,
          a.appointment_date,
          a.appointment_time,
          s.name as service_name
         FROM coupon_usage cu
         JOIN clients c ON cu.user_id = c.id
         LEFT JOIN appointments a ON cu.appointment_id = a.id
         LEFT JOIN services s ON a.service_id = s.id
         WHERE cu.coupon_id = $1
         ORDER BY cu.used_at DESC`
      : `SELECT
          cu.*,
          c.name as client_name,
          c.email as client_email,
          a.appointment_date,
          a.appointment_time,
          s.name as service_name
         FROM coupon_usage cu
         JOIN clients c ON cu.user_id = c.id
         LEFT JOIN appointments a ON cu.appointment_id = a.id
         LEFT JOIN services s ON a.service_id = s.id
         WHERE cu.coupon_id = ?
         ORDER BY cu.used_at DESC`;

    const usage = await db.all(query, [coupon_id]);
    res.json(usage);
  } catch (err) {
    console.error('Error fetching coupon usage history:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de uso' });
  }
};

module.exports = {
  validateCoupon,
  applyCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponUsageHistory
};
