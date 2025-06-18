/**
 * Airplane Table Service Wrapper
 * Intercepts firebaseTableService calls when airplane mode is enabled
 */

import firebaseTableService from './firebaseTableService.js';
import airplaneModeService from './airplaneModeService.js';

class AirplaneTableService {
  // Get tables - either from localStorage or Firebase
  async getTables() {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Getting tables from airplane mode cache...');
      const tables = airplaneModeService.getSavedTables();
      return tables;
    }
    
    // Normal mode - use Firebase
    return await firebaseTableService.getTables();
  }

  // Get table data - either from localStorage or Firebase
  async getData(tableName, filters = {}) {
    if (airplaneModeService.isEnabled()) {
      console.log(`✈️ Getting ${tableName} data from airplane mode cache...`);
      
      const savedData = airplaneModeService.getTableData(tableName);
      if (savedData) {
        // Apply simple filters if provided
        let data = savedData.data || [];
        
        if (filters && Object.keys(filters).length > 0) {
          data = data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
              if (!value) return true; // Skip empty filters
              const itemValue = item[key];
              if (typeof itemValue === 'string') {
                return itemValue.toLowerCase().includes(value.toLowerCase());
              }
              return itemValue == value;
            });
          });
        }
        
        return {
          ...savedData,
          data: data,
          fromCache: true,
          cachedAt: savedData.savedAt
        };
      } else {
        console.warn(`⚠️ No cached data found for ${tableName}`);
        return { table: tableName, data: [], fromCache: true };
      }
    }
    
    // Normal mode - use Firebase
    return await firebaseTableService.getData(tableName, filters);
  }

  // For other methods, just pass through to firebaseTableService
  // but prevent writes in airplane mode
  async insertData(tableName, data) {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Airplane mode: Insert operation blocked');
      throw new Error('Cannot insert data in airplane mode. Disable airplane mode first.');
    }
    
    return await firebaseTableService.insertData(tableName, data);
  }

  async updateData(tableName, id, data) {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Airplane mode: Update operation blocked');
      throw new Error('Cannot update data in airplane mode. Disable airplane mode first.');
    }
    
    return await firebaseTableService.updateData(tableName, id, data);
  }

  async deleteData(tableName, id) {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Airplane mode: Delete operation blocked');
      throw new Error('Cannot delete data in airplane mode. Disable airplane mode first.');
    }
    
    return await firebaseTableService.deleteData(tableName, id);
  }

  async createTable(tableName, data) {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Airplane mode: Create table operation blocked');
      throw new Error('Cannot create table in airplane mode. Disable airplane mode first.');
    }
    
    return await firebaseTableService.createTable(tableName, data);
  }

  // Pass through formatting methods
  formatTableTitle(tableName) {
    return firebaseTableService.formatTableTitle(tableName);
  }

  formatSingleTableName(tableName) {
    return firebaseTableService.formatSingleTableName(tableName);
  }

  // Pass through other read-only methods
  setCurrentTable(tableName) {
    return firebaseTableService.setCurrentTable(tableName);
  }

  getCurrentTableTitle() {
    return firebaseTableService.getCurrentTableTitle();
  }
}

// Export singleton instance
export default new AirplaneTableService(); 