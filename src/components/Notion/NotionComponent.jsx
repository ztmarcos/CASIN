import React, { useState, useEffect, useMemo, useCallback } from 'react';
import NotionErrorBoundary from './NotionErrorBoundary';
import TaskModal from './TaskModal';
import { PROPERTY_CONFIGS } from './config';
import './NotionComponent.css';

const ITEMS_PER_PAGE = 10;
const API_BASE_URL = '/api';

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
  { key: 'Encargado', label: 'Encargado' },
  { key: 'Status', label: 'Status' },
  { key: 'Fecha límite', label: 'Fecha límite' },
  { key: 'Descripción', label: 'Descripción' }
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
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const notionDatabaseUrl = "https://www.notion.so/1f7385297f9a80a3bc5bcec8a3c2debb?v=1f7385297f9a80de9d66000cfeaf4e83";

  // Fetch Notion users
  const fetchNotionUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await fetch(`${API_BASE_URL}/notion/users`);
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
      const response = await fetch(`${API_BASE_URL}/notion/raw-table`);
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

      // Send the raw value and let the backend handle the formatting
      const response = await fetch(`${API_BASE_URL}/notion/update-cell`, {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update cell');
      }

      const responseData = await response.json();
      
      // Refresh the tasks list after successful update
      await fetchTasks();
      
      return responseData;
    } catch (error) {
      console.error('Error in handleCellEdit:', error);
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
    const value = task[column];

    // Handle null or undefined values
    if (value === null || value === undefined) {
      return <div className="notion-td-content">-</div>;
    }

    // Handle status field
    if (column === 'Status') {
      return (
        <div className={`notion-status ${getStatusClass(value)}`}>
          {value || 'Sin iniciar'}
        </div>
      );
    }

    // Handle user/person type (Encargado field)
    if (column === 'Encargado') {
      // Check if value is an array of user objects
      if (Array.isArray(value) && value.length > 0) {
        const user = value[0];
        return (
          <div className="notion-td-content">
            {user.name || user.person?.email || 'Sin asignar'}
          </div>
        );
      }
      // Handle single user object
      if (value.person) {
        return (
          <div className="notion-td-content">
            {value.name || value.person.email || 'Sin asignar'}
          </div>
        );
      }
      // Handle string value (email)
      if (typeof value === 'string') {
        return <div className="notion-td-content">{value}</div>;
      }
      return <div className="notion-td-content">Sin asignar</div>;
    }

    // Handle date fields
    if (column === 'Fecha límite') {
      return <div className="notion-td-content">{formatDate(value)}</div>;
    }

    // Handle regular string values
    if (typeof value === 'string') {
      return <div className="notion-td-content">{value}</div>;
    }

    // For any other type of value, convert to string
    return <div className="notion-td-content">{String(value)}</div>;
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
    if (!status) return 'status-sin-iniciar';
    
    // Normalize the status string by removing extra spaces and converting to lowercase
    const normalizedStatus = status.trim().toLowerCase();
    
    // Map of normalized status values to their corresponding classes
    const statusClasses = {
      'listo': 'status-listo',
      'en progreso': 'status-en-progreso',
      'sin iniciar': 'status-sin-iniciar'
    };
    
    return statusClasses[normalizedStatus] || 'status-sin-iniciar';
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      console.log('Deleting task:', taskId);
      setIsDeleting(true);
      
      const response = await fetch(`${API_BASE_URL}/notion/delete-task/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      // Try to parse JSON response
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Failed to delete task');
      }

      console.log('Delete successful:', responseData);
      await fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError(error.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add handleTaskSave function
  const handleTaskSave = async (taskData) => {
    try {
      if (taskData.isNew) {
        // For new tasks, send properties directly to create-task endpoint
        console.log('Creating new task with properties:', taskData.properties);

        const response = await fetch(`${API_BASE_URL}/notion/create-task`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties: taskData.properties }),
        });

        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData.message || responseData.error || 'Failed to create task');
        }

        // Fetch tasks only once after successful creation
        await fetchTasks();
        
        // Close modal only after successful save
        setIsTaskModalOpen(false);
        setSelectedTask(null);
      } else {
        // For existing tasks, send updates one by one
        console.log('Updating existing task with data:', taskData);
        
        for (const update of taskData.updates) {
          const config = PROPERTY_CONFIGS[update.column];
          if (!config) {
            console.warn('No config found for column:', update.column);
            continue;
          }

          console.log('Processing update:', {
            column: update.column,
            value: update.value,
            config: config
          });
          
          const requestBody = {
            taskId: update.taskId,
            column: update.column,
            value: update.value,
            propertyType: config.type
          };
          
          console.log('Sending request to update-cell:', requestBody);
          
          const response = await fetch(`${API_BASE_URL}/notion/update-cell`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          const responseData = await response.json();
          console.log('Update response:', responseData);

          if (!response.ok) {
            console.error('Update failed:', {
              request: requestBody,
              response: responseData
            });
            throw new Error(responseData.message || responseData.error || 'Failed to update task');
          }
        }
        
        // Fetch tasks only once after all updates are complete
        await fetchTasks();
        
        // Close modal only after successful save
        setIsTaskModalOpen(false);
        setSelectedTask(null);
      }
    } catch (error) {
      console.error('Error saving task:', error);
      throw error;
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
                onClick={() => {
                  setSelectedTask(null);
                  setIsTaskModalOpen(true);
                }} 
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
                <tr 
                  key={task.id || index} 
                  className="notion-tr"
                  onClick={() => {
                    setSelectedTask(task);
                    setIsTaskModalOpen(true);
                  }}
                >
                  {TABLE_COLUMNS.map((column, colIndex) => (
                    <td 
                      key={`${task.id}-${column.key}`} 
                      className={`notion-td ${column.key === 'Status' ? getStatusClass(task[column.key]) : ''} ${colIndex === 0 ? 'titlecolumn' : ''}`}
                    >
                      {renderCell(task, column.key)}
                    </td>
                  ))}
                  <td className="notion-td notion-actions-cell">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                      className="notion-button delete"
                      disabled={isDeleting}
                      title="Delete task"
                    >
                      {isDeleting ? '...' : '✕'}
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

        <TaskModal
          task={selectedTask}
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setSelectedTask(null);
          }}
          onSave={handleTaskSave}
          notionUsers={notionUsers}
        />
      </div>
    </NotionErrorBoundary>
  );
};

export default NotionComponent; 