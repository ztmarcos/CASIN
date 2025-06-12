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



const Drive = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [folderStack, setFolderStack] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_FOLDER_ID);
  const [searchTerm, setSearchTerm] = useState('');

  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Test Google Drive connection
  const testConnection = async () => {
    try {
      console.log('🔍 Testing Google Drive connection...');
      const response = await axios.get(`${API_URL}/drive/test`);
      console.log('📡 Drive test response:', response.data);
      
      if (response.data.connected) {
        setConnectionStatus('connected');
        return true;
      } else {
        setConnectionStatus('disconnected');
        setError('Google Drive no está configurado correctamente');
        return false;
      }
    } catch (error) {
      console.error('❌ Drive connection test failed:', error);
      setConnectionStatus('error');
      setError(`Error de conexión: ${error.message}`);
      return false;
    }
  };

  // Fetch files from Google Drive
  const fetchFiles = async (folderId = currentFolderId) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`📂 Fetching files from folder: ${folderId}`);
      console.log(`🎯 Current folder ID: ${currentFolderId}`);
      console.log(`📋 Folder stack:`, folderStack);
      
      const response = await axios.get(`${API_URL}/drive/files`, {
        params: { folderId }
      });
      
      console.log('📁 Drive API response:', response.data);
      
      if (response.data.success) {
        const fetchedFiles = response.data.files || [];
        console.log(`✅ Successfully fetched ${fetchedFiles.length} files`);
        console.log('📄 Files:', fetchedFiles.map(f => ({ name: f.name, type: f.mimeType })));
        
        setFiles(fetchedFiles);
        setConnectionStatus('connected');
      } else {
        console.error('❌ API error:', response.data.message);
        setError(response.data.message || 'Error al cargar archivos');
        setFiles([]);
      }
    } catch (error) {
      console.error('❌ Error fetching files:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(`Error al cargar archivos: ${error.message}`);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to folder
  const navigateToFolder = (file) => {
    console.log('🗂️ Navigating to folder:', file);
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      console.log('✅ Valid folder, updating state...');
      
      // Check if we're already in this folder
      if (currentFolderId === file.id) {
        console.log('⚠️ Already in this folder, ignoring click');
        return;
      }
      
      // Update folder stack first
      const newStack = [...folderStack, { id: file.id, name: file.name }];
      console.log('📁 New folder stack:', newStack);
      setFolderStack(newStack);
      
      // Then update current folder ID (this will trigger useEffect to fetch files)
      console.log('🆔 Setting new folder ID:', file.id);
      setCurrentFolderId(file.id);
    } else {
      console.log('❌ Not a folder:', file.mimeType);
    }
  };

  // Navigate back in breadcrumb
  const navigateBack = (index) => {
    console.log('🔙 Navigating back, index:', index);
    console.log('📁 Current folder stack:', folderStack);
    
    if (index === null) {
      // Go to root
      console.log('🏠 Going to root folder');
      setFolderStack([]);
      setCurrentFolderId(ROOT_FOLDER_ID);
    } else {
      // Go to specific folder in stack
      const newStack = folderStack.slice(0, index + 1);
      console.log('📁 New folder stack after navigation:', newStack);
      setFolderStack(newStack);
      setCurrentFolderId(newStack[newStack.length - 1].id);
      console.log('🆔 New current folder ID:', newStack[newStack.length - 1].id);
    }
  };



  // Filter files based on search term
  const filteredFiles = useMemo(() => {
    if (!searchTerm.trim()) return files;
    
    return files.filter(file =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Initial load
  useEffect(() => {
    const initializeDrive = async () => {
      console.log('🚀 Initializing Drive component...');
      const isConnected = await testConnection();
      if (isConnected) {
        console.log('🎯 Loading initial files...');
        await fetchFiles(ROOT_FOLDER_ID);
      }
    };
    
    initializeDrive();
  }, []);

  // Fetch files when folder changes
  useEffect(() => {
    console.log('🔄 useEffect triggered - currentFolderId changed:', currentFolderId);
    console.log('🔗 Connection status:', connectionStatus);
    
    if (connectionStatus === 'connected') {
      console.log('📥 Calling fetchFiles with:', currentFolderId);
      fetchFiles(currentFolderId);
    } else {
      console.log('⚠️ Not fetching files - connection status is:', connectionStatus);
    }
  }, [currentFolderId]);

  if (connectionStatus === 'checking') {
    return (
      <div className="drive-container">
        <div className="drive-header">
          <h2>📁 Google Drive</h2>
          <div className="status-badge checking">
            🔄 Verificando conexión...
          </div>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
    return (
      <div className="drive-container">
        <div className="drive-header">
          <h2>📁 Google Drive</h2>
          <div className="status-badge error">
            ❌ Sin conexión
          </div>
        </div>
        
        <div className="error-message">
          <h3>⚠️ Google Drive no disponible</h3>
          <p>{error || 'No se pudo conectar con Google Drive'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            🔄 Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="drive-container">
      <div className="drive-header">
        <h2>📁 Google Drive</h2>
        <div className="status-badge connected">
          ✅ Conectado
        </div>
      </div>

      <div className="drive-controls">
        <BreadcrumbPath 
          folderStack={folderStack} 
          onNavigate={navigateBack}
        />
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar archivos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">🔄</div>
          <p>Cargando archivos...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>❌ {error}</p>
          <button onClick={() => fetchFiles()} className="retry-button">
            🔄 Reintentar
          </button>
        </div>
      ) : (
        <div className="files-container">
          {filteredFiles.length === 0 ? (
            <div className="empty-folder">
              <p>📂 {searchTerm ? 'No se encontraron archivos' : 'Carpeta vacía'}</p>
            </div>
          ) : (
            <div className="files-grid">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`file-item ${file.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file'}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ File item clicked:', {
                      name: file.name,
                      id: file.id,
                      mimeType: file.mimeType,
                      isFolder: file.mimeType === 'application/vnd.google-apps.folder'
                    });
                    
                    if (file.mimeType === 'application/vnd.google-apps.folder') {
                      console.log('🗂️ This is a folder, calling navigateToFolder...');
                      navigateToFolder(file);
                    } else {
                      console.log('📄 This is a file, opening in new tab...');
                      window.open(file.webViewLink, '_blank');
                    }
                  }}
                >
                  <div className="file-icon">
                    <FileIcon mimeType={file.mimeType} />
                  </div>
                  <div className="file-info">
                    <div className="file-name" title={file.name}>
                      {file.name}
                    </div>
                    <div className="file-details">
                      {file.mimeType !== 'application/vnd.google-apps.folder' && (
                        <span className="file-size">{formatFileSize(file.size)}</span>
                      )}
                      <span className="file-date">{formatDate(file.modifiedTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


    </div>
  );
};

export default Drive;