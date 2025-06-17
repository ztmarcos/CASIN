import React, { useState, useEffect, useRef } from 'react';
import DriveSelector from './DriveSelector';
import { API_URL } from '../../config/api';
import './DriveManager.css';

const DriveManager = ({ isOpen, onClose, clientData }) => {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [view, setView] = useState('files'); // 'files' or 'upload'
  const fileInputRef = useRef(null);

  // Generate client identifier
  const getClientId = () => {
    if (!clientData) return null;
    
    // Try different fields that might identify the client
    const identifier = clientData.nombre_contratante || 
                      clientData.contratante || 
                      clientData.asegurado || 
                      clientData.nombre_completo ||
                      clientData.email ||
                      clientData.id;
    
    return identifier ? identifier.toString().trim() : null;
  };

  // Load saved folder preference for this client
  useEffect(() => {
    const clientId = getClientId();
    if (clientId) {
      loadClientFolder(clientId);
    }
  }, [clientData]);

  // Load folder preference from backend
  const loadClientFolder = async (clientId) => {
    try {
      console.log('📁 Loading folder preference for client:', clientId);
      const response = await fetch(`${API_URL}/drive/client-folder/${encodeURIComponent(clientId)}`);
      const result = await response.json();
      
      if (result.success && result.folderId) {
        const folderData = {
          id: result.folderId,
          name: result.folderName || 'Selected Folder'
        };
        setSelectedFolder(folderData);
        loadFiles(folderData.id);
        console.log('✅ Loaded folder preference:', folderData);
      } else {
        console.log('📁 No folder preference found for client');
      }
    } catch (error) {
      console.error('❌ Error loading folder preference:', error);
      // Fallback to localStorage for backwards compatibility
      const savedFolder = localStorage.getItem(`drive_folder_${clientId}`);
      if (savedFolder) {
        try {
          const folderData = JSON.parse(savedFolder);
          setSelectedFolder(folderData);
          loadFiles(folderData.id);
        } catch (parseError) {
          console.error('Error parsing saved folder:', parseError);
        }
      }
    }
  };

  // Save folder preference to backend
  const saveClientFolder = async (folder) => {
    const clientId = getClientId();
    if (clientId && folder) {
      try {
        console.log('📁 Saving folder preference for client:', clientId, 'folder:', folder.name);
        const response = await fetch(`${API_URL}/drive/client-folder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId: clientId,
            folderId: folder.id,
            folderName: folder.name
          }),
        });
        
        const result = await response.json();
        if (result.success) {
          console.log('✅ Folder preference saved successfully');
          // Also save to localStorage as backup
          localStorage.setItem(`drive_folder_${clientId}`, JSON.stringify(folder));
        } else {
          console.error('❌ Failed to save folder preference:', result.error);
          // Fallback to localStorage
          localStorage.setItem(`drive_folder_${clientId}`, JSON.stringify(folder));
        }
      } catch (error) {
        console.error('❌ Error saving folder preference:', error);
        // Fallback to localStorage
        localStorage.setItem(`drive_folder_${clientId}`, JSON.stringify(folder));
      }
    }
  };

  // Load files from selected folder
  const loadFiles = async (folderId) => {
    if (!folderId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/drive/files?folderId=${folderId}`);
      const result = await response.json();
      
      if (result.success) {
        // Filter out folders, show only files
        const filesList = result.files.filter(file => 
          file.mimeType !== 'application/vnd.google-apps.folder'
        );
        setFiles(filesList);
      } else {
        setError('Error loading files: ' + result.message);
      }
    } catch (error) {
      setError('Error loading files: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle folder selection
  const handleFolderSelect = async (folder) => {
    setSelectedFolder(folder);
    await saveClientFolder(folder);
    setShowFolderSelector(false);
    loadFiles(folder.id);
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const newAttachments = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  // Remove attachment
  const removeAttachment = (attachmentId) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload files to Drive
  const uploadFiles = async () => {
    if (!selectedFolder || attachments.length === 0) {
      setError('Please select a folder and add files to upload');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('folderId', selectedFolder.id);
      
      // Add all files to FormData
      attachments.forEach((attachment) => {
        formData.append('files', attachment.file);
      });

      const uploadUrl = `${API_URL.replace('/api', '')}/drive/upload`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Successfully uploaded ${result.files.length} files`);
        setAttachments([]);
        
        // Reload files to show new uploads
        await loadFiles(selectedFolder.id);
        
        // Switch to files view to see uploaded files
        setView('files');
      } else {
        setError('Upload failed: ' + result.error);
      }
    } catch (error) {
      setError('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  // Get client name for display
  const getClientName = () => {
    if (!clientData) return 'Unknown Client';
    
    return clientData.nombre_contratante || 
           clientData.contratante || 
           clientData.asegurado || 
           clientData.nombre_completo ||
           'Unknown Client';
  };

  if (!isOpen) return null;

  return (
    <div className="drive-manager-overlay" onClick={onClose}>
      <div className="drive-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="drive-manager-header">
          <h3>📁 Drive Manager - {getClientName()}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="drive-manager-body">
          {/* Folder Selection Section */}
          <div className="folder-section">
            <div className="folder-info">
              {selectedFolder ? (
                <div className="selected-folder">
                  <span className="folder-name">📁 {selectedFolder.name}</span>
                  <button 
                    className="change-folder-btn"
                    onClick={() => setShowFolderSelector(true)}
                  >
                    Change Folder
                  </button>
                </div>
              ) : (
                <button 
                  className="select-folder-btn"
                  onClick={() => setShowFolderSelector(true)}
                >
                  📁 Select Client Folder
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          {selectedFolder && (
            <div className="drive-tabs">
              <button 
                className={`tab-btn ${view === 'files' ? 'active' : ''}`}
                onClick={() => setView('files')}
              >
                📄 Files ({files.length})
              </button>
              <button 
                className={`tab-btn ${view === 'upload' ? 'active' : ''}`}
                onClick={() => setView('upload')}
              >
                📤 Upload
              </button>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Content Area */}
          <div className="drive-content">
            {selectedFolder && view === 'files' && (
              <div className="files-view">
                {isLoading ? (
                  <div className="loading">Loading files...</div>
                ) : files.length === 0 ? (
                  <div className="no-files">
                    <p>No files found in this folder</p>
                    <button 
                      className="upload-first-btn"
                      onClick={() => setView('upload')}
                    >
                      📤 Upload Files
                    </button>
                  </div>
                ) : (
                  <div className="files-list">
                    {files.map(file => (
                      <div key={file.id} className="file-item">
                        <div className="file-icon">📄</div>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-meta">
                            {file.size && <span>{formatFileSize(file.size)}</span>}
                            {file.modifiedTime && <span>{formatDate(file.modifiedTime)}</span>}
                          </div>
                        </div>
                        <div className="file-actions">
                          <a 
                            href={file.webViewLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="view-file-btn"
                            title="View in Google Drive"
                          >
                            👁️
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedFolder && view === 'upload' && (
              <div className="upload-view">
                <div className="upload-section">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    style={{ display: 'none' }}
                    accept="*/*"
                  />
                  
                  <button 
                    className="select-files-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    📎 Select Files
                  </button>

                  {attachments.length > 0 && (
                    <div className="attachments-list">
                      <h4>Files to Upload:</h4>
                      {attachments.map(attachment => (
                        <div key={attachment.id} className="attachment-item">
                          <span className="attachment-name">{attachment.name}</span>
                          <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                          <button 
                            className="remove-attachment-btn"
                            onClick={() => removeAttachment(attachment.id)}
                            disabled={isUploading}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      <button 
                        className="upload-btn"
                        onClick={uploadFiles}
                        disabled={isUploading}
                      >
                        {isUploading ? 'Uploading...' : '📤 Upload Files'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Folder Selector Modal */}
        {showFolderSelector && (
          <DriveSelector
            isOpen={showFolderSelector}
            onClose={() => setShowFolderSelector(false)}
            onFolderSelect={handleFolderSelect}
            selectedFolder={selectedFolder}
          />
        )}
      </div>
    </div>
  );
};

export default DriveManager; 