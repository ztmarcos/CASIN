import React, { useState, useEffect, useCallback } from 'react';
import TableManager from '../TableManager/TableManager';
import ColumnManager from '../ColumnManager/ColumnManager';
import DataTable from '../DataDisplay/DataTable';
import TableCardView from '../TableCardView/TableCardView';
import TableImport from '../TableImport/TableImport';
import AddEntryModal from './AddEntryModal';
import tableService from '../../services/data/tableService';
import './DataSection.css';

const DataSection = () => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showCreateTableModal, setShowCreateTableModal] = useState(false);
  const [filters, setFilters] = useState({});

  const loadTableData = useCallback(async () => {
    if (!selectedTable) return;
    
    setIsLoading(true);
    try {
      const result = await tableService.getData(selectedTable.name, filters);
      setTableData(result.data || []);
    } catch (error) {
      console.error('Error loading table data:', error);
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTable, filters]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  const handleTableSelect = async (table) => {
    setSelectedTable(table);
    setFilters({}); // Reset filters on table change
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
    if (!selectedTable || !data.length) return;
    
    setIsLoading(true);
    try {
      // Here you would typically send the data to your backend
      // await tableService.importData(selectedTable.name, data);
      await Promise.all(data.map(row => tableService.insertData(selectedTable.name, row)));
      loadTableData(); // Reload the table data after import
      setShowImportModal(false);
    } catch (error) {
      console.error('Error importing data:', error);
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
      await tableService.updateData(selectedTable.name, id, column, value);
      // Update the local data to reflect the change
      setTableData(prevData => 
        prevData.map(row => 
          row.id === id ? { ...row, [column]: value } : row
        )
      );
    } catch (error) {
      console.error('Error updating cell:', error);
      throw error; // Let DataTable handle the error
    }
  };

  const handleCreateTable = async (data, tableName) => {
    if (!data || !data.length) {
      console.error('No data provided');
      return;
    }

    if (!tableName) {
      console.error('Table name is required');
      return;
    }

    try {
      setIsLoading(true);
      // Create the table with the preview data
      await tableService.createTable(tableName, data);
      setShowCreateTableModal(false);
      // Refresh the table list in TableManager
      // This will be handled by the TableManager component's useEffect
    } catch (error) {
      console.error('Error creating table:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="data-section">
      <div className="data-section-header">
        <h2>Data Management</h2>
        <div className="header-actions">
          <button 
            className="btn-primary create-btn" 
            onClick={() => setShowCreateTableModal(true)}
            disabled={isLoading}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Crear Tabla
          </button>
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
                className="btn-primary import-btn" 
                onClick={() => setShowImportModal(true)}
                disabled={isLoading}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-9-1.5h7.5m-7.5 3h7.5m3-3v3m0 0v3m0-3h-3m3 0h3M3 9l3-3m0 0l3 3m-3-3v12" />
                </svg>
                Importar
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
        <div className="managers-container">
          <TableManager onTableSelect={handleTableSelect} />
          {selectedTable && (
            <ColumnManager 
              selectedTable={selectedTable} 
              onOrderChange={handleColumnOrderChange}
            />
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
      {showImportModal && selectedTable && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import Data to {selectedTable.name}</h3>
              <button 
                className="close-button" 
                onClick={() => setShowImportModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <TableImport onFileData={handleImportData} />
            </div>
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
              <TableImport onFileData={handleCreateTable} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSection; 