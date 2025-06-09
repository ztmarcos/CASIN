import firebaseService from './firebaseService.js';
import { API_URL } from '../config/api.js';

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
      
      console.log('📋 Getting directorio contactos from backend API...', { filters });
      
      // Use backend directorio endpoint
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
        ...(origen && { origen }),
        ...(genero && { genero })
      });
      
      const response = await fetch(`${API_URL}/directorio?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      console.log(`✅ Found ${result.total} total contactos, showing ${result.data.length}`);
      
      return {
        data: result.data || [],
        total: result.total || 0,
        page: result.page || parseInt(page),
        limit: result.limit || parseInt(limit),
        totalPages: result.totalPages || Math.ceil((result.total || 0) / parseInt(limit))
      };
      
    } catch (error) {
      console.error('Error fetching contacts from backend:', error);
      throw error;
    }
  }

  /**
   * Search contacts by term
   */
  async searchContactos(searchTerm, params = {}) {
    try {
      console.log('🔍 Searching contactos via backend API...', { searchTerm, params });
      
      const queryParams = new URLSearchParams({
        search: searchTerm,
        page: (params.page || 1).toString(),
        limit: (params.limit || 50).toString(),
        ...(params.status && { status: params.status }),
        ...(params.origen && { origen: params.origen }),
        ...(params.genero && { genero: params.genero })
      });
      
      const response = await fetch(`${API_URL}/directorio?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      console.log(`✅ Found ${result.total} matching contactos, showing ${result.data.length}`);
      
      return {
        data: result.data || [],
        total: result.total || 0,
        page: result.page || parseInt(params.page || 1),
        limit: result.limit || parseInt(params.limit || 50),
        totalPages: result.totalPages || Math.ceil((result.total || 0) / parseInt(params.limit || 50))
      };
      
    } catch (error) {
      console.error('Error searching contacts via backend:', error);
      throw error;
    }
  }

  /**
   * Get contact by ID
   */
  async getContactoById(id) {
    try {
      console.log(`📋 Getting contacto ${id} from backend API...`);
      
      const response = await fetch(`${API_URL}/directorio/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contact not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      if (!result.data) {
        throw new Error('Contact not found');
      }
      
      return {
        success: true,
        data: result.data
      };
      
    } catch (error) {
      console.error('Error fetching contacto from backend:', error);
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
      console.log('📊 Getting directorio stats from backend API...');
      
      // Use the dedicated stats endpoint
      const response = await fetch(`${API_URL}/directorio/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      
      console.log('✅ Raw directorio stats from backend:', result);
      
      // Backend returns stats directly, not wrapped in a stats object
      const stats = {
        total: result.total || 0,
        withPhone: result.withPhone || 0,
        withEmail: result.withEmail || 0,
        withBirthday: result.withBirthday || 0,
        clientes: result.clientes || 0,
        prospectos: result.prospectos || 0
      };
      
      console.log('✅ Formatted directorio stats:', stats);
      
      return {
        stats: stats
      };
      
    } catch (error) {
      console.error('Error getting directorio stats from backend:', error);
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
   * Uses backend API endpoint for efficient policy matching
   */
  async getContactoPolicies(contactoId) {
    try {
      console.log(`📋 Getting policies for contacto ${contactoId} from backend API...`);
      
      // Use the dedicated backend endpoint for contact policies
      const response = await fetch(`${API_URL}/directorio/${contactoId}/policies`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contact not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log(`✅ Found ${result.policies?.length || 0} policies for contacto ${contactoId}`);
      
      return {
        success: true,
        data: {
          contact: result.contact,
          policies: result.policies || []
        },
        total: result.policies?.length || 0
      };
      
    } catch (error) {
      console.error('Error getting contacto policies from backend:', error);
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