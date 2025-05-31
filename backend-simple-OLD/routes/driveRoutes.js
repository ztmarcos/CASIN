const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Google Drive API
const initializeDrive = () => {
  try {
    console.log('Starting Drive initialization...');
    
    // Verify required environment variables
    const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
    const projectId = process.env.GOOGLE_DRIVE_PROJECT_ID;
    
    console.log('Environment variables check:', {
      hasClientEmail: !!clientEmail,
      hasFolderId: !!folderId,
      hasPrivateKey: !!privateKey,
      hasProjectId: !!projectId,
      clientEmail,
      folderId,
      projectId,
      privateKeyLength: privateKey?.length
    });
    
    if (!clientEmail || !folderId || !privateKey || !projectId) {
      throw new Error('Required environment variables are not set');
    }

    console.log('Creating auth object...');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
        project_id: projectId
      },
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
    });

    console.log('Auth object created successfully');
    const drive = google.drive({ version: 'v3', auth });
    console.log('Drive client created successfully');
    return drive;
  } catch (error) {
    console.error('Drive initialization detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    return null;
  }
};

// Test connection endpoint
router.get('/test', async (req, res) => {
  console.log('Starting drive test...');
  try {
    const drive = initializeDrive();
    if (!drive) {
      throw new Error('Drive initialization failed - check server logs for details');
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
    if (!folderId || folderId === 'root') {
      folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      console.log('Using default folder ID from env:', folderId);
    }

    // First check if the ID exists and get its details
    try {
      const fileCheck = await drive.files.get({
        fileId: folderId,
        fields: 'id, name, mimeType, webViewLink',
        supportsAllDrives: true
      });
      
      console.log('Target item details:', fileCheck.data);
      
      // If it's not a folder, return it as a single item
      if (fileCheck.data.mimeType !== 'application/vnd.google-apps.folder') {
        return res.json({
          files: [{
            ...fileCheck.data,
            isFolder: false
          }]
        });
      }
    } catch (error) {
      console.warn('Cannot access target:', error.message);
      return res.status(404).json({ 
        error: 'Cannot access the specified folder. Please check the folder ID and ensure the service account has access.',
        details: error.message 
      });
    }

    // If we get here, the ID exists and is a folder
    const query = `'${folderId}' in parents and trashed = false`;
    console.log('Fetching files with query:', query);

    const fields = req.query.fields || 'files(id, name, mimeType, webViewLink)';
    
    const response = await drive.files.list({
      q: query,
      pageSize: 100,
      fields: fields,
      orderBy: 'folder,name',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    console.log('Files list response:', {
      totalFiles: response.data.files?.length || 0,
      fileTypes: response.data.files?.map(f => f.mimeType) || []
    });
    
    const files = response.data.files.map(file => ({
      ...file,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder'
    }));

    res.json({ files });
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

// Add upload endpoint
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    const { folderId } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const drive = initializeDrive();
    if (!drive) {
      throw new Error('Failed to initialize Google Drive');
    }

    console.log('Uploading file:', {
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folderId
    });

    const fileMetadata = {
      name: file.originalname,
      parents: [folderId]
    };

    // Create a readable stream from the buffer
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(file.buffer);
    stream.push(null);

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: file.mimetype,
        body: stream
      },
      fields: 'id, name, mimeType, webViewLink'
    });

    console.log('Upload successful:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
});

module.exports = router; 