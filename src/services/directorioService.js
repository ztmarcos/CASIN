// Base URL for API requests
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class DirectorioService {
  async getContactos(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });
      
      const url = `${API_BASE_URL}/directorio${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }

  async getContactoById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/directorio/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching contacto:', error);
      throw error;
    }
  }

  async createContacto(contactoData) {
    try {
      const response = await fetch(`${API_BASE_URL}/directorio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactoData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating contacto:', error);
      throw error;
    }
  }

  async updateContacto(id, contactoData) {
    try {
      const response = await fetch(`${API_BASE_URL}/directorio/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactoData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating contacto:', error);
      throw error;
    }
  }

  async deleteContacto(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/directorio/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting contacto:', error);
      throw error;
    }
  }

  async searchContactos(searchTerm, params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('search', searchTerm);
      
      // Add pagination and filter params
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          queryParams.append(key, params[key]);
        }
      });
      
      const response = await fetch(`${API_BASE_URL}/directorio?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error searching contactos:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/directorio/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  // Método para relacionar contactos con clientes existentes
  async linkContactoToCliente(contactoId, clienteData) {
    try {
      const response = await fetch(`${API_BASE_URL}/directorio/${contactoId}/link-cliente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clienteData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error linking contacto to cliente:', error);
      throw error;
    }
  }

  // Método para obtener relaciones entre directorio y tablas de pólizas
  async getRelationships() {
    try {
      const response = await fetch(`${API_BASE_URL}/directorio/relationships`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching relationships:', error);
      throw error;
    }
  }

  // Método para obtener las pólizas de un contacto específico
  async getContactoPolicies(contactoId) {
    try {
      const response = await fetch(`${API_BASE_URL}/directorio/${contactoId}/policies`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching contacto policies:', error);
      throw error;
    }
  }

  // Método para actualizar automáticamente el status de contactos que ya son clientes
  async updateClientStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/directorio/update-client-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating client status:', error);
      throw error;
    }
  }
}

export default new DirectorioService(); 