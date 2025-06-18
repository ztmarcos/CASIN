import teamDirectorioService from './teamDirectorioService';
import firebaseTeamService from './firebaseTeamService';

/**
 * DirectorioServiceAdapter - Adaptador para migrar gradualmente el Directorio al sistema de equipos
 * 
 * Este adaptador mantiene la API existente del firebaseDirectorioService
 * pero usa internamente el nuevo teamDirectorioService.
 * 
 * Para el equipo 4JlUqhAvfJMlCDhQ4vgH, accede directamente a la colección directorio_contactos.
 */
class DirectorioServiceAdapter {

  /**
   * Ensure team context is set for data access
   */
  ensureTeamContext() {
    const currentTeamId = firebaseTeamService.currentTeamId;
    if (!currentTeamId) {
      console.warn('⚠️ No team context set, directorio may not work properly');
      console.warn('⚠️ Available teams:', firebaseTeamService.getStats());
    } else {
      console.log('✅ Team context active:', currentTeamId);
      
      // For team 4JlUqhAvfJMlCDhQ4vgH, verify it will use direct collections
      if (currentTeamId === '4JlUqhAvfJMlCDhQ4vgH') {
        const directorioCollection = firebaseTeamService.getNamespacedCollection('directorio_contactos');
        const polizasCollection = firebaseTeamService.getNamespacedCollection('polizas');
        
        console.log('🎯 Team 4JlUqhAvfJMlCDhQ4vgH collection mapping:');
        console.log('  - directorio_contactos →', directorioCollection);
        console.log('  - polizas →', polizasCollection);
        
        if (directorioCollection === 'directorio_contactos' && polizasCollection === 'polizas') {
          console.log('✅ Confirmed: Using direct Firebase collections');
        } else {
          console.warn('⚠️ Expected direct collections but got namespaced ones');
        }
      }
    }
  }

  // ================== Métodos de Contactos ==================

  /**
   * Obtener contactos con paginación (API compatible con el Directorio existente)
   */
  async getContactos(params = {}) {
    try {
      this.ensureTeamContext();
      console.log('🔄 DirectorioAdapter: getContactos called with params:', params);
      
      const { page = 1, limit = 50, ...filters } = params;
      
      // Usar el nuevo servicio de equipos
      let allContactos;
      
      if (Object.keys(filters).length > 0) {
        // Si hay filtros, usar búsqueda con filtros
        allContactos = await teamDirectorioService.searchContactos('', filters);
      } else {
        // Sin filtros, obtener todos
        allContactos = await teamDirectorioService.getAllContactos();
      }

      // Simular paginación (en el futuro esto se hará en el servidor)
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedContactos = allContactos.slice(startIndex, endIndex);

      // Formatear respuesta compatible con el Directorio existente
      const result = {
        data: paginatedContactos.map(contacto => ({
          ...contacto,
          // Mapear campos para compatibilidad
          firebase_doc_id: contacto.id,
          nombre_completo: contacto.nombre,
          reactKey: `team_${contacto.id}`
        })),
        total: allContactos.length,
        page: page,
        totalPages: Math.ceil(allContactos.length / limit),
        limit: limit
      };

      console.log('✅ DirectorioAdapter: returning paginated data:', {
        totalResults: allContactos.length,
        returnedItems: result.data.length,
        currentPage: page,
        totalPages: result.totalPages
      });

      return result;

    } catch (error) {
      console.error('❌ DirectorioAdapter: Error in getContactos:', error);
      // Retornar estructura compatible en caso de error
      return {
        data: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: params.limit || 50,
        error: error.message
      };
    }
  }

  /**
   * Buscar contactos (API compatible)
   */
  async searchContactos(searchTerm, params = {}) {
    try {
      this.ensureTeamContext();
      console.log('🔍 DirectorioAdapter: searchContactos called:', { searchTerm, params });
      
      const { page = 1, limit = 50, ...filters } = params;
      
      // Usar el nuevo servicio de búsqueda
      const searchResults = await teamDirectorioService.searchContactos(searchTerm, filters);
      
      // Aplicar paginación
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = searchResults.slice(startIndex, endIndex);

      const result = {
        data: paginatedResults.map(contacto => ({
          ...contacto,
          firebase_doc_id: contacto.id,
          nombre_completo: contacto.nombre,
          reactKey: `search_${contacto.id}`
        })),
        total: searchResults.length,
        page: page,
        totalPages: Math.ceil(searchResults.length / limit),
        limit: limit
      };

      console.log('✅ DirectorioAdapter: search results:', {
        searchTerm,
        totalFound: searchResults.length,
        returnedItems: result.data.length
      });

      return result;

    } catch (error) {
      console.error('❌ DirectorioAdapter: Error in searchContactos:', error);
      return {
        data: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: params.limit || 50,
        error: error.message
      };
    }
  }

