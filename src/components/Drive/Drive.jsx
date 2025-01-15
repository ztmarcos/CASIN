import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Drive.css';

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
      title="Go to root folder"
    >
      🏠 Root
    </span>
    {folderStack.map((folder, index) => (
      <span key={index} className="path-item">
        {' › '}
        <span
          onClick={() => onNavigate(index)}
          className="path-link"
          title={`Go to ${folder.name}`}
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
      <div className="modal-header">{title}</div>
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
  const fileInputRef = useRef(null);

  const fetchFiles = async (folderId = null) => {
    try {
      setLoading(true);
      setError(null);
      const targetFolderId = folderId || '1VitMX-H-IzNpfy0uAMUnaHkh92m0NVRn';
      console.log('Fetching files from:', targetFolderId);
      
      const response = await axios.get(`http://localhost:3001/api/drive/files`, {
        params: {
          folderId: targetFolderId,
          fields: 'files(id, name, mimeType, webViewLink)'
        }
      });
      
      console.log('API Response:', {
        totalFiles: response.data.files?.length || 0,
        files: response.data.files?.map(f => ({
          name: f.name,
          type: f.mimeType,
          isFolder: f.mimeType === 'application/vnd.google-apps.folder'
        }))
      });
      
      if (!response.data.files) {
        console.warn('No files array in response:', response.data);
        setError('Invalid response format from server');
        setFiles([]);
        return;
      }
      
      const processedFiles = response.data.files.map(file => ({
        ...file,
        isFolder: file.mimeType === 'application/vnd.google-apps.folder'
      }));

      // If we got a single file that's not a folder, show a message
      if (processedFiles.length === 1 && !processedFiles[0].isFolder) {
        setError(`"${processedFiles[0].name}" is a file, not a folder. You can view it by clicking on it.`);
      } else if (processedFiles.length === 0) {
        setError('No files found. This could mean the folder is empty or you don\'t have access to it.');
      }

      console.log('Processed files:', {
        total: processedFiles.length,
        folders: processedFiles.filter(f => f.isFolder).length,
        files: processedFiles.filter(f => !f.isFolder).length
      });
      
      setFiles(processedFiles);
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.error || 'Failed to fetch files. Please ensure the service account has access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentFolder) {
      fetchFiles(currentFolder);
    }
  }, [currentFolder]);

  const testGoogleDrive = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Testing Google Drive connection...');
      
      const response = await axios.get('http://localhost:3001/api/drive/test');
      console.log('Full test response:', response.data);
      
      setConnectionStatus(response.data.status);
      
      if (response.data.status === 'Connected') {
        console.log('Connection successful, fetching root files...');
        await fetchFiles();
      } else {
        console.warn('Connected but status is not "Connected":', response.data.status);
        setError('Unexpected connection status');
      }
    } catch (error) {
      console.error('Drive test error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.error || 'Failed to connect to Google Drive');
      setConnectionStatus('Error');
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder) => {
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await axios.post('http://localhost:3001/api/drive/folders', {
        name: newFolderName,
        parentId: currentFolder
      });
      setNewFolderName('');
      fetchFiles(currentFolder);
    } catch (error) {
      setError('Failed to create folder');
      console.error('Error creating folder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`http://localhost:3001/api/drive/files/${selectedFile.id}`);
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
      await axios.patch(`http://localhost:3001/api/drive/files/${selectedFile.id}`, {
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
      formData.append('folderId', currentFolder || '1VitMX-H-IzNpfy0uAMUnaHkh92m0NVRn');

      const response = await fetch('http://localhost:3001/api/drive/upload', {
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
        <h2>📂 Google Drive Files</h2>
        <div className="header-actions">
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
            title="Upload a file to current folder"
          >
            {loading ? '🔄 Uploading...' : '📤 Upload File'}
          </button>
          <button 
            onClick={testGoogleDrive} 
            disabled={loading}
            className={`connection-button ${connectionStatus === 'Connected' ? 'connected' : ''}`}
          >
            {loading ? '🔄 Connecting...' : 
             connectionStatus === 'Connected' ? '✅ Connected' : 
             '🔌 Test Connection'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="folder-navigation">
        <button 
          onClick={handleBackClick} 
          disabled={!currentFolder || loading}
          className="back-button"
          title="Go back to previous folder"
        >
          ← Back
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

      <div className="new-folder-form">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="Enter new folder name..."
          disabled={loading || !connectionStatus}
          className="folder-input"
        />
        <button 
          onClick={handleCreateFolder} 
          disabled={loading || !newFolderName.trim() || !connectionStatus}
          className="create-button"
          title="Create a new folder"
        >
          + Create Folder
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          🔄 Loading files...
        </div>
      ) : files.length > 0 ? (
        <div className="files-grid">
          {files.map((file) => (
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
                  title="Rename"
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
                  title="Delete"
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
                title={file.isFolder ? 'Open folder' : 'View file'}
              >
                <div className="file-icon">
                  <FileIcon mimeType={file.mimeType} />
                </div>
                <div className="file-details">
                  <div className="file-name">
                    {file.name}
                  </div>
                  <div className="file-type">
                    {file.isFolder ? 'Folder' : file.mimeType.split('/').pop().replace('vnd.google-apps.', '')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {connectionStatus === 'Connected' ? 
            '📂 No files found in this folder' : 
            '🔌 Connect to Google Drive to view files'}
        </div>
      )}

      {showDeleteModal && (
        <Modal
          title="Confirm Delete"
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
                Cancel
              </button>
              <button 
                className="modal-button delete"
                onClick={handleDelete}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </>
          }
        >
          <p>Are you sure you want to delete "{selectedFile?.name}"?</p>
          <p>This action cannot be undone.</p>
        </Modal>
      )}

      {showRenameModal && (
        <Modal
          title="Rename File"
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
                Cancel
              </button>
              <button 
                className="modal-button confirm"
                onClick={handleRename}
                disabled={loading || !newFileName.trim()}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </>
          }
        >
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="Enter new name"
            className="modal-input"
            autoFocus
          />
        </Modal>
      )}
    </div>
  );
};

export default Drive;