import React, { useState, useEffect, useCallback } from 'react';
import './DataTable.css';

const DataTable = ({ data, onRowClick, onCellUpdate, onRefresh }) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null);
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

  // Global keyboard handler for confirmation dialog
  useEffect(() => {
    const handleGlobalKeyDown = async (e) => {
      if (showConfirm && e.key === 'Enter') {
        e.preventDefault();
        await handleConfirmEdit();
      } else if (showConfirm && e.key === 'Escape') {
        handleCancelEdit();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showConfirm, pendingEdit]);

  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>;
  }

  const columns = Object.keys(data[0]);

  const handleDoubleClick = (rowIndex, column, value) => {
    setEditingCell({ rowIndex, column });
    setEditValue(value);
  };

  const handleCancelEdit = () => {
    setShowConfirm(false);
    setEditingCell(null);
    setPendingEdit(null);
    setEditValue('');
  };

  const handleConfirmEdit = async () => {
    if (pendingEdit) {
      const { rowIndex, column, newValue } = pendingEdit;
      const row = data[rowIndex];
      
      try {
        await onCellUpdate(row.id, column, newValue);
        handleCancelEdit();
        await refreshData();
      } catch (error) {
        console.error('Failed to update cell:', error);
        setEditValue(row[column]);
        handleCancelEdit();
      }
    }
  };

  const handleBlur = (rowIndex, column) => {
    if (editingCell) {
      const row = data[rowIndex];
      const oldValue = row[column];
      
      if (editValue !== oldValue) {
        setPendingEdit({ rowIndex, column, newValue: editValue });
        setShowConfirm(true);
      } else {
        handleCancelEdit();
      }
    }
  };

  // Input field keyboard handler
  const handleInputKeyDown = (e, rowIndex, column) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation(); // Prevent global handler from catching this
      const row = data[rowIndex];
      const oldValue = row[column];
      
      if (editValue !== oldValue) {
        setPendingEdit({ rowIndex, column, newValue: editValue });
        setShowConfirm(true);
      } else {
        handleCancelEdit();
      }
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className="data-table-container">
      {showConfirm && (
        <div className="confirmation-dialog">
          <p>Are you sure you want to update this cell?</p>
          <div className="confirmation-actions">
            <button 
              className="cancel-btn" 
              onClick={handleCancelEdit}
            >
              Cancel (Esc)
            </button>
            <button 
              className="confirm-btn" 
              onClick={handleConfirmEdit}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing data...' : 'Confirm (Enter)'}
            </button>
          </div>
        </div>
      )}
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
                          onKeyDown={(e) => handleInputKeyDown(e, rowIndex, column)}
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