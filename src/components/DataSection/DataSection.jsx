import React, { useState, useEffect, useCallback } from 'react';
import TableManager from '../TableManager/TableManager';
import ColumnManager from '../ColumnManager/ColumnManager';
import DataTable from '../DataDisplay/DataTable';
import TableCardView from '../TableCardView/TableCardView';
import AddEntryModal from './AddEntryModal';
import databaseService from '../../services/data/database';
import './DataSection.css';

const DataSection = () => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    role: ''
  });

  const loadTableData = useCallback(async () => {
    if (!selectedTable) return;
    
    setIsLoading(true);
    try {
      const result = await databaseService.getData(selectedTable.name, filters);
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

  const handleAddEntry = () => {
    setIsAddModalOpen(true);
  };

  const handleAddEntrySubmit = async (formData) => {
    try {
      await databaseService.insertData(selectedTable.name, formData);
      setIsAddModalOpen(false);
      await loadTableData(); // Reload table data after adding new entry
    } catch (error) {
      console.error('Error adding new entry:', error);
      // TODO: Show error message to user
      alert(error.message);
    }
  };

  return (
    <div className="data-section">
      <div className="data-section-header">
        <h2>Data Management</h2>
        <div className="header-actions">
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
          <button 
            className="btn-primary"
            onClick={handleAddEntry}
            title="Add New Entry"
            disabled={!selectedTable || isLoading}
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="data-section-content">
        <div className="managers-container">
          <TableManager onTableSelect={handleTableSelect} />
          {selectedTable && <ColumnManager selectedTable={selectedTable} />}
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

      {selectedTable && (
        <AddEntryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          table={selectedTable}
          onSubmit={handleAddEntrySubmit}
        />
      )}
    </div>
  );
};

export default DataSection; 