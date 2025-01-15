import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const ColumnManager = () => {
  const [columns, setColumns] = useState([
    { id: '1', name: 'Column 1' },
    { id: '2', name: 'Column 2' },
    { id: '3', name: 'Column 3' },
  ]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedColumns = Array.from(columns);
    const [removed] = reorderedColumns.splice(result.source.index, 1);
    reorderedColumns.splice(result.destination.index, 0, removed);
    setColumns(reorderedColumns);
  };

  const handleDelete = (id) => {
    setColumns(columns.filter(column => column.id !== id));
  };

  const handleEdit = (id, newName) => {
    setColumns(columns.map(column => (column.id === id ? { ...column, name: newName } : column)));
  };

  const handleAddColumn = () => {
    const newColumn = { id: Date.now().toString(), name: `New Column` };
    setColumns([...columns, newColumn]);
  };

  return (
    <div>
      <button onClick={handleAddColumn}>Add Column</button>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="columns">
          {(provided) => (
            <ul {...provided.droppableProps} ref={provided.innerRef}>
              {columns.map((column, index) => (
                <Draggable key={column.id} draggableId={column.id} index={index}>
                  {(provided) => (
                    <li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      <input
                        type="text"
                        value={column.name}
                        onChange={(e) => handleEdit(column.id, e.target.value)}
                      />
                      <button onClick={() => handleDelete(column.id)}>Delete</button>
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

export default ColumnManager; 