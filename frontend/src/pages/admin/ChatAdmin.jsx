import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiSend, FiUsers, FiClock } from 'react-icons/fi';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const ChatAdmin = () => {
  const { token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.client_id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const connectWebSocket = () => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
    const ws = new WebSocket(`${wsUrl}/ws/chat?token=${token}`);

    ws.onopen = () => {
      console.log('WebSocket conectado');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'chat_message' || data.type === 'message_sent') {
        // Se for mensagem da conversa atual, adicionar
        if (selectedConversation && data.clientId === selectedConversation.client_id) {
          setMessages(prev => [...prev, {
            id: data.id,
            text: data.text,
            senderType: data.senderType,
            createdAt: data.createdAt
          }]);
        }

        // Atualizar lista de conversas
        loadConversations();
      }
    };

    ws.onclose = () => {
      console.log('WebSocket desconectado');
      setIsConnected(false);
      wsRef.current = null;

      // Tentar reconectar após 5 segundos
      setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
    };

    wsRef.current = ws;
  };

  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast.error('Erro ao carregar conversas');
      setLoading(false);
    }
  };

  const loadMessages = async (clientId) => {
    try {
      const response = await chatAPI.getHistory({ client_id: clientId });
      setMessages(response.data.map(msg => ({
        id: msg.id,
        text: msg.message,
        senderType: msg.sender_type,
        createdAt: msg.created_at
      })));

      // Marcar como lidas
      await chatAPI.markAsRead({ client_id: clientId, sender_type: 'client' });
      loadConversations(); // Atualizar contador
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !selectedConversation || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'chat_message',
      clientId: selectedConversation.client_id,
      text: inputMessage.trim()
    };

    wsRef.current.send(JSON.stringify(message));
    setInputMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-neutral-800 dark:text-white">
            Chat com Clientes
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {isConnected ? 'Online' : 'Desconectado'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Conversas */}
          <div className="lg:col-span-1">
            <div className="card h-[calc(100vh-250px)] flex flex-col">
              <div className="flex items-center gap-2 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                <FiUsers size={20} className="text-neutral-600 dark:text-neutral-400" />
                <h2 className="font-semibold text-neutral-800 dark:text-white">
                  Conversas ({conversations.length})
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                {loading && (
                  <div className="flex justify-center items-center py-8">
                    <div className="spinner"></div>
                  </div>
                )}

                {!loading && conversations.length === 0 && (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    <FiMessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Nenhuma conversa ainda</p>
                  </div>
                )}

                {conversations.map((conv) => (
                  <button
                    key={conv.client_id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      selectedConversation?.client_id === conv.client_id
                        ? 'bg-pink-50 dark:bg-pink-900/20 border-2 border-pink-500'
                        : 'bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-neutral-800 dark:text-white">
                          {conv.client_name}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                          {conv.client_email}
                        </p>
                      </div>
                      {conv.unread_count > 0 && (
                        <span className="bg-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 flex items-center gap-1">
                      <FiClock size={12} />
                      {new Date(conv.last_message_at).toLocaleString('pt-BR')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Área de Chat */}
          <div className="lg:col-span-2">
            <div className="card h-[calc(100vh-250px)] flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Header da Conversa */}
                  <div className="pb-4 border-b border-neutral-200 dark:border-neutral-700">
                    <h2 className="font-semibold text-lg text-neutral-800 dark:text-white">
                      {selectedConversation.client_name}
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {selectedConversation.client_email}
                    </p>
                  </div>

                  {/* Mensagens */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-lg ${
                            msg.senderType === 'admin'
                              ? 'bg-gradient-primary text-white'
                              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-white'
                          }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-1 ${
                            msg.senderType === 'admin' ? 'text-white/70' : 'text-neutral-500'
                          }`}>
                            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input de Mensagem */}
                  <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex gap-2">
                      <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={isConnected ? "Digite sua mensagem..." : "Conectando..."}
                        disabled={!isConnected}
                        className="input flex-1 resize-none"
                        rows={2}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || !isConnected}
                        className="btn-primary h-full px-6"
                      >
                        <FiSend size={20} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                  <div className="text-center">
                    <FiMessageCircle size={64} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Selecione uma conversa para começar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAdmin;
