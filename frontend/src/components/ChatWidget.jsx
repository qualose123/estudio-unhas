import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiX, FiSend } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import './ChatWidget.css';

const ChatWidget = () => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Conectar ao WebSocket quando o chat abrir
  useEffect(() => {
    if (isOpen && user && token && !wsRef.current) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, user, token]);

  const connectWebSocket = () => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
    const ws = new WebSocket(`${wsUrl}/ws/chat?token=${token}`);

    ws.onopen = () => {
      console.log('WebSocket conectado');
      setIsConnected(true);
      loadChatHistory();
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat_message' || data.type === 'message_sent') {
        setMessages(prev => [...prev, {
          id: data.id,
          text: data.text,
          senderType: data.senderType,
          createdAt: data.createdAt
        }]);
      }

      if (data.type === 'typing') {
        setIsTyping(data.isTyping);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket desconectado');
      setIsConnected(false);
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
    };

    wsRef.current = ws;
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/chat/history?client_id=${user.clientId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const history = await response.json();
        setMessages(history.map(msg => ({
          id: msg.id,
          text: msg.message,
          senderType: msg.sender_type,
          createdAt: msg.created_at
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'chat_message',
      clientId: user.clientId,
      text: inputMessage.trim()
    };

    wsRef.current.send(JSON.stringify(message));
    setInputMessage('');

    // Parar indicador de digitação
    wsRef.current.send(JSON.stringify({
      type: 'typing',
      clientId: user.clientId,
      isTyping: false
    }));
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);

    // Enviar indicador de digitação
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        clientId: user.clientId,
        isTyping: true
      }));

      // Limpar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Parar indicador após 2 segundos de inatividade
      typingTimeoutRef.current = setTimeout(() => {
        wsRef.current.send(JSON.stringify({
          type: 'typing',
          clientId: user.clientId,
          isTyping: false
        }));
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Só mostrar chat para usuários logados
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          className="chat-widget-button"
          onClick={() => setIsOpen(true)}
          title="Chat ao vivo"
        >
          <FiMessageCircle size={24} />
          {/* Badge de mensagens não lidas (pode ser implementado depois) */}
        </button>
      )}

      {/* Janela de chat */}
      {isOpen && (
        <div className="chat-widget-container">
          {/* Header */}
          <div className="chat-widget-header">
            <div className="chat-header-info">
              <h3>Chat ao Vivo</h3>
              <span className={`chat-status ${isConnected ? 'online' : 'offline'}`}>
                {isConnected ? 'Online' : 'Desconectado'}
              </span>
            </div>
            <button
              className="chat-close-button"
              onClick={() => setIsOpen(false)}
              title="Fechar chat"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Área de mensagens */}
          <div className="chat-widget-messages">
            {messages.length === 0 ? (
              <div className="chat-empty-state">
                <FiMessageCircle size={48} />
                <p>Nenhuma mensagem ainda</p>
                <span>Envie uma mensagem para começar</span>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`chat-message ${msg.senderType === 'client' ? 'sent' : 'received'}`}
                  >
                    <div className="chat-message-bubble">
                      <p>{msg.text}</p>
                      <span className="chat-message-time">
                        {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="chat-message received">
                    <div className="chat-message-bubble typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input de mensagem */}
          <div className="chat-widget-input">
            <textarea
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder={isConnected ? "Digite sua mensagem..." : "Conectando..."}
              disabled={!isConnected}
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || !isConnected}
              className="chat-send-button"
              title="Enviar mensagem"
            >
              <FiSend size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
