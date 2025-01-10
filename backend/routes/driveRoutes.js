const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

// Initialize Google Drive API
const initializeDrive = () => {
  try {
    console.log('Starting Drive initialization...');
    
    // Load credentials from file
    const credentialsPath = path.join(__dirname, '..', 'pdfcasin-1091c7357015.json');
    const credentials = require(credentialsPath);
    
    console.log('Credentials loaded:', {
      client_email: credentials.client_email,
      project_id: credentials.project_id
    });

    // Verify required environment variables
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID environment variable is not set');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
    });

    console.log('Auth object created');
    const drive = google.drive({ version: 'v3', auth });
    console.log('Drive client created');
    return drive;
  } catch (error) {
    console.error('Drive initialization error:', error.message);
    console.error('Error stack:', error.stack);
    return null;
  }
};

// Test connection endpoint
router.get('/test', async (req, res) => {
  console.log('Starting drive test...');
  try {
    const drive = initializeDrive();
    if (!drive) {
      throw new Error('Drive initialization failed');
    }

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    console.log('Using folder ID:', folderId);

    console.log('Attempting to list files...');
    const response = await drive.files.list({
      q: `'${folderId}' in parents`,
      pageSize: 10,
      fields: 'files(id, name, mimeType)',
    });

    console.log('Files list response:', response.data);
    res.json({ 
      status: 'Connected', 
      message: 'Successfully connected to Google Drive',
      files: response.data.files,
      folderId: folderId
    });
  } catch (error) {
    console.error('Drive test detailed error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errors: error.errors
    });
    
    res.status(500).json({ 
      status: 'Error', 
      message: 'Failed to connect to Google Drive',
      error: error.message,
      details: error.errors
    });
  }
});

// List files in a folder
router.get('/files', async (req, res) => {
  try {
    const drive = initializeDrive();
    if (!drive) {
      throw new Error('Failed to initialize Google Drive');
    }

    let folderId = req.query.folderId;
    // If folderId is 'root' or not specified, use the environment variable
    if (!folderId || folderId === 'root') {
      folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    }

    const query = `'${folderId}' in parents`;
    console.log('Fetching files with query:', query);

    const response = await drive.files.list({
      q: query,
      pageSize: 100,
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink)',
      orderBy: 'folder,name'
    });

    console.log(`Found ${response.data.files.length} files in folder ${folderId}`);
    res.json({ files: response.data.files });
  } catch (error) {
    console.error('Failed to fetch files:', error);
    res.status(500).json({ 
      error: 'Failed to fetch files from Google Drive',
      details: error.message 
    });
  }
});

// Create new folder
router.post('/folders', async (req, res) => {
  try {
    const drive = initializeDrive();
    if (!drive) {
      throw new Error('Failed to initialize Google Drive');
    }

    const { name, parentId } = req.body;
    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : [process.env.GOOGLE_DRIVE_FOLDER_ID]
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      fields: 'id, name, mimeType'
    });

    res.json(response.data);
  } catch (error) {
    console.error('Failed to create folder:', error);
    res.status(500).json({
      error: 'Failed to create folder',
      details: error.message
    });
  }
});

// Delete file or folder
router.delete('/files/:fileId', async (req, res) => {
  try {
    const drive = initializeDrive();
    if (!drive) {
      throw new Error('Failed to initialize Google Drive');
    }

    await drive.files.delete({
      fileId: req.params.fileId
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Failed to delete file:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      details: error.message
    });
  }
});

// Get file details
router.get('/files/:fileId', async (req, res) => {
  try {
    const drive = initializeDrive();
    if (!drive) {
      throw new Error('Failed to initialize Google Drive');
    }

    const response = await drive.files.get({
      fileId: req.params.fileId,
      fields: 'id, name, mimeType, modifiedTime, size, webViewLink'
    });

    res.json(response.data);
  } catch (error) {
    console.error('Failed to get file details:', error);
    res.status(500).json({
      error: 'Failed to get file details',
      details: error.message
    });
  }
});

module.exports = router; 