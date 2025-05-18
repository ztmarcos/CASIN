import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import './TableManager.css';
import { toast } from 'react-hot-toast';
import Modal from '../Modal/Modal';

const TableManager = ({ onTableSelect, selectedTableProp }) => {
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedTables, setExpandedTables] = useState(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupData, setGroupData] = useState({
    mainTableName: '',
    secondaryTableName: '',
    groupType: 'GMM'
  });

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
        <div className="tables-list">
          {tables.map(table => (
            <div key={table.name} className="table-group">
              <div
                className={`table-item ${selectedTableProp === table.name ? 'selected' : ''} ${table.secondaryTable ? 'has-secondary' : ''}`}
                onClick={() => handleTableClick(table)}
              >
                <div className="table-info">
                  <span className="table-name">{table.name}</span>
                  {table.secondaryTable && (
                    <span className="expand-icon">
                      {expandedTables.has(table.name) ? '▼' : '▶'}
                    </span>
                  )}
                </div>
                {table.relationshipType && (
                  <span className="table-relationship-indicator" data-type={table.relationshipType}>
                    {table.relationshipType.split('_')[0].toUpperCase()}
                  </span>
                )}
              </div>
              
              {table.secondaryTable && expandedTables.has(table.name) && (
                <div className="secondary-table">
                  <div
                    className={`table-item ${selectedTableProp === table.secondaryTable.name ? 'selected' : ''}`}
                    onClick={() => handleTableClick(table.secondaryTable, true)}
                  >
                    <span className="table-name">{table.secondaryTable.name}</span>
                    <span className="table-relationship-indicator" data-type={table.relationshipType}>
                      Details
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableManager; 