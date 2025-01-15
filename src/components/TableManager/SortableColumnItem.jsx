import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableColumnItem = ({ column, index, onEdit, onDelete, onCapture }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`column-item ${isDragging ? 'dragging' : ''}`}
    >
      {column.isPrimary ? (
        <div className="column-drag-handle"></div>
      ) : (
        <div {...attributes} {...listeners} className="column-drag-handle">
          ⋮⋮
        </div>
      )}
      <div className="column-icon">{column.isPrimary ? '🔑' : '📄'}</div>
      <div className="column-name">{column.name}</div>
      <div className="column-type">{column.type}</div>
      {!column.isPrimary && (
        <div className="column-actions">
          <button
            onClick={() => onCapture(column)}
            className="btn-capture"
            title="Capture column data"
          >
            📋
          </button>
          <button
            onClick={() => onEdit(column)}
            className="btn-edit"
            title="Edit column"
          >
            ✎
          </button>
          <button
            onClick={() => onDelete(column.name)}
            className="btn-delete"
            title="Delete column"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default SortableColumnItem; 