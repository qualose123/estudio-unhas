const express = require('express');
const router = express.Router();
const professionalController = require('../controllers/professionalController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validateId } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');

// Todas as rotas exigem admin
router.post('/', verifyToken, verifyAdmin, auditLog('create_professional', 'professional'), professionalController.createProfessional);
router.get('/', verifyToken, verifyAdmin, professionalController.getAllProfessionals);
router.get('/:id', verifyToken, verifyAdmin, validateId, professionalController.getProfessionalById);
router.put('/:id', verifyToken, verifyAdmin, validateId, auditLog('update_professional', 'professional'), professionalController.updateProfessional);
router.delete('/:id', verifyToken, verifyAdmin, validateId, auditLog('delete_professional', 'professional'), professionalController.deleteProfessional);
router.get('/:id/commissions', verifyToken, verifyAdmin, validateId, professionalController.getProfessionalCommissions);

module.exports = router;
