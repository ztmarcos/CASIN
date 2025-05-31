import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import tableService from '../../services/data/tableService';
import { toast } from 'react-hot-toast';
import './EditColumn.css';

const SortableItem = ({ id, column, onDelete, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(column.name);
  const [editedType, setEditedType] = useState(column.type || 'TEXT');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editedName.trim()) {
      onEdit(column.name, {
        ...column,
        name: editedName.trim(),
        type: editedType
      });
      setIsEditing(false);
    }
  };

  const columnTypes = [
    { value: 'TEXT', label: 'Text' },
    { value: 'VARCHAR', label: 'Short Text' },
    { value: 'INT', label: 'Integer' },
    { value: 'DECIMAL', label: 'Decimal' },
    { value: 'DATE', label: 'Date' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'TIMESTAMP', label: 'Timestamp' }
  ];

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="column-item">
        <form onSubmit={handleEditSubmit} className="column-edit-form">
          <span className="drag-handle" {...attributes} {...listeners}>⋮⋮</span>
          <input
            type="text"
            className="column-input name-input"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            disabled={column.isPrimary}
            autoFocus
            placeholder="Column name"
          />
          <select
            className="column-input type-select"
            value={editedType}
            onChange={(e) => setEditedType(e.target.value)}
            disabled={column.isPrimary}
          >
            {columnTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <div className="column-edit-actions">
            <button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="save-btn">
              Save
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`column-item${column.isPrimary ? ' primary' : ''}`}
      {...attributes}
    >
      <span className="drag-handle" {...listeners}>⋮⋮</span>
      <span 
        className="column-name" 
        onClick={() => !column.isPrimary && setIsEditing(true)}
      >
        {column.name}
      </span>
      <span 
        className="column-type"
        onClick={() => !column.isPrimary && setIsEditing(true)}
      >
        {columnTypes.find(t => t.value === column.type)?.label || column.type}
      </span>
      {column.isPrimary ? (
        <span className="primary-badge">Primary Key</span>
      ) : (
        <>
          {showDeleteConfirm ? (
            <div className="delete-confirm">
              <button onClick={() => setShowDeleteConfirm(false)} className="cancel-btn">
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDelete(column.name);
                  setShowDeleteConfirm(false);
                }} 
                className="confirm-btn"
              >
                Confirm
              </button>
            </div>
          ) : (
            <button 
              className="delete-btn" 
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete column"
            >
              ×
            </button>
          )}
        </>
      )}
    </div>
  );
};

const EditColumn = ({ columns, tableName, onSave, onCancel }) => {
  const [editableColumns, setEditableColumns] = useState(columns);
  const [isLoading, setIsLoading] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      try {
        const oldIndex = editableColumns.findIndex(item => `col-${item.name}` === active.id);
        const newIndex = editableColumns.findIndex(item => `col-${item.name}` === over.id);
        
        const newColumns = arrayMove(editableColumns, oldIndex, newIndex);
        setEditableColumns(newColumns);

        // Update column order in database
        await tableService.updateColumnOrder(tableName, newColumns.map(col => col.name));
        toast.success('Column order updated');
      } catch (error) {
        console.error('Failed to update column order:', error);
        toast.error('Failed to update column order');
      }
    }
  };

  const handleDelete = async (columnName) => {
    try {
      setIsLoading(true);
      await tableService.deleteColumn(tableName, columnName);
      setEditableColumns(columns => columns.filter(col => col.name !== columnName));
      toast.success(`Column ${columnName} deleted`);
    } catch (error) {
      console.error('Failed to delete column:', error);
      toast.error(`Failed to delete column ${columnName}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (oldName, updatedColumn) => {
    try {
      setIsLoading(true);
      if (oldName !== updatedColumn.name) {
        // If name changed, rename the column
        await tableService.renameColumn(tableName, oldName, updatedColumn.name);
      }
      // Update local state
      setEditableColumns(columns => 
        columns.map(col => col.name === oldName ? updatedColumn : col)
      );
      toast.success(`Column ${oldName} updated`);
    } catch (error) {
      console.error('Failed to update column:', error);
      toast.error(`Failed to update column ${oldName}`);
      // Revert changes in UI
      setEditableColumns(columns => 
        columns.map(col => col.name === oldName ? { ...col, name: oldName } : col)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      // Just call onSave with the current columns
      onSave(editableColumns);
    } catch (error) {
      console.error('Failed to save changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="edit-column-container">
      <div className="edit-column-header">
        <h3>Edit Columns</h3>
        <div>
          <button 
            className="btn-secondary" 
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={editableColumns.map(col => `col-${col.name}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="columns-list">
            {editableColumns.map((column) => (
              <SortableItem
                key={`col-${column.name}`}
                id={`col-${column.name}`}
                column={column}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default EditColumn; 