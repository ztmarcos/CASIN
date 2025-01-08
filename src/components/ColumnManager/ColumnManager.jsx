import React, { useState } from 'react';
import './ColumnManager.css';

const ColumnManager = ({ selectedTable }) => {
  const [columns, setColumns] = useState([
    { id: 1, name: 'id', type: 'INTEGER', isPrimary: true },
    { id: 2, name: 'name', type: 'VARCHAR', length: 255 },
    { id: 3, name: 'created_at', type: 'TIMESTAMP' }
  ]);

  const [newColumn, setNewColumn] = useState({
    name: '',
    type: 'VARCHAR',
    length: '',
    isPrimary: false
  });

  const dataTypes = [
    'INTEGER',
    'VARCHAR',
    'TEXT',
    'TIMESTAMP',
    'BOOLEAN',
    'DECIMAL'
  ];

  const handleNewColumnSubmit = (e) => {
    e.preventDefault();
    const columnId = columns.length + 1;
    setColumns([...columns, { ...newColumn, id: columnId }]);
    setNewColumn({ name: '', type: 'VARCHAR', length: '', isPrimary: false });
  };

  return (
    <div className="column-manager">
      <div className="column-manager-header">
        <h3>┌─ Columns: {selectedTable?.name || 'No table selected'} ─┐</h3>
      </div>

      <div className="column-list">
        {columns.map(column => (
          <div key={column.id} className="column-item">
            <span className="column-icon">└─</span>
            <span className="column-name">{column.name}</span>
            <span className="column-type">
              {column.type}
              {column.length ? `(${column.length})` : ''}
            </span>
            {column.isPrimary && (
              <span className="column-primary">PK</span>
            )}
          </div>
        ))}
      </div>

      <form className="new-column-form" onSubmit={handleNewColumnSubmit}>
        <input
          type="text"
          placeholder="Column name"
          value={newColumn.name}
          onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
          className="column-input"
        />
        <select
          value={newColumn.type}
          onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value })}
          className="column-input"
        >
          {dataTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        {newColumn.type === 'VARCHAR' && (
          <input
            type="number"
            placeholder="Length"
            value={newColumn.length}
            onChange={(e) => setNewColumn({ ...newColumn, length: e.target.value })}
            className="column-input column-length"
          />
        )}
        <label className="column-primary-label">
          <input
            type="checkbox"
            checked={newColumn.isPrimary}
            onChange={(e) => setNewColumn({ ...newColumn, isPrimary: e.target.checked })}
          />
          Primary Key
        </label>
        <button type="submit" className="btn-primary">Add Column</button>
      </form>
    </div>
  );
};

export default ColumnManager; 