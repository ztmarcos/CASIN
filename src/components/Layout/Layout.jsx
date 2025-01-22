import React, { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="layout">
      <div className="top-bar">
        <div className="left-section">
          <button className="toggle-sidebar" onClick={toggleSidebar}>
            <svg 
              viewBox="0 0 24 24" 
              width="24" 
              height="24" 
              stroke="currentColor" 
              strokeWidth="2" 
              fill="none"
            >
              {sidebarOpen ? (
                <path d="M19 12H5M19 6H5M19 18H5" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <div className="logo">
            <span className="logo-text">C-H</span>
            <span className="logo-version">Cambiando Historias</span>
          </div>
        </div>
        <div className="right-section">
          <div className="search-bar">
            <input type="text" placeholder="Search..." />
          </div>
          <div className="user-section">
            <span className="user-email">{user?.email}</span>
            <button className="logout-button" onClick={logout}>
              <svg 
                viewBox="0 0 24 24" 
                width="24" 
                height="24" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? (
              <svg 
                viewBox="0 0 24 24" 
                width="24" 
                height="24" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none"
              >
                <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg 
                viewBox="0 0 24 24" 
                width="24" 
                height="24" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill="none"
              >
                <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      <div className="main-container">
        <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : 'closed'}`}>
          <Sidebar />
        </div>
        <div className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout; 