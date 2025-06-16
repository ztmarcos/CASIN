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
  horizontalListSortingStrategy,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import firebaseTableService from '../../services/firebaseTableService';
import './TableManager.css';
import { toast } from 'react-hot-toast';
import Modal from '../Modal/Modal';

// Minimalist sortable table item component
const SortableTableItem = ({ 
  table, 
  isSecondary, 
  onTableClick, 
  onTableDoubleClick, 
  isSelected, 
  isEditing, 
  editingName, 
  onNameChange, 
  onNameSubmit
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: table.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleItemClick = (e) => {
    // Don't trigger if clicking edit button, input, or drag handle
    if (e.target.closest('.edit-btn') || e.target.closest('.table-name-input') || e.target.closest('.drag-handle')) {
      return;
    }
    onTableClick(table, isSecondary);
  };

  const getDisplayName = () => {
    return table.name; // Return original Firebase table name
  };

  const getTableIcon = () => {
    // No icons, just return empty string
    return '';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`table-item-clean ${isSelected ? 'selected' : ''} ${
        table.isParentTable ? 'parent' : table.isChildTable ? 'child' : 'simple'
      }`}
      onClick={handleItemClick}
    >
      {/* Left drag handle */}
      <div className="drag-handle drag-handle-left" {...attributes} {...listeners}>
        <span className="drag-icon">⋮⋮</span>
      </div>
      
      <div className="table-main-content">
        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={onNameChange}
            onKeyDown={onNameSubmit}
            onBlur={() => onNameSubmit({ key: 'Escape' })}
            autoFocus
            className="table-name-input-clean"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="table-info-clean">
            <div className="table-header-info">
              <span className="table-name-clean">{getDisplayName()}</span>
              {table.isParentTable && (
                <span className="group-badge">GRUPO</span>
              )}
              {table.count !== undefined && table.count > 0 && (
                <span className="count-badge">{table.count}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right side with edit button and drag handle */}
      <div className="table-actions">
        <button
          className="edit-btn-clean"
          onClick={(e) => {
            e.stopPropagation();
            onTableDoubleClick(e, table);
          }}
          title="Editar tabla"
        >
          ✏️
        </button>
        <div className="drag-handle drag-handle-right" {...attributes} {...listeners}>
          <span className="drag-icon">⋮⋮</span>
        </div>
      </div>
    </div>
  );
};

const TableManager = ({ onTableSelect, selectedTableProp }) => {
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTables, setExpandedTables] = useState(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [groupData, setGroupData] = useState({
    mainTableName: '',
    secondaryTableName: '',
    groupType: 'primary'
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Updated table types for Firebase with parent-child support
  const TABLE_TYPES = {
    'primary': 'Tabla Simple',
    'parent': 'Tabla Principal (con Secundaria)',
    'child': 'Tabla Secundaria'
  };

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setIsLoading(true);
      console.log('🔥 Loading Firebase collections with relationships...');
      
      // Use firebaseTableService directly instead of backend endpoint
      const tables = await firebaseTableService.getTables();
      console.log('🔥 Received Firebase collections with relationships:', tables);
      
      // Group and organize tables by relationships
      const organizedTables = organizeTables(tables);
      setTables(organizedTables);
      setError(null);
    } catch (error) {
      console.error('❌ Error loading Firebase collections:', error);
      setError('Failed to load collections');
      toast.error('Failed to load collections');
    } finally {
      setIsLoading(false);
    }
  };

  // Organize tables to show parent-child relationships properly
  const organizeTables = (tables) => {
    const parentTables = [];
    const childTables = [];
    const simpleTables = [];

    tables.forEach(table => {
      if (table.isParentTable) {
        parentTables.push(table);
      } else if (table.isChildTable) {
        childTables.push(table);
      } else {
        simpleTables.push(table);
      }
    });

    // For minimal design: only show parent tables and simple tables
    // Child tables are hidden and accessed via dropdown in DataTable
    const displayTables = [];
    
    // Add simple tables first
    displayTables.push(...simpleTables);
    
    // Add only parent tables (they will show as red cards)
    displayTables.push(...parentTables);

    return displayTables;
  };

  const handleCreateGroup = async () => {
    try {
      const result = await firebaseTableService.createTableGroup(
        groupData.mainTableName,
        groupData.secondaryTableName,
        groupData.groupType
      );
      
      if (result.success) {
        toast.success('Table group created successfully');
        loadTables();
        setShowGroupModal(false);
        setGroupData({
          mainTableName: '',
          secondaryTableName: '',
          groupType: 'primary'
        });
      }
    } catch (error) {
      console.error('Error creating table group:', error);
      toast.error(error.message || 'Error creating table group');
    }
  };

  const toggleTableExpand = (tableName) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableName)) {
        newSet.delete(tableName);
      } else {
        newSet.add(tableName);
      }
      return newSet;
    });
  };

  const handleTableClick = (table, isSecondary = false) => {
    console.log('🎯 Table clicked:', { table, isSecondary, isParentTable: table.isParentTable, childTable: table.childTable });
    
    // For now, just select the table as-is to let DataTable handle the parent-child navigation
    // The dropdown in DataTable will handle switching between parent and child tables
    let tableToSelect = table;
    
    console.log('🚀 Selecting table:', tableToSelect.name);
    
    if (onTableSelect) {
      console.log('🚀 Calling onTableSelect with:', tableToSelect);
      onTableSelect(tableToSelect);
    }
    
    // Collapse the section after selection
    setIsCollapsed(true);
  };

  const handleTableDoubleClick = (e, table) => {
    e.stopPropagation();
    setEditingTable(table);
    setEditingName(table.name);
  };

  const handleNameChange = (e) => {
    setEditingName(e.target.value);
  };

  const handleNameSubmit = async (e) => {
    if (e.key === 'Enter') {
      // Don't submit if the name is empty or unchanged
      if (!editingName.trim() || editingName.trim() === editingTable.name) {
        setEditingTable(null);
        setEditingName('');
        return;
      }

      try {
        setIsLoading(true);
        await firebaseTableService.renameTable(editingTable.name, editingName.trim());
        toast.success('Table renamed successfully');
        await loadTables(); // Reload tables to get updated data
      } catch (error) {
        console.error('Error renaming table:', error);
        toast.error(error.message || 'Error renaming table');
        // Reset to original name on error
        setEditingName(editingTable.name);
        return; // Keep editing mode active on error
      } finally {
        setIsLoading(false);
      }
      
      // Only clear editing state if successful
      setEditingTable(null);
      setEditingName('');
    } else if (e.key === 'Escape') {
      setEditingTable(null);
      setEditingName('');
    }
  };

  const handleDeleteTable = async (e, table) => {
    e.stopPropagation();
    const isChild = table.isSecondaryTable;
    const message = isChild 
      ? `Are you sure you want to delete the child table "${table.name}"?`
      : `Are you sure you want to delete table "${table.name}"?${table.secondaryTable ? ' This will also delete its child table.' : ''}`;

    if (window.confirm(message)) {
      try {
        setIsLoading(true);
        
        // If it's a parent table with a child, delete the child first
        if (table.secondaryTable) {
          await firebaseTableService.deleteTable(table.secondaryTable.name);
          // Small delay to ensure child table is deleted
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await firebaseTableService.deleteTable(table.name);
        toast.success(`Table ${table.name} deleted successfully`);
        await loadTables(); // Reload tables after deletion
        
        // If the deleted table was selected, clear the selection
        if (selectedTableProp === table.name) {
          onTableSelect(null);
        }
      } catch (error) {
        console.error('Error deleting table:', error);
        toast.error(error.message || 'Error deleting table');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      try {
        // Get the current tables array
        const oldIndex = tables.findIndex((item) => item.name === active.id);
        const newIndex = tables.findIndex((item) => item.name === over.id);

        // Update local state first
        setTables((items) => {
          const reorderedItems = arrayMove(items, oldIndex, newIndex);
          return reorderedItems;
        });

        // Get the new order of table names after reordering
        const newOrder = tables.map(table => table.name);
        newOrder.splice(newIndex, 0, newOrder.splice(oldIndex, 1)[0]);

        // Persist the order in the backend
        await firebaseTableService.updateTableOrder(newOrder);
        toast.success('Table order updated successfully');
      } catch (error) {
        console.error('Error updating table order:', error);
        toast.error('Failed to update table order');
        // Reload tables to ensure consistent state
        await loadTables();
      }
    }
  };

  return (
    <div className={`table-manager`}>
      <div className="section-header">
        <h3>
          Tables {tables.length > 0 && `(${tables.length})`}
        </h3>
        <div className="header-actions">
          <button
            onClick={() => setShowGroupModal(true)}
            className="create-group-btn"
          >
            New Table
          </button>
        </div>
        {isLoading && <div className="loading-spinner">Loading...</div>}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="tables-list">
          <SortableContext
            items={tables.map(table => table.name)}
            strategy={rectSortingStrategy}
          >
            {tables.map(table => (
              <SortableTableItem
                key={table.name}
                table={table}
                isSecondary={false}
                onTableClick={handleTableClick}
                onTableDoubleClick={handleTableDoubleClick}
                isSelected={selectedTableProp === table.name || (table.secondaryTable && selectedTableProp === table.secondaryTable.name)}
                isEditing={editingTable === table}
                editingName={editingName}
                onNameChange={handleNameChange}
                onNameSubmit={handleNameSubmit}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

                {/* Modal for creating tables */}
      <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} size="md">
        <div className="modal-header">
          <h2>Crear Nueva Tabla</h2>
          <button onClick={() => setShowGroupModal(false)}>×</button>
        </div>
        <div className="modal-content">
          <div className="form-group">
            <label>Tipo de Tabla:</label>
            <select
              value={groupData.groupType}
              onChange={(e) => setGroupData(prev => ({
                ...prev,
                groupType: e.target.value,
                mainTableName: '',
                secondaryTableName: ''
              }))}
              className="form-select"
            >
              {Object.entries(TABLE_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <small className="help-text">
              {groupData.groupType === 'parent' && 'Tabla principal que tendrá una tabla secundaria relacionada'}
              {groupData.groupType === 'child' && 'Tabla secundaria que pertenece a una tabla principal'}
              {groupData.groupType === 'primary' && 'Tabla independiente sin relaciones'}
            </small>
          </div>

          {/* Show table names based on type */}
          {groupData.groupType === 'parent' ? (
            <>
              <div className="form-group">
                <label>Nombre de Tabla Principal:</label>
                <input
                  type="text"
                  value={groupData.mainTableName}
                  onChange={(e) => setGroupData(prev => ({
                    ...prev,
                    mainTableName: e.target.value
                  }))}
                  placeholder="Ej: emant_caratula, gmm_grupos, etc."
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Nombre de Tabla Secundaria:</label>
                <input
                  type="text"
                  value={groupData.secondaryTableName}
                  onChange={(e) => setGroupData(prev => ({
                    ...prev,
                    secondaryTableName: e.target.value
                  }))}
                  placeholder="Ej: emant_listado, gmm_empleados, etc."
                  className="form-input"
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label>Nombre de Tabla:</label>
              <input
                type="text"
                value={groupData.mainTableName}
                onChange={(e) => setGroupData(prev => ({
                  ...prev,
                  mainTableName: e.target.value
                }))}
                placeholder="Nombre de la tabla"
                className="form-input"
              />
            </div>
          )}

          <div className="modal-actions">
            <button
              onClick={handleCreateGroup}
              className="btn btn-primary"
              disabled={!groupData.mainTableName || (groupData.groupType === 'parent' && !groupData.secondaryTableName)}
            >
              Crear Tabla
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TableManager; 