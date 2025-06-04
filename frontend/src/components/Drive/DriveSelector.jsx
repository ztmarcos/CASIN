import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../../config/api.js';
import './DriveSelector.css';

const ROOT_FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID || '1rDGEXJg-8fssJ_atzDNHeJr6BouwGCCo';

const DriveSelector = ({ isOpen, onClose, onFolderSelect, selectedFolderId }) => {
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderStack, setFolderStack] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen, currentFolder]);

  const fetchFolders = async (folderId = null) => {
    try {
      setLoading(true);
      setError(null);
      const targetFolderId = folderId || ROOT_FOLDER_ID;
      
      const response = await axios.get(`${API_URL}/api/drive/files`, {
        params: {
          folderId: targetFolderId,
          fields: 'files(id, name, mimeType)'
        }
      });
      
      // Filter only folders
      const folderList = response.data.files.filter(file => 
        file.mimeType === 'application/vnd.google-apps.folder'
      );
      
      setFolders(folderList);
    } catch (error) {
      console.error('Error fetching folders:', error);
      setError('Error al cargar las carpetas');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = async (folder) => {
    setFolderStack([...folderStack, { id: currentFolder, name: folder.name }]);
    setCurrentFolder(folder.id);
  };

  const handleBackClick = () => {
    if (folderStack.length > 0) {
      const newStack = [...folderStack];
      const previousFolder = newStack.pop();
      setFolderStack(newStack);
      setCurrentFolder(previousFolder?.id || null);
    }
  };

  const handleSelectFolder = () => {
    const folderId = currentFolder || ROOT_FOLDER_ID;
    const folderName = folderStack.length > 0 
      ? folderStack[folderStack.length - 1].name 
      : 'Carpeta Principal';
    
    onFolderSelect({
      id: folderId,
      name: folderName,
      path: folderStack.map(f => f.name).join(' > ')
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="drive-selector-overlay" onClick={onClose}>
      <div className="drive-selector-modal" onClick={e => e.stopPropagation()}>
        <div className="drive-selector-header">
          <h3>Seleccionar Carpeta de Drive</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="drive-selector-body">
          {error && (
            <div className="error-message">
              <span>⚠️ {error}</span>
            </div>
          )}
          
          <div className="folder-navigation">
            <button 
              onClick={handleBackClick} 
              disabled={!currentFolder || loading}
              className="back-button"
            >
              ← Atrás
            </button>
            <div className="current-path">
              <span>📁 Inicio</span>
              {folderStack.map((folder, index) => (
                <span key={index}>
                  <span className="path-separator"> › </span>
                  <span>{folder.name}</span>
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <span>🔄 Cargando carpetas...</span>
            </div>
          ) : (
            <div className="folders-list">
              {folders.length === 0 ? (
                <div className="empty-state">
                  <span>📂 No hay subcarpetas en esta ubicación</span>
                </div>
              ) : (
                folders.map(folder => (
                  <div 
                    key={folder.id} 
                    className="folder-item"
                    onClick={() => handleFolderClick(folder)}
                  >
                    <span className="folder-icon">📁</span>
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-arrow">›</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="drive-selector-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="select-btn" 
            onClick={handleSelectFolder}
            disabled={loading}
          >
            Seleccionar Esta Carpeta
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriveSelector; 