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
  const [filters, setFilters] = useState({
    status: '',
    role: ''
  });

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
    setFilters({ status: '', role: '' }); // Reset filters on table change
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
            className="btn-primary" 
            onClick={() => setShowCreateTableModal(true)}
            disabled={isLoading}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Table
          </button>
          {selectedTable && (
            <>
              <button 
                className="btn-primary" 
                onClick={() => setShowAddEntryModal(true)}
                disabled={isLoading}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Entry
              </button>
              <button 
                className="btn-primary" 
                onClick={() => setShowImportModal(true)}
                disabled={isLoading}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import
              </button>
              <button 
                className="btn-secondary" 
                onClick={toggleViewMode}
                title={viewMode === 'table' ? 'Switch to Card View' : 'Switch to Table View'}
                disabled={isLoading}
              >
                {viewMode === 'table' ? (
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="4" y="4" width="7" height="7" rx="1" />
                    <rect x="13" y="4" width="7" height="7" rx="1" />
                    <rect x="4" y="13" width="7" height="7" rx="1" />
                    <rect x="13" y="13" width="7" height="7" rx="1" />
                  </svg>
                ) : (
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                  </svg>
                )}
              </button>
              <button 
                className="btn-secondary" 
                onClick={handleExport}
                title="Export as CSV"
                disabled={!selectedTable || isLoading || !tableData.length}
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 3v12M8 12l4 4 4-4" />
                  <path d="M20 16v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3" />
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
          <>
            <div className="data-filters">
              <div className="filter-group">
                <label>Status:</label>
                <select 
                  className="filter-select"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Role:</label>
                <select 
                  className="filter-select"
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">All</option>
                  <option value="Developer">Developer</option>
                  <option value="Designer">Designer</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : viewMode === 'table' ? (
              <DataTable 
                data={tableData}
                onRowClick={handleRowClick}
                onCellUpdate={handleCellUpdate}
              />
            ) : (
              <TableCardView 
                data={tableData}
                onCardClick={handleRowClick}
              />
            )}
          </>
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