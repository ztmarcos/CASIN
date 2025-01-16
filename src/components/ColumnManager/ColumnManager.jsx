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

const SortableItem = ({ id, column, onDelete, onEdit, onTagChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(column);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tag, setTag] = useState('');

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
    if (editedName.trim() && editedName !== column) {
      onEdit(column, editedName.trim());
    }
    setIsEditing(false);
  };

  const handleTagSubmit = (e) => {
    e.preventDefault();
    if (tag.trim()) {
      onTagChange(column, tag.trim());
      setShowTagInput(false);
      setTag('');
    }
  };

  if (isEditing) {
    return (
      <form onSubmit={handleEditSubmit} className="column-edit-form">
        <input
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          autoFocus
          onBlur={() => setIsEditing(false)}
        />
      </form>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="column-tag-container">
      <span className="column-tag" {...attributes} {...listeners}>
        {id === 'col-id' ? '🔑 ' : ''}{column}
        {tag && <span className="column-tag-label">{tag}</span>}
      </span>
      <div className="column-actions">
        {showTagInput ? (
          <form onSubmit={handleTagSubmit} className="tag-input-form">
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              autoFocus
              onBlur={() => setShowTagInput(false)}
              placeholder="Add tag"
            />
          </form>
        ) : (
          <>
            <button onClick={() => setShowTagInput(true)} className="action-btn tag-btn">
              🏷️
            </button>
            <button onClick={() => setIsEditing(true)} className="action-btn edit-btn">
              ✏️
            </button>
            {id !== 'col-id' && (
              <button onClick={() => onDelete(column)} className="action-btn delete-btn">
                🗑️
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ColumnManager = ({ selectedTable, onOrderChange }) => {
  const [columns, setColumns] = useState([]);
  const [columnTags, setColumnTags] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('text');

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

  const handleCreateColumn = async (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    try {
      setIsLoading(true);
      await tableService.addColumn(selectedTable.name, {
        name: newColumnName.trim(),
        type: newColumnType
      });
      
      // Refresh columns
      await loadColumns();
      
      // Reset form
      setNewColumnName('');
      setNewColumnType('text');
      setShowCreateForm(false);
      
      // Notify parent
      if (onOrderChange) {
        onOrderChange();
      }
    } catch (err) {
      console.error('Failed to create column:', err);
      setError('Failed to create column');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteColumn = async (columnName) => {
    if (window.confirm(`Are you sure you want to delete the column "${columnName}"?`)) {
      try {
        setIsLoading(true);
        await tableService.deleteColumn(selectedTable.name, columnName);
        await loadColumns();
        if (onOrderChange) {
          onOrderChange();
        }
      } catch (err) {
        console.error('Failed to delete column:', err);
        setError('Failed to delete column');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditColumnName = async (oldName, newName) => {
    try {
      setIsLoading(true);
      await tableService.renameColumn(selectedTable.name, oldName, newName);
      await loadColumns();
      if (onOrderChange) {
        onOrderChange();
      }
    } catch (err) {
      console.error('Failed to rename column:', err);
      setError('Failed to rename column');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagChange = async (columnName, tag) => {
    try {
      setIsLoading(true);
      await tableService.setColumnTag(selectedTable.name, columnName, tag);
      setColumnTags(prev => ({
        ...prev,
        [columnName]: tag
      }));
    } catch (err) {
      console.error('Failed to set column tag:', err);
      setError('Failed to set column tag');
    } finally {
      setIsLoading(false);
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
        <div className="header-buttons">
          <button className="create-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : 'Create'}
          </button>
          <button className="edit-btn" onClick={() => setIsEditing(true)}>
            Edit
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {showCreateForm && (
            <form onSubmit={handleCreateColumn} className="create-column-form">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Column name"
                required
              />
              <select
                value={newColumnType}
                onChange={(e) => setNewColumnType(e.target.value)}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
              </select>
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Add Column'}
              </button>
            </form>
          )}

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
                        onDelete={handleDeleteColumn}
                        onEdit={handleEditColumnName}
                        onTagChange={handleTagChange}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ColumnManager; 