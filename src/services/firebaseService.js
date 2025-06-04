import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

class FirebaseService {
  
  // Get all records from a table
  async getAll(tableName, limitCount = 50) {
    try {
      const q = query(
        collection(db, tableName),
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
      const docRef = doc(db, tableName, id);
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
      const docRef = await addDoc(collection(db, tableName), {
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
      const docRef = doc(db, tableName, firebaseId);
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
      const docRef = doc(db, tableName, firebaseId);
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