import React, { useState } from 'react';
import './NotionComponent.css';

const NotionCardView = ({ tasks, onCardClick, onUpdateCell, notionUsers }) => {
  const [editingField, setEditingField] = useState(null);

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

  const renderEditableField = (task, key, value) => {
    // Skip certain fields we don't want to display
    if ([
      'id', 
      'PageURL', 
      'URL',
      'Created',
      'LastEdited',
      'Last Edited'
    ].includes(key)) return null;

    const isEditing = editingField === `${task.id}-${key}`;
    const label = key.replace(/([A-Z])/g, ' $1').trim();

    const handleEdit = (newValue) => {
      setEditingField(null);
      onUpdateCell(task.id, key, newValue);
    };

    return (
      <div 
        key={key}
        className="notion-card-field"
        onClick={(e) => {
          e.stopPropagation();
          setEditingField(`${task.id}-${key}`);
        }}
      >
        <span className="notion-card-label">{label}:</span>
        {isEditing ? (
          key === 'Encargado' || key === 'Assignee' ? (
            <select
              className="notion-select"
              value={value || ''}
              onChange={(e) => handleEdit(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Select assignee...</option>
              {notionUsers.map(user => (
                <option key={user.id} value={user.email}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          ) : key === 'Status' || key === 'Estado' ? (
            <select
              className="notion-select"
              value={value || ''}
              onChange={(e) => handleEdit(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Select status...</option>
              <option value="No iniciado">No iniciado</option>
              <option value="En progreso">En progreso</option>
              <option value="Completado">Completado</option>
            </select>
          ) : key === 'Priority' || key === 'Prioridad' ? (
            <select
              className="notion-select"
              value={value || ''}
              onChange={(e) => handleEdit(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Select priority...</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          ) : key.toLowerCase().includes('date') || key.toLowerCase().includes('fecha') ? (
            <input
              type="date"
              className="notion-input"
              value={value || ''}
              onChange={(e) => handleEdit(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <input
              type="text"
              className="notion-input"
              value={value || ''}
              onChange={(e) => handleEdit(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          )
        ) : (
          <span className="notion-card-value">
            {Array.isArray(value) 
              ? value.join(', ')
              : key.toLowerCase().includes('date') || key.toLowerCase().includes('fecha')
                ? formatDate(value)
                : value || ''}
          </span>
        )}
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
            <h3 
              className="notion-card-title"
              onClick={(e) => {
                e.stopPropagation();
                setEditingField(`${task.id}-title`);
              }}
            >
              {editingField === `${task.id}-title` ? (
                <input
                  type="text"
                  className="notion-input"
                  value={task.title || ''}
                  onChange={(e) => onUpdateCell(task.id, 'title', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => setEditingField(null)}
                />
              ) : (
                task.title || 'Sin título'
              )}
            </h3>
          </div>

          <div className="notion-card-content">
            {/* Render all editable fields */}
            {Object.entries(task).map(([key, value]) => 
              renderEditableField(task, key, value)
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotionCardView; 