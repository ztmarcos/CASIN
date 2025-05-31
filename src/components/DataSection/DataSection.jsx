import React, { useState, useEffect, useCallback } from 'react';
import TableManager from '../TableManager/TableManager';
import ColumnManager from '../ColumnManager/ColumnManager';
import DataTable from '../DataDisplay/DataTable';
import TableCardView from '../TableCardView/TableCardView';
import TableImport from '../TableImport/TableImport';
import AddEntryModal from './AddEntryModal';
import tableService from '../../services/data/tableService';
import './DataSection.css';
import { toast } from 'react-hot-toast';

const DataSection = () => {
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
      console.log('Loading data for table:', targetTableName);
      const result = await tableService.getData(targetTableName, filters);
      console.log('Received data from API:', result);
      
      if (!result) {
        console.error('No response from API');
        setTableData([]);
        return;
      }
      
      // The API returns { table, data, timestamp }
      // We need to use result.data for the table data
      const tableData = result.data || [];
      console.log('Setting table data with', tableData.length, 'rows');
      setTableData(tableData);
      
      // Update the selected table name when tableName is provided
      if (tableName) {
        console.log('🔄 Updating selectedTable.name from', selectedTable?.name, 'to', tableName);
        setSelectedTable(prev => ({
          ...prev,
          name: tableName
        }));
      }
    } catch (error) {
      console.error('Error loading table data:', error);
      setTableData([]);
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
    console.log('Selected table:', table);
    setSelectedTable(table);
    setFilters({}); // Reset filters on table change
    
    // Auto-collapse table manager and keep column manager closed when table is selected
    setIsTableManagerCollapsed(true);
    setIsColumnManagerCollapsed(true);
    
    // Load data immediately after selecting the table
    try {
      setIsLoading(true);
      const result = await tableService.getData(table.name);
      console.log('Received data from API:', result);
      
      if (!result) {
        console.error('No response from API');
        setTableData([]);
        return;
      }
      
      // The API returns { table, data, timestamp }
      // We need to use result.data for the table data
      const tableData = result.data || [];
      console.log('Setting table data with', tableData.length, 'rows');
      setTableData(tableData);
    } catch (error) {
      console.error('Error loading table data:', error);
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = (row) => {
    console.log('Selected row:', row);
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
      // Ensure data is an array
      const dataArray = Array.isArray(data) ? data : [data];
      
      // Insert data in chunks to avoid overwhelming the server
      const chunkSize = 100;
      for (let i = 0; i < dataArray.length; i += chunkSize) {
        const chunk = dataArray.slice(i, i + chunkSize);
        await tableService.insertData(selectedTable.name, chunk);
      }
      
      loadTableData(); // Reload the table data after import
      setShowImportModal(false);
    } catch (error) {
      console.error('Error importing data:', error);
      setError(error.message || 'Error importing data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTableFromData = async (data, tableName) => {
    if (!data || !data.length || !tableName) {
      console.error('Data and table name are required');
      return;
    }

    setIsLoading(true);
    try {
      // Infer column types from the first few rows of data
      const sampleSize = Math.min(10, data.length);
      const sampleData = data.slice(0, sampleSize);
      
      // Create column definitions, excluding 'id' column if it exists in the data
      const columnDefs = Object.keys(data[0])
        .filter(columnName => columnName.toLowerCase() !== 'id') // Exclude id column from data
        .map(columnName => {
          // Initialize type checking arrays
          const values = sampleData
            .map(row => row[columnName])
            .filter(val => val !== null && val !== undefined && val !== '');

          // Infer type based on values
          let type = 'varchar(255)'; // default type
          
          if (values.length > 0) {
            const allNumbers = values.every(val => !isNaN(val) && !isNaN(parseFloat(val)));
            const allIntegers = allNumbers && values.every(val => Number.isInteger(parseFloat(val)));
            const allDates = values.every(val => !isNaN(Date.parse(val)));
            const maxLength = Math.max(...values.map(val => String(val).length));

            if (allIntegers) {
              type = 'int';
            } else if (allNumbers) {
              type = 'decimal(10,2)';
            } else if (allDates) {
              type = 'date';
            } else if (maxLength > 255) {
              type = 'text';
            } else {
              type = `varchar(${Math.min(maxLength * 2, 255)})`;
            }
          }

          return {
            name: columnName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            type,
            nullable: true
          };
        });

      // Create table with inferred schema, adding id as the first column
      const tableDefinition = {
        name: tableName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        columns: [
          {
            name: 'id',
            type: 'INT',
            isPrimary: true,
            autoIncrement: true,
            nullable: false
          },
          ...columnDefs
        ]
      };

      await tableService.createTable(tableDefinition);
      
      // Insert data in chunks
      const chunkSize = 50;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        // Clean the data according to inferred types, excluding id
        const cleanedChunk = chunk.map(row => {
          const cleanedRow = {};
          columnDefs.forEach(({ name, type }) => {
            let value = row[Object.keys(row).find(key => 
              key.toLowerCase().replace(/[^a-z0-9_]/g, '_') === name
            )];

            // Convert values according to type
            if (value !== null && value !== undefined && value !== '') {
              if (type === 'int') {
                value = parseInt(value);
              } else if (type === 'decimal(10,2)') {
                value = parseFloat(value);
              } else if (type === 'date') {
                const date = new Date(value);
                if (!isNaN(date)) {
                  value = date.toISOString().split('T')[0];
                }
              }
            } else {
              value = null;
            }
            
            cleanedRow[name] = value;
          });
          return cleanedRow;
        });
        
        await tableService.insertData(tableName, cleanedChunk);
      }
      
      setShowCreateTableModal(false);
      // Optionally select the newly created table
      const newTable = { name: tableName, columns: tableDefinition.columns };
      setSelectedTable(newTable);
      
    } catch (error) {
      console.error('Error creating table:', error);
      setError(error.message || 'Error creating table');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = async (formData) => {
    if (!selectedTable) return;
    
    try {
      await tableService.insertData(selectedTable.name, formData);
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
      const result = await tableService.getData(selectedTable.name, filters);
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
      
      const result = await tableService.updateData(currentTableName, id, column, value);
      
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
      const tablesData = await tableService.getTables();
      
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