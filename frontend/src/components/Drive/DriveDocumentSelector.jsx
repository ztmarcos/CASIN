import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api.js';
import './DriveDocumentSelector.css';

const DriveDocumentSelector = ({ isOpen, onClose, onDocumentSelect, selectedDocumentId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadRootDocuments();
    }
  }, [isOpen]);

  const loadRootDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/drive/files`);
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }
      const data = await response.json();
      
      if (data.success && data.files) {
        // Filtrar solo PDFs y carpetas
        const filteredFiles = data.files.filter(file => 
          file.mimeType === 'application/pdf' || 
          file.mimeType === 'application/vnd.google-apps.folder'
        );
        setDocuments(filteredFiles);
        setCurrentFolder(null);
        setBreadcrumbs([]);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Error loading documents from Drive');
    } finally {
      setLoading(false);
    }
  };

  const loadFolderContents = async (folderId, folderName) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/drive/files?folderId=${folderId}`);
      if (!response.ok) {
        throw new Error('Failed to load folder contents');
      }
      const data = await response.json();
      
      if (data.success && data.files) {
        // Filtrar solo PDFs y carpetas
        const filteredFiles = data.files.filter(file => 
          file.mimeType === 'application/pdf' || 
          file.mimeType === 'application/vnd.google-apps.folder'
        );
        setDocuments(filteredFiles);
        setCurrentFolder({ id: folderId, name: folderName });
        
        // Actualizar breadcrumbs
        const newBreadcrumbs = [...breadcrumbs, { id: folderId, name: folderName }];
        setBreadcrumbs(newBreadcrumbs);
      }
    } catch (err) {
      console.error('Error loading folder contents:', err);
      setError('Error loading folder contents');
    } finally {
      setLoading(false);
    }
  };

  const navigateToBreadcrumb = async (index) => {
    if (index === -1) {
      // Navegar a la raíz
      await loadRootDocuments();
    } else {
      // Navegar a un breadcrumb específico
      const targetBreadcrumb = breadcrumbs[index];
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newBreadcrumbs);
      await loadFolderContents(targetBreadcrumb.id, targetBreadcrumb.name);
    }
  };

  const [selectedDocument, setSelectedDocument] = useState(null);

  const handleDocumentSelect = (document) => {
    if (document.mimeType === 'application/vnd.google-apps.folder') {
      // Navegar a la carpeta
      loadFolderContents(document.id, document.name);
    } else {
      // Seleccionar documento PDF con checkmark
      setSelectedDocument(document);
    }
  };

  const handleAnalyzeSelectedDocument = async () => {
    if (!selectedDocument || selectedDocument.mimeType !== 'application/pdf') {
      setError('Please select a PDF file to analyze');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Descargar el documento
      const response = await fetch(`${API_URL}/drive/download/${selectedDocument.id}`);
      if (!response.ok) {
        throw new Error('Failed to download document');
      }
      
      const blob = await response.blob();
      
      // Crear un archivo File desde el blob
      const file = new File([blob], selectedDocument.name, { type: 'application/pdf' });
      
      // Crear objeto parsedData simulado
      const parsedData = {
        text: `Documento descargado: ${selectedDocument.name}`,
        metadata: {
          fileName: selectedDocument.name,
          fileSize: selectedDocument.size,
          lastModified: selectedDocument.modifiedTime,
          driveId: selectedDocument.id,
          driveLink: selectedDocument.webViewLink
        },
        source: 'drive',
        driveDocument: selectedDocument
      };
      
      onDocumentSelect({ file, parsedData, driveDocument: selectedDocument });
      onClose();
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Error downloading document from Drive');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="drive-document-selector-overlay" onClick={onClose}>
      <div className="drive-document-selector-modal" onClick={e => e.stopPropagation()}>
        <div className="drive-document-selector-header">
          <h3>📁 Seleccionar Documento de Google Drive</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="drive-document-selector-body">
          {/* Breadcrumbs */}
          <div className="breadcrumbs">
            <button 
              className="breadcrumb-item"
              onClick={() => navigateToBreadcrumb(-1)}
            >
              📁 Drive
            </button>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                <span className="breadcrumb-separator">/</span>
                <button 
                  className="breadcrumb-item"
                  onClick={() => navigateToBreadcrumb(index)}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Search */}
          <div className="search-section">
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="error-message">
              {error}
              <button onClick={loadRootDocuments} className="retry-button">
                Reintentar
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-message">
              <div className="spinner"></div>
              Cargando documentos...
            </div>
          )}

          {/* Documents List */}
          {!loading && !error && (
            <div className="documents-list">
              {filteredDocuments.length === 0 ? (
                <div className="no-documents">
                  {searchTerm ? 'No se encontraron documentos que coincidan con la búsqueda' : 'No hay documentos en esta carpeta'}
                </div>
              ) : (
                filteredDocuments.map(doc => (
                  <div 
                    key={doc.id} 
                    className={`document-item ${doc.id === selectedDocument?.id ? 'selected' : ''}`}
                    onClick={() => handleDocumentSelect(doc)}
                  >
                    <div className="document-icon">
                      {doc.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄'}
                    </div>
                    <div className="document-info">
                      <div className="document-name">{doc.name}</div>
                      <div className="document-details">
                        {doc.mimeType === 'application/vnd.google-apps.folder' ? (
                          <span>Carpeta</span>
                        ) : (
                          <>
                            <span>{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            <span>{formatDate(doc.modifiedTime)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {doc.mimeType === 'application/pdf' && (
                      <div className="selection-indicator">
                        {doc.id === selectedDocument?.id ? (
                          <div className="checkmark">✅</div>
                        ) : (
                          <div className="checkbox">☐</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="drive-document-selector-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancelar
          </button>
          <div className="footer-actions">
            {selectedDocument && (
              <button 
                className="analyze-button"
                onClick={handleAnalyzeSelectedDocument}
                disabled={loading}
              >
                {loading ? '⏳ Analizando...' : '🔍 Analizar con GPT'}
              </button>
            )}
          </div>
          <div className="footer-info">
            <span>📄 Solo se muestran archivos PDF y carpetas</span>
            {selectedDocument && (
              <span className="selected-file-info">
                📄 Seleccionado: {selectedDocument.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveDocumentSelector;
