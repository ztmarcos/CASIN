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
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderStack, setFolderStack] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  const fetchFiles = async (folderId = null) => {
    try {
      setLoading(true);
      setError(null);
      const targetFolderId = folderId || ROOT_FOLDER_ID;
      console.log('Obteniendo archivos de:', targetFolderId);
      
      const response = await axios.get(`${API_URL}/api/drive/files`, {
        params: {
          folderId: targetFolderId,
          fields: 'files(id, name, mimeType, webViewLink)'
        }
      });
      
      if (!response.data.files) {
        console.warn('No hay array de archivos en la respuesta:', response.data);
        setError('Formato de respuesta inválido del servidor');
        setFiles([]);
        return;
      }
      
      const processedFiles = response.data.files.map(file => ({
        ...file,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      }));

      if (processedFiles.length === 1 && !processedFiles[0].isFolder) {
        setError(`"${processedFiles[0].name}" es un archivo, no una carpeta. Puedes verlo haciendo clic en él.`);
      } else if (processedFiles.length === 0) {
        setError('No se encontraron archivos. La carpeta podría estar vacía o no tienes acceso a ella.');
      }
      
      setFiles(processedFiles);
    } catch (error) {
      console.error('Detalles del error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.error || 'Error al obtener los archivos. Por favor, asegúrate de que la cuenta de servicio tiene acceso.');
    } finally {
      setLoading(false);
    }
  };

  // Memoized filtered files based on search term
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    return files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  const testGoogleDrive = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Probando conexión con Google Drive...');
      
      const response = await axios.get(`${API_URL}/api/drive/test`);
      console.log('Respuesta completa del test:', response.data);
      
      setConnectionStatus(response.data.status);
      
      if (response.data.status === 'Connected') {
        console.log('Conexión exitosa, obteniendo archivos raíz...');
        await fetchFiles();
      } else {
        console.warn('Conectado pero el estado no es "Connected":', response.data.status);
        setError('Estado de conexión inesperado');
      }
    } catch (error) {
      console.error('Detalles del error de Drive:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.error || 'Error al conectar con Google Drive');
      setConnectionStatus('Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Test connection and fetch files when component mounts
    testGoogleDrive();
  }, []);

  useEffect(() => {
    // Fetch files whenever currentFolder changes
    if (connectionStatus === 'Connected') {
      fetchFiles(currentFolder);
    }
  }, [currentFolder, connectionStatus]);

  const handleFolderClick = async (folder) => {
    setFolderStack([...folderStack, { id: currentFolder, name: folder.name }]);
    setCurrentFolder(folder.id);
    await fetchFiles(folder.id);
  };

  const handleBackClick = async () => {
    if (folderStack.length > 0) {
      const newStack = [...folderStack];
      const previousFolder = newStack.pop();
      setFolderStack(newStack);
      setCurrentFolder(previousFolder?.id || null);
      await fetchFiles(previousFolder?.id || null);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      
      // Normalize folder name
      const normalizedName = newFolderName.trim();
      
      await axios.post(`${API_URL}/api/drive/folders`, {
        name: normalizedName,
        parentId: currentFolder || ROOT_FOLDER_ID
      });
      
      // Clear input and close modal
      setNewFolderName('');
      setShowCreateFolderModal(false);
      
      // Refresh the current folder's contents
      await fetchFiles(currentFolder);
      
    } catch (error) {
      console.error('Error al crear carpeta:', error);
      setError(error.response?.data?.error || 'Error al crear la carpeta. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${API_URL}/api/drive/files/${selectedFile.id}`);
      setShowDeleteModal(false);
      setSelectedFile(null);
      fetchFiles(currentFolder);
    } catch (error) {
      setError('Failed to delete file');
      console.error('Error deleting file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newFileName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await axios.patch(`${API_URL}/api/drive/files/${selectedFile.id}`, {
        name: newFileName
      });
      setShowRenameModal(false);
      setSelectedFile(null);
      setNewFileName('');
      fetchFiles(currentFolder);
    } catch (error) {
      setError('Failed to rename file');
      console.error('Error renaming file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', currentFolder || ROOT_FOLDER_ID);

      const response = await fetch(`${API_URL}/api/drive/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      await fetchFiles(currentFolder);
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
      // Reset the input to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="drive-container">
      <div className="drive-header">
        <h2>
          <span className="header-icon">📂</span>
          Drive
        </h2>
        <div className="header-actions">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Buscar archivos..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="search-clear" 
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="upload-input"
            onChange={handleFileUpload}
            disabled={loading}
          />
          <button 
            className="upload-button" 
            onClick={handleUploadClick}
            disabled={loading}
            title="Subir un archivo a la carpeta actual"
          >
            <span className="button-icon">📤</span>
            {loading ? 'Subiendo...' : 'Subir'}
          </button>
          <button 
            onClick={() => setShowCreateFolderModal(true)} 
            className="create-folder-button"
            disabled={loading || !connectionStatus}
            title="Crear una nueva carpeta"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="folder-navigation">
        <button 
          onClick={handleBackClick} 
          disabled={!currentFolder || loading}
          className="back-button"
          title="Volver a la carpeta anterior"
        >
          ←
        </button>
        <BreadcrumbPath 
          folderStack={folderStack} 
          onNavigate={(index) => {
            if (index === null) {
              setCurrentFolder(null);
              setFolderStack([]);
              fetchFiles();
            } else {
              const newStack = folderStack.slice(0, index + 1);
              setFolderStack(newStack);
              setCurrentFolder(newStack[index].id);
            }
          }}
        />
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="loading-icon">🔄</span>
          <span>Cargando archivos...</span>
        </div>
      ) : filteredFiles.length > 0 ? (
        <div className="files-grid">
          {filteredFiles.map((file) => (
            <div 
              key={file.id} 
              className={`file-item ${file.isFolder ? 'folder' : ''}`}
            >
              <div className="file-actions">
                <button 
                  className="action-button edit"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(file);
                    setNewFileName(file.name);
                    setShowRenameModal(true);
                  }}
                  title="Renombrar"
                >
                  ✏️
                </button>
                <button 
                  className="action-button delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(file);
                    setShowDeleteModal(true);
                  }}
                  title="Eliminar"
                >
                  🗑️
                </button>
              </div>
              <div 
                className="file-content"
                onClick={(e) => {
                  e.stopPropagation();
                  if (file.isFolder) {
                    handleFolderClick(file);
                  } else if (file.webViewLink) {
                    window.open(file.webViewLink, '_blank');
                  }
                }}
                title={file.isFolder ? 'Abrir carpeta' : 'Ver archivo'}
              >
                <div className="file-icon">
                  <FileIcon mimeType={file.mimeType} />
                </div>
                <div className="file-details">
                  <div className="file-name">
                    {file.name}
                  </div>
                  <div className="file-type">
                    {file.isFolder ? 'Carpeta' : file.mimeType.split('/').pop().replace('vnd.google-apps.', '')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {connectionStatus === 'Connected' ? (
            <>
              <span className="empty-icon">📂</span>
              <span>
                {searchTerm 
                  ? `No se encontraron archivos que coincidan con "${searchTerm}"` 
                  : 'No hay archivos en esta carpeta'
                }
              </span>
            </>
          ) : (
            <>
              <span className="empty-icon">🔌</span>
              <span>Conecta con Google Drive para ver los archivos</span>
            </>
          )}
        </div>
      )}

      {showDeleteModal && (
        <Modal
          title="Confirmar Eliminación"
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedFile(null);
          }}
          actions={
            <>
              <button 
                className="modal-button cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedFile(null);
                }}
              >
                Cancelar
              </button>
              <button 
                className="modal-button delete"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </>
          }
        >
          <p>¿Estás seguro de que quieres eliminar "{selectedFile?.name}"?</p>
          <p className="warning-text">Esta acción no se puede deshacer.</p>
        </Modal>
      )}

      {showRenameModal && (
        <Modal
          title="Renombrar Archivo"
          onClose={() => {
            setShowRenameModal(false);
            setSelectedFile(null);
            setNewFileName('');
          }}
          actions={
            <>
              <button 
                className="modal-button cancel"
                onClick={() => {
                  setShowRenameModal(false);
                  setSelectedFile(null);
                  setNewFileName('');
                }}
              >
                Cancelar
              </button>
              <button 
                className="modal-button confirm"
                onClick={handleRename}
                disabled={loading || !newFileName.trim()}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          }
        >
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Nuevo nombre"
            className="modal-input"
            autoFocus
          />
        </Modal>
      )}

      {showCreateFolderModal && (
        <Modal
          title="Crear Nueva Carpeta"
          onClose={() => {
            setShowCreateFolderModal(false);
            setNewFolderName('');
          }}
          actions={
            <>
              <button 
                className="modal-button cancel"
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderName('');
                }}
              >
                Cancelar
              </button>
              <button 
                className="modal-button confirm"
                onClick={handleCreateFolder}
                disabled={loading || !newFolderName.trim()}
              >
                {loading ? 'Creando...' : 'Crear'}
              </button>
            </>
          }
        >
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Nombre de la carpeta"
            className="modal-input"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newFolderName.trim() && !loading) {
                handleCreateFolder();
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default Drive;