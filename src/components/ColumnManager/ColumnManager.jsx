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
import tableService from '../../services/data/tableService';
import './ColumnManager.css';
import Modal from '../Modal/Modal';
import { toast } from 'react-hot-toast';
import EditColumn from '../EditColumn/EditColumn';

const SortableItem = ({ id, column, onDelete, onEdit, onTagChange, onPdfToggle, isPdfEnabled }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(column);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tag, setTag] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editedType, setEditedType] = useState('TEXT');

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
      handleConfirmEdit();
    }
  };

  const handleConfirmEdit = () => {
    if (editedName.trim() !== column || editedType !== (columns.find(colObj => colObj.name === column)?.type || 'TEXT')) {
      onEdit(column, editedName.trim(), editedType);
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
      <div ref={setNodeRef} style={style} className="column-edit-container">
        <form onSubmit={handleEditSubmit} className="column-edit-form">
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            autoFocus
            className="column-edit-input"
            placeholder="Column name"
          />
          <select
            value={editedType}
            onChange={(e) => setEditedType(e.target.value)}
            className="column-type-select"
          >
            <option value="TEXT">Text</option>
            <option value="INT">Integer</option>
            <option value="DECIMAL">Decimal</option>
            <option value="DATE">Date</option>
            <option value="BOOLEAN">Boolean</option>
          </select>
          <div className="column-edit-actions">
            <button 
              type="button" 
              onClick={() => setIsEditing(false)}
              className="cancel-btn"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="save-btn"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="column-tag-container">
      <span className="column-tag" {...attributes} {...listeners}>
        {id === 'col-id' ? '•' : ''}{column}
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
            <button onClick={() => {
              setIsEditing(true);
              setEditedName(column);
            }} className="action-btn edit-btn">
              ✎
            </button>
            {id !== 'col-id' && (
              <>
                <button onClick={() => setShowDeleteConfirm(true)} className="action-btn delete-btn">
                  ×
                </button>
                {showDeleteConfirm && (
                  <div className="confirmation-dialog">
                    <p>Delete this column?</p>
                    <div className="confirmation-actions">
                      <button className="cancel-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                      <button className="confirm-btn" onClick={() => {
                        onDelete(column);
                        setShowDeleteConfirm(false);
                      }}>Delete</button>
                    </div>
                  </div>
                )}
              </>
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState('TEXT');
  const [showEditColumns, setShowEditColumns] = useState(false);
  const [pdfEnabledColumns, setPdfEnabledColumns] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadColumns = async () => {
    try {
      if (!selectedTable?.name) {
        console.log('No table selected, skipping column load');
        setColumns([]);
        return;
      }

      console.log('Loading columns for table:', selectedTable.name);
      setIsLoading(true);
      setError(null);
      
      const structure = await tableService.getTableStructure(selectedTable.name);
      console.log('Received table structure:', structure);
      
      if (structure && Array.isArray(structure.columns)) {
        const newColumns = structure.columns.map(col => ({
          name: col.name,
          type: col.type || 'TEXT'
        }));
        console.log('Setting columns state:', newColumns);
        setColumns(newColumns);
      } else {
        console.warn('Invalid structure received:', structure);
        setColumns([]);
        setError('Invalid table structure received');
      }
    } catch (error) {
      console.error('Error loading columns:', error);
      setError(error.message || 'Failed to load columns');
      setColumns([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable?.name) {
      console.log('Table changed, loading columns for:', selectedTable.name);
      loadColumns();
    } else {
      console.log('No table selected, clearing columns');
      setColumns([]);
    }
  }, [selectedTable]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    // Remove 'col-' prefix to get actual column names
    const oldIndex = columns.findIndex(col => `col-${col.name}` === active.id);
    const newIndex = columns.findIndex(col => `col-${col.name}` === over.id);

    const newColumns = arrayMove(columns, oldIndex, newIndex);
    
    try {
      // Update local state first for immediate feedback
      setColumns(newColumns);
      
      // Update in the database
      await tableService.updateColumnOrder(selectedTable.name, newColumns.map(col => col.name));
      
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
      setError(null); // Clear any previous errors
      
      // Add the column
      await tableService.addColumn(selectedTable.name, {
        name: newColumnName.trim(),
        type: newColumnType
      });
      
      // Reset form state
      setNewColumnName('');
      setNewColumnType('TEXT');
      setShowCreateForm(false);
      
      // Show success message
      toast.success('Column created successfully');
      
      // Refresh the columns list
      await loadColumns();
      
      // Notify parent
      if (onOrderChange) {
        onOrderChange();
      }
    } catch (err) {
      console.error('Failed to create column:', err);
      setError(err.message || 'Failed to create column');
      toast.error(err.message || 'Failed to create column');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteColumn = async (columnName) => {
    if (window.confirm(`Are you sure you want to delete the column "${columnName}"?`)) {
      try {
        setIsLoading(true);
        console.log(`Deleting column: ${columnName}`);
        
        // Optimistically update the UI
        setColumns((prevColumns) => prevColumns.filter((col) => col.name !== columnName));

        await tableService.deleteColumn(selectedTable.name, columnName);
        await loadColumns(); // Ensure data is refreshed from the server
        if (onOrderChange) {
          onOrderChange();
        }
      } catch (err) {
        console.error('Failed to delete column:', err);
        setError('Failed to delete column');
        await loadColumns(); // Revert changes if there's an error
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditColumnName = async (oldName, newName, newType) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!selectedTable?.name) {
        throw new Error('No table selected');
      }

      // First try to rename if name changed
      if (oldName !== newName) {
        await tableService.renameColumn(selectedTable.name, oldName, newName);
      }

      // Then update the column type if it changed
      const currentColumn = columns.find(col => col.name === oldName);
      if (currentColumn && currentColumn.type !== newType) {
        // Add type update logic here when backend supports it
        console.log('Type change requested:', { oldType: currentColumn.type, newType });
      }

      // Refresh the columns to get the updated state
      await loadColumns();
      
      // Show success message
      toast.success('Column updated successfully');
      
      // Notify parent component if needed
      if (onOrderChange) {
        onOrderChange();
      }
    } catch (err) {
      console.error('Failed to update column:', err);
      setError(err.message || 'Failed to update column');
      toast.error(err.message || 'Failed to update column');
      // Refresh to ensure we're showing current state
      await loadColumns();
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

  const handlePdfToggle = async (columnName) => {
    try {
      setIsLoading(true);
      await tableService.updateColumnPdfStatus(selectedTable.name, columnName, !pdfEnabledColumns[columnName]);
    } catch (err) {
      console.error('Failed to toggle PDF status:', err);
      setError('Failed to toggle PDF status');
    } finally {
      setIsLoading(false);
    }
  };

  // Add refresh function
  const refreshData = async () => {
    if (selectedTable?.name) {
      await loadColumns();
      if (onOrderChange) {
        onOrderChange();
      }
    }
  };

  // Add event listener for table updates
  useEffect(() => {
    const handleTableUpdate = () => {
      console.log('Table structure updated, refreshing...');
      refreshData();
    };

    window.addEventListener('tableStructureUpdated', handleTableUpdate);
    return () => window.removeEventListener('tableStructureUpdated', handleTableUpdate);
  }, [selectedTable]);

  const handleEditColumns = () => {
    setShowEditColumns(true);
  };

  const handleEditColumnsSave = async (updatedColumns) => {
    try {
      setIsLoading(true);
      await loadColumns(); // Always reload columns from backend after save
      if (onOrderChange) {
        onOrderChange();
      }
      setShowEditColumns(false);
      toast.success('Columns updated successfully');
    } catch (error) {
      console.error('Failed to save column changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="column-manager">
      <div className="section-header">
        <h3>
          <span className="collapse-icon" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '›' : '⌄'}
          </span>
          Columnas {columns.length > 0 && `(${columns.length})`}
        </h3>
        <div className="header-buttons">
          <button className="create-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? '—' : '+'}
          </button>
          <button className="edit-btn" onClick={handleEditColumns}>
            Edit
          </button>
        </div>
      </div>

      {/* Edit Columns Modal */}
      <Modal 
        isOpen={showEditColumns} 
        onClose={() => setShowEditColumns(false)}
        size="large"
      >
        <EditColumn
          columns={columns}
          tableName={selectedTable?.name}
          onSave={handleEditColumnsSave}
          onCancel={() => setShowEditColumns(false)}
        />
      </Modal>

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
                <option value="TEXT">Text</option>
                <option value="INT">Integer</option>
                <option value="DECIMAL">Decimal</option>
                <option value="DATE">Date</option>
                <option value="BOOLEAN">Boolean</option>
              </select>
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Add Column'}
              </button>
            </form>
          )}

          {error && (
            <div className="error-message">
              {error}
              <button onClick={refreshData} className="refresh-btn">
                Retry
              </button>
            </div>
          )}

          <div className="columns-list">
            {!selectedTable?.name ? (
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
                  items={columns.map(col => `col-${col.name}`)}
                  strategy={horizontalListSortingStrategy}
                >
                  <div className="columns-tags">
                    {columns.map((column) => (
                      <SortableItem 
                        key={`col-${column.name}`}
                        id={`col-${column.name}`}
                        column={column.name}
                        onDelete={handleDeleteColumn}
                        onEdit={handleEditColumnName}
                        onTagChange={handleTagChange}
                        onPdfToggle={handlePdfToggle}
                        isPdfEnabled={pdfEnabledColumns[column.name]}
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