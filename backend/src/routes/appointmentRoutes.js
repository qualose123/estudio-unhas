const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { verifyToken, verifyAdmin, verifyClient } = require('../middleware/auth');
const { validateAppointment, validateAppointmentUpdate, validateId } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');
const { appointmentLimiter } = require('../middleware/rateLimiters');

// Verificar horários disponíveis (autenticado)
router.get('/available-times', verifyToken, appointmentController.getAvailableTimes);

// Listar agendamentos (admin vê todos, cliente vê seus próprios)
router.get('/', verifyToken, appointmentController.getAllAppointments);

// Buscar agendamento por ID
router.get('/:id', verifyToken, validateId, appointmentController.getAppointmentById);

// Criar agendamento (cliente) - Com rate limiting (10 agendamentos/hora)
router.post('/', verifyToken, verifyClient, appointmentLimiter, validateAppointment, auditLog('create_appointment', 'appointment'), appointmentController.createAppointment);

// Atualizar agendamento (cliente pode cancelar ou alterar, admin pode tudo)
router.put('/:id', verifyToken, validateId, validateAppointmentUpdate, auditLog('update_appointment', 'appointment'), appointmentController.updateAppointment);

// Deletar agendamento (admin apenas)
router.delete('/:id', verifyToken, verifyAdmin, validateId, auditLog('delete_appointment', 'appointment'), appointmentController.deleteAppointment);

module.exports = router;
