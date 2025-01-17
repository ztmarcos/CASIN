import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import './TableManager.css';

const TableManager = ({ onTableSelect }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setIsLoading(true);
      const tablesData = await tableService.getTables();
      setTables(tablesData);
      setError(null);
    } catch (err) {
      console.error('Error loading tables:', err);
      setError('Failed to load tables. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = async (table) => {
    setSelectedTable(table);
    if (onTableSelect) {
      onTableSelect(table);
    }
  };

  return (
    <div className="table-manager">
      <div className="section-header">
        <h3>
          <span className="collapse-icon" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '›' : '⌄'}
          </span>
          Tables {tables.length > 0 && `(${tables.length})`}
        </h3>
        {isLoading && <div className="loading-spinner">Loading...</div>}
      </div>

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
                  className={`table-item ${selectedTable?.name === table.name ? 'selected' : ''}`}
                  onClick={() => handleTableSelect(table)}
                >
                  <span className="table-name">{table.name}</span>
                  {table.count !== undefined && (
                    <span className="table-count">{table.count}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TableManager; 