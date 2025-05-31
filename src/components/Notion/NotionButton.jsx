import React, { useState } from 'react';
import NotionComponent from './NotionComponent';

const NotionButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notion-button"
        title="Notion Integration"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="nav-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <path d="M4 10h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="notion-popup">
          <div className="notion-popup-content">
            <button 
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
            <NotionComponent />
          </div>
        </div>
      )}
    </>
  );
};

export default NotionButton; 