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
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EditColumn from '../EditColumn/EditColumn';
import tableService from '../../services/data/tableService';
import './ColumnManager.css';

const SortableItem = ({ id, column }) => {
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
    <span
      ref={setNodeRef}
      style={style}
      className="column-tag"
      {...attributes}
      {...listeners}
    >
      {id === 'col-id' ? '🔑 ' : ''}{column}
    </span>
  );
};

const ColumnManager = ({ selectedTable, onOrderChange }) => {
  const [columns, setColumns] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadColumns = async () => {
    try {
      setIsLoading(true);
      const response = await tableService.getData(selectedTable.name, { limit: 1 });
      if (response.data && response.data.length > 0) {
        const columnNames = Object.keys(response.data[0]);
        setColumns(columnNames);
      } else {
        setColumns([]);
      }
    } catch (error) {
      console.error('Error loading columns:', error);
      setError('Failed to load columns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      loadColumns();
    }
  }, [selectedTable]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    // Remove 'col-' prefix to get actual column names
    const oldIndex = columns.findIndex(col => `col-${col}` === active.id);
    const newIndex = columns.findIndex(col => `col-${col}` === over.id);

    const newColumns = arrayMove(columns, oldIndex, newIndex);
    
    try {
      // Update local state first for immediate feedback
      setColumns(newColumns);
      
      // Update in the database
      await tableService.updateColumnOrder(selectedTable.name, newColumns);
      
      // Refresh to ensure we're showing the current database state
      await loadColumns();

      // Notify parent to refresh data
      if (onOrderChange) {
        onOrderChange();
      }
    } catch (error) {
      console.error('Failed to update column order:', error);
      // Revert on error
      setColumns(columns);
    }
  };

  if (isEditing) {
    return (
      <EditColumn 
        columns={columns} 
        onSave={(updatedColumns) => {
          setColumns(updatedColumns);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="column-manager">
      <div className="section-header">
        <h3>
          <span className="collapse-icon" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '▶' : '▼'}
          </span>
          Columns {columns.length > 0 && `(${columns.length})`}
        </h3>
        <button className="edit-btn" onClick={() => setIsEditing(true)}>
          Edit
        </button>
      </div>

      {!isCollapsed && (
        <div className="columns-list">
          {!selectedTable ? (
            <div className="no-table-message">Select a table</div>
          ) : columns.length === 0 ? (
            <div className="no-columns-message">No columns</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map(col => `col-${col}`)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="columns-tags">
                  {columns.map((column) => (
                    <SortableItem 
                      key={`col-${column}`}
                      id={`col-${column}`}
                      column={column}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
};

export default ColumnManager; 