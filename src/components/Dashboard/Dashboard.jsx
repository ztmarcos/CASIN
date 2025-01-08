import React from 'react';
import Weather from '../Weather/Weather';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      
      <div className="dashboard-grid">
        {/* Section 1 - Weather */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Weather</h3>
          </div>
          <div className="card-content">
            <Weather />
          </div>
        </div>

        {/* Section 2 - Quick Stats */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Quick Stats</h3>
          </div>
          <div className="card-content stats-grid">
            <div className="stat-item">
              <span className="stat-value">128</span>
              <span className="stat-label">Total Records</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">64</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">32</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        </div>

        {/* Section 3 - Recent Activity */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="card-content">
            <div className="activity-list">
              <div className="activity-item">
                <span className="activity-time">2m ago</span>
                <span className="activity-text">New record added</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">1h ago</span>
                <span className="activity-text">Data updated</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">3h ago</span>
                <span className="activity-text">System backup</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4 - System Status */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>System Status</h3>
          </div>
          <div className="card-content">
            <div className="status-item">
              <span className="status-label">Database</span>
              <span className="status-badge success">Online</span>
            </div>
            <div className="status-item">
              <span className="status-label">API</span>
              <span className="status-badge success">Online</span>
            </div>
            <div className="status-item">
              <span className="status-label">Storage</span>
              <span className="status-badge warning">85% Used</span>
            </div>
          </div>
        </div>

        {/* Section 5 - Quick Actions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="card-content">
            <div className="actions-grid">
              <button className="action-button">New Entry</button>
              <button className="action-button">Export</button>
              <button className="action-button">Reports</button>
              <button className="action-button">Settings</button>
            </div>
          </div>
        </div>

        {/* Section 6 - Notifications */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Notifications</h3>
          </div>
          <div className="card-content">
            <div className="notification-list">
              <div className="notification-item">
                <div className="notification-dot warning"></div>
                <span>System update available</span>
              </div>
              <div className="notification-item">
                <div className="notification-dot success"></div>
                <span>Backup completed</span>
              </div>
              <div className="notification-item">
                <div className="notification-dot error"></div>
                <span>Storage space low</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 7 - Data Summary */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Data Summary</h3>
          </div>
          <div className="card-content">
            <div className="summary-list">
              <div className="summary-item">
                <span className="summary-label">Total Tables</span>
                <span className="summary-value">12</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Records</span>
                <span className="summary-value">1,234</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Last Update</span>
                <span className="summary-value">2h ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 8 - System Resources */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>System Resources</h3>
          </div>
          <div className="card-content">
            <div className="resource-list">
              <div className="resource-item">
                <span className="resource-label">CPU Usage</span>
                <div className="progress-bar">
                  <div className="progress" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div className="resource-item">
                <span className="resource-label">Memory</span>
                <div className="progress-bar">
                  <div className="progress" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className="resource-item">
                <span className="resource-label">Disk</span>
                <div className="progress-bar">
                  <div className="progress" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 