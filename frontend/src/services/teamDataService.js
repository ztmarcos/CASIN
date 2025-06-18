import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where, 
  getDocs,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseTeamService from './firebaseTeamService';

/**
 * TeamDataService - Wrapper para operaciones de Firestore usando la base de datos del equipo
 * 
 * Este servicio asegura que todas las operaciones de datos usen la configuración
 * correcta de Firebase para el equipo actual.
 */
class TeamDataService {
  
  /**
   * Obtiene la base de datos del equipo actual
   */
  getTeamDb() {
    try {
      return firebaseTeamService.getCurrentDb();
    } catch (error) {
      console.error('❌ No team database available:', error);
      throw new Error('No team is currently active. Please ensure you are logged in and part of a team.');
    }
  }

  /**
   * Obtiene el nombre de colección con namespace del equipo
   */
  getCollectionName(collectionName) {
    try {
      return firebaseTeamService.getNamespacedCollection(collectionName);
    } catch (error) {
      console.error('❌ Error getting collection name:', error);
      throw error;
    }
  }

  /**
   * Obtiene una colección del equipo
   */
  getCollection(collectionName) {
    const db = this.getTeamDb();
    const namespacedName = this.getCollectionName(collectionName);
    return collection(db, namespacedName);
  }

  /**
   * Obtiene un documento específico
   */
  getDocument(collectionName, docId) {
    const db = this.getTeamDb();
    const namespacedName = this.getCollectionName(collectionName);
    return doc(db, namespacedName, docId);
  }

  // ================== CRUD Operations ==================

