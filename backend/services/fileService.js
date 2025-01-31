const mysqlDatabase = require('./mysqlDatabase');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
});

const bucket = admin.storage().bucket();

const fileService = {
  // Test Firebase connection
  async testConnection() {
    try {
      const [exists] = await bucket.exists();
      return {
        success: true,
        message: 'Firebase Storage connection successful',
        bucket: bucket.name
      };
    } catch (error) {
      console.error('Firebase Storage connection error:', error);
      throw error;
    }
  },

  // Upload file to Firebase and store metadata in MySQL
  async uploadFile(file, tableName) {
    try {
      // 1. Upload to Firebase Storage
      const fileName = `${Date.now()}-${file.originalname}`;
      const fileUpload = bucket.file(fileName);
      
      await fileUpload.save(file.buffer, {
        metadata: {
          contentType: file.mimetype
        }
      });

      // 2. Get the public URL
      const [url] = await fileUpload.getSignedUrl({
        action: 'read',
        expires: '03-01-2500' // Long-lived URL
      });

      // 3. Store metadata in MySQL
      const fileMetadata = {
        filename: fileName,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size: file.size,
        url: url,
        upload_date: new Date(),
        table_name: tableName
      };

      const result = await mysqlDatabase.insertData('file_metadata', fileMetadata);
      return { ...fileMetadata, id: result.insertId };
    } catch (error) {
      console.error('Error in file upload:', error);
      throw error;
    }
  },

  // Delete file from Firebase and remove metadata from MySQL
  async deleteFile(fileId) {
    try {
      // 1. Get file metadata from MySQL
      const [fileMetadata] = await mysqlDatabase.getData('file_metadata', { id: fileId });
      if (!fileMetadata) {
        throw new Error('File not found');
      }

      // 2. Delete from Firebase Storage
      await bucket.file(fileMetadata.filename).delete();

      // 3. Delete metadata from MySQL
      await mysqlDatabase.deleteData('file_metadata', { id: fileId });

      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Error in file deletion:', error);
      throw error;
    }
  }
};

module.exports = fileService; 