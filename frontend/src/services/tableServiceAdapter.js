import teamDataService from './teamDataService';
import firebaseTableService from './firebaseTableService';

/**
 * Adaptador para firebaseTableService que usa el sistema de equipos
 * Mantiene la misma API para compatibilidad con componentes existentes
 */
class TableServiceAdapter {
  // ===== MÉTODOS DE CONFIGURACIÓN =====
  
  /**
   * Verifica si el usuario actual es el usuario CASIN (admin global)
   */
  isCasinUser() {
    try {
      // Intentar obtener email desde diferentes fuentes
      let userEmail = null;
      
      // 1. Desde localStorage (clave 'user')
      try {
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userEmail = userData.email;
      } catch (e) {
        // Continuar con otras opciones
      }
      
      // 2. Si no está en 'user', intentar desde otras claves de localStorage
      if (!userEmail) {
        try {
          const authData = JSON.parse(localStorage.getItem('authUser') || '{}');
          userEmail = authData.email;
        } catch (e) {
          // Continuar
        }
      }
      
      // 3. Intentar desde window.userEmail si está disponible
      if (!userEmail && typeof window !== 'undefined' && window.userEmail) {
        userEmail = window.userEmail;
      }
      
      // 4. Buscar en todas las claves de localStorage que contengan email
      if (!userEmail) {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              const value = localStorage.getItem(key);
              if (value && value.includes('@')) {
                try {
                  const parsed = JSON.parse(value);
                  if (parsed.email && typeof parsed.email === 'string') {
                    userEmail = parsed.email;
                    break;
                  }
                } catch (e) {
                  // Si no es JSON, verificar si el valor mismo es un email
                  if (value.includes('@') && value.includes('.')) {
                    userEmail = value;
                    break;
                  }
                }
              }
            }
          }
        } catch (e) {
          // Continuar
        }
      }
      
      console.log(`🔍 Found user email: ${userEmail}`);
      
      if (!userEmail) {
        console.warn('⚠️ No user email found in any source');
        return false;
      }
      
      // Lista de emails que son usuarios CASIN
      const casinUsers = [
        'z.t.marcos@gmail.com',
        'ztmarcos@gmail.com',
        'marcos@casin.com',
        'bumtekateam@gmail.com' // Admin adicional para pruebas
      ];
      
      const isCasin = casinUsers.includes(userEmail);
      console.log(`🔍 Checking if user is CASIN: ${userEmail} → ${isCasin ? 'YES' : 'NO'}`);
      
      return isCasin;
    } catch (error) {
      console.warn('⚠️ Error checking CASIN user:', error);
      return false;
    }
  }

  /**
   * Verifica si el sistema de equipos está disponible y debe usarse
   */
  isTeamSystemAvailable() {
    try {
      // Si es usuario CASIN, NO usar sistema de equipos
      if (this.isCasinUser()) {
        console.log('👑 CASIN user detected, using original tables');
        return false;
      }
      
      // Para otros usuarios, verificar si el sistema de equipos está disponible
      const hasTeamService = teamDataService && typeof teamDataService.createDocument === 'function';
      
      if (hasTeamService) {
        console.log('👥 Team user detected, using team system');
        return true;
      } else {
        console.log('⚠️ Team system not available, falling back to original service');
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Error checking team system availability:', error);
      return false;
    }
  }

  /**
   * Obtiene el servicio apropiado (team o original)
   */
  getService() {
    return this.isTeamSystemAvailable() ? teamDataService : firebaseTableService;
  }

  // ===== MÉTODOS DE TABLAS =====

  /**
   * Obtiene todas las tablas con información de conteo
   */
  async getTables() {
    try {
      if (this.isTeamSystemAvailable()) {
        // Usar team data service
        const collections = await teamDataService.listCollections();
        
        // Obtener conteo para cada colección
        const tablesWithCount = await Promise.all(
          collections.map(async (collectionName) => {
            try {
              // Obtener conteo de la colección del equipo
              let count = 0;
              const result = await teamDataService.queryDocuments(collectionName, { 
                limit: 0, // Solo obtener el conteo, no los documentos
                countOnly: true 
              });
              count = result.total || 0;
              
              // Si la colección del equipo está vacía, intentar obtener conteo de CASIN original
              if (count === 0) {
                try {
                  const casinResult = await firebaseTableService.getData(collectionName, { 
                    limit: 0, // Solo obtener el conteo
                    countOnly: true 
                  });
                  count = casinResult.total || (casinResult.data ? casinResult.data.length : 0);
                  console.log(`📊 Using CASIN count for ${collectionName}: ${count}`);
                } catch (fallbackError) {
                  console.warn(`⚠️ Could not get CASIN count for ${collectionName}:`, fallbackError);
                }
              } else {
                console.log(`📊 Using team count for ${collectionName}: ${count}`);
              }
              
              return {
                name: collectionName,
                title: this.formatTableTitle(collectionName),
                count: count,
                isTeamData: count > 0 && result.total > 0
              };
            } catch (error) {
              console.warn(`⚠️ Could not get count for ${collectionName}:`, error);
              return {
                name: collectionName,
                title: this.formatTableTitle(collectionName),
                count: 0
              };
            }
          })
        );
        
        console.log('📊 Tables with counts:', tablesWithCount.map(t => `${t.name} (${t.count})`));
        return tablesWithCount;
      } else {
        // Fallback al servicio original
        return await firebaseTableService.getTables();
      }
    } catch (error) {
      console.error('❌ Error getting tables:', error);
      // Fallback en caso de error
      return await firebaseTableService.getTables();
    }
  }

  /**
   * Obtiene tipos de tabla
   */
  async getTableTypes() {
    if (this.isTeamSystemAvailable()) {
      // Para el sistema de equipos, devolver tipos básicos
      return [
        { type: 'contactos', label: 'Contactos' },
        { type: 'polizas', label: 'Pólizas' },
        { type: 'clientes', label: 'Clientes' },
        { type: 'custom', label: 'Personalizada' }
      ];
    } else {
      return await firebaseTableService.getTableTypes();
    }
  }

  /**
   * Crea una nueva tabla
   */
  async createTable(tableName, data) {
    try {
      if (this.isTeamSystemAvailable()) {
        // Crear colección en team data service
        if (data && data.length > 0) {
          // Si hay datos, insertar el primer documento para crear la colección
          const result = await teamDataService.createDocument(tableName, data[0]);
          
          // Insertar el resto de los datos si los hay
          if (data.length > 1) {
            for (let i = 1; i < data.length; i++) {
              await teamDataService.createDocument(tableName, data[i]);
            }
          }
          
          return { success: true, id: result.id };
        } else {
          // Crear colección vacía con un documento temporal
          const tempDoc = { _temp: true, created: new Date().toISOString() };
          const result = await teamDataService.createDocument(tableName, tempDoc);
          return { success: true, id: result.id };
        }
      } else {
        return await firebaseTableService.createTable(tableName, data);
      }
    } catch (error) {
      console.error('❌ Error creating table:', error);
      throw error;
    }
  }

  /**
   * Crea un grupo de tablas
   */
  async createTableGroup(groupName, tables) {
    if (this.isTeamSystemAvailable()) {
      // Para el sistema de equipos, crear cada tabla individualmente
      const results = [];
      for (const table of tables) {
        const result = await this.createTable(table.name, table.data || []);
        results.push(result);
      }
      return { success: true, tables: results };
    } else {
      return await firebaseTableService.createTableGroup(groupName, tables);
    }
  }

  /**
   * Renombra una tabla
   */
  async renameTable(oldName, newName) {
    if (this.isTeamSystemAvailable()) {
      // Para el sistema de equipos, necesitaríamos migrar datos
      // Por ahora, devolver error o implementar migración
      throw new Error('Renaming tables not yet supported in team system');
    } else {
      return await firebaseTableService.renameTable(oldName, newName);
    }
  }

  /**
   * Elimina una tabla
   */
  async deleteTable(tableName) {
    if (this.isTeamSystemAvailable()) {
      // Eliminar toda la colección
      return await teamDataService.deleteCollection(tableName);
    } else {
      return await firebaseTableService.deleteTable(tableName);
    }
  }

  // ===== MÉTODOS DE DATOS =====

  /**
   * Obtiene datos de una tabla con fallback a datos originales de CASIN
   */
  async getData(tableName, filters = {}) {
    try {
      if (this.isTeamSystemAvailable()) {
        const options = {
          limit: filters.limit || 50,
          page: filters.page || 1
        };
        
        // Agregar filtros si existen
        if (filters.filters && Object.keys(filters.filters).length > 0) {
          options.filters = filters.filters;
        }
        
        const result = await teamDataService.queryDocuments(tableName, options);
        
        // Si la colección del equipo está vacía, intentar obtener datos de CASIN original
        if ((!result.documents || result.documents.length === 0) && result.total === 0) {
          console.log(`📋 Team collection ${tableName} is empty, trying CASIN fallback...`);
          
          try {
            const casinResult = await firebaseTableService.getData(tableName, filters);
            if (casinResult.data && casinResult.data.length > 0) {
              console.log(`✅ Using CASIN data for ${tableName}: ${casinResult.data.length} records`);
              return {
                ...casinResult,
                isFromCASIN: true, // Marcar que viene de CASIN original
                message: 'Mostrando datos de CASIN original (colección del equipo vacía)'
              };
            }
          } catch (fallbackError) {
            console.warn(`⚠️ CASIN fallback failed for ${tableName}:`, fallbackError);
          }
        }
        
        // Convertir al formato esperado
        return {
          data: result.documents || [],
          total: result.total || 0,
          page: result.page || 1,
          totalPages: Math.ceil((result.total || 0) / (options.limit || 50)),
          isFromTeam: true
        };
      } else {
        return await firebaseTableService.getData(tableName, filters);
      }
    } catch (error) {
      console.error(`❌ Error getting data from ${tableName}:`, error);
      return { data: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  /**
   * Inserta datos en una tabla
   */
  async insertData(tableName, data) {
    try {
      if (this.isTeamSystemAvailable()) {
        if (Array.isArray(data)) {
          // Insertar múltiples documentos
          const results = [];
          for (const item of data) {
            const result = await teamDataService.createDocument(tableName, item);
            results.push(result);
          }
          return { success: true, inserted: results.length, ids: results.map(r => r.id) };
        } else {
          // Insertar un solo documento
          const result = await teamDataService.createDocument(tableName, data);
          return { success: true, inserted: 1, id: result.id };
        }
      } else {
        return await firebaseTableService.insertData(tableName, data);
      }
    } catch (error) {
      console.error(`❌ Error inserting data into ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza datos en una tabla
   */
  async updateData(tableName, id, column, value) {
    try {
      if (this.isTeamSystemAvailable()) {
        const updateData = { [column]: value };
        const result = await teamDataService.updateDocument(tableName, id, updateData);
        return { success: true, updated: result };
      } else {
        return await firebaseTableService.updateData(tableName, id, column, value);
      }
    } catch (error) {
      console.error(`❌ Error updating data in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Elimina una fila
   */
  async deleteRow(tableName, id) {
    try {
      if (this.isTeamSystemAvailable()) {
        await teamDataService.deleteDocument(tableName, id);
        return { success: true };
      } else {
        return await firebaseTableService.deleteRow(tableName, id);
      }
    } catch (error) {
      console.error(`❌ Error deleting row from ${tableName}:`, error);
      throw error;
    }
  }

  // ===== MÉTODOS DE UTILIDAD =====

  /**
   * Actualiza el orden de las tablas
   */
  async updateTableOrder(newOrder) {
    if (this.isTeamSystemAvailable()) {
      // Para el sistema de equipos, esto podría guardarse en metadata
      console.log('💡 Table order update not yet implemented for team system');
      return { success: true };
    } else {
      return await firebaseTableService.updateTableOrder(newOrder);
    }
  }

  // ===== MÉTODOS DE FORMATO (mantenidos para compatibilidad) =====

  formatTableTitle(tableName) {
    return firebaseTableService.formatTableTitle(tableName);
  }

  formatSingleTableName(tableName) {
    return firebaseTableService.formatSingleTableName(tableName);
  }

  isChildTable(tableName) {
    return firebaseTableService.isChildTable(tableName);
  }

  isParentTable(tableName) {
    return firebaseTableService.isParentTable(tableName);
  }

  getParentTable(tableName) {
    return firebaseTableService.getParentTable(tableName);
  }

  async getChildTables(parentTableName) {
    if (this.isTeamSystemAvailable()) {
      // Para el sistema de equipos, implementar lógica de tablas hijo
      const allTables = await this.getTables();
      return allTables.filter(table => 
        table.name.startsWith(parentTableName + '_') || 
        table.name.includes(parentTableName)
      );
    } else {
      return await firebaseTableService.getChildTables(parentTableName);
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
      service: isTeamSystem ? 'teamDataService' : 'firebaseTableService',
      version: '1.0.0'
    };
  }
}

// Crear instancia única
const tableServiceAdapter = new TableServiceAdapter();

export default tableServiceAdapter; 