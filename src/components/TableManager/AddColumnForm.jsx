import React, { useState } from 'react';
import { DATA_TYPES } from './constants';

const AddColumnForm = ({ onAdd }) => {
  const [column, setColumn] = useState({
    name: '',
    type: 'VARCHAR',
    length: '',
    isPrimary: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!column.name.trim()) return;

    onAdd({
      ...column,
      name: column.name.trim(),
      type: column.type + (column.length ? `(${column.length})` : '')
    });

    setColumn({
      name: '',
      type: 'VARCHAR',
      length: '',
      isPrimary: false
    });
  };

  return (
    <form onSubmit={handleSubmit} className="add-column-form">
      <input
        type="text"
        value={column.name}
        onChange={(e) => setColumn({ ...column, name: e.target.value })}
        placeholder="New column name"
        className="column-name-input"
      />
      <select
        value={column.type}
        onChange={(e) => setColumn({ ...column, type: e.target.value })}
        className="column-type-select"
      >
        {DATA_TYPES.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      {column.type === 'VARCHAR' && (
        <input
          type="number"
          value={column.length}
          onChange={(e) => setColumn({ ...column, length: e.target.value })}
          placeholder="Length"
          className="column-length-input"
        />
      )}
      <button type="submit" className="btn-primary">
        Add Column
      </button>
    </form>
  );
};

export default AddColumnForm; 