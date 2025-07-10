/**
 * Airplane Table Service Wrapper
 * Intercepts firebaseTableService calls when airplane mode is enabled
 */

import tableServiceAdapter from './tableServiceAdapter.js';
import airplaneModeService from './airplaneModeService.js';
import localCacheService from './localCacheService.js';

class AirplaneTableService {
  // Get tables - either from localStorage or Firebase
  async getTables(forceRefresh = false) {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Getting tables from airplane mode cache...');
      const tables = airplaneModeService.getSavedTables();
      return tables;
    }
    
    const cacheKey = 'datasection_tables';
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedTables = localCacheService.get(cacheKey);
      if (cachedTables) {
        console.log('💾 Using cached tables list');
        return cachedTables;
      }
    }
    
    // Normal mode - use table service adapter (team system enabled)
    const tables = await tableServiceAdapter.getTables();
    
    // Cache the result for 10 minutes (tables don't change often)
    localCacheService.set(cacheKey, tables, {}, 10 * 60 * 1000);
    
    return tables;
  }

  // Get table data - either from localStorage or Firebase
  async getData(tableName, filters = {}, forceRefresh = false) {
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
    
    const cacheKey = `datasection_table_${tableName}`;
    const cacheParams = { filters };
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cachedData = localCacheService.get(cacheKey, cacheParams);
      if (cachedData) {
        console.log(`💾 Using cached data for table ${tableName}`);
        return cachedData;
      }
    }
    
    console.log(`🚫 Skipping cache for ${tableName} (${forceRefresh ? 'forceRefresh=true' : 'no cache found'})`);
    
    // Normal mode - use table service adapter (team system enabled)
    const result = await tableServiceAdapter.getData(tableName, filters);
    
    // Cache the result for 5 minutes (longer TTL for better performance)
    localCacheService.set(cacheKey, result, cacheParams, 5 * 60 * 1000);
    
    return result;
  }

  // For other methods, just pass through to tableServiceAdapter
  // but prevent writes in airplane mode
  async insertData(tableName, data) {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Airplane mode: Insert operation blocked');
      throw new Error('Cannot insert data in airplane mode. Disable airplane mode first.');
    }
    
    const result = await tableServiceAdapter.insertData(tableName, data);
    
    // Invalidate related caches after successful insert
    this.invalidateTableCache(tableName);
    
    return result;
  }

  async updateData(tableName, id, data) {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Airplane mode: Update operation blocked');
      throw new Error('Cannot update data in airplane mode. Disable airplane mode first.');
    }
    
    const result = await tableServiceAdapter.updateData(tableName, id, data);
    
    // Invalidate related caches after successful update
    this.invalidateTableCache(tableName);
    
    return result;
  }

  async deleteData(tableName, id) {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Airplane mode: Delete operation blocked');
      throw new Error('Cannot delete data in airplane mode. Disable airplane mode first.');
    }
    
    const result = await tableServiceAdapter.deleteRow(tableName, id);
    
    // Invalidate related caches after successful delete
    this.invalidateTableCache(tableName);
    
    return result;
  }

  async createTable(tableName, data) {
    if (airplaneModeService.isEnabled()) {
      console.log('✈️ Airplane mode: Create table operation blocked');
      throw new Error('Cannot create table in airplane mode. Disable airplane mode first.');
    }
    
    const result = await tableServiceAdapter.createTable(tableName, data);
    
    // Invalidate tables list and table cache after creating new table
    localCacheService.invalidate('datasection_tables');
    this.invalidateTableCache(tableName);
    
    return result;
  }

  // Pass through formatting methods
  formatTableTitle(tableName) {
    return tableServiceAdapter.formatTableTitle(tableName);
  }

  formatSingleTableName(tableName) {
    return tableServiceAdapter.formatSingleTableName(tableName);
  }

  // Pass through other read-only methods
  setCurrentTable(tableName) {
    // tableServiceAdapter doesn't have setCurrentTable, skip it
    return tableName;
  }

  getCurrentTableTitle() {
    // Return empty string if not available
    return '';
  }

  // Helper method to invalidate all cache related to a table
  invalidateTableCache(tableName) {
    // Invalidate the table data cache
    localCacheService.invalidate(`datasection_table_${tableName}`);
    
    // Invalidate reports cache since table changes might affect reports
    localCacheService.invalidateService('reports');
    
    console.log(`💾 Invalidated cache for table: ${tableName}`);
  }

  // Method to invalidate all DataSection caches
  invalidateAllCache() {
    localCacheService.invalidateService('datasection');
    localCacheService.invalidateService('reports');
    console.log('💾 Invalidated all DataSection and Reports cache');
  }
}

// Export singleton instance
export default new AirplaneTableService(); 