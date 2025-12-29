const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { verifyToken, verifyAdmin, verifyClient } = require('../middleware/auth');
const { validateId } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');

// Adicionar à lista de espera (cliente)
router.post('/', verifyToken, verifyClient, auditLog('add_to_waitlist', 'waitlist'), waitlistController.addToWaitlist);

// Listar lista de espera (admin vê todas, cliente vê apenas suas)
router.get('/', verifyToken, waitlistController.getWaitlist);

// Cancelar entrada da lista de espera
router.delete('/:id', verifyToken, validateId, auditLog('cancel_waitlist', 'waitlist'), waitlistController.cancelWaitlistEntry);

// Converter entrada em agendamento (admin apenas)
router.post('/:id/convert', verifyToken, verifyAdmin, validateId, auditLog('convert_waitlist', 'waitlist'), waitlistController.convertToAppointment);

module.exports = router;
