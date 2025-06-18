/**
 * Simple Airplane Mode Service
 * Saves/loads data to/from localStorage when airplane mode is enabled
 */

class AirplaneModeService {
  constructor() {
    this.isAirplaneMode = localStorage.getItem('airplaneMode') === 'true';
  }

  // Enable airplane mode and save current data
  async enableAirplaneMode() {
    try {
      console.log('✈️ Enabling airplane mode - saving data to localStorage...');
      
      // Import services here to avoid circular dependencies
      const firebaseTableService = (await import('./firebaseTableService.js')).default;
      
      // Get all tables
      const tables = await firebaseTableService.getTables();
      
      // Save each table's data
      for (const table of tables) {
        try {
          const data = await firebaseTableService.getData(table.name);
          this.saveTableData(table.name, data);
          console.log(`📊 Saved ${table.name}: ${data.data?.length || 0} records`);
        } catch (error) {
          console.warn(`⚠️ Failed to save ${table.name}:`, error.message);
        }
      }
      
      // Save tables list
      localStorage.setItem('airplane_tables', JSON.stringify(tables));
      
      // Enable airplane mode
      this.isAirplaneMode = true;
      localStorage.setItem('airplaneMode', 'true');
      localStorage.setItem('airplaneModeTimestamp', new Date().toISOString());
      
      console.log('✅ Airplane mode enabled - all data saved locally');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to enable airplane mode:', error);
      throw error;
    }
  }

  // Disable airplane mode and clear cached data
  disableAirplaneMode() {
    console.log('🌐 Disabling airplane mode - clearing local cache...');
    
    // Get all saved tables and clear their data
    const savedTables = this.getSavedTables();
    savedTables.forEach(table => {
      localStorage.removeItem(`airplane_table_${table.name}`);
    });
    
    // Clear airplane mode settings
    localStorage.removeItem('airplaneMode');
    localStorage.removeItem('airplaneModeTimestamp');
    localStorage.removeItem('airplane_tables');
    
    this.isAirplaneMode = false;
    
    console.log('✅ Airplane mode disabled - local cache cleared');
  }

  // Check if airplane mode is enabled
  isEnabled() {
    return this.isAirplaneMode;
  }

  // Save table data to localStorage
  saveTableData(tableName, data) {
    const storageData = {
      ...data,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(`airplane_table_${tableName}`, JSON.stringify(storageData));
  }

  // Get table data from localStorage
  getTableData(tableName) {
    const saved = localStorage.getItem(`airplane_table_${tableName}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error(`Error parsing saved data for ${tableName}:`, error);
        return null;
      }
    }
    return null;
  }

  // Get list of saved tables
  getSavedTables() {
    const saved = localStorage.getItem('airplane_tables');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error parsing saved tables:', error);
        return [];
      }
    }
    return [];
  }

  // Get airplane mode status info
  getStatus() {
    const timestamp = localStorage.getItem('airplaneModeTimestamp');
    const tables = this.getSavedTables();
    
    return {
      enabled: this.isAirplaneMode,
      enabledAt: timestamp,
      tablesCount: tables.length,
      tables: tables.map(t => t.name)
    };
  }

  // Check if we have data for a specific table
  hasTableData(tableName) {
    return localStorage.getItem(`airplane_table_${tableName}`) !== null;
  }

  // Clear all airplane mode data (emergency reset)
  clearAllData() {
    console.log('🧹 Clearing all airplane mode data...');
    
    // Get all localStorage keys that start with 'airplane_'
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('airplane')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all airplane mode keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    this.isAirplaneMode = false;
    
    console.log(`✅ Cleared ${keysToRemove.length} airplane mode items`);
  }
}

// Export singleton instance
export default new AirplaneModeService(); 