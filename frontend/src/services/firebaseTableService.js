import firebaseService from './firebaseService';
import { API_URL } from '../config/api.js';

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
      
      // Get statistics for each collection directly from API
      const tablesWithStats = await Promise.all(
        this.availableCollections.map(async (collection) => {
          try {
            // Get stats directly from API instead of firebaseService
            const response = await fetch(`${API_URL}/data/${collection.name}`);
            let count = 0;
            let columns = [];
            
            if (response.ok) {
              const result = await response.json();
              const documents = result.data || [];
              count = documents.length;
              columns = await this.getTableStructure(collection.name, documents);
            }
            
            return {
              name: collection.name,
              title: this.formatTableTitle(collection.name),
              type: collection.type,
              icon: collection.icon,
              count: count,
              lastModified: new Date(),
              isMainTable: true,
              columns: columns
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
   * Get data from a Firebase collection via backend API
   */
  async getData(tableName, options = {}) {
    try {
      console.log(`📊 Getting data from Firebase collection: ${tableName}`);
      
      // Set current table when getting data
      this.setCurrentTable(tableName);
      
      // Use backend API instead of direct Firebase calls
      const response = await fetch(`${API_URL}/data/${tableName}?nocache=true`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const documents = result.data || [];
      
      return {
        data: documents,
        columns: await this.getTableStructure(tableName, documents),
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
   * Get table structure (columns) from document data
   */
  async getTableStructure(tableName, documents = null) {
    try {
      // Use provided documents or fetch from API
      let sampleDocs = documents;
             if (!sampleDocs || sampleDocs.length === 0) {
         const response = await fetch(`${API_URL}/data/${tableName}?nocache=true`);
         if (response.ok) {
           const result = await response.json();
           sampleDocs = (result.data || []).slice(0, 5); // Take first 5 for sampling
         } else {
           return [];
         }
       }
      
      if (sampleDocs.length === 0) {
        return [];
      }
      
      // Get all unique keys from sample documents
      const allKeys = new Set();
      sampleDocs.slice(0, 5).forEach(doc => {
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
   * Update data in Firebase collection via backend API
   */
  async updateData(tableName, id, column, value) {
    try {
      console.log(`✏️ Updating ${tableName} document ${id}, column ${column} via backend API`);
      
      const updateData = { [column]: value };
      
      // Use backend API instead of direct Firebase call to ensure cache invalidation
      const response = await fetch(`${API_URL}/data/${tableName}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update document');
      }
      
      const result = await response.json();
      console.log('✅ Document updated successfully via backend API');
      return { success: true, result };
      
    } catch (error) {
      console.error(`❌ Error updating document:`, error);
      throw error;
    }
  }

  /**
   * Delete row from Firebase collection via backend API
   */
  async deleteRow(tableName, id) {
    try {
      console.log(`🗑️ Deleting document ${id} from ${tableName} via backend API`);
      
      // Use backend API instead of direct Firebase call to ensure cache invalidation
      const response = await fetch(`${API_URL}/data/${tableName}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete document');
      }
      
      const result = await response.json();
      console.log('✅ Document deleted successfully via backend API');
      return { success: true, result };
      
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
          const searchResponse = await fetch(`${API_URL}/data/${collection.name}`);
          if (!searchResponse.ok) {
            throw new Error(`HTTP error! status: ${searchResponse.status}`);
          }
          const searchResult = await searchResponse.json();
          const documents = (searchResult.data || []).slice(0, 100);
          
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
   * Insert new data into Firebase collection via backend API
   */
  async insertData(tableName, data) {
    try {
      console.log(`➕ Inserting new document into ${tableName} via backend API`);
      
      // Use backend API instead of direct Firebase call to ensure cache invalidation
      const response = await fetch(`${API_URL}/data/${tableName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to insert document');
      }
      
      const result = await response.json();
      console.log(`✅ Document created successfully via backend API with ID: ${result.id}`);
      return { success: true, id: result.id };
      
    } catch (error) {
      console.error(`❌ Error inserting document:`, error);
      throw error;
    }
  }

  /**
   * Get child tables for a parent table (Firebase compatibility)
   */
  async getChildTables(parentTableName) {
    try {
      console.log(`🔗 Getting child tables for: ${parentTableName}`);
      
      // For Firebase, we don't have traditional table relationships
      // Return empty array as Firebase collections are independent
      return [];
      
    } catch (error) {
      console.error('Error getting child tables:', error);
      return [];
    }
  }

  /**
   * Get table types from the backend API
   */
  async getTableTypes() {
    try {
      console.log('📊 Getting table types from backend API...');
      
      const response = await fetch(`${API_URL}/data/table-types`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Validate the response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid table types data received');
      }
      
      console.log('✅ Table types retrieved from backend API');
      return data;
    } catch (error) {
      console.error('Error getting table types:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export default new FirebaseTableService(); 