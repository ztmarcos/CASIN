import React, { useState, useEffect } from 'react';
import './DataTable.css';

const DataTable = ({ data, onRowClick, onCellUpdate }) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>;
  }

  const columns = Object.keys(data[0]);

  const handleDoubleClick = (rowIndex, column, value) => {
    setEditingCell({ rowIndex, column });
    setEditValue(value);
  };

  const handleBlur = async (rowIndex, column) => {
    if (editingCell) {
      const row = data[rowIndex];
      const oldValue = row[column];
      
      if (editValue !== oldValue) {
        try {
          await onCellUpdate(row.id, column, editValue);
        } catch (error) {
          console.error('Failed to update cell:', error);
          setEditValue(oldValue);
        }
      }
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e, rowIndex, column) => {
    if (e.key === 'Enter') {
      handleBlur(rowIndex, column);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  return (
    <div className="data-table-container">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                {columns.map(column => {
                  const isEditing = editingCell?.rowIndex === rowIndex && editingCell?.column === column;
                  return (
                    <td
                      key={`${rowIndex}-${column}`}
                      onDoubleClick={() => handleDoubleClick(rowIndex, column, row[column])}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleBlur(rowIndex, column)}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, column)}
                          autoFocus
                        />
                      ) : (
                        row[column]
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable; 