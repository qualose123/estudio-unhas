const createDOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

const DOMPurify = createDOMPurify();

/**
 * Middleware de sanitização de inputs
 * Previne XSS, SQL Injection e outros ataques de injeção
 */

// Sanitizar string removendo HTML e scripts maliciosos
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  // Remover HTML tags e scripts
  let cleaned = DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [], // Não permite nenhuma tag HTML
    KEEP_CONTENT: true // Mantém o conteúdo texto
  });

  // Escapar caracteres especiais SQL
  cleaned = validator.escape(cleaned);

  // Normalizar espaços
  cleaned = cleaned.trim();

  return cleaned;
};

// Sanitizar objeto recursivamente
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      // Sanitizar a chave também
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
};

// Middleware principal de sanitização
const sanitizeInput = (req, res, next) => {
  // Sanitizar body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitizar query params
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitizar params (ID, etc)
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Validações específicas por tipo de dados
const validators = {
  // Validar email
  email: (value) => {
    if (!value) return { valid: false, error: 'Email é obrigatório' };
    if (!validator.isEmail(value)) {
      return { valid: false, error: 'Email inválido' };
    }
    // Normalizar email
    return { valid: true, value: validator.normalizeEmail(value) };
  },

  // Validar telefone brasileiro
  phone: (value) => {
    if (!value) return { valid: true, value: null }; // Telefone é opcional

    // Remover caracteres não numéricos
    const cleaned = value.replace(/\D/g, '');

    // Validar formato brasileiro (10 ou 11 dígitos)
    if (cleaned.length < 10 || cleaned.length > 11) {
      return { valid: false, error: 'Telefone inválido (formato: (XX) XXXXX-XXXX)' };
    }

    return { valid: true, value: cleaned };
  },

  // Validar CPF (se for implementar)
  cpf: (value) => {
    if (!value) return { valid: true, value: null };

    const cleaned = value.replace(/\D/g, '');

    if (cleaned.length !== 11) {
      return { valid: false, error: 'CPF inválido' };
    }

    // Validação básica de CPF (checar dígitos verificadores)
    // Simplificado - pode ser melhorado com algoritmo completo
    const allSame = /^(\d)\1{10}$/.test(cleaned);
    if (allSame) {
      return { valid: false, error: 'CPF inválido' };
    }

    return { valid: true, value: cleaned };
  },

  // Validar data
  date: (value) => {
    if (!value) return { valid: false, error: 'Data é obrigatória' };

    // Aceitar formato YYYY-MM-DD
    if (!validator.isDate(value, { format: 'YYYY-MM-DD', strictMode: true })) {
      return { valid: false, error: 'Data inválida (formato: YYYY-MM-DD)' };
    }

    // Verificar se não é data passada
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      return { valid: false, error: 'Data não pode ser no passado' };
    }

    return { valid: true, value: value };
  },

  // Validar hora (formato HH:MM)
  time: (value) => {
    if (!value) return { valid: false, error: 'Horário é obrigatório' };

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(value)) {
      return { valid: false, error: 'Horário inválido (formato: HH:MM)' };
    }

    return { valid: true, value: value };
  },

  // Validar senha forte
  password: (value) => {
    if (!value) return { valid: false, error: 'Senha é obrigatória' };

    if (value.length < 8) {
      return { valid: false, error: 'Senha deve ter no mínimo 8 caracteres' };
    }

    // Verificar se tem letra e número
    if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
      return { valid: false, error: 'Senha deve conter letras e números' };
    }

    return { valid: true, value: value };
  },

  // Validar URL
  url: (value) => {
    if (!value) return { valid: true, value: null };

    if (!validator.isURL(value, { protocols: ['http', 'https'], require_protocol: true })) {
      return { valid: false, error: 'URL inválida' };
    }

    return { valid: true, value: value };
  },

  // Validar número inteiro positivo
  positiveInt: (value) => {
    const num = parseInt(value, 10);

    if (isNaN(num) || num <= 0) {
      return { valid: false, error: 'Deve ser um número inteiro positivo' };
    }

    return { valid: true, value: num };
  },

  // Validar preço (decimal positivo)
  price: (value) => {
    const num = parseFloat(value);

    if (isNaN(num) || num < 0) {
      return { valid: false, error: 'Preço inválido' };
    }

    // Limitar a 2 casas decimais
    return { valid: true, value: Math.round(num * 100) / 100 };
  }
};

module.exports = {
  sanitizeInput,
  sanitizeString,
  sanitizeObject,
  validators
};
