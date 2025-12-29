const express = require('express');
const router = express.Router();
const recurringController = require('../controllers/recurringAppointmentController');
const { verifyToken, verifyClient } = require('../middleware/auth');
const { validateId } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');

// Criar agendamento recorrente (cliente)
router.post('/', verifyToken, verifyClient, auditLog('create_recurring', 'recurring_appointment'), recurringController.createRecurringAppointment);

// Listar agendamentos recorrentes
router.get('/', verifyToken, recurringController.getRecurringAppointments);

// Obter agendamento recorrente específico
router.get('/:id', verifyToken, validateId, recurringController.getRecurringAppointmentById);

// Atualizar agendamento recorrente
router.put('/:id', verifyToken, validateId, auditLog('update_recurring', 'recurring_appointment'), recurringController.updateRecurringAppointment);

// Cancelar agendamento recorrente
router.delete('/:id', verifyToken, validateId, auditLog('cancel_recurring', 'recurring_appointment'), recurringController.cancelRecurringAppointment);

module.exports = router;
