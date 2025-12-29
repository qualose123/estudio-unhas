const db = require('../config/database');

// Validar cupom (usado pelo cliente ao fazer agendamento)
const validateCoupon = (req, res) => {
  const { code, service_id, total_value } = req.body;
  const user_id = req.user.id;

  if (!code) {
    return res.status(400).json({ error: 'Código do cupom é obrigatório' });
  }

  // Buscar cupom
  db.get(
    `SELECT * FROM coupons WHERE code = ? AND active = 1`,
    [code.toUpperCase()],
    (err, coupon) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar cupom' });
      }

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
      db.get(
        `SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ? AND user_id = ?`,
        [coupon.id, user_id],
        (err, usage) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao verificar uso do cupom' });
          }

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
        }
      );
    }
  );
};

// Aplicar cupom (quando agendamento é criado)
const applyCoupon = (coupon_id, user_id, appointment_id, discount_applied) => {
  return new Promise((resolve, reject) => {
    // Registrar uso do cupom
    db.run(
      `INSERT INTO coupon_usage (coupon_id, user_id, appointment_id, discount_applied)
       VALUES (?, ?, ?, ?)`,
      [coupon_id, user_id, appointment_id, discount_applied],
      function (err) {
        if (err) {
          return reject(err);
        }

        // Incrementar contador de uso
        db.run(
          `UPDATE coupons SET times_used = times_used + 1 WHERE id = ?`,
          [coupon_id],
          (err) => {
            if (err) {
              console.error('Erro ao incrementar contador de cupom:', err);
            }
            resolve(this.lastID);
          }
        );
      }
    );
  });
};

// Listar todos os cupons (admin)
const getAllCoupons = (req, res) => {
  const { active } = req.query;

  let query = 'SELECT * FROM coupons';
  const params = [];

  if (active !== undefined) {
    query += ' WHERE active = ?';
    params.push(active === 'true' ? 1 : 0);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, coupons) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar cupons' });
    }
    res.json(coupons);
  });
};

// Criar cupom (admin)
const createCoupon = (req, res) => {
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

  db.run(
    `INSERT INTO coupons
     (code, description, discount_type, discount_value, min_purchase_value, max_discount_value,
      valid_from, valid_until, usage_limit, usage_limit_per_user, applies_to_services)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Código de cupom já existe' });
        }
        return res.status(500).json({ error: 'Erro ao criar cupom' });
      }

      db.get('SELECT * FROM coupons WHERE id = ?', [this.lastID], (err, coupon) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar cupom criado' });
        }
        res.status(201).json(coupon);
      });
    }
  );
};

// Atualizar cupom (admin)
const updateCoupon = (req, res) => {
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

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (discount_type !== undefined) {
    updates.push('discount_type = ?');
    params.push(discount_type);
  }
  if (discount_value !== undefined) {
    updates.push('discount_value = ?');
    params.push(discount_value);
  }
  if (min_purchase_value !== undefined) {
    updates.push('min_purchase_value = ?');
    params.push(min_purchase_value);
  }
  if (max_discount_value !== undefined) {
    updates.push('max_discount_value = ?');
    params.push(max_discount_value);
  }
  if (valid_from !== undefined) {
    updates.push('valid_from = ?');
    params.push(valid_from);
  }
  if (valid_until !== undefined) {
    updates.push('valid_until = ?');
    params.push(valid_until);
  }
  if (usage_limit !== undefined) {
    updates.push('usage_limit = ?');
    params.push(usage_limit);
  }
  if (usage_limit_per_user !== undefined) {
    updates.push('usage_limit_per_user = ?');
    params.push(usage_limit_per_user);
  }
  if (active !== undefined) {
    updates.push('active = ?');
    params.push(active ? 1 : 0);
  }
  if (applies_to_services !== undefined) {
    updates.push('applies_to_services = ?');
    params.push(applies_to_services ? JSON.stringify(applies_to_services) : null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  db.run(
    `UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`,
    params,
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar cupom' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Cupom não encontrado' });
      }

      db.get('SELECT * FROM coupons WHERE id = ?', [id], (err, coupon) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao buscar cupom atualizado' });
        }
        res.json(coupon);
      });
    }
  );
};

// Deletar cupom (admin)
const deleteCoupon = (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM coupons WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao deletar cupom' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cupom não encontrado' });
    }

    res.json({ message: 'Cupom deletado com sucesso' });
  });
};

// Histórico de uso de cupons
const getCouponUsageHistory = (req, res) => {
  const { coupon_id } = req.params;

  db.all(
    `SELECT
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
     ORDER BY cu.used_at DESC`,
    [coupon_id],
    (err, usage) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar histórico de uso' });
      }
      res.json(usage);
    }
  );
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
