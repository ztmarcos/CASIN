import React, { useState, useCallback, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

// Use relative path for API requests to leverage Vite proxy
const API_URL = '/api';

const NotionComponent = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  // Enhanced debugging with frontend port information
  const logDebug = (message, data) => {
    console.group('NotionComponent Debug');
    console.log('Frontend Port:', window.location.port);
    console.log('API Base URL:', API_URL);
    console.log(message);
    if (data) console.log(JSON.stringify(data, null, 2));
    console.groupEnd();
  };

  const getStatusColor = (status) => {
    if (!status || status === 'No Status') return {};
    
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block'
    };

    switch (status.toLowerCase()) {
      case 'completed':
      case 'completado':
      case 'done':
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#065f46' : '#d1fae5',
          color: isDark ? '#34d399' : '#065f46'
        };
      case 'in progress':
      case 'en progreso':
      case 'doing':
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#854d0e' : '#fef3c7',
          color: isDark ? '#fbbf24' : '#854d0e'
        };
      case 'not started':
      case 'no iniciado':
      case 'to do':
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#1e40af' : '#dbeafe',
          color: isDark ? '#60a5fa' : '#1e40af'
        };
      case 'blocked':
      case 'bloqueado':
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#991b1b' : '#fee2e2',
          color: isDark ? '#f87171' : '#991b1b'
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#374151' : '#f3f4f6',
          color: isDark ? '#9ca3af' : '#374151'
        };
    }
  };

  const getPriorityColor = (priority) => {
    if (!priority || priority === 'No Priority') return {};
    
    const baseStyle = {
      padding: '4px 8px',
      borderRadius: '4px',
      display: 'inline-block'
    };

    switch (priority.toLowerCase()) {
      case 'high':
      case 'alta':
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#991b1b' : '#fee2e2',
          color: isDark ? '#f87171' : '#991b1b'
        };
      case 'medium':
      case 'media':
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#854d0e' : '#fef3c7',
          color: isDark ? '#fbbf24' : '#854d0e'
        };
      case 'low':
      case 'baja':
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#065f46' : '#d1fae5',
          color: isDark ? '#34d399' : '#065f46'
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: isDark ? '#374151' : '#f3f4f6',
          color: isDark ? '#9ca3af' : '#374151'
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const fetchNotionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fullUrl = `${API_URL}/notion/tasks`;
      console.log('🔍 Fetching Notion tasks', {
        fullUrl,
        apiUrl: API_URL,
        windowLocation: {
          href: window.location.href,
          origin: window.location.origin,
          port: window.location.port
        }
      });
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Fetch Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        contentType: response.headers.get('content-type')
      });
      
      if (!response.ok) {
        const errorData = await response.text().catch(() => 'No error details');
        console.error('❌ Fetch Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        const errorMessage = `HTTP error! status: ${response.status}. Details: ${errorData}`;
        throw new Error(errorMessage);
      }
      
      const responseData = await response.json();
      
      // Validate response data
      if (!Array.isArray(responseData)) {
        console.warn('🚨 Invalid response format:', {
          type: typeof responseData,
          data: JSON.stringify(responseData, null, 2)
        });
        throw new Error('Invalid response format. Expected an array of tasks.');
      }
      
      console.log('✅ Fetched Notion tasks:', {
        taskCount: responseData?.length || 0,
        firstTask: responseData?.[0] ? JSON.stringify(responseData[0], null, 2) : 'No tasks',
        fullResponse: JSON.stringify(responseData, null, 2)
      });
      
      // Filter out invalid tasks with more comprehensive validation
      const validTasks = responseData.filter(task => {
        const isValid = task && 
          typeof task === 'object' && 
          task.id &&
          task.title &&
          typeof task.title === 'string' &&
          task.title.trim() !== '';
        
        if (!isValid) {
          console.warn('🚫 Invalid Task:', {
            id: task?.id,
            hasTitle: !!task?.title,
            titleType: typeof task?.title,
            titleLength: task?.title?.trim().length,
            rawTask: JSON.stringify(task, null, 2)
          });
        }
        
        return isValid;
      });
      
      console.log('✅ Valid Tasks:', {
        total: validTasks.length,
        tasks: validTasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status
        }))
      });
      
      setData(validTasks);
      
      if (validTasks.length !== responseData.length) {
        console.warn('🚨 Task Validation Summary:', {
          totalTasks: responseData.length,
          validTasks: validTasks.length,
          invalidTasks: responseData.length - validTasks.length,
          firstInvalidTask: responseData.find(task => !validTasks.includes(task))
        });
      }
    } catch (err) {
      console.error('🚨 Comprehensive Notion Fetch Error:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      
      const errorMessage = err.message.includes('Failed to fetch') 
        ? 'Network error: Unable to connect to the server' 
        : err.message;
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on component mount
  useEffect(() => {
    fetchNotionData();
  }, [fetchNotionData]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = useCallback(() => {
    if (!data) return [];
    const sortedData = [...data];
    if (sortConfig.key) {
      sortedData.sort((a, b) => {
        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';
        
        if (sortConfig.key === 'dueDate') {
          aVal = aVal ? new Date(aVal).getTime() : 0;
          bVal = bVal ? new Date(bVal).getTime() : 0;
        }
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortedData;
  }, [data, sortConfig]);

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'monospace',
    backgroundColor: isDark ? '#1f2937' : '#ffffff'
  };

  const thStyle = {
    borderBottom: isDark ? '2px solid #4b5563' : '2px solid #ccc',
    padding: '12px 8px',
    textAlign: 'left',
    color: isDark ? '#e5e7eb' : '#111827',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer'
  };

  const tdStyle = {
    padding: '8px',
    borderBottom: isDark ? '1px solid #374151' : '1px solid #eee',
    color: isDark ? '#e5e7eb' : '#111827',
    fontSize: '0.875rem'
  };

  const linkStyle = {
    color: isDark ? '#60a5fa' : '#2563eb',
    textDecoration: 'none'
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ 
          margin: 0, 
          color: isDark ? '#e5e7eb' : '#111827',
          fontSize: '1.5rem',
          fontWeight: '600'
        }}>
          Tareas de Notion
        </h2>
        <button
          onClick={fetchNotionData}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: isDark ? 'none' : '1px solid #e5e7eb',
            backgroundColor: isDark ? '#374151' : '#ffffff',
            color: isDark ? '#e5e7eb' : '#111827',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          marginBottom: '16px',
          borderRadius: '6px',
          backgroundColor: isDark ? 'rgba(220, 38, 38, 0.1)' : '#fee2e2',
          color: isDark ? '#fca5a5' : '#991b1b'
        }}>
          {error}
        </div>
      )}

      <table style={tableStyle}>
        <thead>
          <tr>
            {[
              { key: 'title', label: 'Tarea' },
              { key: 'status', label: 'Estado' },
              { key: 'priority', label: 'Prioridad' },
              { key: 'dueDate', label: 'Fecha' },
              { key: 'assignee', label: 'Asignado' },
              { key: 'description', label: 'Descripción' },
              { key: 'taskType', label: 'Tipo' }
            ].map((column) => (
              <th 
                key={column.key}
                style={thStyle}
                onClick={() => requestSort(column.key)}
              >
                {column.label} {sortConfig.key === column.key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" style={{ ...tdStyle, textAlign: 'center' }}>
                Cargando tareas...
              </td>
            </tr>
          ) : getSortedData().length === 0 ? (
            <tr>
              <td colSpan="7" style={{ ...tdStyle, textAlign: 'center' }}>
                No hay tareas disponibles
              </td>
            </tr>
          ) : (
            getSortedData().map((task) => (
              <tr key={task.id}>
                <td style={tdStyle}>
                  <a 
                    href={task.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={linkStyle}
                  >
                    {task.title || 'Sin título'}
                  </a>
                </td>
                <td style={tdStyle}>
                  <span style={getStatusColor(task.status)}>
                    {task.status || 'Sin estado'}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={getPriorityColor(task.priority)}>
                    {task.priority || 'Sin prioridad'}
                  </span>
                </td>
                <td style={tdStyle}>{formatDate(task.dueDate) || 'Sin fecha'}</td>
                <td style={tdStyle}>{task.assignee || 'Sin asignar'}</td>
                <td style={tdStyle}>
                  <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.description || 'Sin descripción'}
                  </div>
                </td>
                <td style={tdStyle}>{task.taskType || 'Sin tipo'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default NotionComponent; 