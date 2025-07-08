import React, { useState, useEffect, useRef, useMemo } from 'react';
import { storage } from '../../firebase/config.js';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { getCleanTeamName } from '../../utils/teamUtils';
import firebaseTeamStorageService from '../../services/firebaseTeamStorageService';
import firebaseStorageProxy from '../../services/firebaseStorageProxy';
import { ref, listAll, getDownloadURL, getMetadata, uploadBytes } from 'firebase/storage';
import './Drive.css';

// DEBUGGING: Direct Firebase check
const debugDirectFirebaseCheck = async (teamId, folderPath) => {
  try {
    console.log(`🐛 DIRECT FIREBASE CHECK: team ${teamId}, path "${folderPath}"`);
    const fullPath = `teams/${teamId}/${folderPath}`;
    const storageRef = ref(storage, fullPath);
    const result = await listAll(storageRef);
    
    console.log(`🐛 DIRECT RESULT: ${result.items.length} files found`);
    console.log(`🐛 DIRECT FILE NAMES:`, result.items.map(item => item.name));
    
    return result.items.length;
  } catch (error) {
    console.error('🐛 DIRECT CHECK ERROR:', error);
    return -1;
  }
};

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

const NavigationBar = ({ folderStack, onNavigateBack, teamName, currentPath }) => {
  const canGoBack = folderStack.length > 0;
  
  // Show current location
  const currentLocation = folderStack.length > 0 
    ? folderStack[folderStack.length - 1].name 
    : teamName || 'Root';
  
  return (
    <div className="folder-path">
      <button 
        className="back-button"
        onClick={onNavigateBack}
        disabled={!canGoBack}
        title={canGoBack ? 'Volver a la carpeta anterior' : 'Ya estás en la raíz'}
      >
        ←
      </button>
      
      <div className="current-location">
        <span className="location-icon">📁</span>
        <span className="location-name">{currentLocation}</span>
        {folderStack.length > 0 && (
          <span className="location-path">
            {folderStack.map(f => f.name).join(' / ')}
          </span>
        )}
      </div>
    </div>
  );
};

