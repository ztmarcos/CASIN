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

const NotionComponent = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [columns, setColumns] = useState([]);

  const fetchNotionTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notion/raw-table');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Raw Notion data:', data); // Debug log
      
      // Get unique columns from all tasks, excluding any undefined or null values
      const allColumns = data.reduce((cols, task) => {
        Object.keys(task).forEach(key => {
          if (!cols.includes(key) && task[key] !== undefined && task[key] !== null) {
            cols.push(key);
          }
        });
        return cols;
      }, []);

      console.log('Available columns:', allColumns); // Debug log

      // Sort columns to keep important ones first
      const orderedColumns = [
        'title',
        'Name',
        'Status',
        'Priority',
        'Due date',
        'Assignee'
      ].concat(
        allColumns.filter(col => 
          !['id', 'title', 'Name', 'Status', 'Priority', 'Due date', 'Assignee'].includes(col)
        )
      ).filter(col => allColumns.includes(col) && col !== 'id'); // Exclude id column

      setColumns(orderedColumns);
      setTasks(data);
      setCurrentPage(1); // Reset to first page on refresh
    } catch (err) {
      console.error('Failed to fetch Notion tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotionTasks();
  }, [fetchNotionTasks]);

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

  // Row selection
  const toggleRowSelection = (taskId) => {
    setSelectedRows(prev => {
      if (prev.includes(taskId)) {
        return prev.filter(id => id !== taskId);
      }
      return [...prev, taskId];
    });
  };

  const handleDeleteSelected = async () => {
    if (!selectedRows.length || !window.confirm('¿Estás seguro de que quieres eliminar los elementos seleccionados?')) {
      return;
    }

    try {
      setDeleteLoading(true);
      const response = await fetch('/api/notion/delete-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskIds: selectedRows }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete tasks: ${response.statusText}`);
      }

      await fetchNotionTasks();
      setSelectedRows([]);
    } catch (err) {
      console.error('Error deleting tasks:', err);
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCellEdit = async (taskId, column, value) => {
    try {
      // Special handling for dates
      if (column === 'Due date') {
        // Ensure the date is in ISO format for Notion
        value = value ? new Date(value).toISOString().split('T')[0] : null;
      }

      const response = await fetch('/api/notion/update-cell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          column,
          value,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update cell: ${response.statusText}`);
      }

      // Update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, [column]: value } : task
        )
      );

      // Clear editing state
      setEditingCell(null);
    } catch (err) {
      console.error('Error updating cell:', err);
      setError(err.message);
    }
  };

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

  const renderCell = (task, column) => {
    const isEditing = editingCell?.taskId === task.id && editingCell?.column === column;
    const value = task[column];

    // Handle read-only columns
    if (column === 'PageURL') {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer">
          Abrir en Notion
        </a>
      );
    }

    if (column === 'Created' || column === 'LastEdited') {
      return formatDate(value);
    }

    // Enhanced Assignee field handling
    if (column === 'Assignee') {
      console.log('Assignee value:', value); // Debug log
      return isEditing ? (
        <input
          type="text"
          className="notion-td-editable"
          value={value || ''}
          onChange={(e) => handleCellEdit(task.id, column, e.target.value)}
          onBlur={() => setEditingCell(null)}
          autoFocus
          placeholder="Email del asignado"
        />
      ) : (
        <div
          className="notion-td-editable"
          onClick={() => setEditingCell({ taskId: task.id, column })}
          data-type="assignee"
        >
          {Array.isArray(value) 
            ? value.join(', ') 
            : value || 'Sin asignar'}
        </div>
      );
    }

    // Handle date fields
    if (column === 'Due date') {
      return isEditing ? (
        <input
          type="date"
          className="notion-date-input"
          value={formatDateForInput(value)}
          onChange={(e) => handleCellEdit(task.id, column, e.target.value)}
          onBlur={() => setEditingCell(null)}
          autoFocus
        />
      ) : (
        <div
          className="notion-td-editable"
          onClick={() => setEditingCell({ taskId: task.id, column })}
        >
          {value ? formatDate(value) : 'Establecer fecha'}
        </div>
      );
    }

    // Handle multi-select fields
    if (Array.isArray(value)) {
      return isEditing ? (
        <input
          type="text"
          className="notion-td-editable"
          value={value.join(', ')}
          onChange={(e) => handleCellEdit(task.id, column, e.target.value.split(',').map(v => v.trim()))}
          onBlur={() => setEditingCell(null)}
          autoFocus
        />
      ) : (
        <div
          className="notion-td-editable"
          onClick={() => setEditingCell({ taskId: task.id, column })}
        >
          {value.map((tag, index) => (
            <span key={index} className="notion-tag">
              {tag}
            </span>
          ))}
        </div>
      );
    }

    // Handle Status field with colors
    if (column === 'Status') {
      return isEditing ? (
        <input
          type="text"
          className="notion-td-editable"
          value={value || ''}
          onChange={(e) => handleCellEdit(task.id, column, e.target.value)}
          onBlur={() => setEditingCell(null)}
          autoFocus
        />
      ) : (
        <div
          className={`notion-td-editable ${getStatusClass(value)}`}
          onClick={() => setEditingCell({ taskId: task.id, column })}
        >
          {value || 'Establecer estado'}
        </div>
      );
    }

    // Handle Priority field with colors
    if (column === 'Priority') {
      return isEditing ? (
        <input
          type="text"
          className="notion-td-editable"
          value={value || ''}
          onChange={(e) => handleCellEdit(task.id, column, e.target.value)}
          onBlur={() => setEditingCell(null)}
          autoFocus
        />
      ) : (
        <div
          className="notion-td-editable"
          data-priority={value}
          onClick={() => setEditingCell({ taskId: task.id, column })}
        >
          {value || 'Establecer prioridad'}
        </div>
      );
    }

    // Make other fields editable
    return isEditing ? (
      <input
        type="text"
        className="notion-td-editable"
        value={value || ''}
        onChange={(e) => handleCellEdit(task.id, column, e.target.value)}
        onBlur={() => setEditingCell(null)}
        autoFocus
      />
    ) : (
      <div
        className="notion-td-editable"
        onClick={() => setEditingCell({ taskId: task.id, column })}
      >
        {value || ''}
      </div>
    );
  };

  if (loading) return <div className="notion-loading">Cargando tareas...</div>;
  if (error) return <div className="notion-error">Error: {error}</div>;
  if (!tasks.length) return <div className="notion-empty">No se encontraron tareas</div>;

  return (
    <NotionErrorBoundary>
      <div className="notion-container">
        <div className="notion-header">
          <h2>Tareas de Notion</h2>
          <div className="notion-actions">
            <button 
              onClick={fetchNotionTasks} 
              className="notion-button refresh"
              disabled={loading}
            >
              {loading ? 'Actualizando...' : '↻ Actualizar'}
            </button>
            {selectedRows.length > 0 && (
              <button 
                className="notion-button delete"
                onClick={handleDeleteSelected}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Eliminando...' : `Eliminar seleccionados (${selectedRows.length})`}
              </button>
            )}
          </div>
        </div>

        <div className="notion-table-container">
          <table className="notion-table">
            <thead>
              <tr>
                <th className="notion-th checkbox">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRows(processedTasks.map(task => task.id));
                      } else {
                        setSelectedRows([]);
                      }
                    }}
                    checked={selectedRows.length === processedTasks.length}
                  />
                </th>
                {columns.map(column => (
                  <th 
                    key={column} 
                    className="notion-th"
                    onClick={() => requestSort(column)}
                  >
                    <div className="notion-th-content">
                      <span>{column}</span>
                      {sortConfig.key === column && (
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
                  <td className="notion-td checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(task.id)}
                      onChange={() => toggleRowSelection(task.id)}
                    />
                  </td>
                  {columns.map(column => (
                    <td 
                      key={column} 
                      className={`notion-td ${column === 'Status' ? getStatusClass(task[column]) : ''}`}
                    >
                      {renderCell(task, column)}
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