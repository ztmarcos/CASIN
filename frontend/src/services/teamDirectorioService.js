import teamDataService from './teamDataService';

/**
 * TeamDirectorioService - Servicio para gestión del directorio de contactos por equipo
 * 
 * Este servicio maneja todas las operaciones relacionadas con el directorio de contactos,
 * asegurando que cada equipo tenga su propio directorio aislado.
 */
class TeamDirectorioService {

  // ================== Contactos ==================

  /**
   * Obtener todos los contactos del equipo
   */
  async getAllContactos() {
    try {
      console.log('📋 Getting all contacts for current team');
      return await teamDataService.getAllDocuments('directorio_contactos', 'nombre', 'asc');
    } catch (error) {
      console.error('❌ Error getting contacts:', error);
      throw error;
    }
  }

  /**
   * Buscar contactos por criterios
   */
  async searchContactos(searchTerm = '', filters = {}) {
    try {
      console.log('🔍 Searching contacts:', { searchTerm, filters });
      
      // Si no hay término de búsqueda, obtener todos
      if (!searchTerm && Object.keys(filters).length === 0) {
        return await this.getAllContactos();
      }

      let queryFilters = [];

      // Agregar filtros específicos
      Object.entries(filters).forEach(([field, value]) => {
        if (value && value !== '') {
          queryFilters.push({
            field: field,
            operator: '==',
            value: value
          });
        }
      });

      // Para búsqueda por término, necesitaríamos implementar búsqueda full-text
      // Por ahora, obtenemos todos y filtramos en el cliente
      const allContacts = await teamDataService.queryDocuments(
        'directorio_contactos', 
        queryFilters, 
        'nombre', 
        'asc'
      );

      // Filtro de búsqueda por término (básico)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return allContacts.filter(contact => 
          (contact.nombre && contact.nombre.toLowerCase().includes(term)) ||
          (contact.email && contact.email.toLowerCase().includes(term)) ||
          (contact.telefono && contact.telefono.includes(term)) ||
          (contact.empresa && contact.empresa.toLowerCase().includes(term))
        );
      }

