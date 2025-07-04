import { storage } from '../firebase/config.js';
import { ref, listAll, getDownloadURL, getMetadata, uploadBytes, deleteObject } from 'firebase/storage';

class FirebaseTeamStorageService {
  constructor() {
    this.currentTeamId = null;
    // Simple cache to avoid expensive operations
    this.cache = new Map();
  }

  // Simple cache methods
  cacheGet(key) {
    const item = this.cache.get(key);
    if (item && item.expires > Date.now()) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  cacheSet(key, data, ttlMs = 5 * 60 * 1000) { // 5 minutes default
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }

  // Set the current team context
  setCurrentTeam(teamId) {
    this.currentTeamId = teamId;
    console.log('🗂️ FirebaseTeamStorageService: Team set to', teamId);
  }

  // Get the team storage path
  getTeamStoragePath(teamId = this.currentTeamId) {
    if (!teamId) {
      throw new Error('No team ID provided');
    }
    return `teams/${teamId}`;
  }

  // Get the full storage path for a team folder
  getTeamFolderPath(folderPath = '', teamId = this.currentTeamId) {
    const teamPath = this.getTeamStoragePath(teamId);
    return folderPath ? `${teamPath}/${folderPath}` : teamPath;
  }

  // Create initial team storage structure
  async createTeamStorageStructure(teamId, teamName) {
    try {
      console.log(`🏗️ Creating storage structure for team: ${teamName} (${teamId})`);
      
      // Create basic folder structure for the team
      const baseFolders = [
        'documentos',
        'polizas',
        'reportes',
        'uploads',
        'temp'
      ];

      const createdFolders = [];

      for (const folderName of baseFolders) {
        try {
          // Create a placeholder file to establish the folder structure
          const folderPath = this.getTeamFolderPath(`${folderName}/.keep`);
          const placeholderContent = new Blob([
            `# ${folderName}\n\n` +
            `Esta carpeta pertenece al team: ${teamName}\n` +
            `Team ID: ${teamId}\n` +
            `Creado: ${new Date().toISOString()}\n` +
            `\n` +
            `Este archivo mantiene la estructura de carpetas.`
          ], { type: 'text/plain' });
          
          const storageRef = ref(storage, folderPath);
          await uploadBytes(storageRef, placeholderContent);
          
          createdFolders.push(folderName);
          console.log(`✅ Created folder: ${folderName}`);
        } catch (error) {
          console.error(`❌ Error creating folder ${folderName}:`, error);
        }
      }

      // Create team info file
      try {
        const teamInfoPath = this.getTeamFolderPath('team-info.json');
        const teamInfo = {
          teamId,
          teamName,
          created: new Date().toISOString(),
          folders: createdFolders,
          version: '1.0'
        };
        
        const teamInfoContent = new Blob([JSON.stringify(teamInfo, null, 2)], { 
          type: 'application/json' 
        });
        
        const teamInfoRef = ref(storage, teamInfoPath);
        await uploadBytes(teamInfoRef, teamInfoContent);
        
        console.log('✅ Created team info file');
      } catch (error) {
        console.error('❌ Error creating team info file:', error);
      }

      console.log(`🎉 Storage structure created for team ${teamName}: ${createdFolders.length} folders`);
      return {
        success: true,
        teamId,
        teamName,
        folders: createdFolders,
        basePath: this.getTeamStoragePath(teamId)
      };

    } catch (error) {
      console.error('❌ Error creating team storage structure:', error);
      throw error;
    }
  }

  // Check if team storage exists
  async checkTeamStorageExists(teamId) {
    try {
      const teamPath = this.getTeamStoragePath(teamId);
      const storageRef = ref(storage, teamPath);
      const result = await listAll(storageRef);
      
      return {
        exists: result.items.length > 0 || result.prefixes.length > 0,
        filesCount: result.items.length,
        foldersCount: result.prefixes.length
      };
    } catch (error) {
      console.error('❌ Error checking team storage:', error);
      return { exists: false, filesCount: 0, foldersCount: 0 };
    }
  }

  // List files and folders for a team
  async listTeamFiles(folderPath = '', teamId = this.currentTeamId) {
    try {
      if (!teamId) {
        throw new Error('No team ID provided');
      }

      const fullPath = this.getTeamFolderPath(folderPath, teamId);
      console.log(`📁 Listing files for team ${teamId} at path: ${fullPath}`);
      
      const storageRef = ref(storage, fullPath);
      const result = await listAll(storageRef);

      // Process folders (prefixes)
      const folders = result.prefixes.map((folderRef) => ({
        id: folderRef.fullPath,
        name: folderRef.name,
        mimeType: 'folder',
        isFolder: true,
        webViewLink: null,
        size: null,
        modifiedTime: null,
        fullPath: folderRef.fullPath,
        relativePath: folderRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, '')
      }));

      // Process files (items) with error handling
      const fileItems = await Promise.allSettled(
        result.items.map(async (itemRef) => {
          try {
            const metadata = await getMetadata(itemRef);
            const downloadURL = await getDownloadURL(itemRef);
            
            return {
              id: itemRef.fullPath,
              name: itemRef.name,
              mimeType: metadata.contentType || 'application/octet-stream',
              isFolder: false,
              webViewLink: downloadURL,
              size: metadata.size,
              modifiedTime: metadata.timeCreated,
              fullPath: itemRef.fullPath,
              relativePath: itemRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, ''),
              teamId
            };
          } catch (error) {
            console.error(`❌ Error getting metadata for ${itemRef.name}:`, error);
            return {
              id: itemRef.fullPath,
              name: itemRef.name,
              mimeType: 'application/octet-stream',
              isFolder: false,
              webViewLink: null,
              size: null,
              modifiedTime: null,
              fullPath: itemRef.fullPath,
              relativePath: itemRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, ''),
              hasError: true,
              teamId
            };
          }
        })
      );

