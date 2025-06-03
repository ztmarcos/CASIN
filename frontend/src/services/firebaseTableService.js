import firebaseService from './firebaseService.js';

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
      },
      {
        name: 'prospeccion_cards',
        title: 'Tarjetas de Prospección',
        type: 'secondary',
        icon: '💡'
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
      'gruposgmm': 'Grupos GMM',
      'prospeccion_cards': 'Tarjetas de Prospección'
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
      
      // Handle combined table names (future feature)
      if (tableName.includes('→')) {
        const [parentTable, childTable] = tableName.split('→').map(t => t.trim());
        console.log('📊 Loading combined table data:', { parentTable, childTable });
        
        // Get both collections
        const [parentData, childData] = await Promise.all([
          this.firebaseService.getAllDocuments(parentTable, options.limit || 1000),
          this.firebaseService.getAllDocuments(childTable, options.limit || 1000)
        ]);
        
        return {
          table: tableName,
          data: childData || [],
          parentData: parentData || [],
          timestamp: new Date().toISOString()
        };
      }
      
      // Get single collection data
      const data = await this.firebaseService.getAllDocuments(tableName, options.limit || 1000);
      
      // Convert Firebase data to table format
      const processedData = data.map(doc => {
        const processed = { ...doc };
        
        // Convert Firestore timestamps to readable dates
        Object.keys(processed).forEach(key => {
          if (processed[key] && typeof processed[key] === 'object' && processed[key].seconds) {
            processed[key] = new Date(processed[key].seconds * 1000).toISOString().split('T')[0];
          }
        });
        
        return processed;
      });
      
      console.log(`✅ Retrieved ${processedData.length} records from ${tableName}`);
      
      return {
        table: tableName,
        data: processedData,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`❌ Error getting data from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get table structure (columns) from Firebase collection
   */
  async getTableStructure(tableName) {
    try {
      console.log(`🔍 Getting structure for table: ${tableName}`);
      
      // Get sample documents to understand structure
      const sampleData = await this.firebaseService.getAllDocuments(tableName, 5);
      
      if (sampleData.length === 0) {
        console.log(`⚠️ No data found in collection: ${tableName}`);
        return [];
      }

      // Get defined column order for this table
      const definedOrder = this.getColumnOrder(tableName);
      
      // Get all unique keys from the sample data
      const allKeys = new Set();
      sampleData.forEach(doc => {
        Object.keys(doc).forEach(key => allKeys.add(key));
      });

      let orderedColumns;
      
      if (definedOrder) {
        // Use predefined order and add any extra columns at the end
        const extraColumns = [...allKeys].filter(key => !definedOrder.includes(key));
        orderedColumns = [...definedOrder.filter(col => allKeys.has(col)), ...extraColumns];
      } else {
        // Fallback to alphabetical order if no predefined order exists
        orderedColumns = [...allKeys].sort();
      }

      // Create column structure with enhanced metadata
      const structure = orderedColumns.map(columnName => {
        // Sample values for type inference
        const sampleValues = sampleData
          .map(doc => doc[columnName])
          .filter(val => val != null)
          .slice(0, 3);

        return {
          Field: columnName,
          Type: this.inferColumnType(sampleValues[0], sampleValues),
          Null: 'YES',
          Key: columnName === 'id' ? 'PRI' : '',
          Default: null,
          Extra: columnName === 'id' ? 'auto_increment' : ''
        };
      });

      console.log(`✅ Structure for ${tableName}:`, structure.length, 'columns');
      console.log(`📋 Column order: ${orderedColumns.join(', ')}`);
      
      return structure;
      
    } catch (error) {
      console.error(`❌ Error getting table structure for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Infer column type from value
   */
  inferColumnType(value) {
    if (value === null || value === undefined) return 'VARCHAR(255)';
    
    if (typeof value === 'number') {
      return value % 1 === 0 ? 'INT' : 'DECIMAL(10,2)';
    } else if (value instanceof Date) {
      return 'DATETIME';
    } else if (typeof value === 'boolean') {
      return 'BOOLEAN';
    } else if (typeof value === 'object' && value.seconds) {
      // Firestore timestamp
      return 'DATETIME';
    } else {
      return 'VARCHAR(255)';
    }
  }

  /**
   * Update data in Firebase
   */
  async updateData(tableName, id, column, value) {
    try {
      console.log(`📝 Updating ${tableName} document ${id}: ${column} = ${value}`);
      
      const updateData = { [column]: value };
      await this.firebaseService.updateDocument(tableName, id, updateData);
      
      console.log('✅ Document updated successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error updating document:', error);
      throw error;
    }
  }

  /**
   * Delete row from Firebase
   */
  async deleteRow(tableName, id) {
    try {
      console.log(`🗑️ Deleting document ${id} from ${tableName}`);
      
      await this.firebaseService.deleteDocument(tableName, id);
      
      console.log('✅ Document deleted successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Search across all Firebase collections
   */
  async searchAllTables(searchTerm) {
    try {
      console.log(`🔍 Searching across Firebase collections for: ${searchTerm}`);
      
      const results = [];
      
      for (const collection of this.availableCollections) {
        try {
          const searchResults = await this.firebaseService.searchDocuments(
            collection.name, 
            searchTerm,
            ['nombre_completo', 'email', 'nombre_contratante', 'numero_poliza', 'numero_de_poliza'],
            50
          );
          
          searchResults.forEach(result => {
            results.push({
              ...result,
              table: collection.name,
              tableTitle: collection.title
            });
          });
        } catch (error) {
          console.warn(`Error searching in ${collection.name}:`, error);
        }
      }
      
      console.log(`✅ Found ${results.length} results across collections`);
      return results;
      
    } catch (error) {
      console.error('❌ Error searching across collections:', error);
      throw error;
    }
  }

  /**
   * Add new document to Firebase collection
   */
  async insertData(tableName, data) {
    try {
      console.log(`➕ Adding new document to ${tableName}:`, data);
      
      if (Array.isArray(data)) {
        // Batch insert
        const results = [];
        for (const item of data) {
          const docId = await this.firebaseService.addDocument(tableName, item);
          results.push({ id: docId, ...item });
        }
        return results;
      } else {
        // Single insert
        const docId = await this.firebaseService.addDocument(tableName, data);
        return { id: docId, ...data };
      }
      
    } catch (error) {
      console.error('❌ Error inserting data:', error);
      throw error;
    }
  }

  /**
   * Get child tables (for future expansion)
   */
  async getChildTables(parentTableName) {
    try {
      // For now, return empty array as Firebase collections don't have child relationships
      // This can be expanded in the future if needed
      return [];
      
    } catch (error) {
      console.error('Error getting child tables:', error);
      return [];
    }
  }

  /**
   * Create a new Firebase collection (table)
   */
  async createTable(tableName, data) {
    try {
      console.log(`📋 Creating new Firebase collection: ${tableName}`);
      
      // Add to available collections
      this.availableCollections.push({
        name: tableName,
        title: this.formatSingleTableName(tableName),
        type: 'custom',
        icon: '📄'
      });
      
      // If data is provided, insert it
      if (data && data.length > 0) {
        await this.insertData(tableName, data);
      }
      
      console.log('✅ Collection created successfully');
      return { success: true, tableName };
      
    } catch (error) {
      console.error('❌ Error creating collection:', error);
      throw error;
    }
  }

  /**
   * Rename a Firebase collection (for compatibility)
   */
  async renameTable(oldName, newName) {
    try {
      console.log(`📝 Renaming collection from ${oldName} to ${newName}`);
      
      // Note: Firebase doesn't support renaming collections directly
      // This would require creating a new collection and migrating data
      // For now, we'll just update our internal list
      const collectionIndex = this.availableCollections.findIndex(c => c.name === oldName);
      if (collectionIndex >= 0) {
        this.availableCollections[collectionIndex] = {
          ...this.availableCollections[collectionIndex],
          name: newName,
          title: this.formatSingleTableName(newName)
        };
      }
      
      console.log('⚠️ Collection renamed in memory only (Firebase limitation)');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error renaming collection:', error);
      throw error;
    }
  }

  /**
   * Delete a Firebase collection (for compatibility)
   */
  async deleteTable(tableName) {
    try {
      console.log(`🗑️ Deleting Firebase collection: ${tableName}`);
      
      // Note: Firebase doesn't provide a direct way to delete collections
      // We'd need to delete all documents in the collection
      // For now, we'll just remove it from our internal list
      this.availableCollections = this.availableCollections.filter(c => c.name !== tableName);
      
      console.log('⚠️ Collection removed from memory only (Firebase limitation)');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error deleting collection:', error);
      throw error;
    }
  }

  /**
   * Create table group (for compatibility - not needed in Firebase)
   */
  async createTableGroup(mainTableName, secondaryTableName, groupType = 'default') {
    try {
      console.log(`📎 Creating table group: ${mainTableName} + ${secondaryTableName}`);
      
      // Firebase collections don't have relationships like MySQL tables
      // This is just for compatibility with existing UI
      console.log('ℹ️ Table groups not needed in Firebase - collections are independent');
      
      return { success: true, message: 'Groups not needed in Firebase' };
      
    } catch (error) {
      console.error('❌ Error creating table group:', error);
      throw error;
    }
  }

  /**
   * Update table order (for compatibility - stored in memory only)
   */
  async updateTableOrder(tableOrder) {
    try {
      console.log('📊 Updating table order:', tableOrder);
      
      // Firebase doesn't have inherent ordering, but we can reorder our internal list
      const reorderedCollections = tableOrder.map(tableName => 
        this.availableCollections.find(c => c.name === tableName)
      ).filter(Boolean);
      
      // Add any missing collections
      const existingNames = new Set(tableOrder);
      const missingCollections = this.availableCollections.filter(c => !existingNames.has(c.name));
      
      this.availableCollections = [...reorderedCollections, ...missingCollections];
      
      console.log('✅ Table order updated in memory');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error updating table order:', error);
      throw error;
    }
  }

  /**
   * Get table types (for compatibility with GPTAnalysis)
   */
  async getTableTypes() {
    try {
      console.log('📋 Getting table types for GPTAnalysis compatibility...');
      
      const tables = await this.getTables();
      const tableTypes = {};
      
      tables.forEach(table => {
        tableTypes[table.name] = {
          fields: table.columns ? table.columns.map(col => col.Field).filter(field => field !== 'id') : [],
          type: table.type || 'primary'
        };
      });
      
      console.log('✅ Table types generated:', tableTypes);
      return tableTypes;
      
    } catch (error) {
      console.error('❌ Error getting table types:', error);
      throw error;
    }
  }

  // Define column order based on original MySQL structure
  getColumnOrder(tableName) {
    const columnOrders = {
      'directorio_contactos': [
        'id',
        'origen', 
        'comentario',
        'nombre_completo',
        'nombre_completo_oficial',
        'nickname',
        'apellido',
        'display_name',
        'empresa',
        'telefono_oficina',
        'telefono_casa',
        'telefono_asistente', 
        'telefono_movil',
        'telefonos_corregidos',
        'email',
        'entidad',
        'genero',
        'status_social',
        'ocupacion',
        'pais',
        'status',
        'created_at',
        'updated_at'
      ],
      'autos': [
        'id',
        'nombre_contratante',
        'numero_poliza',
        'aseguradora',
        'vigencia_inicio',
        'vigencia_fin',
        'forma_de_pago',
        'pago_total_o_prima_total',
        'prima_neta',
        'derecho_de_poliza',
        'recargo_por_pago_fraccionado',
        'i_v_a',
        'e_mail',
        'tipo_de_vehiculo',
        'duracion',
        'rfc',
        'domicilio_o_direccion',
        'descripcion_del_vehiculo',
        'serie',
        'modelo',
        'placas',
        'motor',
        'uso',
        'pdf',
        'ramo'
      ],
      'rc': [
        'id',
        'asegurado',
        'numero_poliza',
        'aseguradora',
        'fecha_inicio',
        'fecha_fin',
        'forma_pago',
        'importe_total',
        'derecho_poliza',
        'prima_neta',
        'recargo_pago_fraccionado',
        'iva',
        'email',
        'limite_maximo_responsabilidad',
        'responsable',
        'ramo'
      ],
      'vida': [
        'id',
        'contratante',
        'numero_poliza',
        'aseguradora',
        'fecha_inicio',
        'fecha_fin',
        'forma_pago',
        'importe_a_pagar_mxn',
        'prima_neta_mxn',
        'derecho_poliza',
        'recargo_pago_fraccionado',
        'iva',
        'email',
        'tipo_de_poliza',
        'tipo_de_plan',
        'rfc',
        'direccion',
        'telefono',
        'fecha_expedicion',
        'beneficiarios',
        'edad_de_contratacion',
        'tipo_de_riesgo',
        'fumador',
        'coberturas',
        'pdf',
        'responsable',
        'cobrar_a',
        'ramo'
      ]
    };

    return columnOrders[tableName] || null;
  }
}

export default new FirebaseTableService(); 