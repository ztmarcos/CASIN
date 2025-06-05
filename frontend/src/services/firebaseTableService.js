import firebaseService from './firebaseService';

class FirebaseTableService {
  constructor() {
    this.firebaseService = firebaseService;
    this.currentTableName = null;
    this.currentTableTitle = null;
    
    // Available Firebase collections (equivalent to MySQL tables)
    this.availableCollections = [
      {
        name: 'directorio_contactos',
        title: 'Directorio Contactos',
        type: 'primary',
        icon: '👥'
      },
      {
        name: 'autos',
        title: 'Seguros de Autos',
        type: 'primary', 
        icon: '🚗'
      },
      {
        name: 'rc',
        title: 'Responsabilidad Civil',
        type: 'primary',
        icon: '⚖️'
      },
      {
        name: 'vida',
        title: 'Seguros de Vida',
        type: 'primary',
        icon: '🛡️'
      },
      {
        name: 'gmm',
        title: 'Gastos Médicos Mayores',
        type: 'secondary',
        icon: '🏥'
      },
      {
        name: 'transporte',
        title: 'Seguros de Transporte',
        type: 'secondary',
        icon: '🚛'
      },
      {
        name: 'mascotas',
        title: 'Seguros de Mascotas',
        type: 'secondary',
        icon: '🐕'
      },
      {
        name: 'diversos',
        title: 'Seguros Diversos',
        type: 'secondary',
        icon: '📦'
      },
      {
        name: 'negocio',
        title: 'Seguros de Negocio',
        type: 'secondary',
        icon: '🏢'
      },
      {
        name: 'gruposgmm',
        title: 'Grupos GMM',
        type: 'secondary',
        icon: '👨‍👩‍👧‍👦'
      }
    ];
  }

  // Table title handling (compatible with existing code)
  setCurrentTable(tableName) {
    this.currentTableName = tableName;
    this.currentTableTitle = this.formatTableTitle(tableName);
  }

  getCurrentTableTitle() {
    return this.currentTableTitle || this.formatTableTitle(this.currentTableName);
  }

  formatTableTitle(tableName) {
    if (!tableName) return '';
    
    // Check if it's a combined table name (contains arrow)
    if (tableName.includes('→')) {
      const [mainTable, secondaryTable] = tableName.split('→').map(t => t.trim());
      return `${this.formatSingleTableName(mainTable)} → ${this.formatSingleTableName(secondaryTable)}`;
    }
    
    return this.formatSingleTableName(tableName);
  }

