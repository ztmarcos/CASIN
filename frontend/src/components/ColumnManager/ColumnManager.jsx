import React, { useState, useEffect, useMemo } from 'react';
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

      // Skip loading columns for combined tables (containing →)
      if (selectedTable.name.includes('→')) {
        console.log('Combined table detected, skipping column structure load');
        setColumns([]);
        return;
      }

      console.log('Loading columns for table:', selectedTable.name);
      setIsLoading(true);
      setError(null);
      
      // UNIFIED APPROACH: Use same API as DataTable for consistency
      try {
        const API_URL = window.location.hostname === 'localhost' 
          ? 'http://localhost:3001/api' 
          : '/api';
        
        const structureUrl = `${API_URL}/data/tables/${selectedTable.name}/structure`;
        console.log('🔧 ColumnManager: Fetching structure from:', structureUrl);
        
        const response = await fetch(structureUrl);
        console.log('🔧 ColumnManager: Received structure response status:', response.status);
        
        if (response.ok) {
          const structure = await response.json();
          console.log('🔧 ColumnManager: Received complete table structure from API:', structure);
          
          if (structure.columns && Array.isArray(structure.columns)) {
            const newColumns = structure.columns.map(col => ({
              name: col.name,
              type: col.type || 'TEXT',
              isCustom: col.isCustom || false
            }));
            console.log('🔧 ColumnManager: Raw columns from API:', newColumns.map(c => `${c.name}${c.isCustom ? ' (custom)' : ''}`));
            console.log('🔧 ColumnManager: Setting columns from API structure (unified):', newColumns);
            setColumns(newColumns);
            setError(null); // Clear any previous errors
            return;
          } else {
            console.warn('🔧 ColumnManager: Invalid structure.columns:', structure.columns);
          }
        } else {
          console.warn('🔧 ColumnManager: API response not ok:', response.status, response.statusText);
        }
      } catch (apiError) {
        console.error('🔧 ColumnManager: Could not get structure from API:', apiError);
      }
      
      // FALLBACK: Try tableService approach
      try {
        const tableData = await tableService.getData(selectedTable.name);
        console.log('Received table data (fallback):', tableData);
        
        if (tableData && tableData.data && Array.isArray(tableData.data) && tableData.data.length > 0) {
          // Get columns from actual data
          const dataColumns = Object.keys(tableData.data[0]);
          console.log('Columns from actual data (fallback):', dataColumns);
          
          // Filter out system columns and format as column objects
          const filteredColumns = dataColumns
            .filter(col => col !== 'firebase_doc_id') // Remove Firebase system columns
            .map(col => ({
              name: col,
              type: 'TEXT' // Default type, can be enhanced later
            }));
          
          console.log('Setting columns from actual data (fallback):', filteredColumns);
          setColumns(filteredColumns);
          return;
        }
      } catch (dataError) {
        console.warn('Could not get data for column extraction:', dataError);
      }
      
      // FINAL FALLBACK: Try the old structure approach
      const structure = await tableService.getTableStructure(selectedTable.name);
      console.log('Received table structure (final fallback):', structure);
      
      if (structure && Array.isArray(structure.columns)) {
        const newColumns = structure.columns.map(col => ({
          name: col.name,
          type: col.type || 'TEXT'
        }));
        console.log('Setting columns from structure (fallback):', newColumns);
        setColumns(newColumns);
      } else {
        console.warn('Invalid structure received:', structure);
        setColumns([]);
        setError('Could not load column structure');
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
      console.log('🔧 ColumnManager: No change in column order');
      return;
    }

    console.log('🔧 ColumnManager: Column order change detected:', {
      activeId: active.id,
      overId: over.id,
      tableName: selectedTable?.name
    });

    // Remove 'col-' prefix to get actual column names
    const oldIndex = columns.findIndex(col => `col-${col.name}` === active.id);
    const newIndex = columns.findIndex(col => `col-${col.name}` === over.id);

    console.log('🔧 ColumnManager: Moving column from index', oldIndex, 'to index', newIndex);

    const newColumns = arrayMove(columns, oldIndex, newIndex);
    
    try {
      // Update local state first for immediate feedback
      setColumns(newColumns);
      console.log('🔧 ColumnManager: Updated local state with new order');
      
      // Update in the database
      const columnNames = newColumns.map(col => col.name);
      console.log('🔧 ColumnManager: Updating database with order:', columnNames);
      await tableService.updateColumnOrder(selectedTable.name, columnNames);
      console.log('✅ ColumnManager: Database updated successfully');
      
      // Refresh to ensure we're showing the current database state
      await loadColumns();
      console.log('✅ ColumnManager: Columns reloaded from database');

      // Notify parent to refresh data
      if (onOrderChange) {
        console.log('🔧 ColumnManager: Calling onOrderChange callback');
        onOrderChange();
      }

      // Dispatch custom event for DataTable to pick up
      const event = new CustomEvent('columnOrderUpdated', {
        detail: { 
          tableName: selectedTable.name, 
          columnOrder: columnNames 
        }
      });
      window.dispatchEvent(event);
      console.log('🔧 ColumnManager: Dispatched columnOrderUpdated event');
    } catch (error) {
      console.error('❌ ColumnManager: Failed to update column order:', error);
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
    console.log('🔄 ColumnManager: refreshData called for table:', selectedTable?.name);
    if (selectedTable?.name) {
      await loadColumns();
      if (onOrderChange) {
        console.log('🔄 ColumnManager: Calling onOrderChange to refresh DataTable');
        onOrderChange();
      }
    }
  };

  // Add event listener for table updates
  useEffect(() => {
    const handleTableUpdate = (event) => {
      console.log('🔄 ColumnManager: Table structure updated event received:', event.detail);
      console.log('🔄 ColumnManager: Current selected table:', selectedTable?.name);
      
      // Only refresh if the event is for our current table
      if (event.detail?.tableName === selectedTable?.name) {
        console.log('🔄 ColumnManager: Refreshing for current table');
        refreshData();
      } else {
        console.log('🔄 ColumnManager: Ignoring event for different table');
      }
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

  // Filtrar columnas especiales (igual que DataTable)
  const filteredColumns = useMemo(() => {
    const result = columns.filter(colObj => {
      const columnName = colObj.name.toLowerCase();
      // Lista completa de columnas a filtrar
      const excludeColumns = [
        'pdf',
        'firebase_doc_id', 
        'estado_pago',
        'created_at',
        'updated_at',
        'createdat',
        'updatedat'
      ];
      
      return !excludeColumns.includes(columnName);
    });
    
    console.log('🔧 ColumnManager: Filtrado de columnas:', {
      total: columns.length,
      filtered: result.length,
      allColumns: columns.map(c => c.name),
      filteredColumns: result.map(c => c.name),
      excludedColumns: columns.filter(c => {
        const columnName = c.name.toLowerCase();
        const excludeColumns = [
          'pdf',
          'firebase_doc_id', 
          'estado_pago',
          'created_at',
          'updated_at',
          'createdat',
          'updatedat'
        ];
        return excludeColumns.includes(columnName);
      }).map(c => c.name)
    });
    
    return result;
  }, [columns]);

  // Log para debugging
  useEffect(() => {
    if (columns.length > 0) {
      console.log('🔧 ColumnManager: All columns received:', columns.map(c => c.name));
      console.log('🔧 ColumnManager: Filtered columns:', filteredColumns.map(c => c.name));
    }
  }, [columns, filteredColumns]);

  return (
    <div className="column-manager">
      <div className="section-header">
        <h3>
          Columnas {columns.length > 0 && `(${columns.length})`}
        </h3>
        <div className="header-buttons">
          <button className="refresh-btn" onClick={refreshData} title="Refrescar columnas">
            🔄
          </button>
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
              items={filteredColumns.map(col => `col-${col.name}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="columns-tags">
                {filteredColumns.map((column) => (
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
    </div>
  );
};

export default ColumnManager; 