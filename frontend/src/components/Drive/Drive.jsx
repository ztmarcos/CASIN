import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api.js';
import './Drive.css';

// Get folder ID from environment variable with fallback
const ROOT_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '1rDGEXJg-8fssJ_atzDNHeJr6BouwGCCo';

const FileIcon = ({ mimeType }) => {
  switch (mimeType) {
    case 'application/vnd.google-apps.folder':
      return '📁';
    case 'application/pdf':
      return '📄';
    case 'application/vnd.google-apps.spreadsheet':
      return '📊';
    case 'application/vnd.google-apps.document':
      return '📝';
    case 'image/jpeg':
    case 'image/png':
      return '🖼️';
    default:
      return '📎';
  }
};

const BreadcrumbPath = ({ folderStack, onNavigate }) => (
  <div className="folder-path">
    <span 
      onClick={() => onNavigate(null)} 
      className="path-item"
      title="Ir a la carpeta raíz"
    >
      <span className="icon">🏠</span>
      <span>Inicio</span>
    </span>
    {folderStack.map((folder, index) => (
      <span key={index} className="path-item">
        <span className="separator">›</span>
        <span
          onClick={() => onNavigate(index)}
          className="path-link"
          title={`Ir a ${folder.name}`}
        >
          {folder.name}
        </span>
      </span>
    ))}
  </div>
);

const Modal = ({ title, children, onClose, actions }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <span>{title}</span>
        <button className="modal-close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">{children}</div>
      <div className="modal-actions">{actions}</div>
    </div>
  </div>
);

const Drive = () => {
  return (
    <div className="drive-container">
      <div className="drive-header">
        <h2>📁 Google Drive</h2>
        <div className="status-badge maintenance">
          🔧 En mantenimiento
        </div>
      </div>
      
      <div className="maintenance-message">
        <h3>⚠️ Servicio temporalmente no disponible</h3>
        <p>Google Drive está en mantenimiento. Volverá a estar disponible pronto.</p>
        <p>Mientras tanto, puedes usar las otras funciones del CRM normalmente.</p>
      </div>
    </div>
  );
};

export default Drive;