      return allContacts;
    } catch (error) {
      console.error('❌ Error searching contacts:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo contacto
   */
  async createContacto(contactData) {
    try {
      console.log('👤 Creating new contact:', contactData);
      
      // Validaciones básicas
      if (!contactData.nombre) {
        throw new Error('El nombre es requerido');
      }

      // Preparar datos del contacto
      const contacto = {
        nombre: contactData.nombre.trim(),
        email: contactData.email?.trim() || '',
        telefono: contactData.telefono?.trim() || '',
        empresa: contactData.empresa?.trim() || '',
        cargo: contactData.cargo?.trim() || '',
        direccion: contactData.direccion?.trim() || '',
        notas: contactData.notas?.trim() || '',
        fechaNacimiento: contactData.fechaNacimiento || null,
        categoria: contactData.categoria || 'contacto',
        status: contactData.status || 'activo',
        // Campos adicionales del CRM
        RFC: contactData.RFC?.trim() || '',
        CURP: contactData.CURP?.trim() || '',
        numeroPoliza: contactData.numeroPoliza?.trim() || '',
        tipoPoliza: contactData.tipoPoliza || '',
        vigenciaPoliza: contactData.vigenciaPoliza || null,
        // Metadatos
        tags: contactData.tags || [],
        customFields: contactData.customFields || {}
      };

      const docRef = await teamDataService.createDocument('directorio_contactos', contacto);
      
      return {
        id: docRef.id,
        ...contacto
      };
    } catch (error) {
      console.error('❌ Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Actualizar contacto existente
   */
  async updateContacto(contactId, updateData) {
    try {
      console.log('📝 Updating contact:', contactId, updateData);
      
      // Limpiar datos de actualización
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([key, value]) => value !== undefined)
      );

      await teamDataService.updateDocument('directorio_contactos', contactId, cleanData);
      
      return await this.getContactoById(contactId);
    } catch (error) {
      console.error('❌ Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Obtener contacto por ID
   */
  async getContactoById(contactId) {
    try {
      return await teamDataService.getDocumentById('directorio_contactos', contactId);
    } catch (error) {
      console.error('❌ Error getting contact by ID:', error);
      throw error;
    }
  }

  /**
   * Eliminar contacto
   */
  async deleteContacto(contactId) {
    try {
      console.log('🗑️ Deleting contact:', contactId);
      
      await teamDataService.deleteDocument('directorio_contactos', contactId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting contact:', error);
      throw error;
    }
  }

  // ================== Pólizas ==================

  /**
   * Obtener pólizas de un contacto
   */
  async getPolizasByContacto(contactoId) {
    try {
      console.log('📋 Getting policies for contact:', contactoId);
      
      const filters = [
        { field: 'contactoId', operator: '==', value: contactoId }
      ];
      
      return await teamDataService.queryDocuments('polizas', filters, 'fechaCreacion', 'desc');
    } catch (error) {
      console.error('❌ Error getting policies for contact:', error);
      throw error;
    }
  }

  /**
   * Crear nueva póliza
   */
  async createPoliza(polizaData) {
    try {
      console.log('📄 Creating new policy:', polizaData);
      
      const poliza = {
        contactoId: polizaData.contactoId,
        numeroPoliza: polizaData.numeroPoliza?.trim() || '',
        tipoPoliza: polizaData.tipoPoliza || '',
        compania: polizaData.compania?.trim() || '',
        fechaInicio: polizaData.fechaInicio || null,
        fechaVencimiento: polizaData.fechaVencimiento || null,
        prima: polizaData.prima || 0,
        sumAsegurada: polizaData.sumAsegurada || 0,
        status: polizaData.status || 'vigente',
        notas: polizaData.notas?.trim() || '',
        agente: polizaData.agente?.trim() || '',
        comision: polizaData.comision || 0,
        detalles: polizaData.detalles || {}
      };

      const docRef = await teamDataService.createDocument('polizas', poliza);
      
      return {
        id: docRef.id,
        ...poliza
      };
    } catch (error) {
      console.error('❌ Error creating policy:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las pólizas del equipo
   */
  async getAllPolizas() {
    try {
      return await teamDataService.getAllDocuments('polizas', 'fechaCreacion', 'desc');
    } catch (error) {
      console.error('❌ Error getting all policies:', error);
      throw error;
    }
  }

  // ================== Estadísticas ==================

  /**
   * Obtener estadísticas del directorio
   */
  async getDirectorioStats() {
    try {
      console.log('📊 Getting directory statistics');
      
      const [totalContactos, totalPolizas] = await Promise.all([
        teamDataService.countDocuments('directorio_contactos'),
        teamDataService.countDocuments('polizas')
      ]);

      // Obtener contactos activos
      const contactosActivos = await teamDataService.countDocuments('directorio_contactos', [
        { field: 'status', operator: '==', value: 'activo' }
      ]);

      // Obtener pólizas vigentes
      const polizasVigentes = await teamDataService.countDocuments('polizas', [
        { field: 'status', operator: '==', value: 'vigente' }
      ]);

      return {
        totalContactos,
        contactosActivos,
        totalPolizas,
        polizasVigentes,
        teamInfo: teamDataService.getCurrentTeamInfo()
      };
    } catch (error) {
      console.error('❌ Error getting directory stats:', error);
      throw error;
    }
  }

  // ================== Importación de datos ==================

  /**
   * Importar contactos desde CSV/JSON
   */
  async importContactos(contactosArray) {
    try {
      console.log('📥 Importing contacts to team database');
      
      // Validar y limpiar datos
      const validContactos = contactosArray
        .filter(contacto => contacto.nombre && contacto.nombre.trim())
        .map(contacto => ({
          nombre: contacto.nombre.trim(),
          email: contacto.email?.trim() || '',
          telefono: contacto.telefono?.trim() || '',
          empresa: contacto.empresa?.trim() || '',
          cargo: contacto.cargo?.trim() || '',
          direccion: contacto.direccion?.trim() || '',
          notas: contacto.notas?.trim() || '',
          RFC: contacto.RFC?.trim() || '',
          CURP: contacto.CURP?.trim() || '',
          categoria: contacto.categoria || 'contacto',
          status: 'activo',
          tags: contacto.tags || [],
          customFields: contacto.customFields || {}
        }));

      if (validContactos.length === 0) {
        throw new Error('No se encontraron contactos válidos para importar');
      }

      const importedCount = await teamDataService.importData('directorio_contactos', validContactos);
      
      console.log(`✅ Successfully imported ${importedCount} contacts`);
      return {
        total: contactosArray.length,
        imported: importedCount,
        skipped: contactosArray.length - importedCount
      };
    } catch (error) {
      console.error('❌ Error importing contacts:', error);
      throw error;
    }
  }

  // ================== Utilidades ==================

  /**
   * Buscar contactos duplicados
   */
  async findDuplicateContactos() {
    try {
      console.log('🔍 Searching for duplicate contacts');
      
      const allContactos = await this.getAllContactos();
      const duplicates = [];
      
      // Buscar por email duplicado
      const emailGroups = {};
      allContactos.forEach(contacto => {
        if (contacto.email && contacto.email.trim()) {
          const email = contacto.email.toLowerCase().trim();
          if (!emailGroups[email]) {
            emailGroups[email] = [];
          }
          emailGroups[email].push(contacto);
        }
      });

      Object.entries(emailGroups).forEach(([email, contacts]) => {
        if (contacts.length > 1) {
          duplicates.push({
            type: 'email',
            value: email,
            contacts: contacts
          });
        }
      });

      return duplicates;
    } catch (error) {
      console.error('❌ Error finding duplicates:', error);
      throw error;
    }
  }
}

// Singleton instance
export const teamDirectorioService = new TeamDirectorioService();
export default teamDirectorioService; 