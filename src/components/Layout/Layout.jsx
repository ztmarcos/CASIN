import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="layout">
      <div className="top-bar">
        <div className="logo">
          <span className="logo-text">Dashboard</span>
          <span className="logo-version">v1.0</span>
        </div>
        <div className="top-bar-right">
          <div className="search-bar">
            <input type="text" placeholder="Search..." />
          </div>
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? '☾' : '☀'}
          </button>
        </div>
      </div>
      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 