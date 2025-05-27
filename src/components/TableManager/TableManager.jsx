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
import tableService from '../../services/data/tableService';
import './TableManager.css';
import { toast } from 'react-hot-toast';
import Modal from '../Modal/Modal';

// Sortable table item component
const SortableTableItem = ({ 
  table, 
  isSecondary, 
  onTableClick, 
  onTableDoubleClick, 
  onDeleteTable, 
  isSelected, 
  isEditing, 
  editingName, 
  onNameChange, 
  onNameSubmit,
  expandedTables
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

  const handleCardClick = (e) => {
    // Don't trigger if clicking delete button, input, or drag handles
    if (e.target.closest('.delete-button') || e.target.closest('.table-name-input') || e.target.closest('.drag-handle')) {
      return;
    }
    onTableClick(table, isSecondary);
  };

  const getDisplayName = () => {
    if (isSecondary) {
      return table.name;
    }
    if (table.secondaryTable) {
      return `${table.name} ⟶ ${table.secondaryTable.name}`;
    }
    return table.name;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`table-item ${isSelected ? 'selected' : ''} ${table.secondaryTable ? 'has-secondary' : ''} ${isSecondary ? 'secondary' : 'primary'}`}
      onDoubleClick={(e) => onTableDoubleClick(e, table)}
    >
      <div className="drag-handle left" {...attributes} {...listeners}>
        <span className="drag-icon">⋮</span>
      </div>

      <div className="table-content" onClick={handleCardClick}>
        <div className="table-info">
          {!isSecondary && table.secondaryTable && (
            <span className="expand-icon">
              {expandedTables.has(table.name) ? '▼' : '▶'}
            </span>
          )}
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={onNameChange}
              onKeyDown={onNameSubmit}
              onBlur={() => {
                setEditingTable(null);
                setEditingName('');
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="table-name-input"
            />
          ) : (
            <div className="table-name-container">
              {table.secondaryTable && !isSecondary && (
                <span className="relationship-icon" title="Combined Table">🔗</span>
              )}
              <span 
                className="table-name"
                title={getDisplayName()}
              >
                {getDisplayName()}
              </span>
            </div>
          )}
        </div>
        <div className="table-actions">
          <button
            className="delete-button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTable(e, table);
            }}
            title={`Delete ${isSecondary ? 'child' : ''} table "${table.name}"`}
          >
            ×
          </button>
        </div>
      </div>

      <div className="drag-handle right" {...attributes} {...listeners}>
        <span className="drag-icon">⋮</span>
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
  const [groupData, setGroupData] = useState({
    mainTableName: '',
    secondaryTableName: '',
    groupType: 'GRUPAL'
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Replace TABLE_TYPES with simpler options
  const TABLE_TYPES = {
    'INDIVIDUAL': 'Individual',
    'GRUPAL': 'Grupal'
  };

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setIsLoading(true);
      const tables = await tableService.getTables();
      
      // Group tables by relationships
      const groupedTables = tables.reduce((acc, table) => {
        // Skip tables that are already processed as secondary tables
        if (table.isSecondaryTable && tables.some(t => 
          t.isMainTable && t.relatedTableName?.toLowerCase() === table.name.toLowerCase()
        )) {
          return acc;
        }

        // If it's a main table, add it with its secondary table
        if (table.isMainTable) {
          const secondaryTable = tables.find(t => 
            t.name.toLowerCase() === table.relatedTableName?.toLowerCase() && t.isSecondaryTable
          );
          
          if (secondaryTable) {
            acc.push({
              ...table,
              secondaryTable: secondaryTable,
              relationshipType: table.relationshipType || 'grupal_policy',
              isGrouped: true
            });
          } else {
            acc.push(table);
          }
        } else if (!table.isSecondaryTable) {
          // If it's not a main or secondary table, add it as is
          acc.push({
            ...table,
            isGrouped: false
          });
        }
        return acc;
      }, []);

      console.log('Grouped tables:', groupedTables); // Add this for debugging
      setTables(groupedTables);
    } catch (err) {
      console.error('Error loading tables:', err);
      setError('Failed to load tables');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const result = await tableService.createTableGroup(
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
          groupType: 'GRUPAL'
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
    // Always select the table when clicked
    if (onTableSelect) {
      // If it's a parent table with a child, pass the parent name
      if (!isSecondary && table.secondaryTable) {
        onTableSelect(table);
        toggleTableExpand(table.name);
      } else {
        // For single tables or child tables, pass the table directly
        onTableSelect(table);
      }
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
        await tableService.renameTable(editingTable.name, editingName.trim());
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
          await tableService.deleteTable(table.secondaryTable.name);
          // Small delay to ensure child table is deleted
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        await tableService.deleteTable(table.name);
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
        await tableService.updateTableOrder(newOrder);
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
            <span>🔗</span> New Table
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
            strategy={verticalListSortingStrategy}
          >
            {tables.map(table => (
              <div key={table.name} className={`table-group ${table.isMainTable ? 'main-table-group' : ''}`}>
                <SortableTableItem
                  table={table}
                  isSecondary={false}
                  onTableClick={handleTableClick}
                  onTableDoubleClick={handleTableDoubleClick}
                  onDeleteTable={handleDeleteTable}
                  isSelected={selectedTableProp === table.name}
                  isEditing={editingTable === table}
                  editingName={editingName}
                  onNameChange={handleNameChange}
                  onNameSubmit={handleNameSubmit}
                  expandedTables={expandedTables}
                />
                
                {table.secondaryTable && expandedTables.has(table.name) && (
                  <div className={`secondary-table-container ${!expandedTables.has(table.name) ? 'hidden' : ''}`}>
                    <div className="connector-line"></div>
                    <div className="secondary-table">
                      <SortableTableItem
                        table={table.secondaryTable}
                        isSecondary={true}
                        onTableClick={handleTableClick}
                        onTableDoubleClick={handleTableDoubleClick}
                        onDeleteTable={handleDeleteTable}
                        isSelected={selectedTableProp === table.secondaryTable.name}
                        isEditing={editingTable === table.secondaryTable}
                        editingName={editingName}
                        onNameChange={handleNameChange}
                        onNameSubmit={handleNameSubmit}
                        expandedTables={expandedTables}
                      />
                    </div>
                  </div>
                )}
              </div>
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
                mainTableName: e.target.value === 'GRUPAL' ? 'Grupos' : 'Individual',
                secondaryTableName: e.target.value === 'GRUPAL' ? 'Listado' : ''
              }))}
              className="form-select"
            >
              {Object.entries(TABLE_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <small className="help-text">
              {groupData.groupType === 'GRUPAL' && 'Tabla para pólizas grupales con listado de asegurados'}
              {groupData.groupType === 'INDIVIDUAL' && 'Tabla para pólizas individuales'}
            </small>
          </div>

          {/* Show table names based on type */}
          {groupData.groupType === 'GRUPAL' ? (
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
                  placeholder="Nombre de la tabla principal"
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
                  placeholder="Nombre de la tabla secundaria"
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
              disabled={!groupData.mainTableName || (groupData.groupType === 'GRUPAL' && !groupData.secondaryTableName)}
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