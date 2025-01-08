import React, { useState } from 'react';
import TableManager from '../TableManager/TableManager';
import ColumnManager from '../ColumnManager/ColumnManager';
import DataTable from '../DataDisplay/DataTable';
import TableCardView from '../TableCardView/TableCardView';
import './DataSection.css';

const DataSection = () => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [tableData] = useState([
    { id: 1, name: 'John Doe', role: 'Developer', status: 'Active' },
    { id: 2, name: 'Jane Smith', role: 'Designer', status: 'Active' },
    { id: 3, name: 'Bob Johnson', role: 'Manager', status: 'Inactive' },
  ]);

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    console.log('Selected table:', table);
  };

  const handleRowClick = (row) => {
    console.log('Selected row:', row);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'table' ? 'card' : 'table');
  };

  const handleExport = () => {
    const csvContent = [
      Object.keys(tableData[0]).join(','),
      ...tableData.map(item => Object.values(item).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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
          >
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 3v12M8 12l4 4 4-4" />
              <path d="M20 16v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3" />
            </svg>
          </button>
          <button 
            className="btn-primary"
            title="Add New Entry"
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
          <ColumnManager selectedTable={selectedTable} />
        </div>

        <div className="data-filters">
          <div className="filter-group">
            <label>Status:</label>
            <select className="filter-select">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Role:</label>
            <select className="filter-select">
              <option value="">All</option>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
              <option value="manager">Manager</option>
            </select>
          </div>
        </div>

        {viewMode === 'table' ? (
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
      </div>
    </div>
  );
};

export default DataSection; 