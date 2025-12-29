const db = require('../config/database');

/**
 * Obter histórico de mensagens de chat
 */
const getChatHistory = (req, res) => {
  const { client_id, limit = 50 } = req.query;

  let query = `
    SELECT
      cm.*,
      c.name as client_name,
      u.name as admin_name
    FROM chat_messages cm
    LEFT JOIN clients c ON cm.client_id = c.id
    LEFT JOIN users u ON cm.admin_id = u.id
  `;

  const params = [];

  if (client_id) {
    query += ' WHERE cm.client_id = ?';
    params.push(client_id);
  }

  query += ' ORDER BY cm.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, messages) => {
    if (err) {
      console.error('Erro ao buscar histórico de chat:', err);
      return res.status(500).json({ error: 'Erro ao buscar histórico de chat' });
    }

    // Reverter ordem para exibir cronologicamente
    res.json(messages.reverse());
  });
};

/**
 * Obter conversas ativas (admin)
 */
const getActiveConversations = (req, res) => {
  db.all(`
    SELECT
      c.id as client_id,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      MAX(cm.created_at) as last_message_at,
      COUNT(CASE WHEN cm.is_read = 0 AND cm.sender_type = 'client' THEN 1 END) as unread_count
    FROM clients c
    INNER JOIN chat_messages cm ON c.id = cm.client_id
    GROUP BY c.id
    ORDER BY last_message_at DESC
  `, [], (err, conversations) => {
    if (err) {
      console.error('Erro ao buscar conversas ativas:', err);
      return res.status(500).json({ error: 'Erro ao buscar conversas ativas' });
    }

    res.json(conversations);
  });
};

/**
 * Marcar mensagens como lidas
 */
const markMessagesAsRead = (req, res) => {
  const { client_id, sender_type } = req.body;

  if (!client_id || !sender_type) {
    return res.status(400).json({ error: 'client_id e sender_type são obrigatórios' });
  }

  db.run(
    `UPDATE chat_messages
     SET is_read = 1
     WHERE client_id = ? AND sender_type = ? AND is_read = 0`,
    [client_id, sender_type],
    function(err) {
      if (err) {
        console.error('Erro ao marcar mensagens como lidas:', err);
        return res.status(500).json({ error: 'Erro ao marcar mensagens como lidas' });
      }

      res.json({
        success: true,
        updated: this.changes
      });
    }
  );
};

/**
 * Salvar mensagem no banco (chamado pelo WebSocket)
 */
const saveMessage = (messageData) => {
  return new Promise((resolve, reject) => {
    const { client_id, admin_id, message, sender_type } = messageData;

    db.run(
      `INSERT INTO chat_messages (client_id, admin_id, message, sender_type, is_read)
       VALUES (?, ?, ?, ?, 0)`,
      [client_id, admin_id || null, message, sender_type],
      function(err) {
        if (err) {
          console.error('Erro ao salvar mensagem:', err);
          return reject(err);
        }

        // Retornar mensagem completa com ID
        db.get(
          'SELECT * FROM chat_messages WHERE id = ?',
          [this.lastID],
          (err, row) => {
            if (err) return reject(err);
            resolve(row);
          }
        );
      }
    );
  });
};

/**
 * Deletar histórico de chat
 */
const deleteChatHistory = (req, res) => {
  const { client_id } = req.params;

  db.run(
    'DELETE FROM chat_messages WHERE client_id = ?',
    [client_id],
    function(err) {
      if (err) {
        console.error('Erro ao deletar histórico:', err);
        return res.status(500).json({ error: 'Erro ao deletar histórico de chat' });
      }

      res.json({
        success: true,
        deleted: this.changes
      });
    }
  );
};

module.exports = {
  getChatHistory,
  getActiveConversations,
  markMessagesAsRead,
  saveMessage,
  deleteChatHistory
};
