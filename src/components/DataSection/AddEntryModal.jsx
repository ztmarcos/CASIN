import React, { useState } from 'react';
import './AddEntryModal.css';

const AddEntryModal = ({ isOpen, onClose, table, onSubmit }) => {
  const [formData, setFormData] = useState({});

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (columnName, value) => {
    setFormData(prev => ({
      ...prev,
      [columnName]: value
    }));
  };

  const renderInput = (column) => {
    const commonProps = {
      id: column.name,
      name: column.name,
      value: formData[column.name] || '',
      onChange: (e) => handleChange(column.name, e.target.value),
      className: "form-input",
      required: !column.isPrimary // Primary keys are usually auto-generated
    };

    switch (column.type.toUpperCase()) {
      case 'INTEGER':
        return <input type="number" {...commonProps} />;
      
      case 'DECIMAL':
        return <input type="number" step="0.01" {...commonProps} />;
      
      case 'BOOLEAN':
        return (
          <select {...commonProps}>
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      
      case 'DATE':
        return <input type="date" {...commonProps} />;
      
      case 'TIMESTAMP':
        return <input type="datetime-local" {...commonProps} />;
      
      default: // VARCHAR, TEXT, etc.
        return <input type="text" {...commonProps} />;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add New Entry to {table.name}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {table.columns.map(column => (
            !column.isPrimary && ( // Skip primary key fields
              <div key={column.name} className="form-group">
                <label htmlFor={column.name}>
                  {column.name}
                  <span className="type-hint">({column.type})</span>
                </label>
                {renderInput(column)}
              </div>
            )
          ))}
          
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal; 