import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Dashboard
        </NavLink>
        <NavLink 
          to="/data" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Data
        </NavLink>
        <NavLink 
          to="/sharepoint" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Sharepoint
        </NavLink>
        <NavLink 
          to="/testgpt" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Test GPT
        </NavLink>
        <NavLink 
          to="/reports" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Reports
        </NavLink>
        <NavLink 
          to="/birthdays" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Birthdays
        </NavLink>
        <NavLink 
          to="/drive" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Drive
        </NavLink>
        <NavLink 
          to="/datapool" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Data Pool
        </NavLink>
        <NavLink 
          to="/prospeccion" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          Prospección
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar; 