import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { useTheme } from '../../context/ThemeContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="layout theme-transition">
      <header className="top-bar">
        <div className="logo">
          <span className="logo-text">CRM</span>
          <span className="logo-version">v1.0</span>
        </div>
        
        <div className="search-bar">
          <input type="text" placeholder="Search..." />
          <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="user-profile">
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>
          <div className="user-info">
            <span className="user-name">John Doe</span>
            <span className="user-status">Online</span>
          </div>
          <div className="user-avatar">JD</div>
        </div>
      </header>

      <div className="main-container">
        <Sidebar />
        <main className="main-content">
          <div className="content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 