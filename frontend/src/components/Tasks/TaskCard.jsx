import React from 'react';
import './TaskCard.css';

const TaskCard = ({ 
  task, 
  onEdit, 
  onStatusChange, 
  getStatusColor, 
  getStatusText, 
  isDark 
}) => {
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const formatDate = (date) => {
    if (!date) return null;
    try {
      let d;
      if (date instanceof Date) {
        d = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        d = new Date(date);
      } else if (date.seconds) {
        // Firestore timestamp
        d = new Date(date.seconds * 1000);
      } else {
        return null;
      }
      
      if (isNaN(d.getTime())) return null;
      
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.warn('Error formatting date in TaskCard:', error);
      return null;
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate || task.status === 'completed') return false;
    try {
      let date;
      if (dueDate instanceof Date) {
        date = dueDate;
      } else if (typeof dueDate === 'string' || typeof dueDate === 'number') {
        date = new Date(dueDate);
      } else if (dueDate.seconds) {
        date = new Date(dueDate.seconds * 1000);
      } else {
        return false;
      }
      
      if (isNaN(date.getTime())) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      return date < today;
    } catch (error) {
      console.warn('Error checking if date is overdue in TaskCard:', error);
      return false;
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' }
  ];

  const handleCardClick = (e) => {
    // Solo abrir modal si no se hace click en el select de estado
    if (e.target.tagName !== 'SELECT' && !e.target.closest('.status-select')) {
      onEdit(task);
    }
  };

  return (
    <div 
      className={`task-card ${isDark ? 'dark' : 'light'} ${task.status} clickable`}
      onClick={handleCardClick}
    >
      {/* Header de la card */}
      <div className="task-card-header">
        <div className="task-title-row">
          <h3 className="task-title" title={task.title}>
            {task.title}
          </h3>
        </div>
        
        {/* Status y Priority */}
        <div className="task-meta-row">
          <select 
            className="status-select"
            value={task.status}
            onChange={(e) => {
              e.stopPropagation(); // Evitar que se propague al click de la card
              onStatusChange(task.id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()} // Evitar que se abra el modal al hacer click en el select
            style={{ borderColor: getStatusColor(task.status) }}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div 
            className="priority-badge"
            style={{ backgroundColor: getPriorityColor(task.priority) }}
          >
            {getPriorityText(task.priority)}
          </div>
        </div>
      </div>

      {/* Descripción */}
      {task.description && (
        <div className="task-description">
          <p>{task.description}</p>
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="task-tags">
          {task.tags.map((tag, index) => (
            <span key={index} className="task-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Información adicional */}
      <div className="task-info">
        {/* Asignado a */}
        {task.assignedTo && (
          <div className="info-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <span>{task.assignedTo}</span>
          </div>
        )}

        {/* Fecha de vencimiento */}
        {task.dueDate && (
          <div className={`info-item due-date ${isOverdue(task.dueDate) ? 'overdue' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
            </svg>
            <span>{formatDate(task.dueDate)}</span>
            {isOverdue(task.dueDate) && <span className="overdue-label">Vencida</span>}
          </div>
        )}


      </div>

      {/* Footer con fechas */}
      <div className="task-footer">
        <div className="created-date">
          <small>Creada: {formatDate(task.createdAt)}</small>
        </div>
        {task.completedAt && (
          <div className="completed-date">
            <small>Completada: {formatDate(task.completedAt)}</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard; 