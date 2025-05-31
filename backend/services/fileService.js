const mysqlDatabase = require('./mysqlDatabase');
const admin = require('firebase-admin');
const path = require('path');

let bucket = null;
let firebaseInitialized = false;

// Initialize Firebase Admin (Optional)
if (!admin.apps.length) {
  try {
    // Try to load Firebase credentials
    let serviceAccount = null;
    try {
      serviceAccount = require('../../casinbbdd-firebase-adminsdk-hnwk0-856db1f02b.json');
      
      // Check if it's dummy data
      if (serviceAccount.project_id === 'dummy-project' || 
          serviceAccount.private_key.includes('DUMMY_PRIVATE_KEY')) {
        console.log('⚠️  Firebase credentials contain dummy data. Firebase features will be disabled.');
        serviceAccount = null;
      }
    } catch (err) {
      console.log('⚠️  Firebase credentials file not found. Firebase features will be disabled.');
    }

    if (serviceAccount && process.env.VITE_FIREBASE_STORAGE_BUCKET) {
      console.log('Firebase Admin Initialization:', {
        projectId: serviceAccount.project_id,
        hasClientEmail: !!serviceAccount.client_email,
        hasPrivateKey: !!serviceAccount.private_key,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
      });

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
      });

      bucket = admin.storage().bucket(process.env.VITE_FIREBASE_STORAGE_BUCKET);
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized successfully');
    } else {
      console.log('⚠️  Firebase configuration incomplete. Firebase features will be disabled.');
    }
  } catch (error) {
    console.error('⚠️  Firebase Admin initialization error:', error.message);
    console.log('🔄 Backend will continue without Firebase features.');
  }
}

const fileService = {
  // Test Firebase connection
  async testConnection() {
    if (!firebaseInitialized || !bucket) {
      return {
        success: false,
        message: 'Firebase not initialized',
        bucket: null
      };
    }

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
    if (!firebaseInitialized || !bucket) {
      throw new Error('Firebase not initialized. Cannot upload files.');
    }

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
    if (!firebaseInitialized || !bucket) {
      throw new Error('Firebase not initialized. Cannot delete files.');
    }

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
  },

  // Check if Firebase is available
  isFirebaseAvailable() {
    return firebaseInitialized && !!bucket;
  }
};

module.exports = fileService; 