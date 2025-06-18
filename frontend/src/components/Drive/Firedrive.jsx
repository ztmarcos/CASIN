import React, { useState, useEffect, useRef, useMemo } from 'react';
import { storage } from '../../firebase/config.js';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import firebaseTeamStorageService from '../../services/firebaseTeamStorageService';
import firebaseStorageProxy from '../../services/firebaseStorageProxy';
import { ref, listAll, getDownloadURL, getMetadata, uploadBytes } from 'firebase/storage';
import './Drive.css';

// Root folder path for Firebase Storage
const ROOT_FOLDER_PATH = '';

const FileIcon = ({ mimeType, name }) => {
  // Extract file extension if mimeType is not available
  const getFileType = () => {
    if (mimeType) return mimeType;
    const extension = name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'application/pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'image/*';
      case 'doc':
      case 'docx': return 'application/msword';
      case 'xls':
      case 'xlsx': return 'application/vnd.ms-excel';
      default: return 'application/octet-stream';
    }
  };

  const fileType = getFileType();
  
  // For folders (prefixes), check if it's a folder-like structure
  if (!name.includes('.') && name.endsWith('/')) {
    return '📁';
  }
  
  switch (fileType) {
    case 'folder':
      return '📁';
    case 'application/pdf':
      return '📄';
    case 'application/vnd.ms-excel':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return '📊';
    case 'application/msword':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '📝';
    case 'image/jpeg':
    case 'image/png':
    case 'image/*':
      return '🖼️';
    default:
      return '📎';
  }
};

const BreadcrumbPath = ({ folderStack, onNavigate, teamName }) => (
  <div className="folder-path">
    <span 
      onClick={() => onNavigate(null)} 
      className="path-item"
      title={`Ir a la carpeta raíz de ${teamName}`}
    >
      <span className="icon">🏠</span>
      <span>{teamName || 'Team'}</span>
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

const Firedrive = () => {
  const { user } = useAuth();
  const { userTeam, isLoadingTeam } = useTeam();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [folderStack, setFolderStack] = useState([]);
  const [currentFolderPath, setCurrentFolderPath] = useState(ROOT_FOLDER_PATH);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [uploading, setUploading] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  const [storageStats, setStorageStats] = useState(null);

  // Add debug message helper
  const addDebugInfo = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-4), `${timestamp}: ${message}`]); // Keep last 5 messages
    console.log(`🔧 Debug: ${message}`);
  };

  // Test Firebase Storage connection with team context
  const testConnection = async () => {
    try {
      addDebugInfo('Iniciando test de conexión Firebase Storage...');
      
      // Check if user is authenticated
      if (!user) {
        addDebugInfo('Usuario no autenticado');
        setConnectionStatus('error');
        setError('Usuario no autenticado. Por favor, inicia sesión.');
        return false;
      }
      
      // Check if team is available
      if (!userTeam) {
        addDebugInfo('No hay equipo asignado');
        setConnectionStatus('error');
        setError('No tienes un equipo asignado. Contacta al administrador.');
        return false;
      }
      
      addDebugInfo(`Usuario: ${user.email} | Team: ${userTeam.name}`);
      addDebugInfo(`Team ID: ${userTeam.id}`);
      
      // Test team storage connection
      const connectionTest = await firebaseTeamStorageService.testTeamStorageConnection(userTeam.id);
      
      if (connectionTest.success) {
        addDebugInfo(`Conexión exitosa: ${connectionTest.filesCount} archivos, ${connectionTest.foldersCount} carpetas`);
        setConnectionStatus('connected');
        
        // Get storage stats
        try {
          const stats = await firebaseTeamStorageService.getTeamStorageStats(userTeam.id);
          setStorageStats(stats);
        } catch (statsError) {
          addDebugInfo('No se pudieron obtener estadísticas');
        }
        
        return true;
      } else {
        addDebugInfo(`Error de conexión: ${connectionTest.error}`);
        
        // Check if team storage exists
        const existsCheck = await firebaseTeamStorageService.checkTeamStorageExists(userTeam.id);
        if (!existsCheck.exists) {
          addDebugInfo('Storage del equipo no existe, creando...');
          
          try {
            await firebaseTeamStorageService.createTeamStorageStructure(userTeam.id, userTeam.name);
            addDebugInfo('Storage del equipo creado exitosamente');
            setConnectionStatus('connected');
            return true;
          } catch (createError) {
            addDebugInfo(`Error creando storage: ${createError.message}`);
          }
        }
        
        setConnectionStatus('error');
        setError(`Error de conexión: ${connectionTest.error}`);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Firebase Storage connection test failed:', error);
      addDebugInfo(`Error: ${error.code} - ${error.message}`);
      
      let errorMessage = 'Error de conexión con Firebase Storage';
      
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Sin permisos para acceder al storage. Verifica las reglas de seguridad en Firebase Console.';
        addDebugInfo('Error de autorización - revisar reglas de seguridad');
      } else if (error.code === 'storage/unauthenticated') {
        errorMessage = 'Usuario no autenticado correctamente.';
        addDebugInfo('Error de autenticación');
      } else if (error.message.includes('CORS')) {
        errorMessage = 'Error de CORS. Firebase Storage necesita configuración CORS para desarrollo local.';
        addDebugInfo('Error CORS detectado');
      } else {
        addDebugInfo(`Error desconocido: ${error.code}`);
      }
      
      setConnectionStatus('error');
      setError(errorMessage);
      return false;
    }
  };

  // Test upload functionality using team storage service
  const testUpload = async () => {
    try {
      addDebugInfo('Probando funcionalidad de upload...');
      
      if (!userTeam) {
        addDebugInfo('No hay equipo disponible para upload');
        return false;
      }
      
      // Create a simple test file
      const testContent = new Blob([`Test file for team: ${userTeam.name}\nCreated: ${new Date().toISOString()}`], { type: 'text/plain' });
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
      
      const result = await firebaseTeamStorageService.uploadFileToTeam(testFile, 'temp', userTeam.id);
      
      addDebugInfo('Upload test exitoso');
      
      // Refresh files to show the uploaded test file
      await fetchFiles(currentFolderPath);
      
      return true;
    } catch (error) {
      addDebugInfo(`Upload test falló: ${error.code || error.message}`);
      return false;
    }
  };

  // Fetch files using team storage service
  const fetchFiles = async (folderPath = currentFolderPath) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!userTeam) {
        addDebugInfo('No hay equipo disponible para listar archivos');
        setFiles([]);
        return;
      }
      
      addDebugInfo(`Obteniendo archivos de: "${folderPath}" para team: ${userTeam.name}`);
      
      const allFiles = await firebaseTeamStorageService.listTeamFiles(folderPath, userTeam.id);
      
      addDebugInfo(`Total procesados: ${allFiles.length} elementos`);
      
      setFiles(allFiles);
      setConnectionStatus('connected');
      
      // Update storage stats after loading files
      await loadStorageStats();
    } catch (error) {
      console.error('❌ Error fetching files:', error);
      addDebugInfo(`Error al obtener archivos: ${error.code || error.message}`);
      setError(`Error al cargar archivos: ${error.message}`);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to folder
  const navigateToFolder = (file) => {
    addDebugInfo(`Navegando a carpeta: ${file.name}`);
    if (file.isFolder) {
      // Check if we're already in this folder
      if (currentFolderPath === file.relativePath) {
        addDebugInfo('Ya estamos en esta carpeta');
        return;
      }
      
      // Update folder stack first
      const newStack = [...folderStack, { path: file.relativePath, name: file.name }];
      setFolderStack(newStack);
      
      // Then update current folder path (this will trigger useEffect to fetch files)
      setCurrentFolderPath(file.relativePath);
    }
  };

  // Navigate back in breadcrumb
  const navigateBack = (index) => {
    addDebugInfo(`Navegando atrás al índice: ${index}`);
    
    if (index === null) {
      // Go to root
      setFolderStack([]);
      setCurrentFolderPath(ROOT_FOLDER_PATH);
    } else {
      // Go to specific folder in stack
      const newStack = folderStack.slice(0, index + 1);
      setFolderStack(newStack);
      setCurrentFolderPath(newStack[newStack.length - 1].path);
    }
  };

  // Handle file upload using team storage service
  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    if (!userTeam) {
      setError('No hay equipo disponible para subir archivos');
      return;
    }

    setUploading(true);
    addDebugInfo(`Subiendo ${selectedFiles.length} archivo(s) al team: ${userTeam.name}`);
    
    try {
      for (const file of selectedFiles) {
        addDebugInfo(`Subiendo: ${file.name}`);
        await firebaseTeamStorageService.uploadFileToTeam(file, currentFolderPath, userTeam.id);
        addDebugInfo(`✅ ${file.name} subido`);
      }
      
      // Refresh the file list
      await fetchFiles(currentFolderPath);
      
      // Update storage stats
      try {
        const stats = await firebaseTeamStorageService.getTeamStorageStats(userTeam.id);
        setStorageStats(stats);
      } catch (error) {
        console.warn('Could not update storage stats:', error);
      }
      
      // Clear the input
      event.target.value = '';
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      addDebugInfo(`Error de upload: ${error.code || error.message}`);
      setError(`Error al subir archivos: ${error.message}`);
    } finally {
      setUploading(false);
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

  // Load storage stats
  const loadStorageStats = async () => {
    if (!userTeam) return;
    
    try {
      addDebugInfo('Cargando estadísticas de almacenamiento...');
      const stats = await firebaseTeamStorageService.getTeamStorageStats(userTeam.id);
      setStorageStats(stats);
      addDebugInfo(`Stats cargadas: ${stats.totalItems} elementos, ${formatFileSize(stats.totalSize)}`);
    } catch (error) {
      console.warn('Could not load storage stats:', error);
      addDebugInfo(`Error cargando stats: ${error.message}`);
    }
  };

  // Initial load - wait for user authentication and team
  useEffect(() => {
    const initializeFiredrive = async () => {
      addDebugInfo('Inicializando Firedrive...');
      
      // Wait for user to be loaded
      if (!user) {
        addDebugInfo('Esperando autenticación de usuario...');
        setConnectionStatus('checking');
        return;
      }
      
      // Wait for team to be loaded
      if (isLoadingTeam) {
        addDebugInfo('Esperando carga del equipo...');
        setConnectionStatus('checking');
        return;
      }
      
      if (!userTeam) {
        addDebugInfo('Usuario sin equipo asignado');
        setConnectionStatus('error');
        setError('No tienes un equipo asignado. Contacta al administrador.');
        return;
      }
      
      addDebugInfo(`Usuario encontrado: ${user.email} | Team: ${userTeam.name}`);
      const isConnected = await testConnection();
      if (isConnected) {
        addDebugInfo('Cargando archivos iniciales...');
        await fetchFiles(ROOT_FOLDER_PATH);
        
        // Load storage stats after initial load
        await loadStorageStats();
      }
    };
    
    initializeFiredrive();
  }, [user, userTeam, isLoadingTeam]); // Add team dependencies

  // Fetch files when folder changes
  useEffect(() => {
    if (connectionStatus === 'connected' && currentFolderPath !== undefined && userTeam) {
      addDebugInfo(`Cambio de carpeta detectado: "${currentFolderPath}"`);
      fetchFiles(currentFolderPath);
    }
  }, [currentFolderPath, userTeam]);

  // Show loading while team is being loaded
  if (isLoadingTeam || (!userTeam && !error)) {
    return (
      <div className="drive-container">
        <div className="drive-header">
          <h2>🔥 Firebase Storage</h2>
          <div className="status-badge checking">
            🔄 Cargando equipo...
          </div>
        </div>
        
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Cargando información del equipo...</p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'checking') {
    return (
      <div className="drive-container">
        <div className="drive-header">
          <h2>🔥 Firebase Storage - {userTeam?.name || 'Team'}</h2>
          <div className="status-badge checking">
            🔄 Verificando conexión...
          </div>
        </div>
        
        {/* Debug Panel */}
        <div style={{ padding: '1rem', background: '#f8f9fa', margin: '1rem', borderRadius: '8px' }}>
          <h4>🔧 Debug Info:</h4>
          {debugInfo.map((info, index) => (
            <div key={index} style={{ fontSize: '12px', fontFamily: 'monospace', margin: '2px 0' }}>
              {info}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
    return (
      <div className="drive-container">
        <div className="drive-header">
          <h2>🔥 Firebase Storage - {userTeam?.name || 'Team'}</h2>
          <div className="status-badge error">
            ❌ Sin conexión
          </div>
        </div>
        
        <div className="error-message">
          <h3>⚠️ Firebase Storage no disponible</h3>
          <p>{error || 'No se pudo conectar con Firebase Storage'}</p>
          
          {/* Debug Panel */}
          <div style={{ padding: '1rem', background: '#ffe6e6', margin: '1rem 0', borderRadius: '8px', fontSize: '14px' }}>
            <h4>🔧 Información de Debug:</h4>
            {debugInfo.map((info, index) => (
              <div key={index} style={{ fontSize: '12px', fontFamily: 'monospace', margin: '2px 0' }}>
                {info}
              </div>
            ))}
            
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
              <h5>💡 Posibles soluciones:</h5>
              <ul style={{ fontSize: '12px', paddingLeft: '1.5rem' }}>
                <li>Verifica que las reglas de Firebase Storage permitan lectura/escritura</li>
                <li>Asegúrate de que el usuario esté autenticado correctamente</li>
                <li>Para desarrollo local, configura CORS en Firebase Storage</li>
                <li>Revisa la configuración del proyecto en Firebase Console</li>
                <li>Contacta al administrador si no tienes un equipo asignado</li>
              </ul>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            🔄 Reintentar
          </button>
          
          <button 
            onClick={testUpload} 
            className="retry-button"
            style={{ marginLeft: '10px' }}
          >
            🧪 Test Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="drive-container">
      <div className="drive-header">
        <h2>🔥 Firebase Storage - {userTeam?.name || 'Team'}</h2>
        <div className="status-badge connected">
          ✅ Conectado
        </div>
      </div>

      {/* Team Storage Stats */}
      <div style={{ 
        padding: '0.5rem 1rem', 
        background: storageStats ? '#e8f5e8' : '#f8f9fa', 
        margin: '1rem', 
        borderRadius: '8px',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {storageStats ? (
          <>
            <span>📊 <strong>{storageStats.totalItems}</strong> elementos ({storageStats.files} archivos, {storageStats.folders} carpetas)</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>💾 <strong>{formatFileSize(storageStats.totalSize)}</strong></span>
              <button 
                onClick={loadStorageStats}
                style={{
                  background: 'none',
                  border: '1px solid #28a745',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: '#28a745'
                }}
                title="Actualizar estadísticas"
              >
                🔄
              </button>
            </div>
          </>
        ) : (
          <>
            <span>📊 Cargando estadísticas...</span>
            <button 
              onClick={loadStorageStats}
              style={{
                background: 'none',
                border: '1px solid #6c757d',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#6c757d'
              }}
              title="Cargar estadísticas"
            >
              🔄
            </button>
          </>
        )}
      </div>

      <div className="drive-controls">
        <BreadcrumbPath 
          folderStack={folderStack} 
          onNavigate={navigateBack}
          teamName={userTeam?.name}
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

        <div className="upload-container">
          <label className="upload-button" htmlFor="file-upload">
            {uploading ? '⬆️ Subiendo...' : '📤 Subir archivos'}
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Debug Panel (collapsible) */}
      <details style={{ margin: '1rem', padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>🔧 Debug Info</summary>
        {debugInfo.map((info, index) => (
          <div key={index} style={{ fontSize: '11px', fontFamily: 'monospace', margin: '1px 0' }}>
            {info}
          </div>
        ))}
      </details>

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
              {currentFolderPath === '' && (
                <div style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
                  <p>Esta es la carpeta raíz del equipo <strong>{userTeam?.name}</strong></p>
                  <p>Puedes subir archivos o navegar a las subcarpetas disponibles.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="files-grid">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`file-item ${file.isFolder ? 'folder' : 'file'} ${file.hasError ? 'file-error' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (file.isFolder) {
                      navigateToFolder(file);
                    } else {
                      if (file.webViewLink) {
                        window.open(file.webViewLink, '_blank');
                      }
                    }
                  }}
                >
                  <div className="file-icon">
                    <FileIcon mimeType={file.mimeType} name={file.name} />
                  </div>
                  <div className="file-info">
                    <div className="file-name" title={file.name}>
                      {file.name} {file.hasError && '⚠️'}
                    </div>
                    <div className="file-details">
                      {!file.isFolder && (
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

export default Firedrive; 