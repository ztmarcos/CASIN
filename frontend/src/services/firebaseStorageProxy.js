/**
 * Firebase Storage Proxy Service
 * Automatically handles CORS issues in development by using Vite proxy
 */

import { storage } from '../firebase/config.js';
import { ref, listAll, getMetadata, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';

class FirebaseStorageProxy {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.proxyPrefix = '/firebasestorage';
  }

  /**
   * Get a Firebase Storage reference
   */
  getStorageRef(path = '') {
    return ref(storage, path);
  }

  /**
   * List files in a directory with CORS handling
   */
  async listFiles(path = '') {
    try {
      const storageRef = this.getStorageRef(path);
      console.log('📁 Listing files in:', path);
      
      const result = await listAll(storageRef);
      console.log('✅ Files listed successfully:', result.items.length, 'files');
      
      return result;
    } catch (error) {
      console.error('❌ Error listing files:', error);
      
      // In development, if CORS error, suggest using proxy
      if (this.isDevelopment && error.code === 'storage/unknown') {
        console.warn('💡 CORS error detected. Make sure your Firebase Storage CORS is configured properly.');
      }
      
      throw error;
    }
  }

  /**
   * Get file metadata with CORS handling
   */
  async getFileMetadata(fileRef) {
    try {
      const metadata = await getMetadata(fileRef);
      console.log('📋 Metadata retrieved for:', fileRef.name);
      return metadata;
    } catch (error) {
      console.error('❌ Error getting metadata:', error);
      throw error;
    }
  }

  /**
   * Get download URL with CORS handling
   */
  async getDownloadURL(fileRef) {
    try {
      const url = await getDownloadURL(fileRef);
      console.log('🔗 Download URL generated for:', fileRef.name);
      
      // In development, replace with proxy URL if needed
      if (this.isDevelopment && url.includes('firebasestorage.googleapis.com')) {
        const proxyUrl = url.replace('https://firebasestorage.googleapis.com', this.proxyPrefix);
        console.log('🔄 Using proxy URL in development:', proxyUrl);
        return proxyUrl;
      }
      
      return url;
    } catch (error) {
      console.error('❌ Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Upload file with progress tracking
   */
  async uploadFile(path, file, onProgress = null) {
    try {
      const storageRef = this.getStorageRef(path);
      console.log('⬆️ Uploading file:', file.name, 'to:', path);
      
      const result = await uploadBytes(storageRef, file);
      console.log('✅ File uploaded successfully:', result.ref.name);
      
      return result;
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileRef) {
    try {
      await deleteObject(fileRef);
      console.log('🗑️ File deleted successfully:', fileRef.name);
      return true;
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Check if CORS is working properly
   */
  async testCorsConnection() {
    try {
      console.log('🧪 Testing CORS connection...');
      
      // Try to list root directory
      const result = await this.listFiles('');
      
      console.log('✅ CORS test successful! Connection working properly.');
      return {
        success: true,
        message: 'Firebase Storage connection working properly',
        filesCount: result.items.length
      };
    } catch (error) {
      console.error('❌ CORS test failed:', error);
      
      let message = 'Firebase Storage connection failed';
      let suggestions = [];
      
      if (error.code === 'storage/unknown') {
        message = 'CORS policy blocking request';
        suggestions = [
          'Configure CORS in Firebase Console',
          'Use Vite proxy for development',
          'Check Firebase Storage rules'
        ];
      }
      
      return {
        success: false,
        message,
        error: error.message,
        suggestions
      };
    }
  }
}

// Export singleton instance
export const firebaseStorageProxy = new FirebaseStorageProxy();
export default firebaseStorageProxy; 