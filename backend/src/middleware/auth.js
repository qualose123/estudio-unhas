const jwt = require('jsonwebtoken');

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// Middleware para verificar se é admin
const verifyAdmin = (req, res, next) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem acessar este recurso.' });
  }
  next();
};

// Middleware para verificar se é cliente
const verifyClient = (req, res, next) => {
  if (req.user.type !== 'client') {
    return res.status(403).json({ error: 'Acesso negado. Apenas clientes podem acessar este recurso.' });
  }
  next();
};

// Middleware para verificar se o usuário é o próprio cliente ou admin
const verifyClientOrAdmin = (req, res, next) => {
  const clientId = parseInt(req.params.id || req.params.clientId);

  if (req.user.type === 'admin') {
    return next();
  }

  if (req.user.type === 'client' && req.user.id === clientId) {
    return next();
  }

  return res.status(403).json({ error: 'Acesso negado.' });
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyClient,
  verifyClientOrAdmin
};