  /**
   * Crear un nuevo documento
   */
  async createDocument(collectionName, data) {
    try {
      console.log(`📝 Creating document in ${collectionName}:`, data);
      
      const teamCollection = this.getCollection(collectionName);
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        teamId: firebaseTeamService.currentTeamId // Para referencia
      };
      
      const docRef = await addDoc(teamCollection, docData);
      console.log(`✅ Document created with ID: ${docRef.id}`);
      
      return docRef;
    } catch (error) {
      console.error(`❌ Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Obtener un documento por ID
   */
  async getDocumentById(collectionName, docId) {
    try {
      console.log(`🔍 Getting document ${docId} from ${collectionName}`);
      
      const docRef = this.getDocument(collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log(`✅ Document found`);
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        console.log(`❌ Document not found`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error getting document ${docId} from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Actualizar un documento
   */
  async updateDocument(collectionName, docId, data) {
    try {
      console.log(`📝 Updating document ${docId} in ${collectionName}`);
      
      const docRef = this.getDocument(collectionName, docId);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
      console.log(`✅ Document updated successfully`);
      
      return true;
    } catch (error) {
      console.error(`❌ Error updating document ${docId} in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar un documento
   */
  async deleteDocument(collectionName, docId) {
    try {
      console.log(`🗑️ Deleting document ${docId} from ${collectionName}`);
      
      const docRef = this.getDocument(collectionName, docId);
      await deleteDoc(docRef);
      
      console.log(`✅ Document deleted successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting document ${docId} from ${collectionName}:`, error);
      throw error;
    }
  }

  // ================== Query Operations ==================

  /**
   * Obtener todos los documentos de una colección
   */
  async getAllDocuments(collectionName, orderByField = 'createdAt', orderDirection = 'desc') {
    try {
      console.log(`📋 Getting all documents from ${collectionName}`);
      
      const teamCollection = this.getCollection(collectionName);
      const q = query(teamCollection, orderBy(orderByField, orderDirection));
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ Retrieved ${documents.length} documents`);
      return documents;
    } catch (error) {
      console.error(`❌ Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Buscar documentos con filtros (versión compatible con tableServiceAdapter)
   */
  async queryDocuments(collectionName, options = {}) {
    try {
      console.log(`🔍 Querying documents from ${collectionName} with options:`, options);
      
      const {
        filters = {},
        limit: limitCount = null,
        page = 1,
        orderBy: orderByField = 'createdAt',
        orderDirection = 'desc'
      } = options;

      // Para el equipo específico 4JlUqhAvfJMlCDhQ4vgH, usar consultas simples sin índices
      const currentTeamInfo = this.getCurrentTeamInfo();
      if (currentTeamInfo && currentTeamInfo.teamId === '4JlUqhAvfJMlCDhQ4vgH') {
        console.log(`🎯 Using simple query for team 4JlUqhAvfJMlCDhQ4vgH`);
        return await this.queryDocumentsSimple(collectionName, options);
      }
      
      const teamCollection = this.getCollection(collectionName);
      let q = query(teamCollection);
      
      // Aplicar filtros si existen (formato objeto)
      if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([field, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            q = query(q, where(field, '==', value));
          }
        });
      }
      
      // Aplicar ordenamiento
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      
      // Aplicar límite
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ Query returned ${documents.length} documents`);
      
      // Calcular paginación
      const total = documents.length;
      const totalPages = limitCount ? Math.ceil(total / limitCount) : 1;
      
      return {
        documents,
        total,
        page,
        totalPages
      };
    } catch (error) {
      console.error(`❌ Error querying documents from ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Versión simplificada de consultas sin índices para team específico
   */
  async queryDocumentsSimple(collectionName, options = {}) {
    try {
      console.log(`🔍 Using simple query for ${collectionName}`);
      
      const {
        filters = {},
        limit: limitCount = null,
        page = 1
      } = options;
      
      const teamCollection = this.getCollection(collectionName);
      let q = query(teamCollection);
      
      // Solo aplicar límite si se especifica, sin orderBy ni where
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      let documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Aplicar filtros en memoria para evitar índices de Firebase
      if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
        documents = documents.filter(doc => {
          return Object.entries(filters).every(([field, value]) => {
            if (value === undefined || value === null || value === '') return true;
            return doc[field] === value;
          });
        });
      }
      
      console.log(`✅ Simple query returned ${documents.length} documents`);
      
      return {
        documents,
        total: documents.length,
        page,
        totalPages: limitCount ? Math.ceil(documents.length / limitCount) : 1
      };
    } catch (error) {
      console.error(`❌ Error in simple query for ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Buscar documentos con filtros (versión original con array)
   */
  async queryDocumentsWithFilters(collectionName, filters = [], orderByField = 'createdAt', orderDirection = 'desc', limitCount = null) {
    try {
      console.log(`🔍 Querying documents from ${collectionName} with filters:`, filters);
      
      const teamCollection = this.getCollection(collectionName);
      let q = query(teamCollection);
      
      // Aplicar filtros
      filters.forEach(filter => {
        q = query(q, where(filter.field, filter.operator, filter.value));
      });
      
      // Aplicar ordenamiento
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      
      // Aplicar límite
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ Query returned ${documents.length} documents`);
      return documents;
    } catch (error) {
      console.error(`❌ Error querying documents from ${collectionName}:`, error);
      throw error;
    }
  }

  // ================== Utility Functions ==================

  /**
   * Verificar si un documento existe
   */
  async documentExists(collectionName, docId) {
    try {
      const docRef = this.getDocument(collectionName, docId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error(`❌ Error checking document existence:`, error);
      return false;
    }
  }

  /**
   * Contar documentos en una colección
   */
  async countDocuments(collectionName, filters = {}) {
    try {
      // Para el equipo específico 4JlUqhAvfJMlCDhQ4vgH, usar conteo simple
      const currentTeamInfo = this.getCurrentTeamInfo();
      if (currentTeamInfo && currentTeamInfo.teamId === '4JlUqhAvfJMlCDhQ4vgH') {
        console.log(`🎯 Using simple count for team 4JlUqhAvfJMlCDhQ4vgH`);
        return await this.countDocumentsSimple(collectionName, filters);
      }
      
      const result = await this.queryDocuments(collectionName, { filters });
      return result.total;
    } catch (error) {
      console.error(`❌ Error counting documents:`, error);
      return 0;
    }
  }

  /**
   * Conteo simple sin índices para team específico
   */
  async countDocumentsSimple(collectionName, filters = {}) {
    try {
      console.log(`🔢 Simple count for ${collectionName}`);
      
      const teamCollection = this.getCollection(collectionName);
      const querySnapshot = await getDocs(teamCollection);
      
      let count = querySnapshot.size;
      
      // Si hay filtros, aplicarlos en memoria
      if (filters && typeof filters === 'object' && Object.keys(filters).length > 0) {
        const documents = querySnapshot.docs.map(doc => doc.data());
        const filteredDocs = documents.filter(doc => {
          return Object.entries(filters).every(([field, value]) => {
            if (value === undefined || value === null || value === '') return true;
            return doc[field] === value;
          });
        });
        count = filteredDocs.length;
      }
      
      console.log(`✅ Simple count result: ${count}`);
      return count;
    } catch (error) {
      console.error(`❌ Error in simple count for ${collectionName}:`, error);
      return 0;
    }
  }

  /**
   * Obtener información del equipo actual
   */
  getCurrentTeamInfo() {
    try {
      const config = firebaseTeamService.getCurrentTeamConfig();
      return {
        teamId: config.teamId,
        projectId: config.config.projectId,
        isTeamDatabase: config.config.isTeamDatabase
      };
    } catch (error) {
      console.error('❌ Error getting team info:', error);
      return null;
    }
  }

  // ================== Batch Operations ==================

  /**
   * Crear múltiples documentos (simulación de batch)
   */
  async createMultipleDocuments(collectionName, documents) {
    try {
      console.log(`📝 Creating ${documents.length} documents in ${collectionName}`);
      
      const promises = documents.map(doc => this.createDocument(collectionName, doc));
      const results = await Promise.all(promises);
      
      console.log(`✅ Created ${results.length} documents successfully`);
      return results;
    } catch (error) {
      console.error(`❌ Error creating multiple documents:`, error);
      throw error;
    }
  }

  /**
   * Importar datos desde otra fuente (útil para migración)
   */
  async importData(collectionName, dataArray, batchSize = 10) {
    try {
      console.log(`📥 Importing ${dataArray.length} items to ${collectionName}`);
      
      const batches = [];
      for (let i = 0; i < dataArray.length; i += batchSize) {
        const batch = dataArray.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      let totalImported = 0;
      for (const batch of batches) {
        await this.createMultipleDocuments(collectionName, batch);
        totalImported += batch.length;
        console.log(`📊 Progress: ${totalImported}/${dataArray.length} imported`);
      }
      
      console.log(`✅ Import completed: ${totalImported} items imported`);
      return totalImported;
    } catch (error) {
      console.error(`❌ Error importing data:`, error);
      throw error;
    }
  }

  // ================== Collection Operations ==================

  /**
   * Listar todas las colecciones del equipo
   */
  async listCollections() {
    try {
      console.log(`📋 Listing collections for current team`);
      
      const teamInfo = this.getCurrentTeamInfo();
      if (!teamInfo) {
        console.warn('⚠️ No team info available');
        return [];
      }
      
      // Colecciones que replican la estructura de CASIN para cada equipo
      const casinCollections = [
        'autos',
        'vida', 
        'gmm',
        'hogar',
        'rc',
        'transporte',
        'mascotas',
        'diversos',
        'negocio',
        'emant_caratula',
        'emant_listado',
        'gruposvida',
        'listadovida',
        'gruposautos',
        'listadoautos'
      ];
      
      console.log(`✅ Found ${casinCollections.length} collections for team ${teamInfo.teamId}`);
      return casinCollections;
    } catch (error) {
      console.error(`❌ Error listing collections:`, error);
      return [];
    }
  }

  /**
   * Verificar si una colección existe
   */
  async collectionExists(collectionName) {
    try {
      const collections = await this.listCollections();
      return collections.includes(collectionName);
    } catch (error) {
      console.error(`❌ Error checking collection existence:`, error);
      return false;
    }
  }

  /**
   * Crear una nueva colección (agregando un documento inicial)
   */
  async createCollection(collectionName, initialData = null) {
    try {
      console.log(`📁 Creating collection: ${collectionName}`);
      
      const data = initialData || {
        _init: true,
        created: new Date().toISOString(),
        description: `Collection ${collectionName} created`
      };
      
      const result = await this.createDocument(collectionName, data);
      console.log(`✅ Collection ${collectionName} created successfully`);
      return result;
    } catch (error) {
      console.error(`❌ Error creating collection ${collectionName}:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const teamDataService = new TeamDataService();
export default teamDataService; 