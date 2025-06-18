import teamDataService from './teamDataService';
import firebaseService from './firebaseService';

/**
 * Adaptador para firebaseService que usa el sistema de equipos
 * Mantiene la misma API para compatibilidad con componentes existentes
 */
class FirebaseServiceAdapter {
  // ===== MÉTODOS DE CONFIGURACIÓN =====
  
  /**
   * Verifica si el sistema de equipos está disponible
   */
  isTeamSystemAvailable() {
    try {
      return teamDataService && typeof teamDataService.createDocument === 'function';
    } catch (error) {
      console.warn('⚠️ Team system not available, falling back to original service:', error);
      return false;
    }
  }

  // ===== MÉTODOS DE DATOS =====

  /**
   * Obtiene todas las tablas/colecciones
   */
  async getTables() {
    try {
      if (this.isTeamSystemAvailable()) {
        const collections = await teamDataService.listCollections();
        return collections.map(name => ({ name, title: name }));
      } else {
        return await firebaseService.getTables();
      }
    } catch (error) {
      console.error('❌ Error getting tables:', error);
      // Fallback al servicio original
      return await firebaseService.getTables();
    }
  }

  /**
   * Obtiene todos los documentos de una colección
   */
  async getAllDocuments(collectionName, limit = 10) {
    try {
      if (this.isTeamSystemAvailable()) {
        const result = await teamDataService.queryDocuments(collectionName, { limit });
        return result.documents || [];
      } else {
        return await firebaseService.getAllDocuments(collectionName, limit);
      }
    } catch (error) {
      console.error(`❌ Error getting documents from ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Obtiene datos con filtros
   */
  async getData(collectionName, limit = 10, filters = {}) {
    try {
      if (this.isTeamSystemAvailable()) {
        const options = { limit, ...filters };
        const result = await teamDataService.queryDocuments(collectionName, options);
        return result.documents || [];
      } else {
        return await firebaseService.getData(collectionName, limit, filters);
      }
    } catch (error) {
      console.error(`❌ Error getting data from ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Crea un documento
   */
  async createDocument(collectionName, data) {
    try {
      if (this.isTeamSystemAvailable()) {
        return await teamDataService.createDocument(collectionName, data);
      } else {
        return await firebaseService.createDocument(collectionName, data);
      }
    } catch (error) {
      console.error(`❌ Error creating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza un documento
   */
  async updateDocument(collectionName, docId, data) {
    try {
      if (this.isTeamSystemAvailable()) {
        return await teamDataService.updateDocument(collectionName, docId, data);
      } else {
        return await firebaseService.updateDocument(collectionName, docId, data);
      }
    } catch (error) {
      console.error(`❌ Error updating document in ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Elimina un documento
   */
  async deleteDocument(collectionName, docId) {
    try {
      if (this.isTeamSystemAvailable()) {
        return await teamDataService.deleteDocument(collectionName, docId);
      } else {
        return await firebaseService.deleteDocument(collectionName, docId);
      }
    } catch (error) {
      console.error(`❌ Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  }

  // ===== MÉTODOS DE DEBUG =====

  /**
   * Información de debug sobre qué servicio se está usando
   */
  getServiceInfo() {
    const isTeamSystem = this.isTeamSystemAvailable();
    return {
      usingTeamSystem: isTeamSystem,
      service: isTeamSystem ? 'teamDataService' : 'firebaseService',
      version: '1.0.0'
    };
  }

  /**
   * Obtiene estadísticas de uso
   */
  async getStats() {
    try {
      if (this.isTeamSystemAvailable()) {
        const collections = await teamDataService.listCollections();
        const stats = {};
        
        for (const collection of collections) {
          const result = await teamDataService.queryDocuments(collection, { limit: 1 });
          stats[collection] = result.total || 0;
        }
        
        return stats;
      } else {
        return await firebaseService.getStats();
      }
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return {};
    }
  }
}

// Crear instancia única
const firebaseServiceAdapter = new FirebaseServiceAdapter();

export default firebaseServiceAdapter; 