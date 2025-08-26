import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { getCleanTeamName } from '../../utils/teamUtils';
import firebaseTeamStorageService from '../../services/firebaseTeamStorageService';
import './DriveDocumentSelector.css';

const DriveDocumentSelector = ({ isOpen, onClose, onDocumentSelect, selectedDocumentId }) => {
  const { user } = useAuth();
  const { userTeam } = useTeam();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [currentFolderPath, setCurrentFolderPath] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRootDocuments();
    }
  }, [isOpen]);

  const loadRootDocuments = async () => {
    setLoading(true);
    setError(null);
    
    if (!userTeam) {
      setError('No hay equipo asignado');
      setLoading(false);
      return;
    }
    
    try {
      console.log(`📁 PDFParser: Cargando documentos del equipo ${getCleanTeamName(userTeam.name)}`);
      
      // Cargar carpetas y archivos PDF del storage del equipo
      const [folderData, files] = await Promise.all([
        firebaseTeamStorageService.listTeamFoldersOnly(currentFolderPath, userTeam.id),
        firebaseTeamStorageService.listFilesInFolder(currentFolderPath, userTeam.id)
      ]);
      
      // Filtrar solo archivos PDF
      const pdfFiles = files.filter(file => 
        file.name.toLowerCase().endsWith('.pdf') && file.name !== '.keep'
      );
      
      console.log(`📁 PDFParser: Encontradas ${folderData.folders.length} carpetas y ${pdfFiles.length} PDFs`);
      
      setFolders(folderData.folders);
      setDocuments(pdfFiles);
      setCurrentFolder(null);
      setBreadcrumbs([]);
      setCurrentFolderPath('');
      
    } catch (err) {
      console.error('Error loading documents from Firebase:', err);
      setError(`Error loading documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderContents = async (folderPath, folderName) => {
    setLoading(true);
    setError(null);
    
    if (!userTeam) {
      setError('No hay equipo asignado');
      setLoading(false);
      return;
    }
    
    try {
      console.log(`📁 PDFParser: Navegando a carpeta "${folderName}" en path "${folderPath}"`);
      
      // Cargar carpetas y archivos PDF de la carpeta específica
      const [folderData, files] = await Promise.all([
        firebaseTeamStorageService.listTeamFoldersOnly(folderPath, userTeam.id),
        firebaseTeamStorageService.listFilesInFolder(folderPath, userTeam.id)
      ]);
      
      // Filtrar solo archivos PDF
      const pdfFiles = files.filter(file => 
        file.name.toLowerCase().endsWith('.pdf') && file.name !== '.keep'
      );
      
      console.log(`📁 PDFParser: En "${folderName}": ${folderData.folders.length} carpetas y ${pdfFiles.length} PDFs`);
      
      setFolders(folderData.folders);
      setDocuments(pdfFiles);
      setCurrentFolder({ path: folderPath, name: folderName });
      setCurrentFolderPath(folderPath);
      
      // Actualizar breadcrumbs
      const newBreadcrumbs = [...breadcrumbs, { path: folderPath, name: folderName }];
      setBreadcrumbs(newBreadcrumbs);
      
    } catch (err) {
      console.error('Error loading folder contents:', err);
      setError(`Error loading folder contents: ${err.message}`);
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
      await loadFolderContents(targetBreadcrumb.path, targetBreadcrumb.name);
    }
  };

  const [selectedDocument, setSelectedDocument] = useState(null);

  const handleDocumentSelect = (document) => {
    if (document.isFolder) {
      // Navegar a la carpeta
      loadFolderContents(document.relativePath, document.name);
    } else {
      // Seleccionar documento PDF con checkmark
      setSelectedDocument(document);
    }
  };

  const handleAnalyzeSelectedDocument = async () => {
    if (!selectedDocument || !selectedDocument.name.toLowerCase().endsWith('.pdf')) {
      setError('Por favor selecciona un archivo PDF para analizar');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`📄 PDFParser: Descargando archivo "${selectedDocument.name}" de Firebase Storage`);
      
      // Obtener la URL de descarga del archivo desde Firebase
      const downloadURL = await firebaseTeamStorageService.loadFileDownloadURL(selectedDocument);
      
      // Descargar el archivo
      const response = await fetch(downloadURL);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Crear un archivo File desde el blob
      const file = new File([blob], selectedDocument.name, { type: 'application/pdf' });
      
      console.log(`📄 PDFParser: Archivo descargado exitosamente - ${file.size} bytes`);
      
      // Crear objeto de datos para el parser
      const documentData = {
        file: file,
        parsedData: {
          metadata: {
            fileName: selectedDocument.name,
            fileSize: selectedDocument.size,
            lastModified: selectedDocument.modifiedTime,
            source: 'firebase_team_storage',
            teamId: userTeam.id,
            teamName: userTeam.name,
            relativePath: selectedDocument.relativePath
          }
        },
        driveDocument: {
          id: selectedDocument.id,
          name: selectedDocument.name,
          size: selectedDocument.size,
          modifiedTime: selectedDocument.modifiedTime,
          webViewLink: downloadURL // Use Firebase download URL as "view" link
        }
      };
      
      onDocumentSelect(documentData);
      onClose();
    } catch (err) {
      console.error('Error downloading document from Firebase:', err);
      setError(`Error al descargar documento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Combinar carpetas y documentos para mostrar en una sola lista
  const allItems = [
    ...folders.filter(folder => 
      folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    ...documents.filter(doc => 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  ];

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
          <h3>📁 Seleccionar PDF del Equipo {userTeam?.name || 'Drive'}</h3>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="drive-document-selector-body">
          {/* Breadcrumbs */}
          <div className="breadcrumbs">
            <button 
              className="breadcrumb-item"
              onClick={() => navigateToBreadcrumb(-1)}
            >
              📁 {userTeam?.name || 'Equipo'}
            </button>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
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
              {allItems.length === 0 ? (
                <div className="no-documents">
                  {searchTerm ? 'No se encontraron documentos que coincidan con la búsqueda' : 'No hay documentos PDF ni carpetas en esta ubicación'}
                </div>
              ) : (
                allItems.map(item => (
                  <div 
                    key={item.id} 
                    className={`document-item ${item.id === selectedDocument?.id ? 'selected' : ''}`}
                    onClick={() => handleDocumentSelect(item)}
                  >
                    <div className="document-icon">
                      {item.isFolder ? '📁' : '📄'}
                    </div>
                    <div className="document-info">
                      <div className="document-name">{item.name}</div>
                      <div className="document-details">
                        {item.isFolder ? (
                          <span>Carpeta</span>
                        ) : (
                          <>
                            <span>{formatFileSize(item.size)}</span>
                            <span>•</span>
                            <span>{formatDate(item.modifiedTime)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {!item.isFolder && item.name.toLowerCase().endsWith('.pdf') && (
                      <div className="selection-indicator">
                        {item.id === selectedDocument?.id ? (
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
