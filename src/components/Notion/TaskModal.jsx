import React, { useState, useEffect } from 'react';
import { TASK_STATUS_OPTIONS, PROPERTY_CONFIGS } from './config';
import './NotionComponent.css';

const TaskModal = ({ task, isOpen, onClose, onSave, notionUsers }) => {
  const [editedTask, setEditedTask] = useState({});
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      const cleanTask = {
        id: task.id,
        title: task.title || '',
        Encargado: Array.isArray(task.Encargado) && task.Encargado.length > 0
          ? task.Encargado[0].id
          : task.Encargado?.id || task.Encargado || '',
        Status: task.Status || 'Por iniciar',
        'Fecha límite': task['Fecha límite'] || '',
        Descripción: task.Descripción || ''
      };
      setEditedTask(cleanTask);
      setErrors({}); // Clear errors when task changes
    } else {
      setEditedTask({
        title: '',
        Encargado: '',
        Status: 'Por iniciar',
        'Fecha límite': '',
        Descripción: ''
      });
    }
  }, [task]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!editedTask.title?.trim()) {
      newErrors.title = 'El título es requerido';
    }
    
    if (!editedTask.Status) {
      newErrors.Status = 'El estado es requerido';
    }
    
    if (editedTask['Fecha límite'] && new Date(editedTask['Fecha límite']) < new Date()) {
      newErrors['Fecha límite'] = 'La fecha límite no puede ser en el pasado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);
      console.log('Preparing task data from:', editedTask);
      
      const updates = Object.entries(editedTask)
        .filter(([key, value]) => key !== 'id' && value !== undefined)
        .map(([column, value]) => {
          const config = PROPERTY_CONFIGS[column];
          if (!config) {
            console.warn(`No config found for column: ${column}`);
            return null;
          }

          const update = {
            taskId: editedTask.id,
            column,
            value: value || '', // Send raw value, let the parent component handle formatting
            propertyType: config.type
          };
          console.log(`Prepared update for ${column}:`, update);
          return update;
        })
        .filter(Boolean);

      console.log('Final updates to send:', updates);

      await onSave({
        isNew: !editedTask.id,
        updates,
        properties: editedTask
      });
      
      // Only close the modal after successful save
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      setErrors({ submit: 'Error al guardar la tarea. Por favor, intente nuevamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notion-modal-overlay" onClick={onClose}>
      <div className="notion-modal" onClick={e => e.stopPropagation()}>
        <h3>{task ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
        <div className="notion-modal-content">
          <div className="notion-form-group">
            <input
              type="text"
              className={`notion-input ${errors.title ? 'notion-input-error' : ''}`}
              placeholder="Título"
              value={editedTask.title || ''}
              onChange={e => {
                setEditedTask({ ...editedTask, title: e.target.value });
                if (errors.title) {
                  setErrors({ ...errors, title: undefined });
                }
              }}
            />
            {errors.title && <div className="notion-error-message">{errors.title}</div>}
          </div>
          
          <div className="notion-form-group">
            <select
              className={`notion-select ${errors.Encargado ? 'notion-input-error' : ''}`}
              value={editedTask.Encargado || ''}
              onChange={e => {
                setEditedTask({ ...editedTask, Encargado: e.target.value });
                if (errors.Encargado) {
                  setErrors({ ...errors, Encargado: undefined });
                }
              }}
            >
              <option value="">Seleccionar encargado...</option>
              {notionUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name || user.person?.email || user.email || user.id}
                </option>
              ))}
            </select>
            {errors.Encargado && <div className="notion-error-message">{errors.Encargado}</div>}
          </div>

          <div className="notion-form-group">
            <select
              className={`notion-select ${errors.Status ? 'notion-input-error' : ''}`}
              value={editedTask.Status || ''}
              onChange={e => {
                setEditedTask({ ...editedTask, Status: e.target.value });
                if (errors.Status) {
                  setErrors({ ...errors, Status: undefined });
                }
              }}
            >
              <option value="">Seleccionar estado...</option>
              {TASK_STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.Status && <div className="notion-error-message">{errors.Status}</div>}
          </div>

          <div className="notion-form-group">
            <input
              type="date"
              className={`notion-input ${errors['Fecha límite'] ? 'notion-input-error' : ''}`}
              value={editedTask['Fecha límite'] || ''}
              onChange={e => {
                setEditedTask({ ...editedTask, 'Fecha límite': e.target.value });
                if (errors['Fecha límite']) {
                  setErrors({ ...errors, 'Fecha límite': undefined });
                }
              }}
            />
            {errors['Fecha límite'] && <div className="notion-error-message">{errors['Fecha límite']}</div>}
          </div>

          <div className="notion-form-group">
            <textarea
              className={`notion-textarea ${errors.Descripción ? 'notion-input-error' : ''}`}
              placeholder="Descripción"
              value={editedTask.Descripción || ''}
              onChange={e => {
                setEditedTask({ ...editedTask, Descripción: e.target.value });
                if (errors.Descripción) {
                  setErrors({ ...errors, Descripción: undefined });
                }
              }}
            />
            {errors.Descripción && <div className="notion-error-message">{errors.Descripción}</div>}
          </div>

          {errors.submit && <div className="notion-error-message notion-submit-error">{errors.submit}</div>}

          <div className="notion-modal-actions">
            <button 
              onClick={onClose} 
              className="notion-button cancel"
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave} 
              className="notion-button create"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal; 