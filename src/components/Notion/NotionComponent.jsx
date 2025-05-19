import React, { useState, useCallback, useEffect } from 'react';

// Use relative path for API requests to leverage Vite proxy
const API_URL = '/api';

const NotionComponent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
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
    if (!status || status === 'No Status') return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'completed':
      case 'completado':
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'in progress':
      case 'en progreso':
      case 'doing':
        return 'bg-yellow-100 text-yellow-800';
      case 'not started':
      case 'no iniciado':
      case 'to do':
        return 'bg-blue-100 text-blue-800';
      case 'blocked':
      case 'bloqueado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    if (!priority || priority === 'No Priority') return 'text-gray-500';
    
    switch (priority.toLowerCase()) {
      case 'high':
      case 'alta':
        return 'text-red-600';
      case 'medium':
      case 'media':
        return 'text-yellow-600';
      case 'low':
      case 'baja':
        return 'text-green-600';
      default:
        return 'text-gray-500';
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

  const TaskTable = ({ tasks }) => {
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <a href={task.url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:text-blue-800 hover:underline">
                    {task.title}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${task.status === 'In progress' ? 'bg-yellow-100 text-yellow-800' : 
                      task.status === 'Not started' ? 'bg-red-100 text-red-800' : 
                      task.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {task.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${task.priority === 'High' ? 'bg-red-100 text-red-800' : 
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                      task.priority === 'Low' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {task.priority || 'No Priority'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {task.dueDate || 'No date'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {task.assignee || 'Unassigned'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                  {task.description || 'No description'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Notion Tasks</h2>
          <button
            onClick={fetchNotionData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Refresh Tasks
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 p-4 rounded" role="alert">
            <p className="font-bold text-red-700">Error</p>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : data && data.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignee</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a href={task.url} target="_blank" rel="noopener noreferrer" 
                           className="text-blue-600 hover:text-blue-800 hover:underline">
                          {task.title || 'Untitled'}
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(task.status)}`}>
                          {task.status || 'No Status'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          task.priority === 'High' ? 'bg-red-100 text-red-800' : 
                          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 
                          task.priority === 'Low' ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.priority || 'No Priority'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(task.dueDate) || 'No date'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {task.assignee || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="max-w-xs truncate">
                          {task.description || 'No description'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No tasks found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotionComponent; 