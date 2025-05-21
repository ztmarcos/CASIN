import React from 'react';
import './NotionComponent.css';

const NotionCardView = ({ tasks, onCardClick }) => {
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get status class for styling
  const getStatusClass = (status) => {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'no iniciado':
        return 'status-not-started';
      case 'en progreso':
        return 'status-in-progress';
      case 'completado':
        return 'status-completed';
      default:
        return '';
    }
  };

  // Get priority class
  const getPriorityClass = (priority) => {
    if (!priority) return 'priority-default';
    const priorityLower = priority.toLowerCase();
    switch (priorityLower) {
      case 'high':
      case 'alta':
        return 'priority-high';
      case 'medium':
      case 'media':
        return 'priority-medium';
      case 'low':
      case 'baja':
        return 'priority-low';
      default:
        return 'priority-default';
    }
  };

  const renderField = (key, value) => {
    // Skip certain fields we don't want to display
    if ([
      'id', 
      'Name', 
      'Nombre', 
      'Status', 
      'Estado', 
      'Title', 
      'Titulo',
      'PageURL', 
      'URL',
      'Description',
      'Descripcion'
    ].includes(key)) return null;

    // Format the label
    const label = key.replace(/([A-Z])/g, ' $1').trim();

    return (
      <div 
        key={key}
        className="notion-card-field"
      >
        <span className="notion-card-label">{label}:</span>
        <span className="notion-card-value">
          {Array.isArray(value) 
            ? value.join(', ')
            : key.toLowerCase().includes('date') || key.toLowerCase().includes('fecha')
              ? formatDate(value)
              : value || ''}
        </span>
      </div>
    );
  };

  return (
    <div className="notion-card-grid">
      {tasks.map((task) => (
        <div 
          key={task.id} 
          className="notion-card"
          onClick={() => onCardClick(task)}
        >
          {/* Título destacado */}
          <div className="notion-card-header">
            <h3 className="notion-card-title">
              {task.title || 'Sin título'}
            </h3>
          </div>

          <div className="notion-card-content">
            {/* Tipo y Prioridad en la misma línea */}
            <div className="notion-card-meta">
              {task['Tipo de tarea'] && (
                <span className="notion-card-type">
                  {task['Tipo de tarea']}
                </span>
              )}
              <span className={`notion-card-priority ${getPriorityClass(task.Prioridad || task.Priority)}`}>
                {task.Prioridad || task.Priority || 'Sin prioridad'}
              </span>
            </div>

            {/* Descripción */}
            {(task.Descripción || task.Description) && (
              <div className="notion-card-description">
                <span className="notion-card-value">
                  {task.Descripción || task.Description}
                </span>
              </div>
            )}

            {/* Información del encargado */}
            <div className="notion-card-assignee">
              <i className="user-icon">👤</i>
              <span>{task.Encargado || task.Assignee || 'Sin asignar'}</span>
            </div>

            {/* Fechas importantes */}
            <div className="notion-card-dates">
              <div className="notion-card-deadline">
                <i className="date-icon">⏰</i>
                <span>Fecha límite: {task['Fecha límite'] ? formatDate(task['Fecha límite']) : 'No establecida'}</span>
              </div>
              <div className="notion-card-created">
                <i className="date-icon">📅</i>
                <span>Creado: {formatDate(task.Created)}</span>
              </div>
              <div className="notion-card-edited">
                <i className="date-icon">✏️</i>
                <span>Última edición: {formatDate(task['Last Edited'])}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotionCardView; 