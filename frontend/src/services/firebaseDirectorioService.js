import firebaseService from './firebaseService.js';

class FirebaseDirectorioService {
  constructor() {
    this.firebaseService = firebaseService;
    this.collectionName = 'directorio_contactos';
  }

  /**
   * Get contacts with pagination and filters
   */
  async getContactos(filters = {}) {
    try {
      const { page = 1, limit = 50, status, origen, genero } = filters;
      
      console.log('📋 Getting directorio contactos from Firebase...', { filters });
      
      // Get all documents via backend API
      const apiUrl = import.meta.env.DEV ? 'http://localhost:3001' : 'https://casin-crm-backend-ztmarcos-projects.vercel.app';
      const response = await fetch(`${apiUrl}/api/data/${this.collectionName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      const allContactos = result.data || [];
      
      // Apply filters
      let filteredContactos = allContactos;
      
      if (status && status.trim()) {
        filteredContactos = filteredContactos.filter(c => c.status === status.trim());
      }
      
      if (origen && origen.trim()) {
        filteredContactos = filteredContactos.filter(c => c.origen === origen.trim());
      }
      
      if (genero && genero.trim()) {
        filteredContactos = filteredContactos.filter(c => c.genero === genero.trim());
      }
      
      // Sort by creation date (newest first)
      filteredContactos.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedData = filteredContactos.slice(startIndex, endIndex);
      
      console.log(`✅ Found ${filteredContactos.length} total contactos, showing ${paginatedData.length}`);
      
      return {
        data: paginatedData,
        total: filteredContactos.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredContactos.length / parseInt(limit))
      };
      
    } catch (error) {
      console.error('Error fetching contacts from Firebase:', error);
      throw error;
    }
  }

  /**
   * Search contacts by term
   */
  async searchContactos(searchTerm, params = {}) {
    try {
      console.log('🔍 Searching contactos in Firebase...', { searchTerm, params });
      
      // Get all contactos via backend API and filter locally
      const apiUrl = import.meta.env.DEV ? 'http://localhost:3001' : 'https://casin-crm-backend-ztmarcos-projects.vercel.app';
      const response = await fetch(`${apiUrl}/api/data/${this.collectionName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiResult = await response.json();
      const allContactos = apiResult.data || [];
      
      const searchTermLower = searchTerm.toLowerCase().trim();
      
      const filtered = allContactos.filter(contacto => {
        const searchableFields = [
          contacto.nombre_completo,
          contacto.email,
          contacto.telefono_movil,
          contacto.telefono_oficina,
          contacto.telefono_casa,
          contacto.empresa,
          contacto.nickname,
          contacto.apellido
        ];
        
        return searchableFields.some(field => 
          field && field.toString().toLowerCase().includes(searchTermLower)
        );
      });
      
      // Apply additional filters
      let result = filtered;
      if (params.status && params.status.trim()) {
        result = result.filter(c => c.status === params.status.trim());
      }
      if (params.origen && params.origen.trim()) {
        result = result.filter(c => c.origen === params.origen.trim());
      }
      if (params.genero && params.genero.trim()) {
        result = result.filter(c => c.genero === params.genero.trim());
      }
      
      // Sort by creation date (newest first)
      result.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      
      // Apply pagination
      const page = parseInt(params.page || 1);
      const limit = parseInt(params.limit || 50);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedData = result.slice(startIndex, endIndex);
      
      console.log(`✅ Found ${result.length} matching contactos, showing ${paginatedData.length}`);
      
      return {
        data: paginatedData,
        total: result.length,
        page,
        limit,
        totalPages: Math.ceil(result.length / limit)
      };
      
    } catch (error) {
      console.error('Error searching contacts in Firebase:', error);
      throw error;
    }
  }

  /**
   * Get contact by ID
   */
  async getContactoById(id) {
    try {
      console.log(`📋 Getting contacto ${id} from Firebase...`);
      const contacto = await this.firebaseService.getDocumentById(this.collectionName, id);
      
      if (!contacto) {
        throw new Error('Contact not found');
      }
      
      return {
        success: true,
        data: contacto
      };
      
    } catch (error) {
      console.error('Error fetching contacto from Firebase:', error);
      throw error;
    }
  }

  /**
   * Create new contact
   */
  async createContacto(contactoData) {
    try {
      console.log('📝 Creating new contacto in Firebase...', contactoData);
      
      // Add timestamps
      const dataWithTimestamps = {
        ...contactoData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const newContactoId = await this.firebaseService.addDocument(
        this.collectionName,
        dataWithTimestamps
      );
      
      // Get the created document
      const newContacto = await this.firebaseService.getDocumentById(this.collectionName, newContactoId);
      
      console.log('✅ Contacto created successfully in Firebase');
      
      return {
        success: true,
        message: 'Contact created successfully',
        data: newContacto
      };
      
    } catch (error) {
      console.error('Error creating contacto in Firebase:', error);
      throw error;
    }
  }

  /**
   * Update existing contact
   */
  async updateContacto(id, contactoData) {
    try {
      console.log(`📝 Updating contacto ${id} in Firebase...`);
      
      // Check if the document exists first
      const existingContacto = await this.firebaseService.getDocumentById(this.collectionName, id);
      
      // Add update timestamp
      const dataWithTimestamp = {
        ...contactoData,
        updated_at: new Date().toISOString()
      };
      
      if (existingContacto) {
        // Document exists, update it
        await this.firebaseService.updateDocument(
          this.collectionName,
          id,
          dataWithTimestamp
        );
      } else {
        // Document doesn't exist, create it with the specified ID
        console.log(`📝 Document ${id} doesn't exist, creating it...`);
        
        // For Firebase, we need to use setDoc with a specific ID
        const { doc, setDoc } = await import('firebase/firestore');
        const docRef = doc(this.firebaseService.db, this.collectionName, String(id));
        
        await setDoc(docRef, {
          ...dataWithTimestamp,
          id: String(id),
          created_at: new Date().toISOString()
        });
      }
      
      // Get the updated/created document
      const updatedContacto = await this.firebaseService.getDocumentById(this.collectionName, id);
      
      console.log('✅ Contacto updated/created successfully in Firebase');
      
      return {
        success: true,
        message: 'Contact updated successfully',
        data: updatedContacto
      };
      
    } catch (error) {
      console.error('Error updating contacto in Firebase:', error);
      throw error;
    }
  }

  /**
   * Delete contact
   */
  async deleteContacto(id) {
    try {
      console.log(`🗑️ Deleting contacto ${id} from Firebase...`);
      
      // Get contact before deleting for return data
      const contacto = await this.firebaseService.getDocumentById(this.collectionName, id);
      
      if (!contacto) {
        throw new Error('Contact not found');
      }
      
      await this.firebaseService.deleteDocument(this.collectionName, id);
      
      console.log('✅ Contacto deleted successfully from Firebase');
      
      return {
        success: true,
        message: 'Contact deleted successfully',
        data: contacto
      };
      
    } catch (error) {
      console.error('Error deleting contacto from Firebase:', error);
      throw error;
    }
  }

  /**
   * Get directorio statistics
   */
  async getStats() {
    try {
      console.log('📊 Getting directorio stats from Firebase...');
      
      const apiUrl = import.meta.env.DEV ? 'http://localhost:3001' : 'https://casin-crm-backend-ztmarcos-projects.vercel.app';
      const response = await fetch(`${apiUrl}/api/data/${this.collectionName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const statsResult = await response.json();
      const allContactos = statsResult.data || [];
      
      const stats = {
        total: allContactos.length,
        withPhone: allContactos.filter(c => c.telefono_movil && c.telefono_movil.trim()).length,
        withEmail: allContactos.filter(c => c.email && c.email.trim()).length,
        withBirthday: 0, // No birthday field in directorio_contactos
        clientes: allContactos.filter(c => c.status === 'cliente').length,
        prospectos: allContactos.filter(c => c.status === 'prospecto').length
      };
      
      console.log('✅ Directorio stats calculated:', stats);
      
      return {
        stats: stats
      };
      
    } catch (error) {
      console.error('Error getting directorio stats from Firebase:', error);
      // Return empty stats on error
      return {
        stats: {
          total: 0,
          withPhone: 0,
          withEmail: 0,
          withBirthday: 0,
          clientes: 0,
          prospectos: 0
        }
      };
    }
  }

  /**
   * Get policies for a specific contact
   * Searches across all policy collections for matches by name
   */
  async getContactoPolicies(contactoId) {
    try {
      console.log(`📋 Getting policies for contacto ${contactoId} from Firebase...`);
      
      // Get the contact first
      const contacto = await this.firebaseService.getDocumentById(this.collectionName, contactoId);
      
      if (!contacto) {
        throw new Error('Contact not found');
      }
      
      // Search for policies in all collections that might contain this contact's name
      const policyCollections = ['autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
      const policies = [];
      
      for (const collectionName of policyCollections) {
        try {
          const policiesApiUrl = import.meta.env.DEV ? 'http://localhost:3001' : 'https://casin-crm-backend-ztmarcos-projects.vercel.app';
          const policiesResponse = await fetch(`${policiesApiUrl}/api/data/${collectionName}`);
          if (!policiesResponse.ok) {
            throw new Error(`HTTP error! status: ${policiesResponse.status}`);
          }
          const policiesResult = await policiesResponse.json();
          const records = policiesResult.data || [];
          
          // Search for matches by name
          const matches = records.filter(record => {
            const nameFields = [
              record.nombre_contratante,
              record.asegurado,
              record.contratante,
              record.nombre
            ];
            
            return nameFields.some(nameField => {
              if (!nameField || !contacto.nombre_completo) return false;
              
              const nameFieldLower = nameField.toString().toLowerCase().trim();
              const contactNameLower = contacto.nombre_completo.toLowerCase().trim();
              
              // Check for exact match or partial match
              return nameFieldLower === contactNameLower || 
                     nameFieldLower.includes(contactNameLower) ||
                     contactNameLower.includes(nameFieldLower);
            });
          });
          
          // Add collection info to matches
          matches.forEach(match => {
            policies.push({
              ...match,
              tabla_origen: collectionName,
              poliza: match.numero_poliza || match.poliza || 'N/A',
              asegurado: match.nombre_contratante || match.asegurado || match.contratante || match.nombre,
              vigencia_de: match.vigencia_inicio || match.fecha_inicio,
              vigencia_hasta: match.vigencia_fin || match.fecha_fin
            });
          });
          
        } catch (err) {
          console.log(`Could not search in collection ${collectionName}:`, err.message);
        }
      }
      
      console.log(`✅ Found ${policies.length} policies for contacto ${contactoId}`);
      
      return {
        success: true,
        data: {
          contact: contacto,
          policies: policies
        },
        total: policies.length
      };
      
    } catch (error) {
      console.error('Error getting contacto policies from Firebase:', error);
      throw error;
    }
  }

  /**
   * Link contact to client (placeholder for compatibility)
   */
  async linkContactoToCliente(contactoId, clienteData) {
    try {
      console.log(`🔗 Linking contacto ${contactoId} to cliente in Firebase...`);
      
      const updateData = {
        status: 'cliente',
        tabla_relacionada: clienteData.table,
        cliente_id_relacionado: clienteData.clientId,
        fecha_conversion: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };
      
      await this.firebaseService.updateDocument(
        this.collectionName,
        contactoId,
        updateData
      );
      
      // Get the updated document
      const updatedContacto = await this.firebaseService.getDocumentById(this.collectionName, contactoId);
      
      return {
        success: true,
        message: 'Contact linked to client successfully',
        data: updatedContacto
      };
      
    } catch (error) {
      console.error('Error linking contacto to cliente in Firebase:', error);
      throw error;
    }
  }
}

// Create and export a single instance
const firebaseDirectorioService = new FirebaseDirectorioService();
export default firebaseDirectorioService; 