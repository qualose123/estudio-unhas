const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validateId } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');

// Validar cupom (cliente pode usar ao fazer agendamento)
router.post('/validate', verifyToken, auditLog('validate_coupon', 'coupon'), couponController.validateCoupon);

// Listar cupons (admin apenas)
router.get('/', verifyToken, verifyAdmin, couponController.getAllCoupons);

// Criar cupom (admin apenas)
router.post('/', verifyToken, verifyAdmin, auditLog('create_coupon', 'coupon'), couponController.createCoupon);

// Atualizar cupom (admin apenas)
router.put('/:id', verifyToken, verifyAdmin, validateId, auditLog('update_coupon', 'coupon'), couponController.updateCoupon);

// Deletar cupom (admin apenas)
router.delete('/:id', verifyToken, verifyAdmin, validateId, auditLog('delete_coupon', 'coupon'), couponController.deleteCoupon);

// Histórico de uso de cupom (admin apenas)
router.get('/:id/usage', verifyToken, verifyAdmin, validateId, couponController.getCouponUsageHistory);

module.exports = router;
