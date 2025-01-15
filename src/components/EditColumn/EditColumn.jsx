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
import './EditColumn.css';

const SortableItem = ({ id, column, onDelete }) => {
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
        disabled={column.isPrimary}
      />
      <select
        className="column-input type-select"
        value={column.type}
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

const EditColumn = ({ columns, onSave, onCancel }) => {
  const [editableColumns, setEditableColumns] = useState(columns);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setEditableColumns((items) => {
        const oldIndex = items.findIndex(item => `col-${item.name}` === active.id);
        const newIndex = items.findIndex(item => `col-${item.name}` === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDelete = (columnName) => {
    setEditableColumns(columns => columns.filter(col => col.name !== columnName));
  };

  return (
    <div className="edit-column-container">
      <div className="edit-column-header">
        <h3>Edit Columns</h3>
        <div>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={() => onSave(editableColumns)}>Save</button>
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
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default EditColumn; 