  formatSingleTableName(tableName) {
    if (!tableName || typeof tableName !== 'string') {
      return '';
    }
    
    // Custom mappings for better display names
    const customNames = {
      'directorio_contactos': 'Directorio de Contactos',
      'autos': 'Seguros de Autos',
      'rc': 'Responsabilidad Civil',
      'vida': 'Seguros de Vida',
      'gmm': 'Gastos Médicos Mayores',
      'transporte': 'Seguros de Transporte',
      'mascotas': 'Seguros de Mascotas',
      'diversos': 'Seguros Diversos',
      'negocio': 'Seguros de Negocio',
      'gruposgmm': 'Grupos GMM'
    };
    
    if (customNames[tableName]) {
      return customNames[tableName];
    }
    
    return tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Get available Firebase collections as "tables"
   */
  async getTables() {
    try {
      console.log('📋 Getting Firebase collections as tables...');
      
      // Get statistics for each collection
      const tablesWithStats = await Promise.all(
        this.availableCollections.map(async (collection) => {
          try {
            const stats = await this.firebaseService.getCollectionStats(collection.name);
            return {
              name: collection.name,
              title: this.formatTableTitle(collection.name),
              type: collection.type,
              icon: collection.icon,
              count: stats.count || 0,
              lastModified: stats.lastModified || new Date(),
              isMainTable: true,
              columns: await this.getTableStructure(collection.name)
            };
          } catch (error) {
            console.warn(`Could not get stats for ${collection.name}:`, error);
            return {
              name: collection.name,
              title: this.formatTableTitle(collection.name),
              type: collection.type,
              icon: collection.icon,
              count: 0,
              lastModified: new Date(),
              isMainTable: true,
              columns: []
            };
          }
        })
      );
      
      console.log('✅ Firebase tables retrieved:', tablesWithStats);
      return tablesWithStats;
      
    } catch (error) {
      console.error('❌ Error fetching Firebase tables:', error);
      throw error;
    }
  }

  /**
   * Get data from a Firebase collection
   */
  async getData(tableName, options = {}) {
    try {
      console.log(`📊 Getting data from Firebase collection: ${tableName}`);
      
      // Set current table when getting data
      this.setCurrentTable(tableName);
      
      const limit = options.limit || 100;
      const documents = await this.firebaseService.getAllDocuments(tableName, limit);
      
      return {
        data: documents,
        columns: await this.getTableStructure(tableName),
        total: documents.length,
        tableName: tableName,
        title: this.formatTableTitle(tableName)
      };
      
    } catch (error) {
      console.error(`❌ Error getting data from Firebase collection ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get table structure (columns) from a Firebase collection
   */
  async getTableStructure(tableName) {
    try {
      // Get a few documents to infer structure
      const sampleDocs = await this.firebaseService.getAllDocuments(tableName, 5);
      
      if (sampleDocs.length === 0) {
        return [];
      }
      
      // Get all unique keys from sample documents
      const allKeys = new Set();
      sampleDocs.forEach(doc => {
        Object.keys(doc).forEach(key => allKeys.add(key));
      });
      
      // Convert to column objects
      const columns = Array.from(allKeys).map(key => ({
        name: key,
        type: this.inferColumnType(sampleDocs[0][key]),
        nullable: true
      }));
      
      return columns;
      
    } catch (error) {
      console.error(`Error getting table structure for ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Infer column type from value
   */
  inferColumnType(value) {
    if (value === null || value === undefined) return 'text';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string') {
      // Check if it looks like a date
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
      // Check if it looks like an email
      if (value.includes('@')) return 'email';
    }
    return 'text';
  }

  /**
   * Update data in Firebase collection
   */
  async updateData(tableName, id, column, value) {
    try {
      console.log(`✏️ Updating ${tableName} document ${id}, column ${column}`);
      
      const updateData = { [column]: value };
      await this.firebaseService.updateDocument(tableName, id, updateData);
      
      console.log('✅ Document updated successfully');
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Error updating document:`, error);
      throw error;
    }
  }

  /**
   * Delete row from Firebase collection
   */
  async deleteRow(tableName, id) {
    try {
      console.log(`🗑️ Deleting document ${id} from ${tableName}`);
      
      await this.firebaseService.deleteDocument(tableName, id);
      
      console.log('✅ Document deleted successfully');
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Error deleting document:`, error);
      throw error;
    }
  }

  /**
   * Search across all collections
   */
  async searchAllTables(searchTerm) {
    try {
      console.log(`🔍 Searching all collections for: "${searchTerm}"`);
      
      const results = [];
      
      for (const collection of this.availableCollections) {
        try {
          const documents = await this.firebaseService.getAllDocuments(collection.name, 100);
          
          const filteredDocs = documents.filter(doc => {
            return Object.values(doc).some(value => 
              String(value).toLowerCase().includes(searchTerm.toLowerCase())
            );
          });
          
          if (filteredDocs.length > 0) {
            results.push({
              tableName: collection.name,
              title: collection.title,
              results: filteredDocs,
              count: filteredDocs.length
            });
          }
          
        } catch (error) {
          console.warn(`Could not search in ${collection.name}:`, error);
        }
      }
      
      console.log(`✅ Search completed. Found results in ${results.length} collections`);
      return results;
      
    } catch (error) {
      console.error('❌ Error searching collections:', error);
      throw error;
    }
  }

  /**
   * Insert new data into Firebase collection
   */
  async insertData(tableName, data) {
    try {
      console.log(`➕ Inserting new document into ${tableName}`);
      
      const docId = await this.firebaseService.addDocument(tableName, data);
      
      console.log(`✅ Document created with ID: ${docId}`);
      return { success: true, id: docId };
      
    } catch (error) {
      console.error(`❌ Error inserting document:`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
export default new FirebaseTableService(); 