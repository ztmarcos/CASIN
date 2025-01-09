const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const credentials = require('./pdfcasin-1091c7357015.json');

// Initialize Google Drive API
const initializeDrive = () => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('Drive initialization error:', error);
    return null;
  }
};

// Test connection endpoint
router.get('/test', async (req, res) => {
  try {
    const drive = initializeDrive();
    if (!drive) {
      throw new Error('Failed to initialize Google Drive');
    }

    // Try to list files without folder restriction
    const response = await drive.files.list({
      pageSize: 10,
      fields: 'files(id, name)',
    });

    res.json({ 
      status: 'Connected', 
      message: 'Successfully connected to Google Drive',
      files: response.data.files
    });
  } catch (error) {
    console.error('Drive test error:', error);
    res.status(500).json({ 
      status: 'Error', 
      message: 'Failed to connect to Google Drive',
      error: error.message 
    });
  }
});

// Get files endpoint
router.get('/files', async (req, res) => {
  try {
    const drive = initializeDrive();
    if (!drive) {
      throw new Error('Failed to initialize Google Drive');
    }

    const response = await drive.files.list({
      pageSize: 100,
      fields: 'files(id, name, mimeType, modifiedTime)',
      orderBy: 'modifiedTime desc'
    });

    res.json({ 
      files: response.data.files
    });
  } catch (error) {
    console.error('Failed to fetch files:', error);
    res.status(500).json({ 
      error: 'Failed to fetch files from Google Drive',
      details: error.message 
    });
  }
});

module.exports = router; 