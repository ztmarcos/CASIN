import React, { useState } from 'react';
import './CreateTableModal.css';

const CreateTableModal = ({ isOpen, onClose, onSubmit }) => {
  const [tableName, setTableName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!tableName.trim()) {
      setError('El nombre de la tabla es requerido');
      return;
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tableName)) {
      setError('El nombre debe comenzar con una letra y solo puede contener letras, números y guiones bajos');
      return;
    }

    onSubmit({ tableName: tableName.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Crear Nueva Tabla</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="tableName">Nombre de la Tabla:</label>
            <input
              id="tableName"
              type="text"
              value={tableName}
              onChange={(e) => {
                setError('');
                setTableName(e.target.value);
              }}
              placeholder="Ingrese el nombre de la tabla"
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="submit-btn">
              Crear Tabla
            </button>
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTableModal; 