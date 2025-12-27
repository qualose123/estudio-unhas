const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Gerar token JWT
const generateToken = (user, type) => {
  return jwt.sign(
    { id: user.id, email: user.email, type: type },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Login de Admin
const adminLogin = (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM admins WHERE email = ?', [email], async (err, admin) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (!admin) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = generateToken(admin, 'admin');

    res.json({
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        type: 'admin'
      }
    });
  });
};

// Login de Cliente
const clientLogin = (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM clients WHERE email = ?', [email], async (err, client) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (!client) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, client.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = generateToken(client, 'client');

    res.json({
      token,
      user: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        type: 'client'
      }
    });
  });
};

// Registro de Cliente
const clientRegister = async (req, res) => {
  const { name, email, password, phone } = req.body;

  // Verificar se o email já existe
  db.get('SELECT id FROM clients WHERE email = ?', [email], async (err, existingClient) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (existingClient) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserir novo cliente
    db.run(
      'INSERT INTO clients (name, email, password, phone) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao criar conta' });
        }

        const newClient = {
          id: this.lastID,
          name,
          email,
          phone: phone || null
        };

        const token = generateToken(newClient, 'client');

        res.status(201).json({
          token,
          user: {
            ...newClient,
            type: 'client'
          }
        });
      }
    );
  });
};

// Verificar token (para validação no frontend)
const verifyTokenEndpoint = (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      type: req.user.type
    }
  });
};

module.exports = {
  adminLogin,
  clientLogin,
  clientRegister,
  verifyTokenEndpoint
};
