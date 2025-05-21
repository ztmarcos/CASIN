import React, { useState, useEffect, useMemo, useCallback } from 'react';
import NotionErrorBoundary from './NotionErrorBoundary';
import './NotionComponent.css';

const ITEMS_PER_PAGE = 10;

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Format date for input
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

// Define columns configuration outside the component
const TABLE_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'Encargado', label: 'Assignee' },
  { key: 'Status', label: 'Status' },
  { key: 'Fecha límite', label: 'Due Date' },
  { key: 'Descripción', label: 'Description' }
];

const NotionComponent = () => {
  const [tasks, setTasks] = useState([]);
  const [notionUsers, setNotionUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCell, setEditingCell] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const notionDatabaseUrl = "https://www.notion.so/1f7385297f9a80a3bc5bcec8a3c2debb?v=1f7385297f9a80de9d66000cfeaf4e83";

  // Fetch Notion users
  const fetchNotionUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch('/api/notion/users');
      if (!response.ok) {
        throw new Error('Failed to fetch Notion users');
      }
      const users = await response.json();
      console.log('Fetched Notion users:', users);
      setNotionUsers(users);
    } catch (error) {
      console.error('Error fetching Notion users:', error);
      setError('Failed to load Notion users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch('/api/notion/raw-table');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      console.log('Fetched tasks:', data);
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Handle cell edit
  const handleCellEdit = async (taskId, column, value, propertyType = null) => {
    try {
      console.log('Updating cell:', { taskId, column, value, propertyType });

      const response = await fetch('/api/notion/update-cell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          column,
          value,
          propertyType
        }),
      });

      let responseData;
      try {
        responseData = await response.json();
        console.log('Raw server response:', responseData);
      } catch (parseError) {
        console.error('Failed to parse server response:', parseError);
        throw new Error('Server response was not valid JSON');
      }

      if (!response.ok) {
        console.error('Server returned error:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        throw new Error(responseData.message || `Failed to update cell: ${response.statusText}`);
      }

      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, [column]: value } : task
        )
      );

      return responseData;
    } catch (err) {
      console.error('Error in handleCellEdit:', {
        error: err,
        message: err.message,
        stack: err.stack
      });
      setError(err.message);
      setTimeout(() => setError(null), 3000);
      throw err;
    }
  };

  // Start editing a cell
  const startEditing = (task, column) => {
    setEditingCell({ taskId: task.id, column });
    setEditingValue(task[column] || '');
  };

  // Handle input change
  const handleInputChange = (e) => {
    setEditingValue(e.target.value);
  };

  // Handle input blur
  const handleInputBlur = async () => {
    if (editingCell) {
      try {
        await handleCellEdit(editingCell.taskId, editingCell.column, editingValue);
        setEditingCell(null);
        setEditingValue('');
      } catch (error) {
        // Keep the cell in edit mode if there's an error
        console.error('Error in handleInputBlur:', error);
      }
    }
  };

  // Handle input key press with error handling
  const handleInputKeyPress = async (e) => {
    if (e.key === 'Enter') {
      try {
        await handleInputBlur();
      } catch (error) {
        // Error is already handled in handleCellEdit
        console.log('Error handled in key press');
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditingValue('');
    }
  };

  const renderCell = (task, column) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.column === column;
    const value = task[column];

    if (column === 'Encargado' || column === 'Assignee') {
      return (
        <select
          className="notion-select"
          value={value || ''}
          onChange={(e) => {
            const selectedValue = e.target.value;
            handleCellEdit(task.id, column, selectedValue)
              .catch(error => {
                console.error('Failed to update assignee:', error);
              });
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Select assignee...</option>
          {notionUsers.map(user => (
            <option key={user.id} value={user.email}>
              {user.name} ({user.email})
            </option>
          ))}
        </select>
      );
    }

    if (column === 'Status' || column === 'Estado') {
      const statusOptions = [
        { value: '', label: 'Seleccionar estado...' },
        { value: 'En progreso', label: 'En progreso' },
        { value: 'Listo', label: 'Listo' }
      ];

      return (
        <select
          className="notion-select"
          value={value || ''}
          onChange={(e) => {
            const selectedValue = e.target.value;
            if (!selectedValue && value) {
              console.log('Preventing empty status update');
              e.target.value = value;
              return;
            }

            handleCellEdit(task.id, column, selectedValue, 'status')
              .catch(error => {
                console.error('Status update failed:', error);
                e.target.value = value || '';
              });
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (column === 'Priority' || column === 'Prioridad') {
      return (
        <select
          className="notion-select"
          value={value || ''}
          onChange={(e) => handleCellEdit(task.id, column, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Select priority...</option>
          <option value="Alta">Alta</option>
          <option value="Media">Media</option>
          <option value="Baja">Baja</option>
        </select>
      );
    }

    if (column.toLowerCase().includes('date') || column.toLowerCase().includes('fecha')) {
      return (
        <input
          type="date"
          className="notion-input"
          value={value || ''}
          onChange={(e) => handleCellEdit(task.id, column, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    // Enhanced text cell rendering
    return isEditing ? (
      <input
        type="text"
        className="notion-input"
        value={editingValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyPress}
        onClick={(e) => e.stopPropagation()}
        autoFocus
      />
    ) : (
      <div
        className="notion-td-editable"
        onClick={() => startEditing(task, column)}
      >
        {value || ''}
      </div>
    );
  };

  // Initial data fetch
  useEffect(() => {
    fetchTasks();
    fetchNotionUsers();
  }, []);

  // Sort function
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Debounced filter function
  const handleFilterChange = useCallback((column, value) => {
    const timeoutId = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        [column]: value
      }));
      setCurrentPage(1); // Reset to first page when filter changes
    }, 300);

    return () => clearTimeout(timeoutId);
  }, []);

  // Get sorted and filtered data
  const processedTasks = useMemo(() => {
    let result = [...tasks];

    // Apply filters
    Object.keys(filters).forEach(column => {
      const filterValue = filters[column]?.toLowerCase();
      if (filterValue) {
        result = result.filter(task => {
          const value = String(task[column] || '').toLowerCase();
          return value.includes(filterValue);
        });
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = (a[sortConfig.key] || '').toString().toLowerCase();
        const bVal = (b[sortConfig.key] || '').toString().toLowerCase();
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tasks, sortConfig, filters]);

  // Pagination calculation
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [processedTasks, currentPage]);

  const totalPages = Math.ceil(processedTasks.length / ITEMS_PER_PAGE);

  // Get status class
  const getStatusClass = (status) => {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('not started')) return 'status-not-started';
    if (statusLower.includes('in progress')) return 'status-in-progress';
    if (statusLower.includes('completed')) return 'status-completed';
    return '';
  };

  if (isLoadingUsers) return <div className="notion-loading">Loading...</div>;
  if (error) return <div className="notion-error">{error}</div>;

  return (
    <NotionErrorBoundary>
      <div className="notion-container">
        <div className="notion-header">
          <h2>Tareas</h2>
          <div className="notion-controls">
            <div className="notion-actions">
              <button 
                onClick={fetchTasks} 
                className="notion-button refresh"
                disabled={isLoadingUsers}
              >
                {isLoadingUsers ? 'Actualizando...' : '↻ Actualizar'}
              </button>
              <a
                href={notionDatabaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="notion-database-link"
              >
                Ver en Notion
              </a>
            </div>
          </div>
        </div>

        <div className="notion-table-container">
          <table className="notion-table">
            <thead>
              <tr>
                {TABLE_COLUMNS.map(column => (
                  <th 
                    key={column.key} 
                    className="notion-th"
                    onClick={() => requestSort(column.key)}
                  >
                    <div className="notion-th-content">
                      <span>{column.label}</span>
                      {sortConfig.key === column.key && (
                        <span className="notion-sort-indicator">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((task, index) => (
                <tr key={task.id || index} className="notion-tr">
                  {TABLE_COLUMNS.map(column => (
                    <td 
                      key={`${task.id}-${column.key}`} 
                      className={`notion-td ${column.key === 'Status' ? getStatusClass(task[column.key]) : ''}`}
                    >
                      {renderCell(task, column.key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="notion-pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="notion-button"
            >
              Anterior
            </button>
            <span className="notion-page-info">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="notion-button"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </NotionErrorBoundary>
  );
};

export default NotionComponent; 