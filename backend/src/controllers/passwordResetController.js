const db = require('../config/database');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const crypto = require('crypto');

// Solicitar recuperação de senha
const requestPasswordReset = async (req, res) => {
  const { email, userType } = req.body; // userType: 'admin' ou 'client'

  if (!['admin', 'client'].includes(userType)) {
    return res.status(400).json({ error: 'Tipo de usuário inválido' });
  }

  const table = userType === 'admin' ? 'admins' : 'clients';

  // Verificar se o usuário existe
  db.get(`SELECT id, name, email FROM ${table} WHERE email = ?`, [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    // Por segurança, sempre retornar sucesso mesmo se o email não existir
    if (!user) {
      return res.json({ message: 'Se o email existir, um código de recuperação será enviado.' });
    }

    // Gerar código de 6 dígitos
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Salvar código no banco
    db.run(
      'INSERT INTO password_reset_codes (user_type, email, code, expires_at) VALUES (?, ?, ?, ?)',
      [userType, email, code, expiresAt.toISOString()],
      async (err) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao gerar código de recuperação' });
        }

        // Enviar email
        try {
          await emailService.sendPasswordResetEmail(user.email, user.name, code);
          res.json({ message: 'Se o email existir, um código de recuperação será enviado.' });
        } catch (emailError) {
          console.error('Erro ao enviar email:', emailError);
          res.status(500).json({ error: 'Erro ao enviar email de recuperação' });
        }
      }
    );
  });
};

// Confirmar recuperação de senha com código
const confirmPasswordReset = async (req, res) => {
  const { email, code, newPassword, userType } = req.body;

  if (!['admin', 'client'].includes(userType)) {
    return res.status(400).json({ error: 'Tipo de usuário inválido' });
  }

  // Buscar código válido
  db.get(
    `SELECT * FROM password_reset_codes
     WHERE user_type = ? AND email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
     ORDER BY created_at DESC
     LIMIT 1`,
    [userType, email, code],
    async (err, resetCode) => {
      if (err) {
        return res.status(500).json({ error: 'Erro no servidor' });
      }

      if (!resetCode) {
        return res.status(400).json({ error: 'Código inválido ou expirado' });
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const table = userType === 'admin' ? 'admins' : 'clients';

      // Atualizar senha
      db.run(
        `UPDATE ${table} SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?`,
        [hashedPassword, email],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar senha' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
          }

          // Marcar código como usado
          db.run(
            'UPDATE password_reset_codes SET used = 1 WHERE id = ?',
            [resetCode.id],
            (err) => {
              if (err) {
                console.error('Erro ao marcar código como usado:', err);
              }
            }
          );

          res.json({ message: 'Senha alterada com sucesso' });
        }
      );
    }
  );
};

module.exports = {
  requestPasswordReset,
  confirmPasswordReset
};
