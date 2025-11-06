import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import activityLogger from '../../utils/activityLogger';
import './ActivityModal.css';

const ActivityModal = ({ activity, selectedUser, onSave, onClose }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('pending');
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef(null);
  
  // Obtener historial de la actividad
  const history = activity?.history || [];

  // Formatear fecha de la actividad
  const getActivityDate = () => {
    if (!activity?.createdAt) return 'Nueva Actividad';
    
    try {
      const date = activity.createdAt instanceof Date ? activity.createdAt : new Date(activity.createdAt);
      if (isNaN(date.getTime())) return 'Actividad';
      
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Actividad';
    }
  };

  useEffect(() => {
    if (activity) {
      setContent(activity.description || activity.title || '');
      setStatus(activity.status || 'pending');
    } else {
      setContent('');
      setStatus('pending');
    }
    // Auto focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activity]);

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Por favor escribe algo en la actividad');
      return;
    }

    // Determinar el nombre y email del usuario
    const userName = selectedUser?.name || activity?.userName || 'Usuario';
    const userEmail = selectedUser?.email || activity?.userEmail || '';
    
    // Para createdBy, usar el email si está disponible, sino el nombre
    const createdBy = activity?.createdBy || userEmail || userName;

    const activityData = {
      title: content.substring(0, 100), // First 100 chars as title
      description: content,
      status: status,
      priority: 'medium',
      createdAt: activity?.createdAt || new Date().toISOString(),
      createdBy: createdBy,
      userName: userName,
      userEmail: userEmail, // Guardar el email también
      tags: [],
      assignedUsers: [],
      comments: []
    };

    // Log daily activity to activity logs
    try {
      const logDate = new Date(activityData.createdAt).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      
      await activityLogger.logDailyActivity(
        activityData.title,
        activityData.description,
        {
          createdAt: activityData.createdAt,
          date: logDate
        }
      );
      console.log('✅ Daily activity logged');
    } catch (error) {
      console.error('❌ Error logging daily activity:', error);
    }

    onSave(activityData);
  };

  const handleKeyDown = (e) => {
    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = content.substring(start, end);
      
      if (selectedText) {
        const beforeText = content.substring(0, start);
        const afterText = content.substring(end);
        const newContent = `${beforeText}**${selectedText}**${afterText}`;
        setContent(newContent);
        
        // Restore selection
        setTimeout(() => {
          textarea.selectionStart = start;
          textarea.selectionEnd = end + 4; // +4 for the ** **
        }, 0);
      }
    }
    
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    
    // Escape to close
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const toggleBold = () => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    if (selectedText) {
      const beforeText = content.substring(0, start);
      const afterText = content.substring(end);
      const newContent = `${beforeText}**${selectedText}**${afterText}`;
      setContent(newContent);
      textarea.focus();
    }
  };

  return (
    <div className="activity-modal-overlay" onClick={onClose}>
      <div className="activity-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="activity-modal-header">
          <h2>{activity ? `Actividad del ${getActivityDate()}` : 'Nueva Actividad'}</h2>
          <button className="activity-modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="activity-modal-body">
          <div className="activity-toolbar">
            <button 
              className="toolbar-btn" 
              onClick={toggleBold}
              title="Negrita (Ctrl/Cmd + B)"
            >
              <strong>B</strong>
            </button>
            <span className="toolbar-hint">
              Ctrl/Cmd + B = Negrita | Ctrl/Cmd + Enter = Guardar
            </span>
          </div>

          <div className="status-selector">
            <label>Estado:</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En Proceso</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <textarea
            ref={textareaRef}
            className="activity-textarea"
            placeholder="Escribe tu actividad aquí..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* Historial de Actividad */}
          {activity && history.length > 0 && (
            <div className="activity-history-section">
              <button 
                className="history-toggle-btn"
                onClick={() => setShowHistory(!showHistory)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
                Historial ({history.length})
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  style={{ transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}
                >
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </button>

              {showHistory && (
                <div className="activity-history-list">
                  {history.map((entry, index) => (
                    <div key={index} className="history-entry">
                      <div className="history-entry-header">
                        <span className="history-action">{entry.action}</span>
                        <span className="history-date">
                          {new Date(entry.timestamp).toLocaleString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {entry.changes && (
                        <div className="history-changes">
                          {entry.changes.map((change, idx) => (
                            <div key={idx} className="history-change-item">
                              <strong>{change.field}:</strong> {change.oldValue} → {change.newValue}
                            </div>
                          ))}
                        </div>
                      )}
                      {entry.user && (
                        <div className="history-user">Por: {entry.user}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="activity-modal-footer">
          <button className="activity-btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button className="activity-btn-save" onClick={handleSave}>
            Guardar Actividad
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;

