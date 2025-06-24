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
        type: 'primary',
        icon: '🏥'
      },
      {
        name: 'transporte',
        title: 'Seguros de Transporte',
        type: 'primary',
        icon: '🚛'
      },
      {
        name: 'mascotas',
        title: 'Seguros de Mascotas',
        type: 'primary',
        icon: '🐕'
      },
      {
        name: 'diversos',
        title: 'Seguros Diversos',
        type: 'primary',
        icon: '📦'
      },
      {
        name: 'negocio',
        title: 'Seguros de Negocio',
        type: 'primary',
        icon: '🏢'
      },
      // Parent-Child table relationships  
      {
        name: 'emant_caratula',
        title: 'Emant Carátula',
        type: 'parent',
        icon: '👨‍👩‍👧‍👦',
        hasChildTable: true,
        childTable: 'emant_listado'
      },
      {
        name: 'emant_listado',
        title: 'Emant Listado',
        type: 'child',
        icon: '📋',
        parentTable: 'emant_caratula'
      },
      // Add more parent-child relationships as needed
      {
        name: 'gruposvida',
        title: 'Grupos Vida',
        type: 'parent',
        icon: '🛡️',
        hasChildTable: true,
        childTable: 'listadovida'
      },
      {
        name: 'listadovida',
        title: 'Listado Vida',
        type: 'child',
        icon: '📋',
        parentTable: 'gruposvida'
      },
      // Grupos Autos parent-child relationship
      {
        name: 'gruposautos',
        title: 'Grupos Autos',
        type: 'parent',
        icon: '🚗',
        hasChildTable: true,
        childTable: 'listadoautos'
      },
      {
        name: 'listadoautos',
        title: 'Listado Autos',
        type: 'child',
        icon: '📋',
        parentTable: 'gruposautos'
      }
    ];

    // Define table relationships explicitly
    this.tableRelationships = {
      'emant_caratula': {
        type: 'parent',
        childTable: 'emant_listado',
        combinedName: 'emant_caratula → emant_listado'
      },
      'emant_listado': {
        type: 'child',
        parentTable: 'emant_caratula',
        combinedName: 'emant_caratula → emant_listado'
      },
      'gruposvida': {
        type: 'parent',
        childTable: 'listadovida',
        combinedName: 'gruposvida → listadovida'
      },
      'listadovida': {
        type: 'child',
        parentTable: 'gruposvida',
        combinedName: 'gruposvida → listadovida'
      },
      'gruposautos': {
        type: 'parent',
        childTable: 'listadoautos',
        combinedName: 'gruposautos → listadoautos'
      },
      'listadoautos': {
        type: 'child',
        parentTable: 'gruposautos',
        combinedName: 'gruposautos → listadoautos'
      }
    };
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
      'emant_caratula': 'Emant Carátula',
      'emant_listado': 'Emant Listado',
      'gruposvida': 'Grupos Vida',
      'listadovida': 'Listado Vida',
      'gruposautos': 'Grupos Autos',
      'listadoautos': 'Listado Autos'
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
   * Get icon for collection based on name patterns
   */
  getCollectionIcon(tableName) {
    if (!tableName) return '📋';
    
    const lowerName = tableName.toLowerCase();
    
    // Custom icons for known collections
    const iconMap = {
      'autos': '🚗',
      'rc': '⚖️',
      'vida': '🛡️',
      'gmm': '🏥',
      'hogar': '🏠',
      'transporte': '🚛',
      'mascotas': '🐕',
      'diversos': '📦',
      'negocio': '🏢',
      'emant_caratula': '👨‍👩‍👧‍👦',
      'emant_listado': '📋',
      'gruposvida': '🛡️',
      'listadovida': '📋',
      'gruposautos': '🚗',
      'listadoautos': '📋',
      'directorio': '📞',
      'contactos': '👥',
      'clientes': '👤'
    };
    
    // Check exact matches first
    if (iconMap[lowerName]) {
      return iconMap[lowerName];
    }
    
    // Pattern matching for dynamic collections
    if (lowerName.includes('auto')) return '🚗';
    if (lowerName.includes('vida')) return '🛡️';
    if (lowerName.includes('hogar') || lowerName.includes('casa') || lowerName.includes('home')) return '🏠';
    if (lowerName.includes('salud') || lowerName.includes('medico')) return '🏥';
    if (lowerName.includes('contact') || lowerName.includes('cliente')) return '👥';
    if (lowerName.includes('directorio')) return '📞';
    if (lowerName.includes('group') || lowerName.includes('grupo')) return '👨‍👩‍👧‍👦';
    if (lowerName.includes('listado') || lowerName.includes('list')) return '📋';
    if (lowerName.includes('transporte')) return '🚛';
    if (lowerName.includes('mascota') || lowerName.includes('pet')) return '🐕';
    if (lowerName.includes('negocio') || lowerName.includes('business')) return '🏢';
    if (lowerName.includes('test')) return '🧪';
    
    // Default icon
    return '📋';
  }

  /**
   * Discover collections by testing API endpoints
   */
  async discoverCollections() {
    const discoveredCollections = [];
    
    // List of possible collection names to test (common patterns)
    const possibleNames = [
      'hogar', 'clientes', 'usuarios', 'personas', 
      'empleados', 'ventas', 'productos', 'servicios', 'facturas', 'pagos', 'reportes', 
      'configuracion', 'logs', 'auditoria'
    ];
    
    console.log('🔍 Discovering collections by testing API endpoints...');
    
    for (const name of possibleNames) {
              try {
          const response = await fetch(`${API_URL}/data/${name}`);
          if (response.ok) {
            const result = await response.json();
            const count = result.total || 0;
            
            // Only include collections that have data (skip empty collections)
            if (count > 0) {
              console.log(`✅ Found collection: ${name} (${count} records)`);
              discoveredCollections.push({
                name: name,
                title: this.formatTableTitle(name),
                type: 'primary',
                icon: this.getCollectionIcon(name),
                count: count
              });
            } else {
              console.log(`⚪ Skipping empty collection: ${name} (0 records)`);
            }
          }
        } catch (error) {
          // Collection doesn't exist or has access issues - skip silently
        }
    }
    
    return discoveredCollections;
  }

  /**
   * Get available Firebase collections as "tables"
   */
  async getTables() {
    try {
      console.log('🔥 Getting Firebase tables with relationships...');
      
      // Start with predefined collections
      let allCollections = [...this.availableCollections];
      
      // Try to discover additional collections
      try {
        const discoveredCollections = await this.discoverCollections();
        
        // Merge discovered with predefined (avoid duplicates)
        const predefinedNames = new Set(this.availableCollections.map(c => c.name));
        const newDiscovered = discoveredCollections.filter(c => !predefinedNames.has(c.name));
        
        if (newDiscovered.length > 0) {
          console.log('🔍 Discovered new collections:', newDiscovered.map(c => c.name));
          allCollections = [...allCollections, ...newDiscovered];
        }
      } catch (error) {
        console.warn('Could not discover additional collections:', error);
      }
      
      console.log('📊 All collections to process:', allCollections.map(c => c.name));
      
      // Get base collections and enhance with relationship info and counts
      const enhancedTables = await Promise.all(
        allCollections.map(async (collection) => {
          const relationship = this.tableRelationships[collection.name];
          
          // Get actual count from Firebase if not already set
          let count = collection.count || 0;
          if (count === 0) {
            try {
              // Add random timestamp to avoid browser caching
              const timestamp = Date.now();
              const response = await fetch(`${API_URL}/data/${collection.name}?nocache=${timestamp}&_t=${Math.random()}`);
              if (response.ok) {
                const result = await response.json();
                count = result.total || (result.data ? result.data.length : 0);
                console.log(`📊 Got count for ${collection.name}: ${count}`);
              }
            } catch (error) {
              console.warn(`Could not get count for ${collection.name}:`, error);
            }
          }
          
          return {
            ...collection,
            isParentTable: relationship?.type === 'parent',
            isChildTable: relationship?.type === 'child',
            hasChildTable: relationship?.type === 'parent',
            childTable: relationship?.type === 'parent' ? relationship.childTable : null,
            parentTable: relationship?.type === 'child' ? relationship.parentTable : null,
            count: count
          };
        })
      );

      console.log('🔥 Enhanced tables with relationships:', enhancedTables.map(t => `${t.name} (${t.count})`));
      return enhancedTables;
      
    } catch (error) {
      console.error('Error getting tables:', error);
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
   * Get child tables for a parent table with real Firebase relationships
   */
  async getChildTables(parentTableName) {
    try {
      console.log(`🔗 Getting child tables for: ${parentTableName}`);
      
      // Check if this table has a defined relationship
      const relationship = this.tableRelationships[parentTableName];
      if (relationship && relationship.type === 'parent') {
        console.log(`✅ Found child table: ${relationship.childTable}`);
        return [relationship.childTable];
      }
      
      // No child tables found
      console.log(`ℹ️ No child tables found for: ${parentTableName}`);
      return [];
      
    } catch (error) {
      console.error('Error getting child tables:', error);
      return [];
    }
  }

  /**
   * Get parent table for a child table
   */
  getParentTable(childTableName) {
    const relationship = this.tableRelationships[childTableName];
    if (relationship && relationship.type === 'child') {
      return relationship.parentTable;
    }
    return null;
  }

  /**
   * Check if a table is a parent table
   */
  isParentTable(tableName) {
    const relationship = this.tableRelationships[tableName];
    return relationship && relationship.type === 'parent';
  }

  /**
   * Check if a table is a child table
   */
  isChildTable(tableName) {
    const relationship = this.tableRelationships[tableName];
    return relationship && relationship.type === 'child';
  }

  /**
   * Get combined table name (parent → child)
   */
  getCombinedTableName(tableName) {
    const relationship = this.tableRelationships[tableName];
    if (relationship) {
      return relationship.combinedName;
    }
    return tableName;
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