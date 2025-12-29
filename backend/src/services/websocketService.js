const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { saveMessage } = require('../controllers/chatController');

/**
 * Serviço de WebSocket para chat ao vivo
 */

let wss;
const clients = new Map(); // Map<userId, WebSocket>

/**
 * Inicializar servidor WebSocket
 */
const initWebSocket = (server) => {
  wss = new WebSocket.Server({
    server,
    path: '/ws/chat'
  });

  wss.on('connection', (ws, req) => {
    console.log('📡 Nova conexão WebSocket');

    // Autenticar via query string: ?token=JWT_TOKEN
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const token = urlParams.get('token');

    if (!token) {
      ws.close(1008, 'Token não fornecido');
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      ws.userId = decoded.userId;
      ws.userRole = decoded.role;
      ws.clientId = decoded.clientId;

      // Armazenar conexão
      clients.set(ws.userId, ws);
      console.log(`✅ Cliente autenticado: ${ws.userId} (${ws.userRole})`);

      // Enviar confirmação de conexão
      ws.send(JSON.stringify({
        type: 'connected',
        userId: ws.userId,
        role: ws.userRole
      }));

    } catch (error) {
      console.error('❌ Erro ao verificar token:', error);
      ws.close(1008, 'Token inválido');
      return;
    }

    // Receber mensagens
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        console.log('📩 Mensagem recebida:', message);

        if (message.type === 'chat_message') {
          // Salvar mensagem no banco
          const savedMessage = await saveMessage({
            client_id: message.clientId,
            admin_id: ws.userRole === 'admin' ? ws.userId : null,
            message: message.text,
            sender_type: ws.userRole === 'admin' ? 'admin' : 'client'
          });

          // Preparar mensagem para broadcast
          const broadcastMessage = {
            type: 'chat_message',
            id: savedMessage.id,
            clientId: savedMessage.client_id,
            adminId: savedMessage.admin_id,
            text: savedMessage.message,
            senderType: savedMessage.sender_type,
            isRead: savedMessage.is_read,
            createdAt: savedMessage.created_at
          };

          // Se admin enviou, enviar para o cliente específico
          if (ws.userRole === 'admin' && message.clientId) {
            const clientConnection = Array.from(clients.values()).find(
              client => client.clientId === message.clientId
            );

            if (clientConnection && clientConnection.readyState === WebSocket.OPEN) {
              clientConnection.send(JSON.stringify(broadcastMessage));
            }
          }

          // Se cliente enviou, enviar para todos os admins online
          if (ws.userRole === 'client') {
            clients.forEach((client) => {
              if (client.userRole === 'admin' && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(broadcastMessage));
              }
            });
          }

          // Enviar de volta para o remetente (confirmação)
          ws.send(JSON.stringify({
            ...broadcastMessage,
            type: 'message_sent'
          }));
        }

        // Typing indicator
        if (message.type === 'typing') {
          if (ws.userRole === 'admin' && message.clientId) {
            const clientConnection = Array.from(clients.values()).find(
              client => client.clientId === message.clientId
            );

            if (clientConnection && clientConnection.readyState === WebSocket.OPEN) {
              clientConnection.send(JSON.stringify({
                type: 'typing',
                isTyping: message.isTyping
              }));
            }
          } else if (ws.userRole === 'client') {
            clients.forEach((client) => {
              if (client.userRole === 'admin' && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'typing',
                  clientId: ws.clientId,
                  isTyping: message.isTyping
                }));
              }
            });
          }
        }

      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Erro ao processar mensagem'
        }));
      }
    });

    // Remover conexão ao desconectar
    ws.on('close', () => {
      console.log(`👋 Cliente desconectado: ${ws.userId}`);
      clients.delete(ws.userId);
    });

    ws.on('error', (error) => {
      console.error('❌ Erro no WebSocket:', error);
    });
  });

  console.log('✅ Servidor WebSocket inicializado em /ws/chat');
};

/**
 * Enviar notificação para um usuário específico
 */
const sendToUser = (userId, message) => {
  const client = clients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
    return true;
  }
  return false;
};

/**
 * Broadcast para todos os admins
 */
const broadcastToAdmins = (message) => {
  let count = 0;
  clients.forEach((client) => {
    if (client.userRole === 'admin' && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      count++;
    }
  });
  return count;
};

/**
 * Obter total de conexões ativas
 */
const getActiveConnections = () => {
  return {
    total: clients.size,
    admins: Array.from(clients.values()).filter(c => c.userRole === 'admin').length,
    clients: Array.from(clients.values()).filter(c => c.userRole === 'client').length
  };
};

module.exports = {
  initWebSocket,
  sendToUser,
  broadcastToAdmins,
  getActiveConnections
};
