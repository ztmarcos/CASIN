import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './ActivityModal.css';

const ActivityModal = ({ activity, onSave, onClose }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const textareaRef = useRef(null);
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  useEffect(() => {
    if (activity) {
      setContent(activity.description || activity.title || '');
    }
    // Auto focus textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activity]);

  const handleSave = () => {
    if (!content.trim()) {
      alert('Por favor escribe algo en la actividad');
      return;
    }

    const activityData = {
      title: content.substring(0, 100), // First 100 chars as title
      description: content,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      createdBy: user?.email || 'unknown',
      userName: user?.name || user?.displayName || user?.email || 'Usuario',
      tags: [],
      assignedUsers: [],
      comments: []
    };

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
          <h2>Actividad de {formattedDate}</h2>
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

          <textarea
            ref={textareaRef}
            className="activity-textarea"
            placeholder="Escribe tu actividad aquí..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
          />
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

