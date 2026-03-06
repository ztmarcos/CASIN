import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Re-enable Firebase direct calls now that billing is activated
const FIREBASE_ENABLED = true; // ✅ Enabled with Blaze plan

// Importar el contexto de equipo para detectar si hay un equipo activo
let currentTeamId = null;
let isTeamSystemAvailable = false;

// Función para configurar el equipo actual
const setCurrentTeam = (teamId) => {
  currentTeamId = teamId;
  isTeamSystemAvailable = !!teamId;
  console.log(`🏢 FirebaseService: Team set to ${teamId}, team system: ${isTeamSystemAvailable ? 'ENABLED' : 'DISABLED'}`);
};

// Función para obtener el nombre de colección correcto
const getCollectionName = (baseName) => {
  if (isTeamSystemAvailable && currentTeamId) {
    const teamCollectionName = `team_${currentTeamId}_${baseName}`;
    console.log(`🏢 Using team collection: ${teamCollectionName}`);
    return teamCollectionName;
  }
  console.log(`📄 Using original collection: ${baseName}`);
  return baseName;
};

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.auth = null;
    this.isInitialized = false;
    this.isConnected = true;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    if (FIREBASE_ENABLED) {
      this.initializeFirebase();
    } else {
      console.log('🔥 Firebase disabled temporarily - using backend fallback');
    }
  }

  initializeFirebase() {
    try {
      // Firebase config
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };

      console.log('🔥 Firebase Config for Web App "casin":', firebaseConfig);

      // Initialize Firebase
      this.app = initializeApp(firebaseConfig);
      this.db = getFirestore(this.app);
      this.auth = getAuth(this.app);

      this.isInitialized = true;
      this.isConnected = true;
      
      console.log('✅ Firebase initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      this.isInitialized = false;
      this.isConnected = false;
    }
  }

  // ================== Utilidades de Cache ==================
  getCacheKey(collectionName, query = '') {
    return `${collectionName}_${query}`;
  }

  setCacheData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCacheData(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ Firebase cache cleared');
  }

  // ================== Métodos Básicos de CRUD ==================

  async getAll(collectionName, maxLimit = 1000, useCache = true, nocache = false) {
    if (!FIREBASE_ENABLED) {
      console.log('🔥 Firebase disabled - returning empty data');
      return [];
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }

    // Usar nombre de colección correcto (team o original)
    const actualCollectionName = getCollectionName(collectionName);
    const cacheKey = this.getCacheKey(actualCollectionName, `limit_${maxLimit}`);
    
    // Check cache first (unless nocache is true)
    if (useCache && !nocache) {
      const cachedData = this.getCacheData(cacheKey);
      if (cachedData) {
        console.log(`📋 Returning cached data for ${actualCollectionName}`);
        return cachedData;
      }
    }

    try {
      if (nocache) {
        console.log(`🚫 Skipping cache for ${actualCollectionName} (nocache=true)`);
      }
      
      console.log(`🔍 Fetching ${actualCollectionName} data from Firebase (limit: ${maxLimit})`);
      
      const collectionRef = collection(this.db, actualCollectionName);
      const q = query(collectionRef, limit(maxLimit));
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        console.log(`🔍 Firebase doc ID: ${doc.id}, contains id field: ${docData.id || 'none'}`);
        return {
          firebase_doc_id: doc.id,
          ...docData,
          reactKey: `${actualCollectionName}_${doc.id}`
        };
      });

      // Cache the result (unless nocache is true)
      if (useCache && !nocache) {
        this.setCacheData(cacheKey, data);
      }

      console.log(`✅ Successfully fetched ${data.length} records from ${actualCollectionName} (estimated total: ${snapshot.docs.length})`);
      return data;

    } catch (error) {
      console.error(`❌ Error fetching ${actualCollectionName}:`, error);
      
      // En caso de error con colección de equipo, intentar con colección original
      if (isTeamSystemAvailable && actualCollectionName !== collectionName) {
        console.log(`🔄 Fallback: trying original collection ${collectionName}`);
        try {
          const collectionRef = collection(this.db, collectionName);
          const q = query(collectionRef, limit(maxLimit));
          const snapshot = await getDocs(q);
          
          const data = snapshot.docs.map(doc => ({
            firebase_doc_id: doc.id,
            ...doc.data(),
            reactKey: `${collectionName}_${doc.id}`
          }));

          if (useCache && !nocache) {
            this.setCacheData(cacheKey, data);
          }

          console.log(`✅ Fallback successful: fetched ${data.length} records from ${collectionName}`);
          return data;
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed for ${collectionName}:`, fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  async getAllDocuments(collectionName, maxLimit = 1000) {
    return this.getAll(collectionName, maxLimit);
  }

  async search(collectionName, searchTerm, searchFields = ['nombre_completo', 'email']) {
    if (!FIREBASE_ENABLED) {
      console.log('🔥 Firebase disabled - returning empty search results');
      return [];
    }

    const actualCollectionName = getCollectionName(collectionName);
    
    try {
      console.log(`🔍 Searching in ${actualCollectionName} for: "${searchTerm}"`);
      
      // Get all documents first (Firestore doesn't support full-text search natively)
      const allDocs = await this.getAll(actualCollectionName, 1000, false);
      
      if (!searchTerm || searchTerm.trim() === '') {
        return allDocs;
      }

      const searchTermLower = searchTerm.toLowerCase();
      const filtered = allDocs.filter(doc => {
        return searchFields.some(field => {
          const fieldValue = doc[field];
          return fieldValue && fieldValue.toString().toLowerCase().includes(searchTermLower);
        });
      });

      console.log(`✅ Search found ${filtered.length} matches in ${actualCollectionName}`);
      return filtered;

    } catch (error) {
      console.error(`❌ Error searching ${actualCollectionName}:`, error);
      
      // Fallback a colección original si hay error
      if (isTeamSystemAvailable && actualCollectionName !== collectionName) {
        console.log(`🔄 Fallback search: trying original collection ${collectionName}`);
        try {
          const allDocs = await this.getAll(collectionName, 1000, false);
          
          if (!searchTerm || searchTerm.trim() === '') {
            return allDocs;
          }

          const searchTermLower = searchTerm.toLowerCase();
          const filtered = allDocs.filter(doc => {
            return searchFields.some(field => {
              const fieldValue = doc[field];
              return fieldValue && fieldValue.toString().toLowerCase().includes(searchTermLower);
            });
          });

          console.log(`✅ Fallback search found ${filtered.length} matches in ${collectionName}`);
          return filtered;
        } catch (fallbackError) {
          console.error(`❌ Fallback search also failed for ${collectionName}:`, fallbackError);
        }
      }
      
      throw error;
    }
  }

  async create(collectionName, data) {
    if (!FIREBASE_ENABLED) {
      console.log('🔥 Firebase disabled - simulating create');
      return { id: 'firebase_disabled_' + Date.now() };
    }

    const actualCollectionName = getCollectionName(collectionName);
    
    try {
      console.log(`➕ Creating document in ${actualCollectionName}`, data);
      
      const docData = {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(this.db, actualCollectionName), docData);
      
      // Clear cache for this collection
      this.clearCacheForCollection(actualCollectionName);
      
      console.log(`✅ Document created in ${actualCollectionName} with ID: ${docRef.id}`);
      return { id: docRef.id, ...docData };

    } catch (error) {
      console.error(`❌ Error creating document in ${actualCollectionName}:`, error);
      throw error;
    }
  }

  async update(collectionName, docId, data) {
    if (!FIREBASE_ENABLED) {
      console.log('🔥 Firebase disabled - simulating update');
      return { id: docId, ...data };
    }

    const actualCollectionName = getCollectionName(collectionName);
    
    try {
      console.log(`📝 Updating document ${docId} in ${actualCollectionName}`, data);
      
      const docData = {
        ...data,
        updatedAt: new Date().toISOString()
      };

      const docRef = doc(this.db, actualCollectionName, docId);
      await updateDoc(docRef, docData);
      
      // Clear cache for this collection
      this.clearCacheForCollection(actualCollectionName);
      
      console.log(`✅ Document ${docId} updated in ${actualCollectionName}`);
      return { id: docId, ...docData };

    } catch (error) {
      console.error(`❌ Error updating document ${docId} in ${actualCollectionName}:`, error);
      throw error;
    }
  }

  async delete(collectionName, docId) {
    if (!FIREBASE_ENABLED) {
      console.log('🔥 Firebase disabled - simulating delete');
      return { success: true };
    }

    const actualCollectionName = getCollectionName(collectionName);
    
    try {
      console.log(`🗑️ Deleting document ${docId} from ${actualCollectionName}`);
      
      const docRef = doc(this.db, actualCollectionName, docId);
      await deleteDoc(docRef);
      
      // Clear cache for this collection
      this.clearCacheForCollection(actualCollectionName);
      
      console.log(`✅ Document ${docId} deleted from ${actualCollectionName}`);
      return { success: true };

    } catch (error) {
      console.error(`❌ Error deleting document ${docId} from ${actualCollectionName}:`, error);
      throw error;
    }
  }

  clearCacheForCollection(collectionName) {
    // Clear all cache entries for this collection
    for (let key of this.cache.keys()) {
      if (key.startsWith(collectionName + '_')) {
        this.cache.delete(key);
      }
    }
    console.log(`🗑️ Cache cleared for collection: ${collectionName}`);
  }

  // ================== Métodos Específicos ==================

  async getBirthdays() {
    if (!FIREBASE_ENABLED) {
      console.log('🔥 Firebase disabled - returning empty data for birthdays');
      return [];
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      const collections = ['directorio_contactos', 'autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
      const allBirthdays = [];
      
      for (const collectionName of collections) {
        try {
          const docs = await this.getAllDocuments(collectionName);
          const birthdays = docs.filter(doc => 
            doc.fecha_nacimiento || doc.birthday || doc.fechaNacimiento
          ).map(doc => ({
            ...doc,
            table: collectionName,
            birthday: doc.fecha_nacimiento || doc.birthday || doc.fechaNacimiento
          }));
          
          allBirthdays.push(...birthdays);
        } catch (error) {
          console.warn(`Could not get birthdays from ${collectionName}:`, error);
        }
      }
      
      return allBirthdays;
    } catch (error) {
      console.error('Error getting birthdays:', error);
      throw error;
    }
  }

  // Get contacts (specific method)
  async getContacts(limit = 50) {
    return this.getAll('directorio_contactos', limit);
  }

  // Search contacts
  async searchContacts(searchTerm) {
    return this.search('directorio_contactos', searchTerm);
  }

  // ================== Métodos de Gestión de Datos ==================

  async getTableNames() {
    if (!FIREBASE_ENABLED) {
      console.log('🔥 Firebase disabled - returning sample table names');
      return ['directorio_contactos', 'autos', 'rc', 'vida', 'gmm'];
    }

    try {
      console.log('📋 Getting available table names...');
      
      // Lista base de colecciones conocidas
      let baseCollections = [
        'directorio_contactos', 'autos', 'rc', 'vida', 'gmm', 
        'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm',
        'emant_caratula', 'emant_listado', 'gruposautos', 'listadoautos',
        'gruposvida', 'listadovida', 'hogar'
      ];

      // Si hay equipo activo, usar colecciones de equipo
      if (isTeamSystemAvailable && currentTeamId) {
        const teamCollections = baseCollections.map(name => `team_${currentTeamId}_${name}`);
        console.log(`✅ Returning team collections for team ${currentTeamId}: ${teamCollections.length} collections`);
        return teamCollections;
      }

      console.log(`✅ Returning base collections: ${baseCollections.length} collections`);
      return baseCollections;

    } catch (error) {
      console.error('❌ Error getting table names:', error);
      return [];
    }
  }

  async getAllTables() {
    const tableNames = await this.getTableNames();
    const tablesData = {};

    for (const tableName of tableNames) {
      try {
        // Para nombres de colección de equipo, extraer el nombre base para la clave
        const keyName = tableName.startsWith('team_') ? 
          tableName.replace(`team_${currentTeamId}_`, '') : 
          tableName;
          
        const data = await this.getAll(tableName, 100);
        tablesData[keyName] = data;
        console.log(`✅ Loaded ${data.length} records from ${tableName}`);
      } catch (error) {
        console.warn(`⚠️ Could not load ${tableName}:`, error.message);
        const keyName = tableName.startsWith('team_') ? 
          tableName.replace(`team_${currentTeamId}_`, '') : 
          tableName;
        tablesData[keyName] = [];
      }
    }

    return tablesData;
  }

  // Generic CRUD Operations
  async getDocumentById(collectionName, id) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - returning null for ${collectionName}/${id}`);
      return null;
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      // Ensure ID is a string for Firebase
      const stringId = String(id);
      const docRef = doc(this.db, collectionName, stringId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error getting document ${id} from ${collectionName}:`, error);
      throw error;
    }
  }

  async addDocument(collectionName, data) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - cannot add document to ${collectionName}`);
      throw new Error('Firebase disabled - use backend API instead');
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      const collectionRef = collection(this.db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  }

  async updateDocument(collectionName, id, data) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - cannot update document in ${collectionName}`);
      throw new Error('Firebase disabled - use backend API instead');
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      // Ensure ID is a string for Firebase
      const stringId = String(id);
      const docRef = doc(this.db, collectionName, stringId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
      return true;
    } catch (error) {
      console.error(`Error updating document ${id} in ${collectionName}:`, error);
      throw error;
    }
  }

  async deleteDocument(collectionName, id) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - cannot delete document from ${collectionName}`);
      throw new Error('Firebase disabled - use backend API instead');
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      // Ensure ID is a string for Firebase
      const stringId = String(id);
      const docRef = doc(this.db, collectionName, stringId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`Error deleting document ${id} from ${collectionName}:`, error);
      throw error;
    }
  }

  // Search and Filter Operations
  async getDocumentsByField(collectionName, field, value, limitCount = 100) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - returning empty data for ${collectionName}`);
      return [];
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      const collectionRef = collection(this.db, collectionName);
      const q = query(
        collectionRef,
        where(field, '==', value),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting documents by ${field} in ${collectionName}:`, error);
      throw error;
    }
  }

  // Pagination
  async getDocumentsPaginated(collectionName, pageSize = 50, lastDoc = null) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - returning empty data for ${collectionName}`);
      return { documents: [], lastDoc: null, hasMore: false };
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      const collectionRef = collection(this.db, collectionName);
      let q = query(
        collectionRef,
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      
      if (lastDoc) {
        q = query(
          collectionRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }
      
      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        _firebaseDoc: doc // Keep reference for pagination
      }));
      
      return {
        documents,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === pageSize
      };
    } catch (error) {
      console.error(`Error getting paginated documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // Batch Operations
  async batchWrite(operations) {
    if (!FIREBASE_ENABLED) {
      console.log('🔥 Firebase disabled - cannot perform batch write');
      throw new Error('Firebase disabled - use backend API instead');
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      const batch = writeBatch(this.db);
      
      operations.forEach(operation => {
        const { type, collectionName, id, data } = operation;
        // Ensure ID is a string for Firebase
        const stringId = String(id || '');
        const docRef = doc(this.db, collectionName, stringId);
        
        switch (type) {
          case 'add':
            batch.set(docRef, {
              ...data,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...data,
              updatedAt: new Date()
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });
      
      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error in batch write:', error);
      throw error;
    }
  }

  // Specific CRM Operations
  async getTableStructure(tableName) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - returning empty data for ${tableName}`);
      return [];
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      // Get a sample document to understand structure
      const collectionRef = collection(this.db, tableName);
      const q = query(collectionRef, limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return [];
      }
      
      const sampleDoc = snapshot.docs[0].data();
      return Object.keys(sampleDoc).map(key => ({
        name: key,
        type: typeof sampleDoc[key],
        nullable: true
      }));
    } catch (error) {
      console.error(`Error getting table structure for ${tableName}:`, error);
      return [];
    }
  }

  // Migration helper - to move data from MySQL to Firebase
  async migrateDataFromMySQL(mysqlData, collectionName) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - cannot migrate data to ${collectionName}`);
      throw new Error('Firebase disabled - use backend API instead');
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      const batch = writeBatch(this.db);
      const collectionRef = collection(this.db, collectionName);
      
      mysqlData.forEach(record => {
        const { id, ...data } = record;
        const docRef = doc(collectionRef);
        batch.set(docRef, {
          ...data,
          originalMySQLId: id,
          migratedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
      
      await batch.commit();
      console.log(`Migrated ${mysqlData.length} records to ${collectionName}`);
      return true;
    } catch (error) {
      console.error(`Error migrating data to ${collectionName}:`, error);
      throw error;
    }
  }

  // Analytics and Reports
  async getCollectionStats(collectionName) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - returning empty stats for ${collectionName}`);
      return { total: 0, collection: collectionName, error: 'Firebase disabled' };
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      const docs = await this.getAllDocuments(collectionName);
      return {
        total: docs.length,
        collection: collectionName,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error getting stats for ${collectionName}:`, error);
      return { total: 0, collection: collectionName, error: error.message };
    }
  }

  // Get all records from a table (legacy method - redirects to main getAll)
  // This method is kept for backwards compatibility but now uses the main getAll method
  async getAllLegacy(tableName, limitCount = 50) {
    console.log(`⚠️ Using legacy getAllLegacy method, redirecting to main getAll for ${tableName}`);
    return this.getAll(tableName, limitCount, false, true);
  }

  // Search records by text
  async search(tableName, searchTerm, limitCount = 50) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - returning empty data for ${tableName}`);
      return { success: true, data: [], count: 0, source: 'Backend', searchTerm };
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      // Firebase doesn't support full-text search, so we'll get all and filter
      const allRecords = await this.getAll(tableName, 1000);
      
      const filtered = allRecords.data.filter(record => {
        const searchFields = ['nombre_completo', 'email', 'telefono_movil', 'aseguradora', 'numero_poliza'];
        return searchFields.some(field => 
          record[field] && 
          record[field].toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      
      return {
        success: true,
        data: filtered.slice(0, limitCount),
        count: filtered.length,
        source: 'Firebase',
        searchTerm
      };
    } catch (error) {
      console.error(`Error searching ${tableName}:`, error);
      throw error;
    }
  }

  // Get record by ID
  async getById(tableName, id) {
    if (!FIREBASE_ENABLED) {
      console.log(`🔥 Firebase disabled - returning null for ${tableName}/${id}`);
      return null;
    }
    
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }
    
    try {
      // Ensure ID is a string for Firebase
      const stringId = String(id);
      const docRef = doc(this.db, tableName, stringId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          success: true,
          data: {
            firebaseId: docSnap.id,
            ...docSnap.data()
          },
          source: 'Firebase'
        };
      } else {
        throw new Error('Document not found');
      }
    } catch (error) {
      console.error(`Error getting ${tableName} by ID:`, error);
      throw error;
    }
  }

  // Get insurance policies (specific method) 
  async getPolicies(limit = 50) {
    return this.getAll('autos', limit);
  }

  // Search policies
  async searchPolicies(searchTerm) {
    return this.search('autos', searchTerm);
  }

  isFirebaseEnabled() {
    return FIREBASE_ENABLED && this.isConnected;
  }
}

const firebaseService = new FirebaseService();
export default firebaseService;
export { setCurrentTeam }; 