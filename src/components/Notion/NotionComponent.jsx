import React, { useState, useEffect, useMemo, useCallback } from 'react';
import NotionErrorBoundary from './NotionErrorBoundary';
import './NotionComponent.css';

const ITEMS_PER_PAGE = 10;
const API_BASE_URL = 'http://localhost:3001';

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
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    Encargado: '',
    Status: '',
    'Fecha límite': '',
    Descripción: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const notionDatabaseUrl = "https://www.notion.so/1f7385297f9a80a3bc5bcec8a3c2debb?v=1f7385297f9a80de9d66000cfeaf4e83";

  // Fetch Notion users
  const fetchNotionUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch(`${API_BASE_URL}/api/notion/users`);
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
      const response = await fetch(`${API_BASE_URL}/api/notion/raw-table`);
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

      const response = await fetch(`${API_BASE_URL}/api/notion/update-cell`, {
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
      } catch (parseError) {
        console.error('Failed to parse server response:', parseError);
        throw new Error('Server response was not valid JSON');
      }

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to update cell');
      }

      // Refresh the data after successful update
      await fetchTasks();

      return responseData;
    } catch (error) {
      console.error('Error in handleCellEdit:', { error });
      throw error;
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
                setError(error.message);
                setTimeout(() => setError(null), 5000);
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

  // Create new task
  const handleCreateTask = async () => {
    try {
      console.log('Creating task with data:', newTask);
      
      const response = await fetch(`${API_BASE_URL}/api/notion/create-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });

      const responseData = await response.json();
      console.log('Server response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to create task');
      }

      await fetchTasks();
      setIsNewTaskModalOpen(false);
      setNewTask({
        title: '',
        Encargado: '',
        Status: '',
        'Fecha límite': '',
        Descripción: ''
      });
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error.message || 'Failed to create task');
      // Keep modal open on error
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      console.log('Deleting task:', taskId);
      setIsDeleting(true);
      
      const response = await fetch(`${API_BASE_URL}/api/notion/delete-task/${taskId}`, {
        method: 'DELETE',
      });

      const responseData = await response.json();
      console.log('Delete response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to delete task');
      }

      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError(error.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
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
                onClick={() => setIsNewTaskModalOpen(true)} 
                className="notion-button create"
              >
                + Nueva Tarea
              </button>
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

        {/* New Task Modal */}
        {isNewTaskModalOpen && (
          <div className="notion-modal-overlay">
            <div className="notion-modal">
              <h3>Nueva Tarea</h3>
              <div className="notion-modal-content">
                <input
                  type="text"
                  placeholder="Título"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="notion-input"
                />
                <select
                  value={newTask.Encargado}
                  onChange={(e) => setNewTask({ ...newTask, Encargado: e.target.value })}
                  className="notion-select"
                >
                  <option value="">Seleccionar encargado...</option>
                  {notionUsers.map(user => (
                    <option key={user.id} value={user.email}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <select
                  value={newTask.Status}
                  onChange={(e) => setNewTask({ ...newTask, Status: e.target.value })}
                  className="notion-select"
                >
                  <option value="">Seleccionar estado...</option>
                  <option value="En progreso">En progreso</option>
                  <option value="Listo">Listo</option>
                </select>
                <input
                  type="date"
                  value={newTask['Fecha límite']}
                  onChange={(e) => setNewTask({ ...newTask, 'Fecha límite': e.target.value })}
                  className="notion-input"
                />
                <textarea
                  placeholder="Descripción"
                  value={newTask.Descripción}
                  onChange={(e) => setNewTask({ ...newTask, Descripción: e.target.value })}
                  className="notion-textarea"
                />
                <div className="notion-modal-actions">
                  <button onClick={() => setIsNewTaskModalOpen(false)} className="notion-button cancel">
                    Cancelar
                  </button>
                  <button onClick={handleCreateTask} className="notion-button create">
                    Crear Tarea
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <th className="notion-th">Actions</th>
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
                  <td className="notion-td notion-actions-cell">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="notion-button delete"
                      disabled={isDeleting}
                    >
                      {isDeleting ? '...' : '🗑️'}
                    </button>
                  </td>
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