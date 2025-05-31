import React, { useState, useEffect } from 'react';
import './AddEntryModal.css';

const AddEntryModal = ({ isOpen, onClose, table, onSubmit }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Initialize form with empty values
      const initialData = {};
      table.columns.forEach(column => {
        if (!column.isPrimary) {
          initialData[column.name] = '';
        }
      });
      setFormData(initialData);
      setErrors({});
    }
  }, [isOpen, table]);

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors = {};
    table.columns.forEach(column => {
      if (!column.isPrimary && !formData[column.name] && column.required) {
        newErrors[column.name] = 'This field is required';
      } else if (formData[column.name]) {
        // Type validation
        switch (column.type.toUpperCase()) {
          case 'INTEGER':
            if (!Number.isInteger(Number(formData[column.name]))) {
              newErrors[column.name] = 'Must be a whole number';
            }
            break;
          case 'DECIMAL':
            if (isNaN(Number(formData[column.name]))) {
              newErrors[column.name] = 'Must be a valid number';
            }
            break;
          case 'DATE':
            if (isNaN(Date.parse(formData[column.name]))) {
              newErrors[column.name] = 'Must be a valid date';
            }
            break;
          default:
            break;
        }
      }
    });
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
        onClose();
      } catch (error) {
        setErrors({ submit: 'Failed to submit data. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  const handleChange = (columnName, value) => {
    setFormData(prev => ({
      ...prev,
      [columnName]: value
    }));
    // Clear error when user starts typing
    if (errors[columnName]) {
      setErrors(prev => ({
        ...prev,
        [columnName]: undefined
      }));
    }
  };

  const renderInput = (column) => {
    const commonProps = {
      id: column.name,
      name: column.name,
      value: formData[column.name] || '',
      onChange: (e) => handleChange(column.name, e.target.value),
      className: `form-input ${errors[column.name] ? 'error' : ''}`,
      required: column.required,
      'aria-invalid': errors[column.name] ? 'true' : 'false',
      'aria-describedby': errors[column.name] ? `${column.name}-error` : undefined
    };

    switch (column.type.toUpperCase()) {
      case 'INTEGER':
        return (
          <input 
            type="number" 
            step="1"
            {...commonProps} 
          />
        );
      
      case 'DECIMAL':
        return (
          <input 
            type="number" 
            step="0.01" 
            {...commonProps} 
          />
        );
      
      case 'BOOLEAN':
        return (
          <select {...commonProps}>
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      
      case 'DATE':
        return (
          <input 
            type="date" 
            {...commonProps} 
          />
        );
      
      case 'TIMESTAMP':
        return (
          <input 
            type="datetime-local" 
            {...commonProps} 
          />
        );
      
      case 'TEXT':
        return (
          <textarea 
            {...commonProps}
            rows="3"
          />
        );
      
      default: // VARCHAR, etc.
        return (
          <input 
            type="text" 
            {...commonProps} 
          />
        );
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add New Entry to {table.name}</h3>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} noValidate>
          {errors.submit && (
            <div className="error-banner">
              {errors.submit}
            </div>
          )}
          
          <div className="form-fields">
            {table.columns.map(column => (
              !column.isPrimary && (
                <div key={column.name} className="form-group">
                  <label htmlFor={column.name}>
                    {column.name}
                    {column.required && <span className="required">*</span>}
                    <span className="type-hint">({column.type})</span>
                  </label>
                  {renderInput(column)}
                  {errors[column.name] && (
                    <div 
                      className="error-message" 
                      id={`${column.name}-error`}
                    >
                      {errors[column.name]}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
          
          <div className="modal-actions">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span>
                  Saving...
                </>
              ) : (
                'Add Entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEntryModal;