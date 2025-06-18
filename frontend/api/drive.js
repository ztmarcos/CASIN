import axios from 'axios';

// Google Drive API configuration
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

// Get API key from environment
const getApiKey = () => {
  return process.env.VITE_GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY;
};

// Test Drive connection
const testConnection = async () => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return { connected: false, error: 'API key not configured' };
    }

    // Test with a simple API call
    const response = await axios.get(`${GOOGLE_DRIVE_API_BASE}/about`, {
      params: {
        key: apiKey,
        fields: 'user'
      }
    });

    return { connected: true, user: response.data.user };
  } catch (error) {
    console.error('Drive connection test failed:', error);
    return { connected: false, error: error.message };
  }
};

// List files in a folder
const listFiles = async (folderId = null) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('Google Drive API key not configured');
    }

    const query = folderId ? `'${folderId}' in parents` : null;
    
    const response = await axios.get(`${GOOGLE_DRIVE_API_BASE}/files`, {
      params: {
        key: apiKey,
        q: query,
        fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,parents)',
        pageSize: 1000
      }
    });

    return {
      success: true,
      files: response.data.files || []
    };
  } catch (error) {
    console.error('Error listing Drive files:', error);
    return {
      success: false,
      message: error.message,
      files: []
    };
  }
};

// Download file from Google Drive
const downloadFile = async (fileId) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('Google Drive API key not configured');
    }

    // First, get file metadata to check if it's a Google Apps file
    const metadataResponse = await axios.get(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}`, {
      params: {
        key: apiKey,
        fields: 'id,name,mimeType,size'
      }
    });

    const fileMetadata = metadataResponse.data;

    // Check if it's a Google Apps file that needs export
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

    // Download the file
    const downloadParams = {
      key: apiKey,
      alt: 'media'
    };

    if (exportFormat) {
      downloadParams.mimeType = exportFormat;
    }

    const response = await axios.get(downloadUrl, {
      params: downloadParams,
      responseType: 'stream'
    });

    return {
      success: true,
      stream: response.data,
      filename: fileMetadata.name,
      mimeType: exportFormat || fileMetadata.mimeType,
      size: fileMetadata.size
    };

  } catch (error) {
    console.error('Error downloading file:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
};

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method, query, url } = req;

    if (method === 'GET') {
      // Parse the URL to determine the action
      const pathParts = url.split('/').filter(part => part);
      const action = pathParts[pathParts.length - 1];

      if (action === 'test') {
        // Test connection
        const result = await testConnection();
        res.status(200).json(result);
        
      } else if (action === 'files') {
        // List files
        const { folderId } = query;
        const result = await listFiles(folderId);
        res.status(200).json(result);
        
      } else if (action.startsWith('download')) {
        // Download file - expect URL like /api/drive/download/[fileId]
        const fileId = pathParts[pathParts.length - 1];
        
        if (!fileId || fileId === 'download') {
          res.status(400).json({ error: 'File ID is required' });
          return;
        }

        try {
          const downloadResult = await downloadFile(fileId);
          
          // Set appropriate headers
          res.setHeader('Content-Type', downloadResult.mimeType);
          res.setHeader('Content-Disposition', `attachment; filename="${downloadResult.filename}"`);
          
          if (downloadResult.size) {
            res.setHeader('Content-Length', downloadResult.size);
          }

          // Pipe the stream to response
          downloadResult.stream.pipe(res);
          
        } catch (downloadError) {
          res.status(500).json({ error: downloadError.message });
        }
        
      } else {
        res.status(404).json({ error: 'Invalid action' });
      }
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Drive API error:', error);
    res.status(500).json({ error: error.message });
  }
} 