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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`table-item ${isSelected ? 'selected' : ''} ${table.secondaryTable ? 'has-secondary' : ''}`}
      onClick={() => onTableClick(table, isSecondary)}
      onDoubleClick={(e) => onTableDoubleClick(e, table)}
    >
      <div className="table-info" {...attributes} {...listeners}>
        {isEditing ? (
          <input
            type="text"
            value={editingName}
            onChange={onNameChange}
            onKeyDown={onNameSubmit}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="table-name-input"
          />
        ) : (
          <span className="table-name">{table.name}</span>
        )}
        {table.secondaryTable && (
          <span className="expand-icon">
            {expandedTables.has(table.name) ? '▼' : '▶'}
          </span>
        )}
      </div>
      <div className="table-actions">
        {table.relationshipType && (
          <span className="table-relationship-indicator" data-type={table.relationshipType}>
            {isSecondary ? 'Details' : table.relationshipType.split('_')[0].toUpperCase()}
          </span>
        )}
        <button
          className="delete-button"
          onClick={(e) => onDeleteTable(e, table)}
          title="Delete table"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const TableManager = ({ onTableSelect, selectedTableProp }) => {
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedTables, setExpandedTables] = useState(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [groupData, setGroupData] = useState({
    mainTableName: '',
    secondaryTableName: '',
    groupType: 'GMM'
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Define table types
  const TABLE_TYPES = {
    'GMM': 'Gastos Médicos Mayores',
    'AUTOS': 'Autos',
    'VIDA': 'Vida',
    'MASCOTAS': 'Mascotas',
    'TRANSPORTE': 'Transporte',
    'NEGOCIO': 'Negocio',
    'HOGAR': 'Hogar',
    'RC': 'Responsabilidad Civil'
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
        if (table.isMainTable) {
          acc.push({
            ...table,
            secondaryTable: tables.find(t => t.name === table.relatedTableName)
          });
        } else if (!table.isSecondaryTable) {
          acc.push(table);
        }
        return acc;
      }, []);

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
          groupType: 'GMM'
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
    if (!isSecondary && table.secondaryTable) {
      toggleTableExpand(table.name);
    }
    if (onTableSelect) {
      onTableSelect(table);
    }
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
    if (window.confirm(`Are you sure you want to delete table "${table.name}"?`)) {
      try {
        await tableService.deleteTable(table.name);
        toast.success('Table deleted successfully');
        loadTables();
      } catch (error) {
        console.error('Error deleting table:', error);
        toast.error(error.message || 'Error deleting table');
      }
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      try {
        // Update local state
        setTables((items) => {
          const oldIndex = items.findIndex((item) => item.name === active.id);
          const newIndex = items.findIndex((item) => item.name === over.id);
          return arrayMove(items, oldIndex, newIndex);
        });

        // Get the new order of table names
        const newOrder = tables.map(table => table.name);

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
    <div className="table-manager">
      <div className="section-header">
        <h3>
          <span className="collapse-icon" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '>' : 'v'}
          </span>
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

      {/* Modal for creating tables */}
      <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} size="md">
        <div className="modal-header">
          <h2>Create Insurance Table</h2>
          <button onClick={() => setShowGroupModal(false)}>×</button>
        </div>
        <div className="modal-content">
          <div className="form-group">
            <label>Insurance Type:</label>
            <select
              value={groupData.groupType}
              onChange={(e) => setGroupData(prev => ({
                ...prev,
                groupType: e.target.value,
                mainTableName: e.target.value === 'GMM' ? 'GruposGMM' :
                             e.target.value === 'AUTOS' ? 'GruposAutos' :
                             e.target.value === 'VIDA' ? 'GruposVida' :
                             e.target.value === 'MASCOTAS' ? 'Mascotas' :
                             e.target.value === 'TRANSPORTE' ? 'Transporte' :
                             e.target.value === 'NEGOCIO' ? 'Negocio' :
                             e.target.value === 'HOGAR' ? 'Hogar' :
                             e.target.value === 'RC' ? 'ResponsabilidadCivil' : '',
                secondaryTableName: e.target.value === 'GMM' ? 'GMMListado' :
                                  e.target.value === 'AUTOS' ? 'AutosListado' :
                                  e.target.value === 'VIDA' ? 'VidaListado' : ''
              }))}
              className="form-select"
            >
              {Object.entries(TABLE_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <small className="help-text">
              {groupData.groupType === 'GMM' && 'GMM policy with insured persons list'}
              {groupData.groupType === 'AUTOS' && 'Auto policy with vehicles list'}
              {groupData.groupType === 'VIDA' && 'Life insurance with insured persons list'}
              {groupData.groupType === 'MASCOTAS' && 'Pet insurance policy'}
              {groupData.groupType === 'TRANSPORTE' && 'Transport insurance policy'}
              {groupData.groupType === 'NEGOCIO' && 'Business insurance policy'}
              {groupData.groupType === 'HOGAR' && 'Home insurance policy'}
              {groupData.groupType === 'RC' && 'Civil liability insurance policy'}
            </small>
          </div>

          {/* Show table names for group tables */}
          {['GMM', 'AUTOS', 'VIDA'].includes(groupData.groupType) && (
            <>
              <div className="form-group">
                <label>Main Table Name:</label>
                <input
                  type="text"
                  value={groupData.mainTableName}
                  readOnly
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Secondary Table Name:</label>
                <input
                  type="text"
                  value={groupData.secondaryTableName}
                  readOnly
                  className="form-input"
                />
              </div>
            </>
          )}

          {/* Show single table name for individual tables */}
          {!['GMM', 'AUTOS', 'VIDA'].includes(groupData.groupType) && (
            <div className="form-group">
              <label>Table Name:</label>
              <input
                type="text"
                value={groupData.mainTableName}
                readOnly
                className="form-input"
              />
            </div>
          )}

          <div className="modal-actions">
            <button
              onClick={handleCreateGroup}
              className="btn btn-primary"
              disabled={!groupData.mainTableName}
            >
              Create Table
            </button>
          </div>
        </div>
      </Modal>

      {!isCollapsed && (
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
                <div key={table.name} className="table-group">
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
                  )}
                </div>
              ))}
            </SortableContext>
          </div>
        </DndContext>
      )}
    </div>
  );
};

export default TableManager; 