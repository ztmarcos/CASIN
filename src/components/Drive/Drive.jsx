import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Drive.css';

const Drive = ({ currentUser }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [driveStatus, setDriveStatus] = useState('Not Connected');

  const fetchDriveFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/drive/files', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.files) {
        setFiles(data.files.map(file => ({
          id: file.id,
          name: file.name,
          type: file.mimeType.includes('folder') ? 'folder' : file.mimeType.split('/').pop(),
          modifiedDate: new Date(file.modifiedTime).toLocaleDateString()
        })));
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
      setError('Failed to fetch files from Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const testGoogleDrive = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/drive/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Google Drive test response:', data);
      setDriveStatus(data.status || 'Connected');
      if (data.status === 'Connected') {
        fetchDriveFiles();
      }
    } catch (err) {
      console.error('Google Drive test error:', err);
      setError('Failed to connect to Google Drive');
      setDriveStatus('Connection Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testGoogleDrive();
  }, []);

  const getFileIcon = (type) => {
    switch(type) {
      case 'folder': return '📁';
      case 'pdf': return '📄';
      case 'text': return '📝';
      case 'image': return '🖼️';
      default: return '📄';
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="drive-container">
      <div className="drive-header">
        <h2>Google Drive Integration</h2>
        <button onClick={testGoogleDrive} className="drive-button">
          {loading ? 'Testing...' : 'Test Drive Connection'}
        </button>
      </div>
      
      <div className="drive-content">
        {error && (
          <div className="drive-error">
            {error}
          </div>
        )}
        
        <div className="drive-status">
          <p>Current User: {currentUser}</p>
          <p>Drive Status: {driveStatus}</p>
          <p>Connection: {loading ? 'Testing...' : 'Ready'}</p>
        </div>

        <div className="drive-search">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="drive-search-input"
          />
        </div>

        <div className="drive-files">
          <div className="drive-files-header">
            <span className="file-icon-header">Type</span>
            <span className="file-name-header">Name</span>
            <span className="file-date-header">Modified</span>
          </div>
          {filteredFiles.map(file => (
            <div key={file.id} className="drive-file-item">
              <span className="file-icon">{getFileIcon(file.type)}</span>
              <span className="file-name">{file.name}</span>
              <span className="file-date">{file.modifiedDate}</span>
            </div>
          ))}
          {filteredFiles.length === 0 && (
            <div className="drive-no-files">
              No files found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

Drive.propTypes = {
  currentUser: PropTypes.string.isRequired,
};

export default Drive;