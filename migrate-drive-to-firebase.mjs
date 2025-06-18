#!/usr/bin/env node

/**
 * Google Drive to Firebase Storage Migration Script
 * Migrates all files from Google Drive to Firebase Storage for a specific team
 */

import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, listAll } from 'firebase/storage';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration (you'll need to replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyAQBqJ0jCgwF2DdGlRZlE8-U9Q8lPxdBNs",
  authDomain: "dbcasin.firebaseapp.com", 
  projectId: "dbcasin",
  storageBucket: "casinbbdd.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Google Drive API configuration
const GOOGLE_DRIVE_API_KEY = process.env.VITE_GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY;
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const ROOT_FOLDER_ID = '1rDGEXJg-8fssJ_atzDNHeJr6BouwGCCo'; // Default from your Drive component

// Target team ID
const TARGET_TEAM_ID = '4JlUqhAvfJMlCDhQ4vgH';

// Initialize Firebase
console.log('🔥 Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Migration stats
let migrationStats = {
  totalFiles: 0,
  processedFiles: 0,
  successfulFiles: 0,
  failedFiles: 0,
  errors: [],
  startTime: new Date()
};

/**
 * Get all files from Google Drive recursively
 */
async function getAllDriveFiles(folderId = null, parentPath = '') {
  try {
    console.log(`📂 Scanning Google Drive folder: ${folderId || 'root'} (${parentPath})`);
    
    if (!GOOGLE_DRIVE_API_KEY) {
      throw new Error('Google Drive API key not found. Set VITE_GOOGLE_DRIVE_API_KEY or GOOGLE_DRIVE_API_KEY environment variable');
    }

    const query = folderId ? `'${folderId}' in parents` : null;
    
    const response = await axios.get(`${GOOGLE_DRIVE_API_BASE}/files`, {
      params: {
        key: GOOGLE_DRIVE_API_KEY,
        q: query,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,parents)',
        pageSize: 1000
      }
    });

    const files = response.data.files || [];
    let allFiles = [];

    for (const file of files) {
      const filePath = parentPath ? `${parentPath}/${file.name}` : file.name;
      
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        // It's a folder, scan recursively
        console.log(`📁 Found folder: ${filePath}`);
        const subFiles = await getAllDriveFiles(file.id, filePath);
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
    console.error('❌ Error scanning Drive files:', error.message);
    throw error;
  }
}

/**
 * Download file from Google Drive
 */
async function downloadDriveFile(fileId, fileName) {
  try {
    console.log(`⬇️ Downloading file from Drive: ${fileName} (${fileId})`);
    
    // First get file metadata to check if it's a Google Apps file
    const metadataResponse = await axios.get(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}`, {
      params: {
        key: GOOGLE_DRIVE_API_KEY,
        fields: 'id,name,mimeType,size'
      }
    });

    const fileMetadata = metadataResponse.data;
    let downloadUrl;
    let exportFormat = null;

    if (fileMetadata.mimeType.startsWith('application/vnd.google-apps.')) {
      // It's a Google Apps file, need to export
      const mimeTypeMap = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.google-apps.drawing': 'image/png'
      };

      exportFormat = mimeTypeMap[fileMetadata.mimeType];
      if (!exportFormat) {
        throw new Error(`Cannot export Google Apps file of type: ${fileMetadata.mimeType}`);
      }

      downloadUrl = `${GOOGLE_DRIVE_API_BASE}/files/${fileId}/export`;
    } else {
      // Regular file, direct download
      downloadUrl = `${GOOGLE_DRIVE_API_BASE}/files/${fileId}`;
    }

    const downloadParams = {
      key: GOOGLE_DRIVE_API_KEY,
      alt: 'media'
    };

    if (exportFormat) {
      downloadParams.mimeType = exportFormat;
    }

    const response = await axios.get(downloadUrl, {
      params: downloadParams,
      responseType: 'arraybuffer'
    });

    console.log(`✅ Downloaded file: ${fileName} (${response.data.byteLength} bytes)`);
    return {
      data: response.data,
      filename: fileName,
      mimeType: exportFormat || fileMetadata.mimeType
    };

  } catch (error) {
    console.error(`❌ Error downloading file ${fileName}:`, error.message);
    throw error;
  }
}

/**
 * Get team storage path
 */
function getTeamStoragePath(teamId) {
  return `teams/${teamId}`;
}

/**
 * Get team folder path
 */
function getTeamFolderPath(folderPath, teamId) {
  const teamBasePath = getTeamStoragePath(teamId);
  return folderPath ? `${teamBasePath}/${folderPath}` : teamBasePath;
}

/**
 * Create folder structure in Firebase Storage by uploading a placeholder
 */
async function createFolderStructure(folderPath, teamId) {
  try {
    if (!folderPath) return;

    console.log(`📁 Creating folder structure: ${folderPath}`);
    
    // Create a placeholder file to ensure folder exists
    const placeholderPath = getTeamFolderPath(`${folderPath}/.placeholder`, teamId);
    const storageRef = ref(storage, placeholderPath);
    const placeholderContent = new Uint8Array(0); // Empty file
    
    await uploadBytes(storageRef, placeholderContent);
    console.log(`✅ Folder structure created: ${folderPath}`);
  } catch (error) {
    console.error(`❌ Error creating folder structure ${folderPath}:`, error.message);
    // Don't throw, folder creation failure shouldn't stop migration
  }
}

/**
 * Upload file to Firebase Storage
 */
async function uploadToFirebaseStorage(fileData, filePath, teamId) {
  try {
    const fullPath = getTeamFolderPath(filePath, teamId);
    console.log(`⬆️ Uploading to Firebase Storage: ${fullPath}`);
    
    const storageRef = ref(storage, fullPath);
    const uploadResult = await uploadBytes(storageRef, fileData.data, {
      contentType: fileData.mimeType
    });
    
    console.log(`✅ File uploaded successfully: ${fullPath}`);
    return {
      success: true,
      path: fullPath,
      ref: uploadResult.ref
    };
  } catch (error) {
    console.error(`❌ Error uploading file ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Migrate single file
 */
async function migrateSingleFile(driveFile, teamId) {
  try {
    console.log(`\n🔄 Processing: ${driveFile.relativePath}`);
    
    // Download file from Google Drive
    const fileData = await downloadDriveFile(driveFile.id, driveFile.name);

    // Create folder structure if needed
    if (driveFile.parentPath) {
      await createFolderStructure(driveFile.parentPath, teamId);
    }

    // Upload to Firebase Storage
    const uploadResult = await uploadToFirebaseStorage(
      fileData,
      driveFile.relativePath,
      teamId
    );

    migrationStats.successfulFiles++;
    console.log(`✅ Migrated successfully: ${driveFile.relativePath}`);
    
    return {
      success: true,
      driveFile,
      firebaseResult: uploadResult
    };

  } catch (error) {
    console.error(`❌ Error migrating file ${driveFile.name}:`, error.message);
    
    const errorInfo = {
      file: driveFile.name,
      path: driveFile.relativePath,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    migrationStats.failedFiles++;
    migrationStats.errors.push(errorInfo);

    return {
      success: false,
      driveFile,
      error: errorInfo
    };
  } finally {
    migrationStats.processedFiles++;
  }
}

/**
 * Ensure team storage structure exists
 */
async function ensureTeamStorageStructure(teamId) {
  try {
    console.log(`📁 Ensuring team storage structure for: ${teamId}`);
    
    const teamPath = getTeamStoragePath(teamId);
    const storageRef = ref(storage, teamPath);
    
    // Check if team storage exists
    try {
      const result = await listAll(storageRef);
      if (result.items.length > 0 || result.prefixes.length > 0) {
        console.log(`✅ Team storage already exists with ${result.items.length} files and ${result.prefixes.length} folders`);
        return;
      }
    } catch (error) {
      // Storage doesn't exist, we'll create it
    }

    // Create basic folder structure
    const folders = ['documentos', 'polizas', 'reportes', 'uploads', 'temp'];
    
    for (const folder of folders) {
      await createFolderStructure(folder, teamId);
    }

    // Create team info file
    const teamInfoPath = getTeamFolderPath('team-info.json', teamId);
    const teamInfoRef = ref(storage, teamInfoPath);
    const teamInfo = {
      teamId,
      createdAt: new Date().toISOString(),
      migratedFrom: 'Google Drive',
      migrationDate: new Date().toISOString()
    };
    
    await uploadBytes(teamInfoRef, new TextEncoder().encode(JSON.stringify(teamInfo, null, 2)), {
      contentType: 'application/json'
    });

    console.log(`✅ Team storage structure created for: ${teamId}`);
  } catch (error) {
    console.error(`❌ Error creating team storage structure:`, error.message);
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrateTeamDrive() {
  try {
    console.log('🚀 Starting Google Drive to Firebase Storage Migration');
    console.log(`📍 Target Team ID: ${TARGET_TEAM_ID}`);
    console.log(`📁 Root Folder ID: ${ROOT_FOLDER_ID}`);
    console.log('═'.repeat(60));

    // Ensure team storage structure exists
    await ensureTeamStorageStructure(TARGET_TEAM_ID);

    // Get all files from Google Drive
    console.log('\n🔍 Scanning Google Drive for files...');
    const allFiles = await getAllDriveFiles(ROOT_FOLDER_ID);
    
    // Filter out Google Apps files that can't be directly downloaded
    const downloadableFiles = allFiles.filter(file => 
      !file.mimeType.startsWith('application/vnd.google-apps.') ||
      ['document', 'spreadsheet', 'presentation', 'drawing'].some(type => 
        file.mimeType.includes(type)
      )
    );

    migrationStats.totalFiles = downloadableFiles.length;
    console.log(`📊 Found ${allFiles.length} total files, ${downloadableFiles.length} downloadable`);
    console.log('═'.repeat(60));

    // Migrate files one by one
    for (let i = 0; i < downloadableFiles.length; i++) {
      const file = downloadableFiles[i];
      console.log(`\n[${i + 1}/${downloadableFiles.length}] Processing: ${file.name}`);
      
      const result = await migrateSingleFile(file, TARGET_TEAM_ID);
      
      // Small delay to avoid overwhelming the APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Complete migration
    migrationStats.endTime = new Date();
    const duration = migrationStats.endTime - migrationStats.startTime;

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 MIGRATION COMPLETED!');
    console.log('═'.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   • Total files: ${migrationStats.totalFiles}`);
    console.log(`   • Successful: ${migrationStats.successfulFiles}`);
    console.log(`   • Failed: ${migrationStats.failedFiles}`);
    console.log(`   • Duration: ${Math.round(duration / 1000)}s`);
    console.log(`   • Team ID: ${TARGET_TEAM_ID}`);

    if (migrationStats.errors.length > 0) {
      console.log(`\n❌ Errors (${migrationStats.errors.length}):`);
      migrationStats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.file}: ${error.error}`);
      });
    }

    console.log('\n✅ Migration process finished!');
    console.log('🔥 Files are now available in Firebase Storage for the team.');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Check if this script is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Google Drive to Firebase Migration Script');
  console.log('═'.repeat(60));
  
  // Check for required environment variables
  if (!GOOGLE_DRIVE_API_KEY) {
    console.error('❌ Error: Google Drive API key not found!');
    console.error('Please set one of these environment variables:');
    console.error('  - VITE_GOOGLE_DRIVE_API_KEY');
    console.error('  - GOOGLE_DRIVE_API_KEY');
    process.exit(1);
  }

  // Start migration
  migrateTeamDrive()
    .then(() => {
      console.log('\n🎯 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
} 