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

  const handleNameChange = (e) => {
    onEdit(column.name, { ...column, name: e.target.value });
  };

  const handleTypeChange = (e) => {
    onEdit(column.name, { ...column, type: e.target.value });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`column-item ${column.isPrimary ? 'primary' : ''}`}
      {...attributes}
    >
      <span className="drag-handle" {...listeners}>⋮⋮</span>
      <input
        type="text"
        className="column-input name-input"
        value={column.name}
        onChange={handleNameChange}
        disabled={column.isPrimary}
      />
      <select
        className="column-input type-select"
        value={column.type}
        onChange={handleTypeChange}
        disabled={column.isPrimary}
      >
        <option value="VARCHAR">VARCHAR</option>
        <option value="INTEGER">INTEGER</option>
        <option value="DECIMAL">DECIMAL</option>
        <option value="DATE">DATE</option>
        <option value="BOOLEAN">BOOLEAN</option>
      </select>
      {column.isPrimary ? (
        <span className="primary-badge">Primary Key</span>
      ) : (
        <button className="delete-btn" onClick={() => onDelete(column.name)}>×</button>
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
      
      // Update column type if changed
      const currentColumn = editableColumns.find(col => col.name === oldName);
      if (currentColumn.type !== updatedColumn.type) {
        await tableService.updateColumnType(tableName, updatedColumn.name, updatedColumn.type);
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
      // Save all changes
      await tableService.updateColumns(tableName, editableColumns);
      toast.success('All changes saved');
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