import { db } from '../firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

/**
 * Test Firebase connectivity and basic operations
 */
export const testFirebaseConnection = async () => {
  const results = {
    configLoaded: false,
    databaseConnected: false,
    collections: [],
    errors: []
  };

  try {
    // Test 1: Check if Firebase config is loaded
    console.log('🔥 Testing Firebase configuration...');
    if (db) {
      results.configLoaded = true;
      console.log('✅ Firebase configuration loaded successfully');
    } else {
      results.errors.push('Firebase database not initialized');
      console.error('❌ Firebase database not initialized');
      return results;
    }

    // Test 2: Try to connect to Firestore and list collections
    console.log('🔗 Testing Firestore connection...');
    
    // Try to access a simple collection
    const testCollections = ['autos', 'directorio_contactos', 'vida', 'gmm'];
    
    for (const collectionName of testCollections) {
      try {
        console.log(`📂 Testing collection: ${collectionName}`);
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          console.log(`📭 Collection ${collectionName} is empty`);
          results.collections.push({
            name: collectionName,
            status: 'empty',
            count: 0
          });
        } else {
          console.log(`📄 Collection ${collectionName} has ${snapshot.size} document(s)`);
          results.collections.push({
            name: collectionName,
            status: 'accessible',
            count: snapshot.size
          });
        }
        
        results.databaseConnected = true;
        
      } catch (collectionError) {
        console.error(`❌ Error accessing collection ${collectionName}:`, collectionError);
        results.errors.push(`Error accessing ${collectionName}: ${collectionError.message}`);
        results.collections.push({
          name: collectionName,
          status: 'error',
          error: collectionError.message
        });
      }
    }

    if (results.databaseConnected) {
      console.log('✅ Firestore connection successful');
    }

  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    results.errors.push(`Connection test failed: ${error.message}`);
  }

  return results;
};

/**
 * Test specific service method
 */
export const testServiceMethod = async (service, methodName, ...args) => {
  try {
    console.log(`🧪 Testing ${service.constructor.name}.${methodName}...`);
    const result = await service[methodName](...args);
    console.log(`✅ ${methodName} successful:`, result);
    return { success: true, result };
  } catch (error) {
    console.error(`❌ ${methodName} failed:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Run comprehensive Firebase tests
 */
export const runFirebaseTests = async () => {
  console.log('🚀 Starting comprehensive Firebase tests...');
  
  const connectionTest = await testFirebaseConnection();
  
  console.log('📊 Firebase Test Results:', {
    configLoaded: connectionTest.configLoaded,
    databaseConnected: connectionTest.databaseConnected,
    collectionsFound: connectionTest.collections.length,
    errorsCount: connectionTest.errors.length
  });
  
  if (connectionTest.errors.length > 0) {
    console.warn('⚠️ Firebase Test Errors:', connectionTest.errors);
  }
  
  return connectionTest;
}; 