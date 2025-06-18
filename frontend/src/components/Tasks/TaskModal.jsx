import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './TaskModal.css';

const TaskModal = ({ task, onSave, onClose, isDark }) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assignedTo: '',
    tags: [],
    dueDate: '',
    estimatedHours: '',
    actualHours: ''
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (task) {
      // Modo edición
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        priority: task.priority || 'medium',
        assignedTo: task.assignedTo || '',
        tags: task.tags || [],
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: task.estimatedHours || '',
        actualHours: task.actualHours || ''
      });
    } else {
      // Modo creación - valores por defecto
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        assignedTo: user?.email || '',
        tags: [],
        dueDate: '',
        estimatedHours: '',
        actualHours: ''
      });
    }
  }, [task, user]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo si existe
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'El título es requerido';
    }

    if (formData.estimatedHours && isNaN(formData.estimatedHours)) {
      newErrors.estimatedHours = 'Las horas estimadas deben ser un número';
    }

    if (formData.actualHours && isNaN(formData.actualHours)) {
      newErrors.actualHours = 'Las horas reales deben ser un número';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const taskData = {
      ...formData,
      tags: formData.tags,
      dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
      estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : null,
      actualHours: formData.actualHours ? parseInt(formData.actualHours) : null,
      createdBy: user?.email || 'sistema'
    };

    onSave(taskData);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={`task-modal-overlay ${isDark ? 'dark' : 'light'}`} onClick={handleOverlayClick}>
      <div className="task-modal">
        <div className="modal-header">
          <h2>{task ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Título */}
          <div className="form-group">
            <label htmlFor="title">Título *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Título de la tarea"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-message">{errors.title}</span>}
          </div>

          {/* Descripción */}
          <div className="form-group">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descripción de la tarea"
              rows="3"
            />
          </div>

          {/* Row de Estado y Prioridad */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Estado</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="pending">Pendiente</option>
                <option value="in_progress">En Progreso</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Prioridad</label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          {/* Asignado a */}
          <div className="form-group">
            <label htmlFor="assignedTo">Asignado a</label>
            <input
              id="assignedTo"
              type="text"
              value={formData.assignedTo}
              onChange={(e) => handleInputChange('assignedTo', e.target.value)}
              placeholder="Email o nombre del responsable"
            />
          </div>

          {/* Fecha de vencimiento */}
          <div className="form-group">
            <label htmlFor="dueDate">Fecha de vencimiento</label>
            <input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
            />
          </div>

          {/* Horas estimadas y reales */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="estimatedHours">Horas estimadas</label>
              <input
                id="estimatedHours"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimatedHours}
                onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                placeholder="Ej: 8"
                className={errors.estimatedHours ? 'error' : ''}
              />
              {errors.estimatedHours && <span className="error-message">{errors.estimatedHours}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="actualHours">Horas reales</label>
              <input
                id="actualHours"
                type="number"
                min="0"
                step="0.5"
                value={formData.actualHours}
                onChange={(e) => handleInputChange('actualHours', e.target.value)}
                placeholder="Ej: 6"
                className={errors.actualHours ? 'error' : ''}
              />
              {errors.actualHours && <span className="error-message">{errors.actualHours}</span>}
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label htmlFor="tags">Etiquetas</label>
            <div className="tags-input-container">
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagInputKeyPress}
                placeholder="Agregar etiqueta y presionar Enter"
              />
              <button 
                type="button" 
                onClick={handleAddTag}
                className="add-tag-btn"
                disabled={!tagInput.trim()}
              >
                Agregar
              </button>
            </div>
            
            {formData.tags.length > 0 && (
              <div className="tags-list">
                {formData.tags.map((tag, index) => (
                  <span key={index} className="tag-item">
                    {tag}
                    <button 
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="remove-tag-btn"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancelar
            </button>
            <button type="submit" className="save-btn">
              {task ? 'Actualizar' : 'Crear'} Tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal; 