const db = require('../config/database');
const { usePG } = require('../config/database');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const crypto = require('crypto');

// Solicitar recuperação de senha
const requestPasswordReset = async (req, res) => {
  try {
    const { email, userType } = req.body; // userType: 'admin' ou 'client'

    if (!['admin', 'client'].includes(userType)) {
      return res.status(400).json({ error: 'Tipo de usuário inválido' });
    }

    const table = userType === 'admin' ? 'admins' : 'clients';

    // Verificar se o usuário existe
    const query1 = usePG
      ? `SELECT id, name, email FROM ${table} WHERE email = $1`
      : `SELECT id, name, email FROM ${table} WHERE email = ?`;

    const user = await db.get(query1, [email]);

    // Por segurança, sempre retornar sucesso mesmo se o email não existir
    if (!user) {
      return res.json({ message: 'Se o email existir, um código de recuperação será enviado.' });
    }

    // Gerar código de 6 dígitos
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Salvar código no banco
    const query2 = usePG
      ? 'INSERT INTO password_reset_codes (user_type, email, code, expires_at) VALUES ($1, $2, $3, $4)'
      : 'INSERT INTO password_reset_codes (user_type, email, code, expires_at) VALUES (?, ?, ?, ?)';

    await db.run(query2, [userType, email, code, expiresAt.toISOString()]);

    // Enviar email
    try {
      await emailService.sendPasswordResetEmail(user.email, user.name, code);
      res.json({ message: 'Se o email existir, um código de recuperação será enviado.' });
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      res.status(500).json({ error: 'Erro ao enviar email de recuperação' });
    }
  } catch (err) {
    console.error('Error requesting password reset:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

// Confirmar recuperação de senha com código
const confirmPasswordReset = async (req, res) => {
  try {
    const { email, code, newPassword, userType } = req.body;

    if (!['admin', 'client'].includes(userType)) {
      return res.status(400).json({ error: 'Tipo de usuário inválido' });
    }

    // Buscar código válido
    const query1 = usePG
      ? `SELECT * FROM password_reset_codes
         WHERE user_type = $1 AND email = $2 AND code = $3 AND used = false
         AND expires_at > CURRENT_TIMESTAMP
         ORDER BY created_at DESC
         LIMIT 1`
      : `SELECT * FROM password_reset_codes
         WHERE user_type = ? AND email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
         ORDER BY created_at DESC
         LIMIT 1`;

    const resetCode = await db.get(query1, [userType, email, code]);

    if (!resetCode) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const table = userType === 'admin' ? 'admins' : 'clients';

    // Atualizar senha
    const query2 = usePG
      ? `UPDATE ${table} SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2`
      : `UPDATE ${table} SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?`;

    const result = await db.run(query2, [hashedPassword, email]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Marcar código como usado
    const query3 = usePG
      ? 'UPDATE password_reset_codes SET used = true WHERE id = $1'
      : 'UPDATE password_reset_codes SET used = 1 WHERE id = ?';

    await db.run(query3, [resetCode.id]);

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error('Error confirming password reset:', err);
    res.status(500).json({ error: 'Erro no servidor' });
  }
};

module.exports = {
  requestPasswordReset,
  confirmPasswordReset
};
