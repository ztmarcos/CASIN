import React, { useState, useEffect } from 'react';
import databaseService from '../../services/data/database';
import './TableManager.css';

const TableManager = ({ onTableSelect }) => {
  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState({ name: '', description: '' });

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

  const handleTableSelect = async (tableName) => {
    try {
      const structure = await databaseService.getTableStructure(tableName);
      const data = await databaseService.getData(tableName);
      onTableSelect({ ...structure, data });
    } catch (error) {
      console.error('Error loading table data:', error);
    }
  };

  const handleNewTableSubmit = async (e) => {
    e.preventDefault();
    if (!newTable.name.trim()) return;

    try {
      await databaseService.addTable(newTable.name, [
        { name: 'id', type: 'INTEGER', isPrimary: true },
        { name: 'name', type: 'VARCHAR(255)' },
        { name: 'created_at', type: 'TIMESTAMP' }
      ]);
      setNewTable({ name: '', description: '' });
      await loadTables();
    } catch (error) {
      console.error('Error adding table:', error);
    }
  };

  return (
    <div className="table-manager">
      <div className="table-manager-header">
        <h3>┌─ Tables ─┐</h3>
      </div>
      
      <div className="table-list">
        {tables.map(table => (
          <div 
            key={table.name} 
            className="table-item"
            onClick={() => handleTableSelect(table.name)}
          >
            <span className="table-icon">└─</span>
            <span className="table-name">{table.name}</span>
            <span className="table-description">{table.description}</span>
          </div>
        ))}
      </div>

      <form className="new-table-form" onSubmit={handleNewTableSubmit}>
        <input
          type="text"
          placeholder="Table name"
          value={newTable.name}
          onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
          className="table-input"
        />
        <input
          type="text"
          placeholder="Description"
          value={newTable.description}
          onChange={(e) => setNewTable({ ...newTable, description: e.target.value })}
          className="table-input"
        />
        <button type="submit" className="btn-primary">Add Table</button>
      </form>
    </div>
  );
};

export default TableManager; 