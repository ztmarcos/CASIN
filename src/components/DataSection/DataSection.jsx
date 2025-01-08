import React, { useState } from 'react';
import TableManager from '../TableManager/TableManager';
import ColumnManager from '../ColumnManager/ColumnManager';
import DataTable from '../DataDisplay/DataTable';
import TableCardView from '../TableCardView/TableCardView';
import './DataSection.css';

const DataSection = () => {
  const [selectedTable, setSelectedTable] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
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

  return (
    <div className="data-section">
      <div className="data-section-header">
        <h2>Data Management</h2>
        <div className="header-actions">
          <button className="btn-secondary" onClick={toggleViewMode}>
            <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {viewMode === 'table' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              )}
            </svg>
            {viewMode === 'table' ? 'Card View' : 'Table View'}
          </button>
          <button className="btn-secondary">
            <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
          <button className="btn-primary">
            <svg className="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New
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
            <label>Status</label>
            <select className="filter-select">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Role</label>
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