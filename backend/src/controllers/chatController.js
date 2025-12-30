const db = require('../config/database');
const { usePG } = require('../config/database');

/**
 * Obter histórico de mensagens de chat
 */
const getChatHistory = async (req, res) => {
  try {
    const { client_id, limit = 50 } = req.query;

    let query = `
      SELECT
        cm.*,
        c.name as client_name,
        u.name as admin_name
      FROM chat_messages cm
      LEFT JOIN clients c ON cm.client_id = c.id
      LEFT JOIN ${usePG ? 'admins' : 'users'} u ON cm.admin_id = u.id
    `;

    const params = [];
    let paramIndex = 1;

    if (client_id) {
      query += ` WHERE cm.client_id = ${usePG ? '$' + paramIndex++ : '?'}`;
      params.push(client_id);
    }

    query += ` ORDER BY cm.created_at DESC LIMIT ${usePG ? '$' + paramIndex : '?'}`;
    params.push(parseInt(limit));

    const messages = await db.all(query, params);

    // Reverter ordem para exibir cronologicamente
    res.json(messages.reverse());
  } catch (err) {
    console.error('Erro ao buscar histórico de chat:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de chat' });
  }
};

/**
 * Obter conversas ativas (admin)
 */
const getActiveConversations = async (req, res) => {
  try {
    const conversations = await db.all(`
      SELECT
        c.id as client_id,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        MAX(cm.created_at) as last_message_at,
        COUNT(CASE WHEN cm.is_read = ${usePG ? 'false' : '0'} AND cm.sender_type = 'client' THEN 1 END) as unread_count
      FROM clients c
      INNER JOIN chat_messages cm ON c.id = cm.client_id
      GROUP BY c.id${usePG ? ', c.name, c.email, c.phone' : ''}
      ORDER BY last_message_at DESC
    `, []);

    res.json(conversations);
  } catch (err) {
    console.error('Erro ao buscar conversas ativas:', err);
    res.status(500).json({ error: 'Erro ao buscar conversas ativas' });
  }
};

/**
 * Marcar mensagens como lidas
 */
const markMessagesAsRead = async (req, res) => {
  try {
    const { client_id, sender_type } = req.body;

    if (!client_id || !sender_type) {
      return res.status(400).json({ error: 'client_id e sender_type são obrigatórios' });
    }

    const query = usePG
      ? `UPDATE chat_messages
         SET is_read = true
         WHERE client_id = $1 AND sender_type = $2 AND is_read = false`
      : `UPDATE chat_messages
         SET is_read = 1
         WHERE client_id = ? AND sender_type = ? AND is_read = 0`;

    const result = await db.run(query, [client_id, sender_type]);

    res.json({
      success: true,
      updated: result.changes
    });
  } catch (err) {
    console.error('Erro ao marcar mensagens como lidas:', err);
    res.status(500).json({ error: 'Erro ao marcar mensagens como lidas' });
  }
};

/**
 * Salvar mensagem no banco (chamado pelo WebSocket)
 */
const saveMessage = async (messageData) => {
  try {
    const { client_id, admin_id, message, sender_type } = messageData;

    const insertQuery = usePG
      ? `INSERT INTO chat_messages (client_id, admin_id, message, sender_type, is_read)
         VALUES ($1, $2, $3, $4, false) RETURNING id`
      : `INSERT INTO chat_messages (client_id, admin_id, message, sender_type, is_read)
         VALUES (?, ?, ?, ?, 0)`;

    const result = await db.run(insertQuery, [client_id, admin_id || null, message, sender_type]);
    const messageId = result.lastID;

    // Retornar mensagem completa com ID
    const selectQuery = usePG
      ? 'SELECT * FROM chat_messages WHERE id = $1'
      : 'SELECT * FROM chat_messages WHERE id = ?';

    const savedMessage = await db.get(selectQuery, [messageId]);
    return savedMessage;
  } catch (err) {
    console.error('Erro ao salvar mensagem:', err);
    throw err;
  }
};

/**
 * Deletar histórico de chat
 */
const deleteChatHistory = async (req, res) => {
  try {
    const { client_id } = req.params;

    const query = usePG
      ? 'DELETE FROM chat_messages WHERE client_id = $1'
      : 'DELETE FROM chat_messages WHERE client_id = ?';

    const result = await db.run(query, [client_id]);

    res.json({
      success: true,
      deleted: result.changes
    });
  } catch (err) {
    console.error('Erro ao deletar histórico:', err);
    res.status(500).json({ error: 'Erro ao deletar histórico de chat' });
  }
};

// Debug: Verificar se as funções existem antes de exportar
console.log('🔍 ChatController - Verificando exports:');
console.log('  getChatHistory:', typeof getChatHistory);
console.log('  getActiveConversations:', typeof getActiveConversations);
console.log('  markMessagesAsRead:', typeof markMessagesAsRead);
console.log('  saveMessage:', typeof saveMessage);
console.log('  deleteChatHistory:', typeof deleteChatHistory);

module.exports = {
  getChatHistory,
  getActiveConversations,
  markMessagesAsRead,
  saveMessage,
  deleteChatHistory
};

console.log('✅ ChatController module.exports configurado');
