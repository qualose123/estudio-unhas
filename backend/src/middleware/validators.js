const { body, param, query, validationResult } = require('express-validator');

// Middleware para tratar erros de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validações para autenticação
const validateLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória'),
  handleValidationErrors
];

const validateRegister = [
  body('name').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres'),
  body('phone').optional().isMobilePhone('pt-BR').withMessage('Telefone inválido'),
  handleValidationErrors
];

// Validações para serviços
const validateService = [
  body('name').trim().notEmpty().withMessage('Nome do serviço é obrigatório'),
  body('duration').isInt({ min: 1 }).withMessage('Duração deve ser um número inteiro positivo'),
  body('price').isFloat({ min: 0 }).withMessage('Preço deve ser um número positivo'),
  body('description').optional().trim(),
  body('active').optional().isBoolean().withMessage('Active deve ser um booleano'),
  handleValidationErrors
];

// Validações para agendamentos
const validateAppointment = [
  body('service_id').isInt({ min: 1 }).withMessage('ID do serviço inválido'),
  body('appointment_date').isDate().withMessage('Data inválida'),
  body('appointment_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário inválido (formato HH:MM)'),
  body('notes').optional().trim(),
  handleValidationErrors
];

const validateAppointmentUpdate = [
  body('status').optional().isIn(['pending', 'confirmed', 'cancelled', 'completed']).withMessage('Status inválido'),
  body('appointment_date').optional().isDate().withMessage('Data inválida'),
  body('appointment_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário inválido'),
  body('notes').optional().trim(),
  handleValidationErrors
];

// Validações para bloqueio de horários
const validateTimeBlock = [
  body('block_date').isDate().withMessage('Data inválida'),
  body('start_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário inicial inválido'),
  body('end_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Horário final inválido'),
  body('reason').optional().trim(),
  handleValidationErrors
];

// Validações para recuperação de senha
const validatePasswordReset = [
  body('email').isEmail().withMessage('Email inválido'),
  handleValidationErrors
];

const validatePasswordResetConfirm = [
  body('email').isEmail().withMessage('Email inválido'),
  body('code').trim().notEmpty().withMessage('Código é obrigatório'),
  body('newPassword').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
  handleValidationErrors
];

// Validação de ID de parâmetro
const validateId = [
  param('id').isInt({ min: 1 }).withMessage('ID inválido'),
  handleValidationErrors
];

module.exports = {
  validateLogin,
  validateRegister,
  validateService,
  validateAppointment,
  validateAppointmentUpdate,
  validateTimeBlock,
  validatePasswordReset,
  validatePasswordResetConfirm,
  validateId,
  handleValidationErrors
};
