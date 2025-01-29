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
import PDFParser from '../PDFParser_new/PDFParser';
import tableService from '../../services/data/tableService';
import './ColumnManager.css';
import Modal from '../common/Modal';

const SortableItem = ({ id, column, onDelete, onEdit, onTagChange, onPdfToggle, isPdfEnabled }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(column);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tag, setTag] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);

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
      setShowEditConfirm(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleConfirmEdit = () => {
    onEdit(column, editedName.trim());
    setShowEditConfirm(false);
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
      <>
        <form onSubmit={handleEditSubmit} className="column-edit-form">
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            autoFocus
            onBlur={() => !showEditConfirm && setIsEditing(false)}
          />
        </form>
        {showEditConfirm && (
          <div className="confirmation-dialog">
            <p>Are you sure you want to rename this column?</p>
            <div className="confirmation-actions">
              <button className="cancel-btn" onClick={() => {
                setShowEditConfirm(false);
                setIsEditing(false);
              }}>Cancel</button>
              <button className="confirm-btn" onClick={handleConfirmEdit}>Confirm</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="column-tag-container">
      <span className="column-tag" {...attributes} {...listeners}>
        {id === 'col-id' ? '•' : ''}{column}
        {tag && <span className="column-tag-label">{tag}</span>}
      </span>
      <div className="column-actions">
        <button 
          onClick={() => onPdfToggle(column)} 
          className={`action-btn pdf-toggle ${isPdfEnabled ? 'active' : ''}`}
          title={isPdfEnabled ? 'PDF enabled' : 'PDF disabled'}
        >
          <svg className="pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
        </button>
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
            <button onClick={() => setIsEditing(true)} className="action-btn edit-btn">
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
  const [newColumnType, setNewColumnType] = useState('text');
  const [showPDFParser, setShowPDFParser] = useState(false);
  const [pdfEnabledColumns, setPdfEnabledColumns] = useState({});

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
        console.log(`Deleting column: ${columnName}`);
        
        // Optimistically update the UI
        setColumns((prevColumns) => prevColumns.filter((col) => col !== columnName));

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

  const handleEditColumnName = async (oldName, newName) => {
    try {
      setIsLoading(true);
      console.log(`Renaming column from ${oldName} to ${newName}`);
      
      // Optimistically update the UI
      setColumns((prevColumns) => 
        prevColumns.map((col) => (col === oldName ? newName : col))
      );

      await tableService.renameColumn(selectedTable.name, oldName, newName);
      await loadColumns(); // Ensure data is refreshed from the server
      if (onOrderChange) {
        onOrderChange();
      }
    } catch (err) {
      console.error('Failed to rename column:', err);
      setError('Failed to rename column');
      await loadColumns(); // Revert changes if there's an error
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
      setPdfEnabledColumns(prev => ({
        ...prev,
        [columnName]: !prev[columnName]
      }));
      // Here you would typically update this in your backend
      await tableService.updateColumnPdfStatus(selectedTable.name, columnName, !pdfEnabledColumns[columnName]);
    } catch (err) {
      console.error('Failed to toggle PDF status:', err);
      setError('Failed to toggle PDF status');
      // Revert the change if there's an error
      setPdfEnabledColumns(prev => ({
        ...prev,
        [columnName]: !prev[columnName]
      }));
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
          Columns {columns.length > 0 && `(${columns.length})`}
        </h3>
        <div className="header-buttons">
          <button className="create-btn" onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? '—' : '+'}
          </button>
          <button className="pdf-btn" onClick={() => setShowPDFParser(true)}>
            <svg className="pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
          </button>
        </div>
      </div>

      {/* PDF Parser Modal */}
      <Modal 
        isOpen={showPDFParser} 
        onClose={() => setShowPDFParser(false)}
        size="full"
      >
        <div style={{ height: '100%', width: '100%' }}>
          <PDFParser />
        </div>
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
                        onPdfToggle={handlePdfToggle}
                        isPdfEnabled={pdfEnabledColumns[column]}
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