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
  const [editingTable, setEditingTable] = useState(null);
  const [newTableName, setNewTableName] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupData, setGroupData] = useState({
    mainTableName: '',
    secondaryTableName: '',
    groupType: 'default'
  });

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setIsLoading(true);
      const tablesData = await tableService.getTables();
      
      // Agrupar las tablas relacionadas
      const groupedTables = tablesData.reduce((acc, table) => {
        // Si es una tabla principal o no tiene relación, agregarla directamente
        if (!table.isSecondaryTable) {
          acc.push(table);
          return acc;
        }
        
        // Si es una tabla secundaria, insertarla después de su tabla principal
        const mainTableIndex = acc.findIndex(t => t.name === table.relatedTableName);
        if (mainTableIndex !== -1) {
          acc.splice(mainTableIndex + 1, 0, table);
        } else {
          // Si no encontramos la tabla principal, la agregamos al final
          acc.push(table);
        }
        return acc;
      }, []);

      setTables(groupedTables);
      setError(null);
    } catch (err) {
      console.error('Error loading tables:', err);
      setError('Failed to load tables. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = async (table) => {
    if (onTableSelect) {
      onTableSelect(table);
      
      // Si es una tabla relacionada, también notificamos la relación
      if (table.isMainTable || table.isSecondaryTable) {
        toast.info(`Esta tabla está relacionada con ${table.relatedTableName}`);
      }
    }
  };

  const handleEditClick = (e, table) => {
    e.stopPropagation();
    setEditingTable(table);
    setNewTableName(table.name);
  };

  const handleEditSubmit = async (oldName, newName) => {
    try {
      setIsLoading(true);
      await tableService.renameTable(oldName, newName);
      // Refresh the table list after successful rename
      await loadTables();
      setEditingTable(null);
      setNewTableName('');
      toast.success(`Table renamed from ${oldName} to ${newName} successfully`);
    } catch (error) {
      console.error('Error renaming table:', error);
      toast.error(error.message || 'Error renaming table');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (e, table) => {
    e.stopPropagation();
    setShowConfirmDelete(table);
  };

  const handleConfirmDelete = async () => {
    if (!showConfirmDelete) return;

    try {
      await tableService.deleteTable(showConfirmDelete.name);
      await loadTables();
      setShowConfirmDelete(null);
      if (selectedTableProp?.name === showConfirmDelete.name) {
        onTableSelect(null);
      }
    } catch (err) {
      console.error('Error deleting table:', err);
      setError('Failed to delete table. Please try again.');
    }
  };

  const getTableClassName = (table) => {
    const classes = ['table-item'];
    if (selectedTableProp?.name === table.name) classes.push('selected');
    if (table.isMainTable) classes.push('main-table');
    if (table.isSecondaryTable) classes.push('secondary-table');
    return classes.join(' ');
  };

  const renderTableRelationship = (table) => {
    if (!table.isMainTable && !table.isSecondaryTable) return null;

    return (
      <div className="table-relationship-indicator">
        <span>
          {table.relatedTableName}
        </span>
      </div>
    );
  };

  const handleCreateGroup = async () => {
    try {
      const result = await tableService.createTableGroup(
        groupData.mainTableName,
        groupData.secondaryTableName,
        groupData.groupType
      );
      
      if (result.success) {
        toast.success('Grupo de tablas creado exitosamente');
        loadTables();
        setShowGroupModal(false);
        setGroupData({
          mainTableName: '',
          secondaryTableName: '',
          groupType: 'default'
        });
      }
    } catch (error) {
      console.error('Error creating table group:', error);
      toast.error(error.message || 'Error al crear el grupo de tablas');
    }
  };

  return (
    <div className="table-manager">
      <div className="section-header">
        <h3>
          <span className="collapse-icon" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '>' : 'v'}
          </span>
          Tablas {tables.length > 0 && `(${tables.length})`}
        </h3>
        <div className="header-actions">
          <button
            onClick={() => setShowGroupModal(true)}
            className="create-group-btn"
          >
            <span>🔗</span> Nuevo Grupo
          </button>
        </div>
        {isLoading && <div className="loading-spinner">Loading...</div>}
      </div>

      {/* Modal para crear grupo de tablas */}
      <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} size="md">
        <div className="modal-header">
          <h2>Crear Grupo de Tablas</h2>
          <button onClick={() => setShowGroupModal(false)}>×</button>
        </div>
        <div className="modal-content">
          <div className="form-group">
            <label>Nombre de Tabla Principal:</label>
            <input
              type="text"
              value={groupData.mainTableName}
              onChange={(e) => setGroupData(prev => ({
                ...prev,
                mainTableName: e.target.value
              }))}
              placeholder="Nombre de tabla principal"
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
              placeholder="Nombre de tabla secundaria"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Tipo de Grupo:</label>
            <select
              value={groupData.groupType}
              onChange={(e) => setGroupData(prev => ({
                ...prev,
                groupType: e.target.value
              }))}
              className="form-select"
            >
              <option value="default">Emant (Default)</option>
              <option value="GMM">GMM</option>
              <option value="basic">Básico</option>
            </select>
            <small className="help-text">
              {groupData.groupType === 'default' && 'Estructura igual a emant/listado'}
              {groupData.groupType === 'GMM' && 'Estructura para pólizas GMM'}
              {groupData.groupType === 'basic' && 'Estructura básica de grupo'}
            </small>
          </div>
          <div className="modal-actions">
            <button
              onClick={handleCreateGroup}
              className="btn btn-primary"
              disabled={!groupData.mainTableName || !groupData.secondaryTableName}
            >
              Crear Grupo
            </button>
          </div>
        </div>
      </Modal>

      {!isCollapsed && (
        <>
          {error && <div className="error-message">{error}</div>}

          <div className="tables-list">
            {tables.length === 0 && !isLoading ? (
              <div className="no-tables-message">No tables available</div>
            ) : (
              tables.map(table => (
                <div
                  key={table.name}
                  className={getTableClassName(table)}
                  onClick={() => handleTableSelect(table)}
                >
                  <div className="table-info">
                    {editingTable?.name === table.name ? (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        handleEditSubmit(table.name, newTableName);
                      }} className="edit-form">
                        <input
                          type="text"
                          value={newTableName}
                          onChange={(e) => setNewTableName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <button type="submit" onClick={(e) => e.stopPropagation()}>✓</button>
                        <button type="button" onClick={(e) => {
                          e.stopPropagation();
                          setEditingTable(null);
                        }}>✕</button>
                      </form>
                    ) : (
                      <>
                        <span className="table-name">{table.name}</span>
                        {renderTableRelationship(table)}
                      </>
                    )}
                  </div>
                  <div className="table-actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={(e) => handleEditClick(e, table)}
                      title="Edit Name"
                    >
                      ✎
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) => handleDeleteClick(e, table)}
                      title="Delete Table"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {showConfirmDelete && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h4>Delete Table</h4>
                <p>Are you sure you want to delete the table "{showConfirmDelete.name}"?</p>
                {(showConfirmDelete.isMainTable || showConfirmDelete.isSecondaryTable) && (
                  <p className="warning">
                    ¡Advertencia! Esta tabla está relacionada con {showConfirmDelete.relatedTableName}
                  </p>
                )}
                <div className="modal-actions">
                  <button onClick={handleConfirmDelete} className="danger-btn">
                    Delete
                  </button>
                  <button onClick={() => setShowConfirmDelete(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TableManager; 