import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './EditColumn.css';

const EditColumn = ({ selectedTable, onColumnsUpdate }) => {
  const [columns, setColumns] = useState([]);

  useEffect(() => {
    if (selectedTable && selectedTable.columns) {
      setColumns(selectedTable.columns.map((col, index) => ({
        ...col,
        id: col.id || String(index + 1)
      })));
    }
  }, [selectedTable]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedColumns = Array.from(columns);
    const [removed] = reorderedColumns.splice(result.source.index, 1);
    reorderedColumns.splice(result.destination.index, 0, removed);
    setColumns(reorderedColumns);
    onColumnsUpdate?.(reorderedColumns);
  };

  const handleDelete = (id) => {
    const updatedColumns = columns.filter(column => column.id !== id);
    setColumns(updatedColumns);
    onColumnsUpdate?.(updatedColumns);
  };

  const handleEdit = (id, field, value) => {
    const updatedColumns = columns.map(column => {
      if (column.id === id) {
        return { ...column, [field]: value };
      }
      return column;
    });
    setColumns(updatedColumns);
    onColumnsUpdate?.(updatedColumns);
  };

  const handleAddColumn = () => {
    const newColumn = { 
      id: Date.now().toString(), 
      name: `New Column`, 
      type: 'VARCHAR',
      length: '255',
      isPrimary: false
    };
    const updatedColumns = [...columns, newColumn];
    setColumns(updatedColumns);
    onColumnsUpdate?.(updatedColumns);
  };

  const DATA_TYPES = ['VARCHAR', 'INTEGER', 'TEXT', 'TIMESTAMP', 'BOOLEAN', 'DATE', 'JSON'];

  if (!selectedTable) return null;

  return (
    <div className="edit-column-container">
      <div className="edit-column-header">
        <h3>Edit Columns: {selectedTable.name}</h3>
        <button className="btn-primary" onClick={handleAddColumn}>
          <span className="btn-icon">+</span> Add Column
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="columns">
          {(provided) => (
            <ul 
              className="columns-list"
              {...provided.droppableProps} 
              ref={provided.innerRef}
            >
              {columns.map((column, index) => (
                <Draggable 
                  key={column.id} 
                  draggableId={column.id} 
                  index={index}
                  isDragDisabled={column.isPrimary}
                >
                  {(provided, snapshot) => (
                    <li 
                      className={`column-item ${snapshot.isDragging ? 'dragging' : ''} ${column.isPrimary ? 'primary' : ''}`}
                      ref={provided.innerRef} 
                      {...provided.draggableProps}
                    >
                      <div 
                        className="drag-handle"
                        {...provided.dragHandleProps}
                      >
                        ⋮⋮
                      </div>
                      
                      <input
                        type="text"
                        className="column-input name-input"
                        value={column.name}
                        onChange={(e) => handleEdit(column.id, 'name', e.target.value)}
                        placeholder="Column name"
                        disabled={column.isPrimary}
                      />

                      <select
                        className="column-input type-select"
                        value={column.type.split('(')[0]}
                        onChange={(e) => handleEdit(column.id, 'type', e.target.value)}
                        disabled={column.isPrimary}
                      >
                        {DATA_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>

                      {column.type.startsWith('VARCHAR') && (
                        <input
                          type="number"
                          className="column-input length-input"
                          value={column.type.match(/\((\d+)\)/)?.[1] || '255'}
                          onChange={(e) => handleEdit(column.id, 'type', `VARCHAR(${e.target.value})`)}
                          placeholder="Length"
                          min="1"
                          max="255"
                          disabled={column.isPrimary}
                        />
                      )}

                      {column.isPrimary ? (
                        <span className="primary-badge">PK</span>
                      ) : (
                        <button 
                          className="btn-icon delete-btn"
                          onClick={() => handleDelete(column.id)}
                          title="Delete column"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default EditColumn; 