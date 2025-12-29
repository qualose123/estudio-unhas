const express = require('express');
const router = express.Router();
const commissionController = require('../controllers/commissionController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validateId } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');

// Todas as rotas exigem admin
router.get('/', verifyToken, verifyAdmin, commissionController.getAllCommissions);
router.get('/summary', verifyToken, verifyAdmin, commissionController.getCommissionsSummary);
router.get('/:id', verifyToken, verifyAdmin, validateId, commissionController.getCommissionById);
router.post('/:id/pay', verifyToken, verifyAdmin, validateId, auditLog('pay_commission', 'commission'), commissionController.markCommissionAsPaid);
router.delete('/:id', verifyToken, verifyAdmin, validateId, auditLog('cancel_commission', 'commission'), commissionController.cancelCommission);

module.exports = router;
