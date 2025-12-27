const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validateService, validateId } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');

// Rotas públicas (ou autenticadas para clientes também)
router.get('/', serviceController.getAllServices);
router.get('/:id', validateId, serviceController.getServiceById);

// Rotas admin
router.post('/', verifyToken, verifyAdmin, validateService, auditLog('create_service', 'service'), serviceController.createService);
router.put('/:id', verifyToken, verifyAdmin, validateId, auditLog('update_service', 'service'), serviceController.updateService);
router.delete('/:id', verifyToken, verifyAdmin, validateId, auditLog('delete_service', 'service'), serviceController.deleteService);

module.exports = router;
