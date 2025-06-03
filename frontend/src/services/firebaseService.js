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

class FirebaseService {
  constructor() {
    this.db = db;
  }

  // Generic CRUD Operations
  async getAllDocuments(collectionName, limitCount = 1000) {
    try {
      const collectionRef = collection(this.db, collectionName);
      const q = query(collectionRef, limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  }

  async getDocumentById(collectionName, id) {
    try {
      const docRef = doc(this.db, collectionName, id);
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
    try {
      const docRef = doc(this.db, collectionName, id);
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
    try {
      const docRef = doc(this.db, collectionName, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`Error deleting document ${id} from ${collectionName}:`, error);
      throw error;
    }
  }

  // Search and Filter Operations
  async searchDocuments(collectionName, searchTerm, searchFields = ['nombre_contratante', 'email'], limitCount = 100) {
    try {
      const collectionRef = collection(this.db, collectionName);
      const searchResults = [];
      
      // Firebase doesn't support full-text search, so we'll search each field separately
      for (const field of searchFields) {
        const q = query(
          collectionRef,
          where(field, '>=', searchTerm),
          where(field, '<=', searchTerm + '\uf8ff'),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(doc => {
          const existing = searchResults.find(item => item.id === doc.id);
          if (!existing) {
            searchResults.push({
              id: doc.id,
              ...doc.data()
            });
          }
        });
      }
      
      return searchResults;
    } catch (error) {
      console.error(`Error searching documents in ${collectionName}:`, error);
      throw error;
    }
  }

  async getDocumentsByField(collectionName, field, value, limitCount = 100) {
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
    try {
      const batch = writeBatch(this.db);
      
      operations.forEach(operation => {
        const { type, collectionName, id, data } = operation;
        const docRef = doc(this.db, collectionName, id || '');
        
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
  async getTables() {
    // Return available collections/tables
    return [
      'directorio_contactos',
      'autos',
      'rc',
      'vida',
      'gmm', 
      'transporte',
      'mascotas',
      'diversos',
      'negocio',
      'gruposgmm',
      'prospeccion_cards'
    ];
  }

  async getTableStructure(tableName) {
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

  async getBirthdays() {
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

  // Migration helper - to move data from MySQL to Firebase
  async migrateDataFromMySQL(mysqlData, collectionName) {
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

  // Get all records from a table
  async getAll(tableName, limitCount = 50) {
    try {
      const q = query(
        collection(this.db, tableName),
        orderBy('id'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const records = [];
      
      querySnapshot.forEach((doc) => {
        records.push({
          firebaseId: doc.id,
          ...doc.data()
        });
      });
      
      return {
        success: true,
        data: records,
        count: records.length,
        source: 'Firebase'
      };
    } catch (error) {
      console.error(`Error getting ${tableName}:`, error);
      throw error;
    }
  }

  // Search records by text
  async search(tableName, searchTerm, limitCount = 50) {
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
    try {
      const docRef = doc(this.db, tableName, id);
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

  // Create new record
  async create(tableName, data) {
    try {
      const docRef = await addDoc(collection(this.db, tableName), {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      return {
        success: true,
        id: docRef.id,
        data: data,
        message: 'Record created successfully',
        source: 'Firebase'
      };
    } catch (error) {
      console.error(`Error creating ${tableName}:`, error);
      throw error;
    }
  }

  // Update record
  async update(tableName, firebaseId, data) {
    try {
      const docRef = doc(this.db, tableName, firebaseId);
      await updateDoc(docRef, {
        ...data,
        updated_at: new Date().toISOString()
      });
      
      return {
        success: true,
        id: firebaseId,
        data: data,
        message: 'Record updated successfully',
        source: 'Firebase'
      };
    } catch (error) {
      console.error(`Error updating ${tableName}:`, error);
      throw error;
    }
  }

  // Delete record
  async delete(tableName, firebaseId) {
    try {
      const docRef = doc(this.db, tableName, firebaseId);
      await deleteDoc(docRef);
      
      return {
        success: true,
        id: firebaseId,
        message: 'Record deleted successfully',
        source: 'Firebase'
      };
    } catch (error) {
      console.error(`Error deleting ${tableName}:`, error);
      throw error;
    }
  }

  // Get contacts (specific method)
  async getContacts(limit = 50) {
    return this.getAll('directorio_contactos', limit);
  }

  // Get insurance policies (specific method) 
  async getPolicies(limit = 50) {
    return this.getAll('autos', limit);
  }

  // Search contacts
  async searchContacts(searchTerm) {
    return this.search('directorio_contactos', searchTerm);
  }

  // Search policies
  async searchPolicies(searchTerm) {
    return this.search('autos', searchTerm);
  }
}

export default new FirebaseService(); 