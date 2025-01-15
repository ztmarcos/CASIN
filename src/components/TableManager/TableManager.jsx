import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import './TableManager.css';

const TableManager = ({ onTableSelect }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="tables-section">
        <div className="section-header">
          <h3>Tables</h3>
          {isLoading && <div className="loading-spinner">Loading...</div>}
        </div>

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
                  <span className="table-count">{table.count} rows</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TableManager; 