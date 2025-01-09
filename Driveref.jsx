import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

export default function Drive({ currentUser }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDriveExpanded, setIsDriveExpanded] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [draggedFile, setDraggedFile] = useState(null);

  useEffect(() => {
    fetchFiles();
  }, [currentFolderId]);

  useEffect(() => {
    // Cleanup preview URL when modal is closed
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchFiles = async () => {
    try {
      console.log('Fetching files for user:', currentUser);
      const endpoint = currentFolderId 
        ? `http://localhost:3001/drive/list-folder/${currentFolderId}`
        : `http://localhost:3001/drive/list/${currentUser}`;
      const response = await axios.get(endpoint);
      console.log('Files response:', response.data);
      setFiles(response.data.files);
    } catch (error) {
      console.error('Error fetching files:', error.response || error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderId, folderName) => {
    setCurrentFolderId(folderId);
    setFolderPath(prev => [...prev, { id: folderId, name: folderName }]);
  };

  const handleBackClick = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length - 1].id : null);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user', currentUser);
    formData.append('folderId', currentFolderId || '');

    try {
      const response = await axios.post('http://localhost:3001/drive/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log('Upload response:', response.data);
      await fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file. Please try again.');
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    setLoading(true);
    try {
      await axios.post('http://localhost:3001/drive/create-folder', { 
        name: folderName,
        user: currentUser
      });
      fetchFiles();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Error creating folder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await axios.get(`http://localhost:3001/drive/download/${fileId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const handleDelete = async (fileId, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    setLoading(true);
    try {
      await axios.delete(`http://localhost:3001/drive/delete/${fileId}`);
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = async (file) => {
    if (file.mimeType.includes('folder')) {
      handleFolderClick(file.id, file.name);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3001/drive/download/${file.id}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      
      console.log('Preview file:', file);
      console.log('Preview URL:', url);
      
      setPreviewUrl(url);
      setPreviewFile(file);
    } catch (error) {
      console.error('Error previewing file:', error);
      alert('Error previewing file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFile(null);
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add debug logging for render
  console.log('Current files:', files);
  console.log('Filtered files:', filteredFiles);

  const handleDragStart = (e, file) => {
    if (file.mimeType.includes('folder')) return; // Don't allow dragging folders
    setDraggedFile(file);
    e.dataTransfer.setData('text/plain', file.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, file) => {
    if (!file.mimeType.includes('folder')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedFile || !targetFolder.mimeType.includes('folder')) return;

    try {
      setLoading(true);
      await axios.post('http://localhost:3001/drive/move-file', {
        fileId: draggedFile.id,
        targetFolderId: targetFolder.id
      });
      setDraggedFile(null);
      fetchFiles();
    } catch (error) {
      console.error('Error moving file:', error);
      alert('Error moving file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 bg-secondary rounded-lg border border-gray-700 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg text-accent font-semibold">Gestión de Archivos</h2>
            <button
              onClick={() => setIsDriveExpanded(!isDriveExpanded)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <svg
                className={`w-5 h-5 text-primary transform transition-transform ${
                  isDriveExpanded ? 'rotate-0' : '-rotate-90'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isDriveExpanded && (
        <>
          {/* Action Buttons */}
          <div className="p-4 flex flex-wrap gap-2 items-center bg-drive-bg">
            <label className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded hover:from-indigo-700 hover:to-purple-700 transition-colors cursor-pointer flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
              </svg>
              SUBIR ARCHIVO
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={handleCreateFolder}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded hover:from-green-700 hover:to-emerald-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              NUEVA CARPETA
            </button>

            <button
              onClick={fetchFiles}
              className="drive-action-button px-4 py-2 rounded hover:bg-drive-hover transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              ACTUALIZAR
            </button>

            <div className="ml-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar archivos..."
                className="px-4 py-2 bg-drive-item-bg border border-drive-border rounded focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Files List */}
          <div className="p-4 bg-drive-bg">
            {loading ? (
              <div className="text-center py-4 drive-icon">Loading...</div>
            ) : (
              <>
                {/* Folder Path */}
                {folderPath.length > 0 && (
                  <div className="mb-4 flex items-center gap-2 drive-icon">
                    <button
                      onClick={handleBackClick}
                      className="p-1 hover:bg-drive-hover rounded transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-1">
                      {folderPath.map((folder, index) => (
                        <span key={folder.id}>
                          {index > 0 && <span className="mx-1">/</span>}
                          <span>{folder.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`drive-item p-4 rounded-lg cursor-pointer ${
                        file.mimeType.includes('folder') && draggedFile ? 'hover:border-accent hover:border-2' : ''
                      }`}
                      onClick={() => handleFileClick(file)}
                      draggable={!file.mimeType.includes('folder')}
                      onDragStart={(e) => handleDragStart(e, file)}
                      onDragOver={(e) => handleDragOver(e, file)}
                      onDrop={(e) => handleDrop(e, file)}
                    >
                      <div className="flex items-center gap-2">
                        {file.mimeType.includes('folder') ? (
                          <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        ) : (
                          <svg className="w-8 h-8 drive-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        )}
                        <div className="flex-1 truncate">
                          <div className="font-medium">{file.name}</div>
                          <div className="drive-date">
                            {file.modifiedTime && new Date(file.modifiedTime).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!file.mimeType.includes('folder') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file.id, file.name);
                              }}
                              className="drive-action-button p-1 hover:text-accent transition-colors"
                              title="Download"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(file.id, file.name);
                            }}
                            className="drive-action-button p-1 hover:text-danger transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewFile && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-drive-item-bg rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-drive-border flex items-center justify-between">
              <h3 className="text-lg font-medium">{previewFile.name}</h3>
              <button
                onClick={closePreview}
                className="p-1 hover:bg-drive-hover rounded transition-colors drive-action-button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {previewFile.mimeType.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[60vh] rounded border border-drive-border"
                  title={previewFile.name}
                />
              ) : previewFile.mimeType.includes('image') ? (
                <img
                  src={previewUrl}
                  alt={previewFile.name}
                  className="max-w-full max-h-[70vh] mx-auto object-contain"
                />
              ) : previewFile.mimeType.includes('text') || previewFile.mimeType.includes('javascript') || previewFile.mimeType.includes('json') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[60vh] rounded border border-drive-border bg-drive-item-bg"
                  title={previewFile.name}
                />
              ) : (
                <div className="text-center py-8 drive-icon">
                  <p>Preview not available for this file type: {previewFile.mimeType}</p>
                  <button
                    onClick={() => handleDownload(previewFile.id, previewFile.name)}
                    className="mt-4 px-4 py-2 bg-accent text-white rounded hover:opacity-90 transition-colors"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Drive.propTypes = {
  currentUser: PropTypes.string.isRequired,
}; 