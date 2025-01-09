import React, { useState, useEffect } from 'react';
import databaseService from '../../services/data/database';
import './TableManager.css';

const TableManager = ({ onTableSelect }) => {
  const [tables, setTables] = useState([]);
  const [selectedTableName, setSelectedTableName] = useState(null);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const tablesData = await databaseService.getTables();
      console.log('Loaded tables:', tablesData);
      setTables(tablesData);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const handleTableSelect = async (table) => {
    try {
      setSelectedTableName(table.name);
      onTableSelect(table);
    } catch (error) {
      console.error('Error selecting table:', error);
    }
  };

  return (
    <div className="table-manager">
      <h3>Tables</h3>
      <div className="tables-list">
        {tables.map((table) => (
          <div
            key={table.name}
            className={`table-item ${selectedTableName === table.name ? 'selected' : ''}`}
            onClick={() => handleTableSelect(table)}
          >
            {table.name}
          </div>
        ))}
        {tables.length === 0 && (
          <div className="no-tables">No tables available</div>
        )}
      </div>
    </div>
  );
};

export default TableManager; 