const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileService = require('../services/fileService');
const fileRelationService = require('../services/fileRelationService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Test Firebase connection
router.get('/test-connection', async (req, res) => {
  try {
    const result = await fileService.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload file with record relationship
router.post('/upload/:tableName/:recordId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const result = await fileService.uploadFile(req.file, req.params.tableName);
    
    // If recordId is provided, link the file to the record
    if (req.params.recordId) {
      await fileRelationService.linkFileToRecord(result.id, req.params.tableName, req.params.recordId);
      
      // Special handling for GMM PDF files
      if (req.params.tableName === 'gmm') {
        await fileRelationService.updateGmmPdf(req.params.recordId, result.url);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload file without record ID
router.post('/upload/:tableName', upload.single('file'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const recordId = null;
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const result = await fileService.uploadFile(req.file, tableName);
    
    // If recordId is provided, link the file to the record
    if (recordId) {
      await fileRelationService.linkFileToRecord(result.id, tableName, recordId);
      
      // Special handling for GMM PDF files
      if (tableName === 'gmm') {
        await fileRelationService.updateGmmPdf(recordId, result.url);
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get files for a specific record
router.get('/:tableName/:recordId', async (req, res) => {
  try {
    const files = await fileRelationService.getFilesForRecord(
      req.params.tableName,
      req.params.recordId
    );
    res.json(files);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all files for a table
router.get('/:tableName', async (req, res) => {
  try {
    const files = await fileRelationService.getFilesForTable(req.params.tableName);
    res.json(files);
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file
router.delete('/:fileId', async (req, res) => {
  try {
    const result = await fileService.deleteFile(req.params.fileId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 