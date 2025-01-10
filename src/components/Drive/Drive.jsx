import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Drive.css';

const Drive = () => {
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderStack, setFolderStack] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);

  const fetchFiles = async (folderId = null) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:3001/api/drive/files${folderId ? `?folderId=${folderId}` : '?folderId=root'}`);
      console.log('Fetched files:', response.data);
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const testGoogleDrive = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:3001/api/drive/test');
      console.log('Google Drive test response:', response.data);
      setConnectionStatus(response.data.status);
      if (response.data.status === 'Connected') {
        await fetchFiles();
      }
    } catch (error) {
      console.error('Error testing Google Drive:', error);
      setError('Failed to connect to Google Drive');
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

  return (
    <div className="drive-container">
      <div className="drive-header">
        <h2>Google Drive Files</h2>
        <div className="header-actions">
          <button 
            onClick={testGoogleDrive} 
            disabled={loading}
            className={`connection-button ${connectionStatus === 'Connected' ? 'connected' : ''}`}
          >
            {loading ? 'Connecting...' : connectionStatus === 'Connected' ? 'Connected ✓' : 'Test Connection'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="folder-navigation">
        <button onClick={handleBackClick} disabled={!currentFolder || loading}>
          ← Back
        </button>
        <div className="folder-path">
          <span onClick={() => setCurrentFolder(null)} style={{ cursor: 'pointer' }}>Root</span>
          {folderStack.map((folder, index) => (
            <span key={index}>
              {' > '}
              <span
                onClick={() => {
                  setFolderStack(folderStack.slice(0, index));
                  setCurrentFolder(folder.id);
                }}
                style={{ cursor: 'pointer' }}
              >
                {folder.name}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="new-folder-form">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder name"
          disabled={loading || !connectionStatus}
        />
        <button 
          onClick={handleCreateFolder} 
          disabled={loading || !newFolderName.trim() || !connectionStatus}
        >
          Create Folder
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : files.length > 0 ? (
        <div className="files-grid">
          {files.map((file) => (
            <div key={file.id} className="file-item">
              <div className="file-icon">
                {file.mimeType === 'application/vnd.google-apps.folder' ? '📁' : 
                 file.mimeType === 'application/pdf' ? '📄' : 
                 file.mimeType === 'application/vnd.google-apps.spreadsheet' ? '📊' : '📎'}
              </div>
              <div className="file-details">
                <div
                  className="file-name"
                  onClick={() => {
                    if (file.mimeType === 'application/vnd.google-apps.folder') {
                      handleFolderClick(file);
                    } else if (file.webViewLink) {
                      window.open(file.webViewLink, '_blank');
                    }
                  }}
                >
                  {file.name}
                </div>
                <div className="file-type">{file.mimeType.split('.').pop()}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {connectionStatus === 'Connected' ? 'No files found' : 'Connect to Google Drive to view files'}
        </div>
      )}
    </div>
  );
};

export default Drive;