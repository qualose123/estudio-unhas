const db = require('../config/database');
const { usePG } = require('../config/database');
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
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const query = usePG
      ? 'SELECT * FROM admins WHERE email = $1'
      : 'SELECT * FROM admins WHERE email = ?';
    const admin = await db.get(query, [email]);

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
  } catch (err) {
    console.error('Erro no login de admin:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// Login de Cliente
const clientLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const query = usePG
      ? 'SELECT * FROM clients WHERE email = $1'
      : 'SELECT * FROM clients WHERE email = ?';
    const client = await db.get(query, [email]);

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
  } catch (err) {
    console.error('Erro no login de cliente:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// Registro de Cliente
const clientRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Verificar se o email já existe
    const checkQuery = usePG
      ? 'SELECT id FROM clients WHERE email = $1'
      : 'SELECT id FROM clients WHERE email = ?';
    const existingClient = await db.get(checkQuery, [email]);

    if (existingClient) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserir novo cliente
    const insertQuery = usePG
      ? 'INSERT INTO clients (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id'
      : 'INSERT INTO clients (name, email, password, phone) VALUES (?, ?, ?, ?)';
    const result = await db.run(insertQuery, [name, email, hashedPassword, phone || null]);
    const clientId = result.lastID;

    const newClient = {
      id: clientId,
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
  } catch (err) {
    console.error('Erro ao criar conta:', err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
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

/**
 * Alterar senha - Usuário Logado
 * Permite que o usuário autenticado altere sua própria senha
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const userType = req.user.type;

    // Validações
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'A nova senha deve ser diferente da atual' });
    }

    const table = userType === 'admin' ? 'admins' : 'clients';

    // Buscar usuário
    const selectQuery = usePG
      ? `SELECT * FROM ${table} WHERE id = $1`
      : `SELECT * FROM ${table} WHERE id = ?`;
    const user = await db.get(selectQuery, [userId]);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar senha atual
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    const updateQuery = usePG
      ? `UPDATE ${table} SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
      : `UPDATE ${table} SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await db.run(updateQuery, [hashedPassword, userId]);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ error: 'Erro ao atualizar senha' });
  }
};

module.exports = {
  adminLogin,
  clientLogin,
  clientRegister,
  verifyTokenEndpoint,
  changePassword
};
