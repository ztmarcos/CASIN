/**
 * Drive Migration Service
 * Migrates files from Google Drive to Firebase Storage for teams
 */

import axios from 'axios';
import { API_URL } from '../config/api.js';
import firebaseTeamStorageService from './firebaseTeamStorageService.js';

class DriveMigrationService {
  constructor() {
    this.migrationStatus = {
      inProgress: false,
      totalFiles: 0,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      errors: [],
      currentFile: null,
      startTime: null,
      endTime: null
    };
    this.onProgress = null;
  }

  // Set progress callback
  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  // Update progress and notify callback
  updateProgress(update) {
    this.migrationStatus = { ...this.migrationStatus, ...update };
    if (this.onProgress) {
      this.onProgress(this.migrationStatus);
    }
  }

  // Get all files from Google Drive recursively
  async getAllDriveFiles(folderId = null, parentPath = '') {
    try {
      console.log(`📂 Scanning Google Drive folder: ${folderId || 'root'} (${parentPath})`);
      
      const response = await axios.get(`${API_URL}/drive/files`, {
        params: { folderId }
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error fetching Drive files');
      }

      const files = response.data.files || [];
      let allFiles = [];

      for (const file of files) {
        const filePath = parentPath ? `${parentPath}/${file.name}` : file.name;
        
        if (file.mimeType === 'application/vnd.google-apps.folder') {
          // It's a folder, scan recursively
          console.log(`📁 Found folder: ${filePath}`);
          const subFiles = await this.getAllDriveFiles(file.id, filePath);
          allFiles = allFiles.concat(subFiles);
        } else {
          // It's a file
          console.log(`📄 Found file: ${filePath} (${file.mimeType})`);
          allFiles.push({
            ...file,
            relativePath: filePath,
            parentPath: parentPath
          });
        }
      }

      return allFiles;
    } catch (error) {
      console.error('❌ Error scanning Drive files:', error);
      throw error;
    }
  }

  // Download file from Google Drive
  async downloadDriveFile(fileId, fileName) {
    try {
      console.log(`⬇️ Downloading file from Drive: ${fileName} (${fileId})`);
      
      const response = await axios.get(`${API_URL}/drive/download/${fileId}`, {
        responseType: 'blob'
      });

      // Create File object from blob
      const file = new File([response.data], fileName, {
        type: response.data.type || 'application/octet-stream'
      });

      console.log(`✅ Downloaded file: ${fileName} (${file.size} bytes)`);
      return file;
    } catch (error) {
      console.error(`❌ Error downloading file ${fileName}:`, error);
      throw error;
    }
  }

  // Create folder structure in Firebase Storage
  async createFolderStructure(folderPath, teamId) {
    try {
      if (!folderPath) return;

      console.log(`📁 Creating folder structure: ${folderPath}`);
      
      // Create a placeholder file to ensure folder exists
      const placeholderContent = new Blob([''], { type: 'text/plain' });
      const placeholderFile = new File([placeholderContent], '.placeholder', {
        type: 'text/plain'
      });

      await firebaseTeamStorageService.uploadFileToTeam(
        placeholderFile, 
        folderPath, 
        teamId
      );

      console.log(`✅ Folder structure created: ${folderPath}`);
    } catch (error) {
      console.error(`❌ Error creating folder structure ${folderPath}:`, error);
      // Don't throw, folder creation failure shouldn't stop migration
    }
  }

  // Migrate single file
  async migrateSingleFile(driveFile, teamId) {
    try {
      this.updateProgress({ currentFile: driveFile.name });

      // Download file from Google Drive
      const file = await this.downloadDriveFile(driveFile.id, driveFile.name);

      // Create folder structure if needed
      if (driveFile.parentPath) {
        await this.createFolderStructure(driveFile.parentPath, teamId);
      }

      // Upload to Firebase Storage
      const uploadResult = await firebaseTeamStorageService.uploadFileToTeam(
        file,
        driveFile.parentPath,
        teamId
      );

      console.log(`✅ Migrated file: ${driveFile.relativePath}`);
      
      this.updateProgress({
        processedFiles: this.migrationStatus.processedFiles + 1,
        successfulFiles: this.migrationStatus.successfulFiles + 1
      });

      return {
        success: true,
        driveFile,
        firebaseResult: uploadResult
      };

    } catch (error) {
      console.error(`❌ Error migrating file ${driveFile.name}:`, error);
      
      const errorInfo = {
        file: driveFile.name,
        path: driveFile.relativePath,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.updateProgress({
        processedFiles: this.migrationStatus.processedFiles + 1,
        failedFiles: this.migrationStatus.failedFiles + 1,
        errors: [...this.migrationStatus.errors, errorInfo]
      });

      return {
        success: false,
        driveFile,
        error: errorInfo
      };
    }
  }

  // Start migration process
  async migrateTeamDrive(teamId, rootFolderId = null) {
    try {
      console.log(`🚀 Starting Drive migration for team: ${teamId}`);
      
      // Reset migration status
      this.migrationStatus = {
        inProgress: true,
        totalFiles: 0,
        processedFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        errors: [],
        currentFile: null,
        startTime: new Date(),
        endTime: null,
        teamId
      };

      this.updateProgress({});

      // Ensure team storage exists
      const storageExists = await firebaseTeamStorageService.checkTeamStorageExists(teamId);
      if (!storageExists.exists) {
        console.log('📁 Creating team storage structure...');
        await firebaseTeamStorageService.createTeamStorageStructure(teamId, `Team ${teamId}`);
      }

      // Get all files from Google Drive
      console.log('🔍 Scanning Google Drive for files...');
      const allFiles = await this.getAllDriveFiles(rootFolderId);
      
      // Filter out Google Apps files (can't be directly downloaded)
      const downloadableFiles = allFiles.filter(file => 
        !file.mimeType.startsWith('application/vnd.google-apps.') ||
        file.mimeType === 'application/vnd.google-apps.script'
      );

      console.log(`📊 Found ${allFiles.length} total files, ${downloadableFiles.length} downloadable`);
      
      this.updateProgress({
        totalFiles: downloadableFiles.length
      });

      // Migrate files one by one
      const results = [];
      for (const file of downloadableFiles) {
        const result = await this.migrateSingleFile(file, teamId);
        results.push(result);

        // Small delay to avoid overwhelming the APIs
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Complete migration
      this.updateProgress({
        inProgress: false,
        endTime: new Date(),
        currentFile: null
      });

      const summary = {
        totalFiles: downloadableFiles.length,
        successfulFiles: this.migrationStatus.successfulFiles,
        failedFiles: this.migrationStatus.failedFiles,
        duration: this.migrationStatus.endTime - this.migrationStatus.startTime,
        errors: this.migrationStatus.errors,
        teamId
      };

      console.log('🎉 Migration completed:', summary);
      return summary;

    } catch (error) {
      console.error('❌ Migration failed:', error);
      
      this.updateProgress({
        inProgress: false,
        endTime: new Date(),
        errors: [...this.migrationStatus.errors, {
          general: true,
          error: error.message,
          timestamp: new Date().toISOString()
        }]
      });

      throw error;
    }
  }

  // Get current migration status
  getMigrationStatus() {
    return { ...this.migrationStatus };
  }

  // Cancel migration (note: files already processed won't be reverted)
  cancelMigration() {
    this.updateProgress({
      inProgress: false,
      endTime: new Date(),
      errors: [...this.migrationStatus.errors, {
        general: true,
        error: 'Migration cancelled by user',
        timestamp: new Date().toISOString()
      }]
    });
  }
}

// Export singleton instance
export const driveMigrationService = new DriveMigrationService();
export default driveMigrationService; 