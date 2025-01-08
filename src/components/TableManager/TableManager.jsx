import React, { useState } from 'react';
import './TableManager.css';

const TableManager = ({ onTableSelect }) => {
  const [tables, setTables] = useState([
    { id: 1, name: 'users', description: 'User information' },
    { id: 2, name: 'products', description: 'Product catalog' },
    { id: 3, name: 'orders', description: 'Customer orders' }
  ]);

  const [newTable, setNewTable] = useState({ name: '', description: '' });

  const handleTableSelect = (table) => {
    onTableSelect(table);
  };

  const handleNewTableSubmit = (e) => {
    e.preventDefault();
    const tableId = tables.length + 1;
    setTables([...tables, { ...newTable, id: tableId }]);
    setNewTable({ name: '', description: '' });
  };

  return (
    <div className="table-manager">
      <div className="table-manager-header">
        <h3>┌─ Tables ─┐</h3>
      </div>
      
      <div className="table-list">
        {tables.map(table => (
          <div 
            key={table.id} 
            className="table-item"
            onClick={() => handleTableSelect(table)}
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