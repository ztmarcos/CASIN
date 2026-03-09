import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { chatGPTService } from '../../services/chatGPTService';
import './ChatGPT.css';

const ChatGPT = () => {
  const { user } = useAuth();
  const { userTeam } = useTeam();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Check if user has access
  const hasAccess = user?.email === 'marcoszavala09@gmail.com' || user?.email === 'z.t.marcos@gmail.com';

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!hasAccess) {
      setError('No tienes permisos para acceder a esta funcionalidad.');
    } else {
      setError(null);
      // Add welcome message
      setMessages([{
        id: Date.now(),
        type: 'assistant',
        content: `¡Hola! Soy tu asistente GPT-4o-mini con acceso completo a la base de datos de Firebase, directorio de clientes y cumpleaños.

Puedo ayudarte con:
• Consultas sobre clientes y sus pólizas
• Análisis de datos de seguros
• Información de cumpleaños y contactos
• Cálculos y estadísticas
• Cualquier pregunta sobre la información almacenada

¿En qué puedo ayudarte hoy?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [hasAccess]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || !hasAccess) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatGPTService.sendMessage(inputMessage.trim(), {
        teamId: userTeam?.id,
        userId: user?.uid,
        userEmail: user?.email
      });

      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
        metadata: response.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error al procesar tu mensaje. Por favor intenta de nuevo.');
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: Date.now(),
      type: 'assistant',
      content: 'Chat limpiado. ¿En qué puedo ayudarte?',
      timestamp: new Date().toISOString()
    }]);
  };

  const formatMessage = (content) => {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');
  };

  if (!hasAccess) {
    return (
      <div className="chat-gpt-container">
        <div className="chat-access-denied">
          <div className="access-denied-icon">🔒</div>
          <h2>Acceso Restringido</h2>
          <p>Esta funcionalidad está disponible solo para usuarios autorizados.</p>
          <p>Contacta al administrador si necesitas acceso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-gpt-container">
      <div className="chat-header">
        <div className="chat-title">
          <div className="chat-icon">🤖</div>
          <div>
            <h1>Chat GPT-4o-mini</h1>
            <p>Asistente inteligente con acceso completo a la base de datos</p>
          </div>
        </div>
        <div className="chat-actions">
          <button 
            onClick={clearChat}
            className="clear-chat-btn"
            title="Limpiar chat"
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              <div 
                className="message-text"
                dangerouslySetInnerHTML={{ 
                  __html: formatMessage(message.content) 
                }}
              />
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="chat-input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Escribe tu pregunta aquí..."
            className="chat-input"
            disabled={isLoading}
            autoFocus
          />
          <button
            type="submit"
            className="send-button"
            disabled={!inputMessage.trim() || isLoading}
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </form>

      {error && (
        <div className="chat-error">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};

export default ChatGPT;