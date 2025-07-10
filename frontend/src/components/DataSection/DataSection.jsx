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
import { getCleanTeamName } from '../../utils/teamUtils';
import './DataSection.css';
import { toast } from 'react-hot-toast';
import localCacheService from '../../services/localCacheService';

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
  
  // Column order state
  const [columnOrder, setColumnOrder] = useState([]);

  const loadTableData = useCallback(async (tableName = null, forceRefresh = false) => {
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
      
      // Add force refresh parameter to bypass cache
      const result = await airplaneTableService.getData(actualTableName, filters, forceRefresh);
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
      
      // Load table structure if we have data and don't have proper structure yet
      if (tableData.length > 0 && (!selectedTable?.columns || selectedTable.columns.length <= 7)) {
        try {
          const API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/api' 
            : '/api';
          const structureResponse = await fetch(`${API_URL}/data/tables/${actualTableName}/structure`);
          
          if (structureResponse.ok) {
            const structureResult = await structureResponse.json();
            console.log('🔧 Got table structure from loadTableData:', structureResult);
            
            if (structureResult.columns) {
              const columns = structureResult.columns.map(col => ({
                name: col.name,
                type: col.type || 'VARCHAR',
                isPrimary: col.key === 'PRI' || col.name === 'id',
                required: !col.nullable,
                isCustom: col.isCustom || false
              }));
              
              setSelectedTable(prev => ({
                ...prev,
                columns: columns
              }));
              console.log('✅ Updated table structure in loadTableData');
            }
          }
        } catch (error) {
          console.error('❌ Error loading table structure in loadTableData:', error);
        }
      }
      
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
    
    // Create a basic table structure with columns for the modal
    const enhancedTable = {
      ...table,
      columns: [
        // Add basic columns based on common database fields
        // This is a temporary solution until we can get actual schema
        { name: 'id', type: 'INTEGER', isPrimary: true, required: false },
        { name: 'name', type: 'VARCHAR', isPrimary: false, required: true },
        { name: 'email', type: 'VARCHAR', isPrimary: false, required: false },
        { name: 'phone', type: 'VARCHAR', isPrimary: false, required: false },
        { name: 'company', type: 'VARCHAR', isPrimary: false, required: false },
        { name: 'notes', type: 'TEXT', isPrimary: false, required: false },
        { name: 'created_at', type: 'TIMESTAMP', isPrimary: false, required: false }
      ]
    };
    
    setSelectedTable(enhancedTable);
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
      
      // If we have data, get the complete table structure from the API
      if (tableData.length > 0) {
        try {
          // Get complete table structure including custom columns
          const API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/api' 
            : '/api';
          const structureResponse = await fetch(`${API_URL}/data/tables/${table.name}/structure`);
          
          let columns = [];
          if (structureResponse.ok) {
            const structureResult = await structureResponse.json();
            console.log('🔧 Got table structure from API:', structureResult);
            
            if (structureResult.columns) {
              columns = structureResult.columns.map(col => ({
                name: col.name,
                type: col.type || 'VARCHAR',
                isPrimary: col.key === 'PRI' || col.name === 'id',
                required: !col.nullable,
                isCustom: col.isCustom || false
              }));
              console.log('✅ Parsed columns:', columns);
            }
          }
          
          // Fallback to inferred columns if API fails
          if (columns.length === 0) {
            console.log('⚠️ API structure failed, falling back to inference');
            const firstRow = tableData[0];
            columns = Object.keys(firstRow).map(key => ({
              name: key,
              type: typeof firstRow[key] === 'number' ? 'INTEGER' : 'VARCHAR',
              isPrimary: key === 'id' || key === '_id',
              required: key === 'name' || key === 'title',
              isCustom: false
            }));
          }
          
          setSelectedTable(prev => ({
            ...prev,
            columns: columns
          }));
          
          // Load column order for this table
          await loadColumnOrder(table.name);
        } catch (error) {
          console.error('❌ Error loading table structure:', error);
          // Fallback to simple inference
          const firstRow = tableData[0];
          const inferredColumns = Object.keys(firstRow).map(key => ({
            name: key,
            type: typeof firstRow[key] === 'number' ? 'INTEGER' : 'VARCHAR',
            isPrimary: key === 'id' || key === '_id',
            required: key === 'name' || key === 'title',
            isCustom: false
          }));
          
          setSelectedTable(prev => ({
            ...prev,
            columns: inferredColumns
          }));
          
          await loadColumnOrder(table.name);
        }
      }
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
      
      // Invalidate cache to ensure fresh data
      localCacheService.invalidate(`datasection_table_${selectedTable.name}`);
      localCacheService.invalidateService('reports');
      
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
      
      // Invalidate cache to ensure fresh data
      localCacheService.invalidate(`datasection_table_${selectedTable.name}`);
      localCacheService.invalidateService('reports');
      
      loadTableData(); // Reload the table data after adding new entry
      setShowAddEntryModal(false);
    } catch (error) {
      console.error('Error adding entry:', error);
      throw error; // Let the AddEntryModal handle the error
    }
  };

  // Function to load column order from backend
  const loadColumnOrder = async (tableName) => {
    try {
      console.log('🔄 Loading column order for table:', tableName);
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api' 
        : '/api';
      const response = await fetch(`${API_URL}/tables/${tableName}/columns/order`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.columnOrder) {
          console.log('✅ Column order loaded:', result.columnOrder);
          setColumnOrder(result.columnOrder);
          return result.columnOrder;
        }
      }
      console.log('ℹ️ No saved column order found, using default');
      setColumnOrder([]);
      return [];
    } catch (error) {
      console.error('Error loading column order:', error);
      setColumnOrder([]);
      return [];
    }
  };

  const handleColumnOrderChange = async () => {
    // Reload both table data and column order
    setIsLoading(true);
    try {
      const result = await tableServiceAdapter.getData(selectedTable.name, filters);
      setTableData(result.data || []);
      
      // Also reload column order
      await loadColumnOrder(selectedTable.name);
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
      
      // FIRST: Invalidate cache BEFORE updating to prevent stale data
      localCacheService.invalidate(`datasection_table_${currentTableName}`);
      localCacheService.invalidateService('reports');
      console.log('🗑️ Pre-invalidated cache before cell update');
      
      // SECOND: Update data on server
      const result = await tableServiceAdapter.updateData(currentTableName, id, column, value);
      
      // THIRD: Force immediate reload of fresh data from server
      console.log('🔄 Forcing immediate data reload after cell update');
      await loadTableData(currentTableName, true); // Force fresh data load
      
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
      
      toast.success('🚀 Data refreshed successfully');
    } catch (error) {
      console.error('Error reloading data:', error);
      toast.error('❌ Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

    return (
    <div className="data-section excel-layout">
      {/* Excel-like Toolbar Header */}
      <div className="excel-toolbar">
        {/* Left Section - Team Info */}
        <div className="toolbar-left">
          {team && (
            <>
              <span className="team-badge">🏢 {getCleanTeamName(team.name)}</span>
              <span className="service-badge">🔒 {tableServiceAdapter.getServiceInfo().service}</span>
            </>
          )}
        </div>

        {/* Center Section - Table Management */}
        <div className="toolbar-center">
          <div className="table-selector-compact">
            <button 
              className="table-select-btn"
              onClick={() => setIsTableManagerCollapsed(!isTableManagerCollapsed)}
            >
              📊 {selectedTable ? selectedTable.name : 'Seleccionar Tabla'}
              <span className="dropdown-arrow">{isTableManagerCollapsed ? '▼' : '▲'}</span>
            </button>
            
            {selectedTable && (
              <button 
                className="column-config-btn"
                onClick={() => setIsColumnManagerCollapsed(!isColumnManagerCollapsed)}
                title="Configurar Columnas"
              >
                ⚙️
              </button>
            )}
            
            <button 
              className="create-table-btn-compact"
              onClick={() => setShowCreateTableModal(true)}
              title="Crear Nueva Tabla"
            >
              🆕
            </button>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="toolbar-right">
          <button 
            className="toolbar-btn reload-btn"
            onClick={handleReload}
            title="Actualizar datos"
            disabled={isLoading}
          >
            {isLoading ? '⏳' : '🔄'}
          </button>

          {selectedTable && (
            <>
              <button 
                className="toolbar-btn add-btn" 
                onClick={() => setShowAddEntryModal(true)}
                disabled={isLoading}
                title="Nuevo Registro"
              >
                ➕
              </button>

              <button 
                className="toolbar-btn view-btn" 
                onClick={toggleViewMode}
                title={viewMode === 'table' ? 'Vista de Tarjetas' : 'Vista de Tabla'}
                disabled={isLoading}
              >
                {viewMode === 'table' ? '🔲' : '📋'}
              </button>

              <button 
                className="toolbar-btn export-btn" 
                onClick={handleExport}
                title="Exportar como CSV"
                disabled={!selectedTable || isLoading || !tableData.length}
              >
                📤
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapsible Panels - Minimized by default */}
      {!isTableManagerCollapsed && (
        <div className="panel-dropdown table-manager-dropdown">
          <TableManager onTableSelect={(table) => {
            handleTableSelect(table);
            setIsTableManagerCollapsed(true); // Auto-close after selection
          }} />
        </div>
      )}

      {!isColumnManagerCollapsed && selectedTable && (
        <div className="panel-dropdown column-manager-dropdown">
          <ColumnManager 
            selectedTable={selectedTable} 
            onOrderChange={handleColumnOrderChange}
          />
        </div>
      )}

      {/* Main Data Display Area */}
      <div className="excel-main-content">
        {selectedTable ? (
          <div className="data-display-container">
            {isLoading ? (
              <div className="loading-state">
                🔄 Cargando datos de {selectedTable.name}...
              </div>
            ) : viewMode === 'table' ? (
              <DataTable 
                data={tableData}
                onRowClick={handleRowClick}
                onCellUpdate={handleCellUpdate}
                onRefresh={loadTableData}
                tableName={selectedTable.name}
                columnOrder={columnOrder}
              />
            ) : (
              <TableCardView 
                data={tableData}
                onCardClick={handleRowClick}
              />
            )}
          </div>
        ) : (
          <div className="data-display-container">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              color: '#667eea',
              textAlign: 'center',
              gap: '1rem'
            }}>
              <div style={{ fontSize: '4rem' }}>📊</div>
              <h3 style={{ 
                margin: 0, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '1.5rem',
                fontWeight: '600'
              }}>
                Selecciona una tabla para comenzar
              </h3>
              <p style={{ margin: 0, opacity: 0.7, fontSize: '1rem' }}>
                Elige una tabla del panel superior para visualizar y gestionar tus datos
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Import Modal */}
      {showImport && (
        <div className="import-modal">
          <div className="import-modal-content">
            <button className="close-button" onClick={() => setShowImport(false)}>×</button>
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ 
                margin: '0 0 0.5rem 0', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '1.75rem'
              }}>
                📊 Importar Datos
              </h2>
              <p style={{ margin: 0, color: '#666', fontSize: '1rem' }}>
                Sube un archivo CSV para importar datos a tu base de datos
              </p>
            </div>
            <TableImport 
              onFileData={(result) => {
                if (result.success) {
                  if (result.shouldReload) {
                    handleReload(); // Use our new comprehensive reload function
                  }
                  setShowImport(false);
                  toast.success('🎉 Datos importados exitosamente');
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

      {/* Enhanced Create Table Modal */}
      {showCreateTableModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTableModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🆕 Crear Nueva Tabla</h3>
              <button 
                className="close-button" 
                onClick={() => setShowCreateTableModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem' }}>
                  Sube un archivo CSV para crear una nueva tabla con la estructura automática
                </p>
              </div>
              <TableImport onFileData={handleCreateTableFromData} mode="create" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSection; 