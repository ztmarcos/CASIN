import React, { useState, useEffect } from 'react';
import './NotionComponent.css';

const NotionComponent = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotionTasks();
  }, []);

  const fetchNotionTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notion/raw-table');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Notion data:', data);
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch Notion tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading Notion tasks...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!tasks.length) return <div>No tasks found</div>;

  // Get column headers from the first task
  const columns = Object.keys(tasks[0]);

  return (
    <div className="notion-container">
      <h2>Notion Tasks</h2>
      <button onClick={fetchNotionTasks} className="refresh-button">
        Refresh
      </button>
      
      <table className="notion-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column} className="notion-th">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map((task, index) => (
            <tr key={task.id || index} className="notion-tr">
              {columns.map(column => (
                <td key={column} className="notion-td">
                  {task[column]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NotionComponent; 