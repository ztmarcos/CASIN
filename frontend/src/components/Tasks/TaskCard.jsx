import React from 'react';
import './TaskCard.css';

const TaskCard = ({ 
  task, 
  onEdit, 
  onDelete, 
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
      const d = new Date(date);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return null;
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate || task.status === 'completed') return false;
    return new Date(dueDate) < new Date();
  };

  const statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En Progreso' },
    { value: 'completed', label: 'Completada' },
    { value: 'cancelled', label: 'Cancelada' }
  ];

  return (
    <div className={`task-card ${isDark ? 'dark' : 'light'} ${task.status}`}>
      {/* Header de la card */}
      <div className="task-card-header">
        <div className="task-title-row">
          <h3 className="task-title" title={task.title}>
            {task.title}
          </h3>
          <div className="task-actions">
            <button 
              className="action-btn edit-btn"
              onClick={() => onEdit(task)}
              title="Editar tarea"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button 
              className="action-btn delete-btn"
              onClick={() => onDelete(task.id)}
              title="Eliminar tarea"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Status y Priority */}
        <div className="task-meta-row">
          <select 
            className="status-select"
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
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

        {/* Horas estimadas/reales */}
        {(task.estimatedHours || task.actualHours) && (
          <div className="info-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zM12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
            </svg>
            <span>
              {task.estimatedHours && `${task.estimatedHours}h est.`}
              {task.actualHours && ` / ${task.actualHours}h real`}
            </span>
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