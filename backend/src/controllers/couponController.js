const db = require('../config/database');
const { usePG } = require('../config/database');

// Validar cupom (usado pelo cliente ao fazer agendamento)
const validateCoupon = async (req, res) => {
  try {
    const { code, total_value } = req.body;
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

    // Validar data de expiração
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Cupom expirado' });
    }

    // Validar limite de uso total
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'Cupom esgotado' });
    }

    // Validar valor mínimo de compra
    if (total_value < coupon.min_value) {
      return res.status(400).json({
        error: `Valor mínimo de compra para este cupom: R$ ${coupon.min_value.toFixed(2)}`
      });
    }

    // Calcular desconto
    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (total_value * coupon.discount_value) / 100;
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
const applyCoupon = async (coupon_id) => {
  try {
    // Incrementar contador de uso
    const query = usePG
      ? 'UPDATE coupons SET used_count = used_count + 1 WHERE id = $1'
      : 'UPDATE coupons SET used_count = used_count + 1 WHERE id = ?';

    await db.run(query, [coupon_id]);

    return true;
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
      min_value,
      max_uses,
      expires_at
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
         (code, description, discount_type, discount_value, min_value, max_uses, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`
      : `INSERT INTO coupons
         (code, description, discount_type, discount_value, min_value, max_uses, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const result = await db.run(query, [
      code.toUpperCase(),
      description || null,
      discount_type,
      discount_value,
      min_value || 0,
      max_uses || null,
      expires_at || null
    ]);

    const couponId = usePG ? result.lastID : result.lastID;

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
      min_value,
      max_uses,
      expires_at,
      active
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
    if (min_value !== undefined) {
      updates.push(usePG ? `min_value = $${paramIndex++}` : 'min_value = ?');
      params.push(min_value);
    }
    if (max_uses !== undefined) {
      updates.push(usePG ? `max_uses = $${paramIndex++}` : 'max_uses = ?');
      params.push(max_uses);
    }
    if (expires_at !== undefined) {
      updates.push(usePG ? `expires_at = $${paramIndex++}` : 'expires_at = ?');
      params.push(expires_at);
    }
    if (active !== undefined) {
      updates.push(usePG ? `active = $${paramIndex++}` : 'active = ?');
      params.push(usePG ? active : (active ? 1 : 0));
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

// Estatísticas de uso de cupons
const getCouponStats = async (req, res) => {
  try {
    const { id } = req.params;

    const query = usePG
      ? 'SELECT * FROM coupons WHERE id = $1'
      : 'SELECT * FROM coupons WHERE id = ?';

    const coupon = await db.get(query, [id]);

    if (!coupon) {
      return res.status(404).json({ error: 'Cupom não encontrado' });
    }

    res.json({
      coupon,
      usage: {
        used: coupon.used_count,
        remaining: coupon.max_uses ? coupon.max_uses - coupon.used_count : 'Ilimitado'
      }
    });
  } catch (err) {
    console.error('Error fetching coupon stats:', err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

module.exports = {
  validateCoupon,
  applyCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponStats
};
