import React, { useState } from 'react';
import './Data.css';

const Data = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [tables, setTables] = useState([
    'users',
    'projects',
    'tasks',
    'reports',
    'analytics'
  ]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
  };

  const handleQuerySubmit = (e) => {
    e.preventDefault();
    // Here you would typically make an API call to your backend
    console.log('Executing query:', query);
  };

  return (
    <div className="data-container">
      <div className="data-header">
        <h2>SQL Data Management</h2>
        <div className="data-stats">
          <div className="stat-item">
            <span className="stat-label">Tables</span>
            <span className="stat-value">{tables.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Last Query</span>
            <span className="stat-value">2 min ago</span>
          </div>
        </div>
      </div>

      <div className="data-content">
        <div className="data-sidebar">
          <div className="tables-list">
            <h3>Available Tables</h3>
            <ul>
              {tables.map((table, index) => (
                <li key={index} className="table-item">
                  <svg className="table-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                  {table}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="query-section">
          <div className="query-editor">
            <h3>SQL Query</h3>
            <form onSubmit={handleQuerySubmit}>
              <textarea
                value={query}
                onChange={handleQueryChange}
                placeholder="Enter your SQL query here..."
                rows={5}
                className="query-input"
              />
              <div className="query-actions">
                <button type="button" className="btn-secondary" onClick={() => setQuery('')}>
                  Clear
                </button>
                <button type="submit" className="btn-primary">
                  Execute Query
                </button>
              </div>
            </form>
          </div>

          <div className="query-results">
            <h3>Results</h3>
            <div className="results-table">
              {results.length === 0 ? (
                <div className="no-results">
                  <svg className="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No query results to display</p>
                  <p className="hint">Try running a query to see results here</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Column 1</th>
                      <th>Column 2</th>
                      <th>Column 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Data 1</td>
                      <td>Data 2</td>
                      <td>Data 3</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Data; 