import React, { useState, useEffect, useCallback } from 'react';
import TableManager from '../TableManager/TableManager';
import ColumnManager from '../ColumnManager/ColumnManager';
import DataTable from '../DataDisplay/DataTable';
import TableCardView from '../TableCardView/TableCardView';
import TableImport from '../TableImport/TableImport';
import AddEntryModal from './AddEntryModal';
import airplaneTableService from '../../services/airplaneTableService';
import tableServiceAdapter from '../../services/tableServiceAdapter';
import { useTeam } from '../../context/TeamContext';
import './DataSection.css';
import { toast } from 'react-hot-toast';

const DataSection = () => {
  const { userTeam, currentTeam } = useTeam();
  const team = currentTeam || userTeam;
  
  const [selectedTable, setSelectedTable] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [filters, setFilters] = useState({});
  const [error, setError] = useState(null);
  const [showImport, setShowImport] = useState(false);
  
  // New state for collapsible panels
  const [isTableManagerCollapsed, setIsTableManagerCollapsed] = useState(false);
  const [isColumnManagerCollapsed, setIsColumnManagerCollapsed] = useState(true); // Start collapsed
  
  // New modal states
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [showEditColumnsModal, setShowEditColumnsModal] = useState(false);

  const loadTableData = useCallback(async (tableName = null) => {
    const targetTableName = tableName || selectedTable?.name;
    if (!targetTableName) return;
    
    setIsLoading(true);
    try {
      console.log('🔥 Loading data for Firebase collection:', targetTableName);
      
      // Extract actual table name from combined format (e.g., "emant_caratula → emant_listado")
      let actualTableName = targetTableName;
      if (targetTableName.includes('→')) {
        // For combined tables, get the child table name (after the arrow)
        actualTableName = targetTableName.split('→')[1].trim();
        console.log('🔄 Combined table detected, using child table:', actualTableName);
      }
      
      const result = await airplaneTableService.getData(actualTableName, filters);
      console.log('🔥 Received data:', result);
      
      if (!result) {
        console.error('❌ No response from Firebase');
        setTableData([]);
        return;
      }
      
      // Firebase service returns { table, data, timestamp }
      // We need to use result.data for the table data
      const tableData = result.data || [];
      console.log(`✅ Setting table data with ${tableData.length} rows from Firebase`);
      setTableData(tableData);
      
      // Update the selected table name when tableName is provided
      if (tableName) {
        console.log('🔄 Updating selectedTable.name from', selectedTable?.name, 'to', tableName);
        setSelectedTable(prev => ({
          ...prev,
          name: tableName,
          title: airplaneTableService.formatTableTitle(tableName)
        }));
      }
    } catch (error) {
      console.error('❌ Error loading Firebase table data:', error);
      setTableData([]);
      toast.error(`Error loading data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, filters]);

  useEffect(() => {
    // Only load data when filters change and we have a selected table
    if (selectedTable && Object.keys(filters).length > 0) {
      loadTableData();
    }
  }, [filters, loadTableData]);

  const handleTableSelect = async (table) => {
    console.log('🔥 Selected Firebase table:', table);
    setSelectedTable(table);
    setFilters({}); // Reset filters on table change
    
    // Auto-collapse table manager and keep column manager closed when table is selected
    setIsTableManagerCollapsed(true);
    setIsColumnManagerCollapsed(true);
    
    // Load data immediately after selecting the table
    try {
      setIsLoading(true);
      const result = await airplaneTableService.getData(table.name);
      console.log('🔥 Received data:', result);
      
      if (!result) {
        console.error('❌ No response from Firebase API');
        setTableData([]);
        return;
      }
      
      // Firebase service returns { table, data, timestamp }
      // We need to use result.data for the table data
      const tableData = result.data || [];
      console.log(`✅ Setting table data with ${tableData.length} rows`);
      setTableData(tableData);
    } catch (error) {
      console.error('❌ Error loading Firebase table data:', error);
      setTableData([]);
      toast.error(`Error loading table: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = (row) => {
    console.log('🔥 Selected row:', row);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'table' ? 'card' : 'table');
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExport = () => {
    if (!tableData.length) return;

    const csvContent = [
      Object.keys(tableData[0]).join(','),
      ...tableData.map(item => Object.values(item).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable?.name || 'data'}_export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportData = async (data) => {
    if (!selectedTable || !data) return;
    
    setIsLoading(true);
    try {
      console.log('🔥 Importing data to Firebase collection:', selectedTable.name);
      
      // Ensure data is an array
      const dataArray = Array.isArray(data) ? data : [data];
      
      // Firebase can handle batch inserts efficiently
      await tableServiceAdapter.insertData(selectedTable.name, dataArray);
      
      console.log(`✅ Successfully imported ${dataArray.length} records to Firebase`);
      toast.success(`Imported ${dataArray.length} records successfully`);
      
      loadTableData(); // Reload the table data after import
      setShowImportModal(false);
    } catch (error) {
      console.error('❌ Error importing data to Firebase:', error);
      setError(error.message || 'Error importing data');
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTableFromData = async (data, tableName) => {
    if (!data || !data.length || !tableName) {
      console.error('❌ Data and table name are required');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔥 Creating new Firebase collection:', tableName);
      
      // Firebase doesn't need explicit column definitions like MySQL
      // Just create the collection and insert the data
      const result = await tableServiceAdapter.createTable(tableName, data);
      
      console.log('✅ Firebase collection created successfully:', result);
      toast.success(`Collection '${tableName}' created successfully`);
      
      // Select the new table
      setSelectedTable({ name: tableName, title: tableServiceAdapter.formatSingleTableName(tableName) });
      loadTableData(tableName);
      setShowCreateTableModal(false);
    } catch (error) {
      console.error('❌ Error creating Firebase collection:', error);
      setError(error.message || 'Error creating table');
      toast.error(`Failed to create collection: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = async (formData) => {
    if (!selectedTable) return;
    
    try {
      await tableServiceAdapter.insertData(selectedTable.name, formData);
      loadTableData(); // Reload the table data after adding new entry
      setShowAddEntryModal(false);
    } catch (error) {
      console.error('Error adding entry:', error);
      throw error; // Let the AddEntryModal handle the error
    }
  };

  const handleColumnOrderChange = async () => {
    // Force a refresh of the table data
    setIsLoading(true);
    try {
      const result = await tableServiceAdapter.getData(selectedTable.name, filters);
      setTableData(result.data || []);
    } catch (error) {
      console.error('Error refreshing table data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellUpdate = async (id, column, value) => {
    if (!selectedTable) return;
    
    try {
      // Get the actual table name (could be combined table name)
      const currentTableName = selectedTable.name;
      console.log('Updating cell:', { id, column, value, table: currentTableName });
      
      const result = await tableServiceAdapter.updateData(currentTableName, id, column, value);
      
      // Update the local data to reflect the change
      setTableData(prevData => 
        prevData.map(row => 
          row.id === id ? { ...row, [column]: value } : row
        )
      );

      // Return the result from the server
      return result;
    } catch (error) {
      console.error('Error updating cell:', error);
      throw error; // Let DataTable handle the error
    }
  };

  const handleReload = async () => {
    try {
      setIsLoading(true);
      // Get the current table name before reloading
      const currentTableName = selectedTable?.name;
      
      // Reload tables list first
      const tablesData = await tableServiceAdapter.getTables();
      
      // If we had a selected table, find it in the new list
      if (currentTableName) {
        const updatedSelectedTable = tablesData.find(t => t.name === currentTableName);
        setSelectedTable(updatedSelectedTable || null);
        
        // If we still have the table selected, reload its data
        if (updatedSelectedTable) {
          await loadTableData();
        }
      }
      
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error reloading data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="data-section">
      {/* Team info header */}
      {team && (
        <div className="team-info-header" style={{
          background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#2d3748', fontSize: '1.3rem' }}>
              📊 Base de Datos de {team.name}
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#718096', fontSize: '0.9rem' }}>
              Datos aislados por equipo - Servicio: {tableServiceAdapter.getServiceInfo().service}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{
              background: '#e6fffa',
              color: '#234e52',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '500',
              border: '1px solid #81e6d9'
            }}>
              🏢 Table Service v1.0
            </span>
            <span style={{
              background: '#fed7d7',
              color: '#c53030',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '500',
              border: '1px solid #feb2b2'
            }}>
              🔒 Datos Aislados
            </span>
          </div>
        </div>
      )}
      
      <div className="data-section-header">
        <div className="header-top">
          <div className="header-title">
            <h2>Base de datos</h2>
            <button 
              className="reload-btn"
              onClick={handleReload}
              title="Reload data"
            >
              ↻
            </button>
          </div>
          <button 
            className="btn-primary import-btn" 
            onClick={() => setShowImport(true)}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-9-1.5h7.5m-7.5 3h7.5m3-3v3m0 0v3m0-3h-3m3 0h3M3 9l3-3m0 0l3 3m-3-3v12" />
            </svg>
            Importar csv
          </button>
        </div>
        <div className="header-actions">
          {selectedTable && (
            <>
              <button 
                className="btn-primary add-btn" 
                onClick={() => setShowAddEntryModal(true)}
                disabled={isLoading}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Agregar Entrada
              </button>

              <button 
                className="btn-icon-only" 
                onClick={toggleViewMode}
                title={viewMode === 'table' ? 'Switch to Card View' : 'Switch to Table View'}
                disabled={isLoading}
              >
                {viewMode === 'table' ? (
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                ) : (
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                )}
              </button>
              <button 
                className="btn-icon-only" 
                onClick={handleExport}
                title="Export as CSV"
                disabled={!selectedTable || isLoading || !tableData.length}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="data-section-content">
        {/* Compact Managers Panel */}
        <div className="compact-managers-panel">
          {/* Table Manager Panel */}
          <div className={`manager-panel ${isTableManagerCollapsed ? 'collapsed' : 'expanded'}`}>
            <div className="panel-header">
              <div className="panel-title" onClick={() => setIsTableManagerCollapsed(!isTableManagerCollapsed)}>
                <span className="panel-icon">📋</span>
                <span>Tablas</span>
                {selectedTable && <span className="selected-indicator">• {selectedTable.name}</span>}
              </div>
              <div className="panel-actions">
                <button 
                  className="action-btn create-table-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateTableModal(true);
                  }}
                  title="Crear nueva tabla"
                >
                  ➕
                </button>
                <button 
                  className="collapse-btn"
                  onClick={() => setIsTableManagerCollapsed(!isTableManagerCollapsed)}
                >
                  {isTableManagerCollapsed ? '▼' : '▲'}
                </button>
              </div>
            </div>
            {!isTableManagerCollapsed && (
              <div className="panel-content">
                <TableManager onTableSelect={handleTableSelect} />
              </div>
            )}
          </div>

          {/* Column Manager Panel */}
          {selectedTable && (
            <div className={`manager-panel ${isColumnManagerCollapsed ? 'collapsed' : 'expanded'}`}>
              <div className="panel-header">
                <div className="panel-title" onClick={() => setIsColumnManagerCollapsed(!isColumnManagerCollapsed)}>
                  <span className="panel-icon">⚙️</span>
                  <span>Columnas</span>
                  <span className="table-name">({selectedTable.name})</span>
                </div>
                <div className="panel-actions">
                  <button 
                    className="action-btn add-column-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddColumnModal(true);
                    }}
                    title="Agregar columna"
                  >
                    ➕
                  </button>
                  <button 
                    className="action-btn edit-columns-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditColumnsModal(true);
                    }}
                    title="Editar columnas"
                  >
                    ✏️
                  </button>
                  <button 
                    className="collapse-btn"
                    onClick={() => setIsColumnManagerCollapsed(!isColumnManagerCollapsed)}
                  >
                    {isColumnManagerCollapsed ? '▼' : '▲'}
                  </button>
                </div>
              </div>
              {!isColumnManagerCollapsed && (
                <div className="panel-content">
                  <ColumnManager 
                    selectedTable={selectedTable} 
                    onOrderChange={handleColumnOrderChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {selectedTable && (
          <div className="data-display-container">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : viewMode === 'table' ? (
              <DataTable 
                data={tableData}
                onRowClick={handleRowClick}
                onCellUpdate={handleCellUpdate}
                onRefresh={loadTableData}
                tableName={selectedTable.name}
              />
            ) : (
              <TableCardView 
                data={tableData}
                onCardClick={handleRowClick}
              />
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="import-modal">
          <div className="import-modal-content">
            <button className="close-button" onClick={() => setShowImport(false)}>×</button>
            <TableImport 
              onFileData={(result) => {
                if (result.success) {
                  if (result.shouldReload) {
                    handleReload(); // Use our new comprehensive reload function
                  }
                  setShowImport(false);
                }
              }} 
            />
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddEntryModal && selectedTable && (
        <AddEntryModal
          isOpen={showAddEntryModal}
          onClose={() => setShowAddEntryModal(false)}
          table={selectedTable}
          onSubmit={handleAddEntry}
        />
      )}

      {/* Create Table Modal */}
      {showCreateTableModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTableModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Table</h3>
              <button 
                className="close-button" 
                onClick={() => setShowCreateTableModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <TableImport onFileData={handleCreateTableFromData} mode="create" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSection; 