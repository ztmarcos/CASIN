import React from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const menuSections = [
    {
      title: "Main",
      items: [
        {
          path: "/",
          icon: "⌂",
          label: "Dashboard"
        },
        {
          path: "/data",
          icon: "≡",
          label: "Data"
        },
        {
          path: "/reports",
          icon: "△",
          label: "Reports"
        }
      ]
    },
    {
      title: "Tools",
      items: [
        {
          path: "/datapool",
          icon: "⌘",
          label: "Data Pool"
        },
        {
          path: "/drive",
          icon: "⌹",
          label: "Drive"
        },
        {
          path: "/sharepoint",
          icon: "⌗",
          label: "Sharepoint"
        }
      ]
    },
    {
      title: "AI Tools",
      items: [
        {
          path: "/test-gpt",
          icon: "∆",
          label: "Test GPT"
        }
      ]
    },
    {
      title: "Other",
      items: [
        {
          path: "/birthdays",
          icon: "★",
          label: "Cumpleaños"
        },
        {
          path: "/prospeccion",
          icon: "→",
          label: "Prospección"
        }
      ]
    }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">Navigation</div>
      </div>
      
      <nav className="sidebar-nav">
        {menuSections.map((section, index) => (
          <div key={index} className="nav-section">
            <div className="section-title">{section.title}</div>
            <ul className="nav-items">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <NavLink 
                    to={item.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="version">v1.0.0</div>
      </div>
    </div>
  );
};

export default Sidebar; 