  /**
   * Obtener estadísticas (API compatible)
   */
  async getStats() {
    try {
      this.ensureTeamContext();
      console.log('📊 DirectorioAdapter: getStats called');
      
      const stats = await teamDirectorioService.getDirectorioStats();
      
      // Formatear para compatibilidad con el Directorio existente
      const formattedStats = {
        stats: {
          total: stats.totalContactos,
          activos: stats.contactosActivos,
          clientes: stats.totalContactos, // Por ahora asumimos que todos pueden ser clientes
          polizas: stats.totalPolizas,
          vigentes: stats.polizasVigentes
        },
        total: stats.totalContactos
      };

      console.log('✅ DirectorioAdapter: stats formatted:', formattedStats);
      return formattedStats;

    } catch (error) {
      console.error('❌ DirectorioAdapter: Error in getStats:', error);
      return {
        stats: {
          total: 0,
          activos: 0,
          clientes: 0,
          polizas: 0,
          vigentes: 0
        },
        total: 0,
        error: error.message
      };
    }
  }

  /**
   * Crear contacto (API compatible)
   */
  async createContacto(contactoData) {
    try {
      console.log('👤 DirectorioAdapter: createContacto called:', contactoData);
      
      // Mapear campos del formato existente al nuevo formato
      const mappedData = {
        nombre: contactoData.nombre_completo || contactoData.nombre,
        email: contactoData.email || '',
        telefono: contactoData.telefono || '',
        empresa: contactoData.empresa || '',
        cargo: contactoData.cargo || '',
        direccion: contactoData.direccion || '',
        notas: contactoData.notas || '',
        status: contactoData.status || 'activo',
        categoria: contactoData.categoria || 'contacto',
        RFC: contactoData.RFC || '',
        CURP: contactoData.CURP || '',
        fechaNacimiento: contactoData.fecha_nacimiento || null,
        // Campos adicionales
        genero: contactoData.genero || '',
        origen: contactoData.origen || ''
      };

      const result = await teamDirectorioService.createContacto(mappedData);
      
      // Formatear respuesta para compatibilidad
      const formattedResult = {
        ...result,
        firebase_doc_id: result.id,
        nombre_completo: result.nombre
      };

      console.log('✅ DirectorioAdapter: contacto created:', formattedResult);
      return formattedResult;

    } catch (error) {
      console.error('❌ DirectorioAdapter: Error creating contacto:', error);
      throw error;
    }
  }

  /**
   * Actualizar contacto (API compatible)
   */
  async updateContacto(contactoId, updateData) {
    try {
      console.log('📝 DirectorioAdapter: updateContacto called:', { contactoId, updateData });
      
      // Mapear campos
      const mappedData = {
        nombre: updateData.nombre_completo || updateData.nombre,
        email: updateData.email,
        telefono: updateData.telefono,
        empresa: updateData.empresa,
        cargo: updateData.cargo,
        direccion: updateData.direccion,
        notas: updateData.notas,
        status: updateData.status,
        RFC: updateData.RFC,
        CURP: updateData.CURP,
        genero: updateData.genero,
        origen: updateData.origen
      };

      // Filtrar valores undefined
      const cleanData = Object.fromEntries(
        Object.entries(mappedData).filter(([key, value]) => value !== undefined)
      );

      const result = await teamDirectorioService.updateContacto(contactoId, cleanData);
      
      console.log('✅ DirectorioAdapter: contacto updated:', result);
      return result;

    } catch (error) {
      console.error('❌ DirectorioAdapter: Error updating contacto:', error);
      throw error;
    }
  }

