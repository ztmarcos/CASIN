import React, { useState, useEffect, useCallback } from 'react';
import './DataTable.css';

const DataTable = ({ data, onRowClick, onCellUpdate, onRefresh }) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [sortedData, setSortedData] = useState([]);

  useEffect(() => {
    setSortedData(data);
  }, [data]);

  const handleSort = (column) => {
    let direction = 'asc';
    if (sortConfig.key === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === column && sortConfig.direction === 'desc') {
      direction = null;
    }

    setSortConfig({ key: direction ? column : null, direction });

    if (!direction) {
      setSortedData([...data]);
      return;
    }

    const sorted = [...sortedData].sort((a, b) => {
      if (a[column] === null) return 1;
      if (b[column] === null) return -1;
      
      let comparison = 0;
      if (typeof a[column] === 'number') {
        comparison = a[column] - b[column];
      } else {
        comparison = String(a[column]).localeCompare(String(b[column]));
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });

    setSortedData(sorted);
  };

  const getSortIcon = (column) => {
    if (sortConfig.key !== column) {
      return <span className="sort-icon">↕</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="sort-icon active">↑</span> : 
      <span className="sort-icon active">↓</span>;
  };

  const refreshData = useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Failed to refresh data:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh]);

  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>;
  }

  const columns = Object.keys(data[0]);

  const handleCellClick = (rowIndex, column, value) => {
    setEditingCell({ rowIndex, column, value });
    setEditValue(value !== null ? String(value) : '');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleConfirmEdit = async () => {
    if (!editingCell) return;

    const { rowIndex, column } = editingCell;
    const row = data[rowIndex];
    
    try {
      await onCellUpdate(row.id, column, editValue);
      handleCancelEdit();
      await refreshData();
    } catch (error) {
      console.error('Failed to update cell:', error);
    }
  };

  // Input field keyboard handler
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="data-table-container">
      <div className={`table-wrapper ${isRefreshing ? 'refreshing' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th 
                  key={column}
                  onClick={() => handleSort(column)}
                  className={`sortable-header ${sortConfig.key === column ? 'active' : ''}`}
                >
                  <div className="header-content">
                    <span>{column}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                {columns.map(column => (
                  <td
                    key={`${rowIndex}-${column}`}
                    onClick={() => handleCellClick(rowIndex, column, row[column])}
                    className="editable-cell"
                  >
                    {row[column] !== null ? String(row[column]) : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Cell Popup */}
      {editingCell && (
        <div className="edit-cell-popup">
          <div className="edit-cell-content" onClick={e => e.stopPropagation()}>
            <h4>Edit Cell</h4>
            <div className="edit-cell-info">
              <p>Column: {editingCell.column}</p>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                autoFocus
                rows={3}
                className="edit-cell-textarea"
              />
            </div>
            <div className="edit-cell-actions">
              <button onClick={handleCancelEdit} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleConfirmEdit} className="confirm-btn">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable; 