      // Extract successful results
      const validFiles = fileItems
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const allFiles = [...folders, ...validFiles];
      
      console.log(`✅ Listed ${allFiles.length} items for team ${teamId}`);
      return allFiles;

    } catch (error) {
      console.error('❌ Error listing team files:', error);
      throw error;
    }
  }

  // Upload file to team storage
  async uploadFileToTeam(file, folderPath = '', teamId = this.currentTeamId) {
    try {
      if (!teamId) {
        throw new Error('No team ID provided');
      }

      const filePath = this.getTeamFolderPath(
        folderPath ? `${folderPath}/${file.name}` : file.name, 
        teamId
      );
      
      console.log(`⬆️ Uploading ${file.name} to team ${teamId} at: ${filePath}`);
      
      const storageRef = ref(storage, filePath);
      const result = await uploadBytes(storageRef, file);
      
      console.log(`✅ File ${file.name} uploaded successfully`);
      return {
        success: true,
        filePath,
        relativePath: filePath.replace(`${this.getTeamStoragePath(teamId)}/`, ''),
        fullPath: result.ref.fullPath,
        teamId
      };

    } catch (error) {
      console.error(`❌ Error uploading file ${file.name}:`, error);
      throw error;
    }
  }

  // Delete file from team storage
  async deleteFileFromTeam(filePath, teamId = this.currentTeamId) {
    try {
      if (!teamId) {
        throw new Error('No team ID provided');
      }

      // If filePath is already a full path, use it; otherwise construct it
      const fullPath = filePath.startsWith('teams/') ? 
        filePath : 
        this.getTeamFolderPath(filePath, teamId);
      
      console.log(`🗑️ Deleting file from team ${teamId}: ${fullPath}`);
      
      const storageRef = ref(storage, fullPath);
      await deleteObject(storageRef);
      
      console.log(`✅ File deleted successfully: ${fullPath}`);
      return { success: true, deletedPath: fullPath, teamId };

    } catch (error) {
      console.error(`❌ Error deleting file ${filePath}:`, error);
      throw error;
    }
  }

  // Recursively list all files and folders in team storage
  async listAllTeamFilesRecursive(folderPath = '', teamId = this.currentTeamId) {
    try {
      if (!teamId) {
        throw new Error('No team ID provided');
      }

      const fullPath = this.getTeamFolderPath(folderPath, teamId);
      const storageRef = ref(storage, fullPath);
      const result = await listAll(storageRef);

      let allFiles = [];

      // Process files in current folder
      const fileItems = await Promise.allSettled(
        result.items.map(async (itemRef) => {
          try {
            const metadata = await getMetadata(itemRef);
            return {
              id: itemRef.fullPath,
              name: itemRef.name,
              mimeType: metadata.contentType || 'application/octet-stream',
              isFolder: false,
              size: metadata.size,
              modifiedTime: metadata.timeCreated,
              fullPath: itemRef.fullPath,
              relativePath: itemRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, ''),
              teamId
            };
          } catch (error) {
            console.error(`❌ Error getting metadata for ${itemRef.name}:`, error);
            return {
              id: itemRef.fullPath,
              name: itemRef.name,
              mimeType: 'application/octet-stream',
              isFolder: false,
              size: 0, // Default to 0 for files with errors
              hasError: true,
              fullPath: itemRef.fullPath,
              relativePath: itemRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, ''),
              teamId
            };
          }
        })
      );

      // Add files from current folder
      const validFiles = fileItems
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      
      allFiles = [...allFiles, ...validFiles];

      // Process folders and recursively get their contents
      for (const folderRef of result.prefixes) {
        // Add the folder itself
        allFiles.push({
          id: folderRef.fullPath,
          name: folderRef.name,
          mimeType: 'folder',
          isFolder: true,
          size: null,
          fullPath: folderRef.fullPath,
          relativePath: folderRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, ''),
          teamId
        });

        // Recursively get files from this folder
        const subFolderPath = folderRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, '');
        const subFiles = await this.listAllTeamFilesRecursive(subFolderPath, teamId);
        allFiles = [...allFiles, ...subFiles];
      }

      return allFiles;

    } catch (error) {
      console.error(`❌ Error recursively listing team files:`, error);
      throw error;
    }
  }

  // Get team storage statistics (EXPENSIVE - use sparingly)
  async getTeamStorageStats(teamId = this.currentTeamId, force = false) {
    try {
      if (!teamId) {
        throw new Error('No team ID provided');
      }

      // Check cache first (10 minute cache)
      const cacheKey = `stats_${teamId}`;
      if (!force) {
        const cachedStats = this.cacheGet(cacheKey);
        if (cachedStats) {
          console.log(`📊 Using cached stats for team ${teamId} (avoiding expensive scan)`);
          return cachedStats;
        }
      }

      console.warn(`📊 🚨 EXPENSIVE: Calculating full storage stats for team ${teamId}... (scanning ALL files)`);
      const files = await this.listAllTeamFilesRecursive('', teamId);
      
      const stats = {
        totalItems: files.length,
        files: files.filter(item => !item.isFolder).length,
        folders: files.filter(item => item.isFolder).length,
        totalSize: files
          .filter(item => !item.isFolder && item.size)
          .reduce((total, file) => total + (parseInt(file.size) || 0), 0),
        teamId,
        lastUpdated: new Date().toISOString(),
        type: 'full'
      };

      // Cache for 10 minutes
      this.cacheSet(cacheKey, stats, 10 * 60 * 1000);

      console.log(`📊 Full storage stats calculated for team ${teamId}:`, stats);
      console.log(`   - Total files found: ${stats.files}`);
      console.log(`   - Total folders found: ${stats.folders}`);
      console.log(`   - Total size: ${stats.totalSize} bytes`);
      return stats;

    } catch (error) {
      console.error('❌ Error getting team storage stats:', error);
      throw error;
    }
  }

  // Get quick stats (MUCH faster - only root level)
  async getQuickTeamStats(teamId = this.currentTeamId) {
    try {
      if (!teamId) {
        throw new Error('No team ID provided');
      }

      console.log(`⚡ Getting quick stats for team ${teamId} (root level only)...`);
      
      const rootData = await this.listTeamFoldersOnly('', teamId);
      
      const quickStats = {
        rootFolders: rootData.folders.length,
        rootFiles: rootData.filesCount,
        hasContent: rootData.folders.length > 0 || rootData.filesCount > 0,
        teamId,
        type: 'quick',
        lastUpdated: new Date().toISOString()
      };
      
      console.log(`⚡ Quick stats for team ${teamId}:`, quickStats);
      
      return quickStats;
    } catch (error) {
      console.error('❌ Error getting quick stats:', error);
      throw error;
    }
  }

  // Test team storage connection
  async testTeamStorageConnection(teamId = this.currentTeamId) {
    try {
      if (!teamId) {
        throw new Error('No team ID provided');
      }

      console.log(`🔍 Testing storage connection for team: ${teamId}`);
      
      const teamPath = this.getTeamStoragePath(teamId);
      const storageRef = ref(storage, teamPath);
      
      // Try to list the team folder
      const result = await listAll(storageRef);
      
      console.log(`✅ Storage connection test successful for team ${teamId}`);
      return {
        success: true,
        teamId,
        filesCount: result.items.length,
        foldersCount: result.prefixes.length,
        message: 'Connection successful'
      };

    } catch (error) {
      console.error(`❌ Storage connection test failed for team ${teamId}:`, error);
      return {
        success: false,
        teamId,
        error: error.message,
        code: error.code
      };
    }
  }

  // ULTRA OPTIMIZED: ONLY folder names - NO files, NO counts, NO processing
  async listTeamFoldersOnly(folderPath = '', teamId = this.currentTeamId) {
    try {
      if (!teamId) {
        throw new Error('No team ID provided');
      }

      const fullPath = this.getTeamFolderPath(folderPath, teamId);
      console.log(`⚡ ULTRA FAST: ONLY folder names for team ${teamId} at path: ${fullPath}`);
      
      const storageRef = ref(storage, fullPath);
      const result = await listAll(storageRef);

      // ONLY process folder names - IGNORE files completely
      const folders = result.prefixes.map((folderRef) => ({
        id: folderRef.fullPath,
        name: folderRef.name,
        mimeType: 'folder',
        isFolder: true,
        webViewLink: null,
        size: null,
        modifiedTime: null,
        fullPath: folderRef.fullPath,
        relativePath: folderRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, '')
      }));

      console.log(`🚀 ULTRA FAST: ${folders.length} folders - NO FILE PROCESSING`);
      return {
        folders
      };

    } catch (error) {
      console.error('❌ Error listing team folders:', error);
      throw error;
    }
  }

  // OPTIMIZED: List files in a specific folder (no download URLs yet)
  async listFilesInFolder(folderPath, teamId = this.currentTeamId) {
    try {
      if (!teamId) {
        throw new Error('No team ID provided');
      }

      const fullPath = this.getTeamFolderPath(folderPath, teamId);
      console.log(`📄 Loading files ONLY for folder: ${fullPath}`);
      
      const storageRef = ref(storage, fullPath);
      const result = await listAll(storageRef);

      // Process files with basic metadata only (NO download URLs)
      const fileItems = await Promise.allSettled(
        result.items.map(async (itemRef) => {
          try {
            const metadata = await getMetadata(itemRef);
            
            return {
              id: itemRef.fullPath,
              name: itemRef.name,
              mimeType: metadata.contentType || 'application/octet-stream',
              isFolder: false,
              webViewLink: null, // Don't load download URL yet
              size: metadata.size,
              modifiedTime: metadata.timeCreated,
              fullPath: itemRef.fullPath,
              relativePath: itemRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, ''),
              teamId,
              urlLoaded: false, // Track if download URL has been loaded
              itemRef: itemRef // Store reference for later URL loading
            };
          } catch (error) {
            console.error(`❌ Error getting metadata for ${itemRef.name}:`, error);
            return {
              id: itemRef.fullPath,
              name: itemRef.name,
              mimeType: 'application/octet-stream',
              isFolder: false,
              webViewLink: null,
              size: null,
              modifiedTime: null,
              fullPath: itemRef.fullPath,
              relativePath: itemRef.fullPath.replace(`${this.getTeamStoragePath(teamId)}/`, ''),
              hasError: true,
              teamId
            };
          }
        })
      );

      // Extract successful results
      const validFiles = fileItems
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      console.log(`⚡ FAST: Loaded ${validFiles.length} files metadata (no download URLs)`);
      return validFiles;

    } catch (error) {
      console.error('❌ Error listing files in folder:', error);
      throw error;
    }
  }

  // OPTIMIZED: Load download URL only when needed (when file is clicked)
  async loadFileDownloadURL(file) {
    try {
      if (file.urlLoaded && file.webViewLink) {
        return file.webViewLink; // Already loaded
      }

      console.log(`🔗 Loading download URL for: ${file.name}`);
      const storageRef = ref(storage, file.fullPath);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update the file object
      file.webViewLink = downloadURL;
      file.urlLoaded = true;
      
      console.log(`✅ Download URL loaded for: ${file.name}`);
      return downloadURL;

    } catch (error) {
      console.error(`❌ Error loading download URL for ${file.name}:`, error);
      throw error;
    }
  }

  // OPTIMIZED: Get folder structure with lazy loading
  async getTeamFolderStructure(teamId = this.currentTeamId) {
    try {
      console.log(`🗂️ Getting folder structure for team: ${teamId}`);
      
      const rootFolders = await this.listTeamFoldersOnly('', teamId);
      
      // Build tree structure without loading all files
      const folderTree = {
        id: `team-${teamId}`,
        name: 'Root',
        isFolder: true,
        isExpanded: false,
        children: rootFolders.folders,
        filesCount: rootFolders.filesCount,
        hasFiles: rootFolders.hasFiles,
        teamId
      };

      console.log(`⚡ ULTRA FAST: Folder structure loaded (${rootFolders.folders.length} folders)`);
      return folderTree;

    } catch (error) {
      console.error('❌ Error getting folder structure:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const firebaseTeamStorageService = new FirebaseTeamStorageService();
export default firebaseTeamStorageService; 