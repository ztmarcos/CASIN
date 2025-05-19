import React, { useEffect, useState } from 'react';
import NotionDebugger from './NotionDebugger';

const NotionComponent = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        console.log('🔍 Fetching Notion tasks...');

        const response = await fetch('/api/notion/tasks', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch tasks');
        }

        const data = await response.json();
        console.log('✅ Fetched tasks:', data);

        if (!data.success) {
          throw new Error(data.error || 'Invalid response format');
        }

        setTasks(data.tasks);
      } catch (err) {
        console.error('❌ Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  return (
    <div className="notion-container">
      <h1>Notion Integration</h1>

      {/* Main Content */}
      <div className="tasks-container">
        {loading && <div className="loading">Loading tasks...</div>}
        
        {error && (
          <div className="error-message">
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <h2>Tasks ({tasks.length})</h2>
            <div className="tasks-grid">
              {tasks.map(task => (
                <div key={task.id} className="task-card">
                  <h3>{task.title || 'Untitled'}</h3>
                  <p>Created: {new Date(task.createdTime).toLocaleDateString()}</p>
                  {task.url && (
                    <a href={task.url} target="_blank" rel="noopener noreferrer">
                      View in Notion
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Debug Panel */}
      <details className="debug-panel">
        <summary>🔍 Debug Information</summary>
        <NotionDebugger />
      </details>

      <style jsx>{`
        .notion-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .tasks-container {
          margin: 20px 0;
        }
        .loading {
          text-align: center;
          padding: 20px;
          color: #666;
        }
        .error-message {
          background: #fee;
          color: #c00;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        }
        .tasks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .task-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .task-card h3 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .task-card a {
          color: #0066cc;
          text-decoration: none;
        }
        .task-card a:hover {
          text-decoration: underline;
        }
        .debug-panel {
          margin: 20px 0;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 10px;
        }
        summary {
          cursor: pointer;
          padding: 10px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default NotionComponent; 