  /**
   * Eliminar contacto (API compatible)
   */
  async deleteContacto(contactoId) {
    try {
      console.log('🗑️ DirectorioAdapter: deleteContacto called:', contactoId);
      
      const result = await teamDirectorioService.deleteContacto(contactoId);
      
      console.log('✅ DirectorioAdapter: contacto deleted');
      return result;

    } catch (error) {
      console.error('❌ DirectorioAdapter: Error deleting contacto:', error);
      throw error;
    }
  }

  // ================== Métodos de Pólizas ==================

  /**
   * Obtener pólizas de un contacto (API compatible)
   */
  async getPolizasByContacto(contactoId) {
    try {
      console.log('📄 DirectorioAdapter: getPolizasByContacto called:', contactoId);
      
      const polizas = await teamDirectorioService.getPolizasByContacto(contactoId);
      
      // Formatear para compatibilidad
      const formattedPolizas = polizas.map(poliza => ({
        ...poliza,
        id: poliza.id,
        numero_poliza: poliza.numeroPoliza,
        tipo_poliza: poliza.tipoPoliza,
        fecha_inicio: poliza.fechaInicio,
        fecha_vencimiento: poliza.fechaVencimiento,
        suma_asegurada: poliza.sumAsegurada
      }));

      console.log('✅ DirectorioAdapter: polizas retrieved:', formattedPolizas.length);
      return formattedPolizas;

    } catch (error) {
      console.error('❌ DirectorioAdapter: Error getting polizas:', error);
      return [];
    }
  }

  /**
   * Crear póliza (API compatible)
   */
  async createPoliza(polizaData) {
    try {
      console.log('📄 DirectorioAdapter: createPoliza called:', polizaData);
      
      // Mapear campos
      const mappedData = {
        contactoId: polizaData.contactoId || polizaData.contacto_id,
        numeroPoliza: polizaData.numero_poliza || polizaData.numeroPoliza,
        tipoPoliza: polizaData.tipo_poliza || polizaData.tipoPoliza,
        compania: polizaData.compania,
        fechaInicio: polizaData.fecha_inicio || polizaData.fechaInicio,
        fechaVencimiento: polizaData.fecha_vencimiento || polizaData.fechaVencimiento,
        prima: polizaData.prima || 0,
        sumAsegurada: polizaData.suma_asegurada || polizaData.sumAsegurada || 0,
        status: polizaData.status || 'vigente',
        notas: polizaData.notas || '',
        agente: polizaData.agente || '',
        comision: polizaData.comision || 0
      };

      const result = await teamDirectorioService.createPoliza(mappedData);
      
      console.log('✅ DirectorioAdapter: poliza created:', result);
      return result;

    } catch (error) {
      console.error('❌ DirectorioAdapter: Error creating poliza:', error);
      throw error;
    }
  }

  // ================== Métodos adicionales para compatibilidad ==================

  /**
   * Método placeholder para policy tables (usado por el Directorio)
   */
  async getPolicyTablesByContacto(contactoId) {
    try {
      // Por ahora retornamos las pólizas como "tables"
      const polizas = await this.getPolizasByContacto(contactoId);
      return polizas.length > 0 ? polizas : null;
    } catch (error) {
      console.error('❌ Error getting policy tables:', error);
      return null;
    }
  }

  /**
   * Método placeholder para batch operations
   */
  async getContactosBatch(contactIds) {
    try {
      console.log('📦 DirectorioAdapter: getContactosBatch called for', contactIds.length, 'contactos');
      
      // Por ahora, obtenemos uno por uno (en el futuro optimizaremos)
      const promises = contactIds.map(id => teamDirectorioService.getContactoById(id));
      const results = await Promise.all(promises);
      
      return results.filter(contacto => contacto !== null);
    } catch (error) {
      console.error('❌ Error in batch operation:', error);
      return [];
    }
  }

  // ================== Información del adaptador ==================

  /**
   * Obtener información sobre qué servicio se está usando
   */
  getServiceInfo() {
    return {
      service: 'TeamDirectorioService',
      adapter: 'DirectorioServiceAdapter',
      version: '1.0.0',
      description: 'Adaptador para migración gradual del Directorio al sistema de equipos',
      teamSupport: true,
      dataIsolation: true
    };
  }
}

// Singleton instance
export const directorioServiceAdapter = new DirectorioServiceAdapter();
export default directorioServiceAdapter; 