const Firedrive = () => {
  const { user } = useAuth();
  const { userTeam, isLoadingTeam } = useTeam();
  const [folders, setFolders] = useState([]);
  const [currentFiles, setCurrentFiles] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState(null);
  const [folderStack, setFolderStack] = useState([]);
  const [currentFolderPath, setCurrentFolderPath] = useState(ROOT_FOLDER_PATH);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [uploading, setUploading] = useState(false);
  const [debugInfo, setDebugInfo] = useState([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');

  // Add debug message helper with performance timing
  const addDebugInfo = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    const perfNow = performance.now();
    setDebugInfo(prev => [...prev.slice(-4), `${timestamp}: ${message}`]); // Keep last 5 messages
    console.log(`🔧 Debug [${perfNow.toFixed(1)}ms]: ${message}`);
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
      
      addDebugInfo(`Usuario: ${user.email} | Team: ${getCleanTeamName(userTeam.name)}`);
      addDebugInfo(`Team ID: ${userTeam.id}`);
      
      // Test team storage connection
      const connectionTest = await firebaseTeamStorageService.testTeamStorageConnection(userTeam.id);
      
      if (connectionTest.success) {
        addDebugInfo(`Conexión exitosa: ${connectionTest.filesCount} archivos, ${connectionTest.foldersCount} carpetas`);
        setConnectionStatus('connected');
        
        // OPTIMIZED MODE - Load folders and files separately
        addDebugInfo('🚀 MODO OPTIMIZADO: Carga por separado carpetas y archivos');
        
        return true;
      } else {
        addDebugInfo(`Error de conexión: ${connectionTest.error}`);
        
        // Check if team storage exists
        const existsCheck = await firebaseTeamStorageService.checkTeamStorageExists(userTeam.id);
        if (!existsCheck.exists) {
          addDebugInfo('Storage del equipo no existe, creando...');
          
          try {
            await firebaseTeamStorageService.createTeamStorageStructure(userTeam.id, getCleanTeamName(userTeam.name));
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

  // DISABLED: Test upload for ultra fast mode
  const testUpload = async () => {
    addDebugInfo('🚀 Upload test deshabilitado en modo ultra rápido');
    return true;
  };

  // OPTIMIZED: Load folder structure
  const loadFolderStructure = async () => {
    try {
      setLoadingFolders(true);
      setError(null);
      
      if (!userTeam) {
        addDebugInfo('No hay equipo disponible para listar carpetas');
        setFolders([]);
        return;
      }
      
              addDebugInfo(`⚡ Cargando carpetas para team: ${getCleanTeamName(userTeam.name)} en path: "${currentFolderPath}"`);
      
      const folderData = await firebaseTeamStorageService.listTeamFoldersOnly(currentFolderPath, userTeam.id);
      
      addDebugInfo(`📁 Cargadas ${folderData.folders.length} carpetas`);
      
      setFolders(folderData.folders);
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('❌ Error loading folder structure:', error);
      addDebugInfo(`Error al cargar carpetas: ${error.code || error.message}`);
      setError(`Error al cargar carpetas: ${error.message}`);
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  // OPTIMIZED: Load files in current folder
  const loadCurrentFolderFiles = async () => {
    try {
      setLoadingFiles(true);
      setError(null);
      
      if (!userTeam) {
        addDebugInfo('No hay equipo disponible para listar archivos');
        setCurrentFiles([]);
        return;
      }
      
      addDebugInfo(`📄 Cargando archivos para path: "${currentFolderPath}"`);
      
      // DEBUGGING: Direct Firebase check
      const directCount = await debugDirectFirebaseCheck(userTeam.id, currentFolderPath);
      addDebugInfo(`🐛 DIRECT COUNT: ${directCount} files found via direct Firebase call`);
      
      const files = await firebaseTeamStorageService.listFilesInFolder(currentFolderPath, userTeam.id);
      
      addDebugInfo(`📄 Cargados ${files.length} archivos para "${currentFolderPath}"`);
      addDebugInfo(`🔍 COMPARISON: Direct count ${directCount} vs Service count ${files.length}`);
      
      // Filter out .keep files for cleaner display
      const visibleFiles = files.filter(file => file.name !== '.keep');
      
      addDebugInfo(`📄 Archivos visibles: ${visibleFiles.length} (sin archivos .keep)`);
      
      if (directCount !== files.length) {
        addDebugInfo(`⚠️ MISMATCH DETECTED! Direct Firebase vs Service count differs`);
      }
      
      setCurrentFiles(visibleFiles);
      
    } catch (error) {
      console.error('❌ Error loading files:', error);
      addDebugInfo(`Error al cargar archivos: ${error.code || error.message}`);
      setError(`Error al cargar archivos: ${error.message}`);
      setCurrentFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  // OPTIMIZED: Navigate to folder - load folders and files
  const navigateToFolder = async (folder) => {
    addDebugInfo(`📁 Navegando a carpeta: ${folder.name}`);
    
    if (!folder.isFolder) return;
    
    // Check if we're already in this folder
    if (currentFolderPath === folder.relativePath) {
      addDebugInfo('Ya estamos en esta carpeta');
      return;
    }
    
    try {
      // Clear current files immediately to avoid showing old files
      setCurrentFiles([]);
      setFolders([]);
      
      // Update folder stack first
      const newStack = [...folderStack, { path: folder.relativePath, name: folder.name }];
      setFolderStack(newStack);
      
      // Update current folder path
      setCurrentFolderPath(folder.relativePath);
      
      // The useEffect will handle loading the new content
      
    } catch (error) {
      console.error('❌ Error navigating to folder:', error);
      addDebugInfo(`Error navegando a carpeta: ${error.message}`);
    }
  };

  // Navigate back one level
  const navigateBack = async () => {
    if (folderStack.length === 0) {
      addDebugInfo('Ya estamos en la raíz, no podemos ir más atrás');
      return;
    }
    
    addDebugInfo('Navegando un nivel hacia atrás');
    
    // Clear current files immediately to avoid showing old files
    setCurrentFiles([]);
    setFolders([]);
    
    // Remove the last folder from stack
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    
    // Set new path (root if stack is empty, otherwise last folder in stack)
    const newPath = newStack.length === 0 
      ? ROOT_FOLDER_PATH 
      : newStack[newStack.length - 1].path;
    
    setCurrentFolderPath(newPath);
    
    // The useEffect will handle loading the new content
  };

  // Handle file click - load download URL if needed
  const handleFileClick = async (file) => {
    if (file.isFolder) {
      await navigateToFolder(file);
      return;
    }
    
    try {
      addDebugInfo(`🔗 Cargando URL para archivo: ${file.name}`);
      
      const downloadURL = await firebaseTeamStorageService.loadFileDownloadURL(file);
      
      // Open file in new tab
      window.open(downloadURL, '_blank');
      
      addDebugInfo(`✅ Archivo abierto: ${file.name}`);
      
    } catch (error) {
      console.error('❌ Error loading file:', error);
      addDebugInfo(`Error cargando archivo: ${error.message}`);
      alert(`Error al cargar el archivo: ${error.message}`);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      alert('Por favor ingresa un nombre para la carpeta');
      return;
    }

    // Validate folder name
    const sanitizedName = newFolderName.trim().replace(/[^a-zA-Z0-9\-_\s]/g, '');
    if (!sanitizedName) {
      alert('El nombre de la carpeta contiene caracteres no válidos');
      return;
    }

    try {
      addDebugInfo(`📁 Creando carpeta: "${sanitizedName}" en path: "${currentFolderPath}"`);
      
      // Create a placeholder file to establish the folder
      const folderPath = currentFolderPath 
        ? `${currentFolderPath}/${sanitizedName}/.keep`
        : `${sanitizedName}/.keep`;
      
      const placeholderContent = new Blob([
        `# ${sanitizedName}\n\n` +
        `Carpeta creada: ${new Date().toISOString()}\n` +
        `Ubicación: ${currentFolderPath || 'raíz'}\n` +
        `Team: ${userTeam?.name}\n` +
        `\n` +
        `Este archivo mantiene la estructura de la carpeta.`
      ], { type: 'text/plain' });
      
      await firebaseTeamStorageService.uploadFileToTeam(
        new File([placeholderContent], '.keep', { type: 'text/plain' }),
        currentFolderPath ? `${currentFolderPath}/${sanitizedName}` : sanitizedName,
        userTeam.id
      );
      
      addDebugInfo(`✅ Carpeta "${sanitizedName}" creada exitosamente`);
      
      // Clear form and close modal
      setNewFolderName('');
      setShowCreateFolder(false);
      
      // Clear current state to force refresh
      setFolders([]);
      
      // Reload folder structure only (files should remain as they were)
      await loadFolderStructure();
      
    } catch (error) {
      console.error('❌ Error creating folder:', error);
      addDebugInfo(`Error creando carpeta: ${error.message}`);
      alert(`Error al crear la carpeta: ${error.message}`);
    }
  };

  // Cancel folder creation
  const handleCancelCreateFolder = () => {
    setNewFolderName('');
    setShowCreateFolder(false);
  };

  // Context menu handlers
  const handleRightClick = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      item: item
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const openRenameModal = (item) => {
    setSelectedItem(item);
    setNewItemName(item.name);
    setShowRenameModal(true);
    closeContextMenu();
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
    closeContextMenu();
  };

  const handleRename = async () => {
    if (!selectedItem || !newItemName.trim()) {
      alert('Por favor ingresa un nombre válido');
      return;
    }

    const sanitizedName = newItemName.trim().replace(/[^a-zA-Z0-9\-_\s\.]/g, '');
    if (!sanitizedName) {
      alert('El nombre contiene caracteres no válidos');
      return;
    }

    if (sanitizedName === selectedItem.name) {
      setShowRenameModal(false);
      return;
    }

    try {
      addDebugInfo(`✏️ Renombrando "${selectedItem.name}" a "${sanitizedName}"`);

      if (selectedItem.isFolder) {
        // For folders, we need to recreate the structure
        await handleFolderRename(selectedItem, sanitizedName);
      } else {
        // For files, rename by copying and deleting
        await handleFileRename(selectedItem, sanitizedName);
      }

      addDebugInfo(`✅ "${selectedItem.name}" renombrado a "${sanitizedName}"`);
      
      setShowRenameModal(false);
      setSelectedItem(null);
      setNewItemName('');
      
      // Refresh the current view
      await Promise.all([
        loadFolderStructure(),
        loadCurrentFolderFiles()
      ]);

    } catch (error) {
      console.error('❌ Error renaming item:', error);
      addDebugInfo(`Error renombrando: ${error.message}`);
      alert(`Error al renombrar: ${error.message}`);
    }
  };

  const handleFolderRename = async (folder, newName) => {
    // Since Firebase Storage doesn't support folder renaming directly,
    // we'd need to copy all contents and delete the old folder
    // For now, we'll show a message about this limitation
    throw new Error('El renombrado de carpetas requiere recrear la estructura completa. Considera crear una nueva carpeta y mover el contenido manualmente.');
  };

  const handleFileRename = async (file, newName) => {
    // For files, we'd need to download the file, upload it with the new name, and delete the old one
    // This is a complex operation that requires handling the file data
    throw new Error('El renombrado de archivos requiere descargar y volver a subir el archivo. Considera subir el archivo con el nuevo nombre y eliminar el anterior.');
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      addDebugInfo(`🗑️ Eliminando "${selectedItem.name}"`);

      if (selectedItem.isFolder) {
        await handleFolderDelete(selectedItem);
      } else {
        await handleFileDelete(selectedItem);
      }

      addDebugInfo(`✅ "${selectedItem.name}" eliminado exitosamente`);
      
      setShowDeleteModal(false);
      setSelectedItem(null);
      
      // Refresh the current view
      await Promise.all([
        loadFolderStructure(),
        loadCurrentFolderFiles()
      ]);

    } catch (error) {
      console.error('❌ Error deleting item:', error);
      addDebugInfo(`Error eliminando: ${error.message}`);
      alert(`Error al eliminar: ${error.message}`);
    }
  };

  const handleFolderDelete = async (folder) => {
    // Delete folder by removing its .keep file and any contents
    try {
      const keepFilePath = `${folder.relativePath}/.keep`;
      await firebaseTeamStorageService.deleteFileFromTeam(keepFilePath, userTeam.id);
      
      // Note: In a production environment, you'd want to recursively delete all contents
      // For now, this will work for empty folders (which only have .keep files)
    } catch (error) {
      // If .keep file doesn't exist, that's okay for empty folders
      if (!error.message.includes('not found')) {
        throw error;
      }
    }
  };

  const handleFileDelete = async (file) => {
    await firebaseTeamStorageService.deleteFileFromTeam(file.relativePath, userTeam.id);
  };

  const cancelRename = () => {
    setShowRenameModal(false);
    setSelectedItem(null);
    setNewItemName('');
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedItem(null);
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    if (!userTeam) {
      alert('No hay equipo asignado para subir archivos');
      event.target.value = '';
      return;
    }

    try {
      setUploading(true);
      addDebugInfo(`📤 Subiendo ${files.length} archivo(s) a "${currentFolderPath || 'raíz'}"`);

      const uploadPromises = Array.from(files).map(async (file) => {
        try {
          addDebugInfo(`⬆️ Subiendo: ${file.name} (${formatFileSize(file.size)})`);
          
          const result = await firebaseTeamStorageService.uploadFileToTeam(
            file,
            currentFolderPath || '',
            userTeam.id
          );
          
          addDebugInfo(`✅ Subido: ${file.name}`);
          return result;
        } catch (error) {
          addDebugInfo(`❌ Error subiendo ${file.name}: ${error.message}`);
          throw error;
        }
      });

      await Promise.all(uploadPromises);
      
      addDebugInfo(`🎉 Todos los archivos subidos exitosamente`);
      
      // Add delay to allow Firebase to propagate changes
      addDebugInfo(`⏳ Esperando 2 segundos para refrescar...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear current files before refreshing to force a clean reload
      setCurrentFiles([]);
      addDebugInfo(`🔄 Limpiando cache y recargando archivos...`);
      
      // Refresh current folder files to show new uploads
      await loadCurrentFolderFiles();
      
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      addDebugInfo(`Error en upload: ${error.message}`);
      alert(`Error al subir archivos: ${error.message}`);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  // Note: Filtering is now done inline in the render for better performance with lazy loading

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

  // DISABLED: No stats in ultra fast mode

  // Initial load - wait for user authentication and team
  useEffect(() => {
    const initializeFiredrive = async () => {
      const startTime = performance.now();
      addDebugInfo('⏱️ INICIANDO Firedrive - Midiendo velocidad...');
      
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
      
              addDebugInfo(`✅ Usuario encontrado: ${user.email} | Team: ${getCleanTeamName(userTeam.name)}`);
      
      const connectionStart = performance.now();
      const isConnected = await testConnection();
      const connectionTime = performance.now() - connectionStart;
      addDebugInfo(`⏱️ Test conexión: ${connectionTime.toFixed(1)}ms`);
      
      if (isConnected) {
        addDebugInfo('⚡ Cargando carpetas y archivos iniciales...');
        
        const loadStart = performance.now();
        await Promise.all([
          loadFolderStructure(),
          loadCurrentFolderFiles()
        ]);
        const loadTime = performance.now() - loadStart;
        addDebugInfo(`⏱️ Carga inicial: ${loadTime.toFixed(1)}ms`);
        
        const totalTime = performance.now() - startTime;
        addDebugInfo(`🏁 TERMINADO - Total: ${totalTime.toFixed(1)}ms`);
      }
    };
    
    initializeFiredrive();
  }, [user, userTeam, isLoadingTeam]); // Add team dependencies

  // Path change detection - load content when path changes (excluding initial load)
  const isInitialLoad = useRef(true);
  
  useEffect(() => {
    if (connectionStatus === 'connected' && currentFolderPath !== undefined && userTeam && !isInitialLoad.current) {
      addDebugInfo(`⚡ Path cambiado: "${currentFolderPath}" - recargando contenido...`);
      
      // Load content when path changes (not initial load)
      const loadContent = async () => {
        try {
          await Promise.all([
            loadFolderStructure(),
            loadCurrentFolderFiles()
          ]);
          addDebugInfo(`✅ Contenido cargado para path: "${currentFolderPath}"`);
        } catch (error) {
          console.error('❌ Error loading content for path change:', error);
          addDebugInfo(`Error cargando contenido: ${error.message}`);
        }
      };
      
      loadContent();
    }
    
    // After first render, mark as not initial
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [currentFolderPath, userTeam]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // Show loading while team is being loaded
  if (isLoadingTeam || (!userTeam && !error)) {
    return (
      <div className="drive-container">
        <div className="drive-header">
          <h2>Drive</h2>
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
        <h2>Drive - {userTeam?.name || 'Team'}</h2>
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
          <h2>Drive - {userTeam?.name || 'Team'}</h2>
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
        <h2>Drive - {userTeam?.name || 'Team'}</h2>
        <div className="status-badge connected">
          ✅ Conectado
        </div>
      </div>

      {/* BANNER DE INFORMACIÓN */}
      <div style={{ 
        padding: '0.5rem 1rem', 
        background: '#f8f9ff', 
        margin: '1rem', 
        borderRadius: '8px',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid #e3f2fd'
      }}>
        <span style={{ color: '#1c1e21', fontWeight: '500' }}>
          Almacenamiento del equipo: <strong>{userTeam?.name}</strong>
        </span>
        <span style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>
          📁 {folders.length} carpetas
        </span>
      </div>

      <div className="drive-controls">
        <NavigationBar 
          folderStack={folderStack} 
          onNavigateBack={navigateBack}
          teamName={userTeam?.name}
          currentPath={currentFolderPath}
        />
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar archivos y carpetas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="action-buttons">
          <button
            className="create-folder-btn"
            onClick={() => setShowCreateFolder(true)}
            title="Crear nueva carpeta"
          >
            📁+ Nueva carpeta
          </button>
          
          <label className="upload-button" htmlFor="file-upload">
            {uploading ? '⬆️ Subiendo...' : '📤 Subir'}
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

      {(loadingFolders || loadingFiles) ? (
        <div className="loading-container">
          <div className="loading-spinner">🔄</div>
          <p>⚡ Cargando {loadingFolders ? 'carpetas' : 'archivos'}...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>❌ {error}</p>
          <button onClick={() => {
            loadFolderStructure();
            loadCurrentFolderFiles();
          }} className="retry-button">
            🔄 Reintentar
          </button>
        </div>
      ) : (
        <div className="files-container">
          {/* CARPETAS */}
          {folders.length > 0 && (
            <div className="folders-section">
              <h3 style={{ margin: '1rem', color: '#0066cc', fontSize: '18px', fontWeight: 'bold' }}>
                📁 Carpetas ({folders.length})
              </h3>
              <div className="files-grid">
                {folders
                  .filter(folder => 
                    !searchTerm || folder.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((folder) => (
                    <div
                      key={folder.id}
                      className="file-item folder"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigateToFolder(folder);
                      }}
                      onContextMenu={(e) => handleRightClick(e, folder)}
                    >
                      <div className="file-icon">
                        <FileIcon mimeType="folder" name={folder.name} />
                      </div>
                      <div className="file-info">
                        <div className="file-name" title={folder.name}>
                          {folder.name}
                        </div>
                        <div className="file-details">
                          <span className="folder-status" style={{ color: '#0066cc', fontWeight: 'bold' }}>
                            📁 Click para entrar
                          </span>
                        </div>
                      </div>
                      
                      {/* Hover Actions */}
                      <div className="hover-actions">
                        <button 
                          className="hover-action edit"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openRenameModal(folder);
                          }}
                          title="Renombrar carpeta"
                        >
                          ✏️
                        </button>
                        <button 
                          className="hover-action delete"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openDeleteModal(folder);
                          }}
                          title="Eliminar carpeta"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ARCHIVOS */}
          {currentFiles.length > 0 && (
            <div className="files-section">
              <h3 style={{ margin: '1rem', color: '#28a745', fontSize: '18px', fontWeight: 'bold' }}>
                📄 Archivos ({currentFiles.length})
              </h3>
              <div className="files-grid">
                {currentFiles
                  .filter(file => 
                    !searchTerm || file.name.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((file) => (
                    <div
                      key={file.id}
                      className="file-item"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFileClick(file);
                      }}
                      onContextMenu={(e) => handleRightClick(e, file)}
                    >
                      <div className="file-icon">
                        <FileIcon mimeType={file.mimeType} name={file.name} />
                      </div>
                      <div className="file-info">
                        <div className="file-name" title={file.name}>
                          {file.name}
                        </div>
                        <div className="file-details">
                          <span className="file-size">{formatFileSize(file.size)}</span>
                          <span className="file-date">{formatDate(file.modifiedTime)}</span>
                        </div>
                      </div>
                      
                      {/* Hover Actions */}
                      <div className="hover-actions">
                        <button 
                          className="hover-action edit"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openRenameModal(file);
                          }}
                          title="Renombrar archivo"
                        >
                          ✏️
                        </button>
                        <button 
                          className="hover-action delete"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openDeleteModal(file);
                          }}
                          title="Eliminar archivo"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* MENSAJE CUANDO NO HAY CONTENIDO */}
          {folders.length === 0 && currentFiles.length === 0 && !loadingFolders && !loadingFiles && (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>Carpeta vacía</h3>
              <p>Esta carpeta no contiene archivos ni subcarpetas.</p>
              {currentFolderPath === '' && (
                <div style={{ marginTop: '1rem', fontSize: '14px', color: '#666' }}>
                  <p>Esta es la carpeta raíz del equipo <strong>{userTeam?.name}</strong></p>
                  <p>⚡ <strong>MODO OPTIMIZADO:</strong> Carpetas y archivos separados</p>
                  <p>🚀 Sin stats para máxima velocidad</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal para crear carpeta */}
      {showCreateFolder && (
        <div className="modal-backdrop" onClick={handleCancelCreateFolder}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📁 Crear nueva carpeta</h3>
            </div>
            
            <div className="modal-body">
              <div className="folder-location">
                <strong>Ubicación:</strong> {currentFolderPath || 'Carpeta raíz'} / {userTeam?.name}
              </div>
              
              <div className="input-group">
                <label htmlFor="folder-name">Nombre de la carpeta:</label>
                <input
                  id="folder-name"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ej: Documentos 2024"
                  className="folder-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFolder();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                className="modal-button cancel"
                onClick={handleCancelCreateFolder}
              >
                Cancelar
              </button>
              <button
                className="modal-button confirm"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Crear carpeta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="context-menu"
          style={{
            top: contextMenu.y,
            left: contextMenu.x
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="context-menu-item"
            onClick={() => openRenameModal(contextMenu.item)}
          >
            ✏️ Renombrar
          </div>
          <div 
            className="context-menu-item danger"
            onClick={() => openDeleteModal(contextMenu.item)}
          >
            🗑️ Eliminar
          </div>
        </div>
      )}

      {/* Modal para renombrar */}
      {showRenameModal && selectedItem && (
        <div className="modal-backdrop" onClick={cancelRename}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Renombrar {selectedItem.isFolder ? 'carpeta' : 'archivo'}</h3>
            </div>
            
            <div className="modal-body">
              <div className="folder-location">
                <strong>Elemento:</strong> {selectedItem.name}
              </div>
              
              <div className="input-group">
                <label htmlFor="new-name">Nuevo nombre:</label>
                <input
                  id="new-name"
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Ingresa el nuevo nombre"
                  className="folder-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleRename();
                    }
                  }}
                  autoFocus
                />
              </div>
              
              <div className="warning-box">
                ⚠️ Nota: El renombrado de {selectedItem.isFolder ? 'carpetas' : 'archivos'} 
                puede tomar tiempo y actualmente tiene limitaciones en Firebase Storage.
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                className="modal-button cancel"
                onClick={cancelRename}
              >
                Cancelar
              </button>
              <button
                className="modal-button confirm"
                onClick={handleRename}
                disabled={!newItemName.trim() || newItemName === selectedItem.name}
              >
                Renombrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para confirmar eliminación */}
      {showDeleteModal && selectedItem && (
        <div className="modal-backdrop" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#dc3545' }}>🗑️ Confirmar eliminación</h3>
            </div>
            
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <strong>¿Estás seguro de que quieres eliminar {selectedItem.isFolder ? 'la carpeta' : 'el archivo'} "{selectedItem.name}"?</strong>
              </div>
              
              {selectedItem.isFolder && (
                <div className="danger-box">
                  ⚠️ Advertencia: Esto eliminará la carpeta y todo su contenido de forma permanente.
                </div>
              )}
              
              <div className="info-box">
                💡 Esta acción no se puede deshacer.
              </div>
            </div>
            
            <div className="modal-actions">
              <button
                className="modal-button cancel"
                onClick={cancelDelete}
              >
                Cancelar
              </button>
              <button
                className="modal-button"
                onClick={handleDelete}
                style={{ 
                  background: '#dc3545', 
                  color: 'white',
                  border: 'none'
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Firedrive; 