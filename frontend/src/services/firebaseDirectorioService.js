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
      console.log('📝 Creating new contacto via backend API...', contactoData);
      
      // Use backend API endpoint for create
      const response = await fetch(`${API_URL}/directorio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactoData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('✅ Contacto created successfully via backend API');
      
      return {
        success: true,
        message: 'Contact created successfully',
        data: result.data
      };
      
    } catch (error) {
      console.error('Error creating contacto via backend:', error);
      throw error;
    }
  }

  /**
   * Update existing contact
   */
  async updateContacto(id, contactoData) {
    try {
      console.log(`📝 Updating contacto ${id} via backend API...`);
      
      // Use backend API endpoint for update
      const response = await fetch(`${API_URL}/directorio/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactoData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('✅ Contacto updated successfully via backend API');
      
      return {
        success: true,
        message: 'Contact updated successfully',
        data: result.data
      };
      
    } catch (error) {
      console.error('Error updating contacto via backend:', error);
      throw error;
    }
  }

  /**
   * Delete contact
   */
  async deleteContacto(id) {
    try {
      console.log(`🗑️ Deleting contacto ${id} via backend API...`);
      
      // Use backend API endpoint for delete
      const response = await fetch(`${API_URL}/directorio/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('✅ Contacto deleted successfully via backend API');
      
      return {
        success: true,
        message: 'Contact deleted successfully',
        data: result.data
      };
      
    } catch (error) {
      console.error('Error deleting contacto via backend:', error);
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
   * Link contact to client data for relationships
   */
  async linkContactoToCliente(contactoId, clienteData) {
    try {
      console.log(`🔗 Linking contacto ${contactoId} to cliente data...`);
      
      // Update the contact with client relationship data
      const updateData = {
        cliente_vinculado: true,
        cliente_data: clienteData,
        fecha_vinculacion: new Date().toISOString()
      };
      
      const response = await fetch(`${API_URL}/directorio/${contactoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('✅ Contacto linked to cliente successfully');
      
      return {
        success: true,
        message: 'Contact linked to client successfully',
        data: result.data
      };
      
    } catch (error) {
      console.error('Error linking contacto to cliente:', error);
      throw error;
    }
  }

  /**
   * Get contact payment statuses from Firebase
   * @returns {Promise<Object>} Contact payment statuses object
   */
  async getContactPaymentStatuses() {
    try {
      console.log('📊 Getting contact payment statuses from Firebase...');
      
      // Get all contacts via backend API
      const response = await fetch(`${API_URL}/directorio?limit=5000`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const contacts = result.data || [];
      const statuses = {};
      
      for (const contact of contacts) {
        // Get payment status from contact document, default to 'No Pagado' if not set
        statuses[contact.id] = contact.estado_pago || 'No Pagado';
      }
      
      console.log(`✅ Contact payment statuses loaded: ${Object.keys(statuses).length} contacts`);
      return statuses;
      
    } catch (error) {
      console.error('❌ Error getting contact payment statuses:', error);
      return {};
    }
  }

  /**
   * Update contact payment status in Firebase
   * @param {string} contactId - Contact ID to update
   * @param {string} paymentStatus - New payment status ('Pagado' or 'No Pagado')
   * @returns {Promise<boolean>} Success status
   */
  async updateContactoPaymentStatus(contactId, paymentStatus) {
    try {
      console.log(`🔄 Updating contact ${contactId} payment status to: ${paymentStatus}`);
      
      // Update the contact document in Firebase through backend API
      const response = await fetch(`${API_URL}/directorio/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          estado_pago: paymentStatus
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Contact payment status updated successfully:', result);
      return true;
      
    } catch (error) {
      console.error('❌ Error updating contact payment status:', error);
      throw error;
    }
  }
}

// Create and export a single instance
const firebaseDirectorioService = new FirebaseDirectorioService();
export default firebaseDirectorioService; 