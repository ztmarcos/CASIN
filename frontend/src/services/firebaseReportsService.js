import firebaseService from './firebaseService';
import firebaseTableService from './firebaseTableService.js';
import { API_URL } from '../config/api.js';

class FirebaseReportsService {
  constructor() {
    this.firebaseService = firebaseService;
    this.firebaseTableService = firebaseTableService;
  }

  /**
   * Get all available insurance collections dynamically
   * @returns {Promise<Array>} Array of collection names that contain insurance data
   */
  async getAvailableInsuranceCollections() {
    try {
      // Get all available tables from firebaseTableService
      const allTables = await this.firebaseTableService.getTables();
      
      // Filter tables that are insurance collections (have count > 0 and are not parent/child tables)
      const insuranceCollections = allTables
        .filter(table => 
          table.count > 0 && // Only tables with data
          !table.isChildTable && // Exclude child tables (listados)
          !table.name.includes('listado') && // Extra safety for listado tables
          table.name !== 'directorio_contactos' // Exclude directorio
        )
        .map(table => table.name);
      
      console.log('📋 Available insurance collections:', insuranceCollections);
      return insuranceCollections;
      
    } catch (error) {
      console.warn('Could not get dynamic collections, using fallback:', error);
      // Fallback to known collections if dynamic detection fails
      return ['autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'hogar'];
    }
  }

  /**
   * Get all policies from all insurance collections
   * @returns {Promise<Array>} Array of all policies
   */
  async getAllPolicies() {
    try {
      console.log('📊 Getting all policies from Firebase...');
      
      // Get available insurance collections dynamically
      const insuranceCollections = await this.getAvailableInsuranceCollections();
      console.log('📋 Using collections for policies:', insuranceCollections);
      
      const allPolicies = [];
      
      for (const collectionName of insuranceCollections) {
        try {
          console.log(`🔍 Getting policies from collection: ${collectionName}`);
          
          // Get all documents from this collection via backend API
          const response = await fetch(`${API_URL}/data/${collectionName}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const result = await response.json();
          const documents = result.data || [];
          
          for (const doc of documents) {
            const name = this.getNameFromDocument(doc, collectionName);
            
            // Create standardized policy object
            const policy = {
              id: doc.id,
              nombre_contratante: name,
              numero_poliza: doc.numero_poliza || doc.poliza || 'Sin número',
              aseguradora: doc.aseguradora || 'Sin aseguradora',
              fecha_inicio: doc.fecha_inicio || doc.vigencia_inicio || doc.fecha_emision,
              fecha_fin: doc.fecha_fin || doc.vigencia_fin || doc.fecha_vencimiento,
              tipo_seguro: this.getInsuranceType(collectionName),
              ramo: this.getInsuranceType(collectionName),
              source: collectionName,
              rfc: doc.rfc || '',
              email: doc.email || doc.e_mail || '',
              telefono: doc.telefono || doc.telefono_movil || '',
              prima: doc.prima || doc.prima_total || doc.importe_total || 0,
              moneda: doc.moneda || 'MXN',
              forma_pago: doc.forma_pago || doc.forma_de_pago || '',
              // Add all original data for compatibility
              ...doc
            };
            
            // Calculate next payment date if payment form is available
            if (policy.fecha_inicio && policy.forma_pago) {
              policy.fecha_proximo_pago = this.calculateNextPaymentDate(policy.fecha_inicio, policy.forma_pago);
            }
            
            allPolicies.push(policy);
          }
          
        } catch (error) {
          console.warn(`Could not access collection ${collectionName}:`, error);
        }
      }
      
      console.log(`✅ Found ${allPolicies.length} total policies from Firebase`);
      return allPolicies;
      
    } catch (error) {
      console.error('❌ Error fetching all policies from Firebase:', error);
      throw error;
    }
  }

  /**
   * Calculate next payment date based on start date and payment frequency
   */
  calculateNextPaymentDate(startDate, paymentForm) {
    if (!startDate || !paymentForm) return null;
    
    try {
      const start = new Date(startDate);
      const today = new Date();
      const paymentIntervals = {
        'MENSUAL': 1,
        'BIMESTRAL': 2,
        'TRIMESTRAL': 3,
        'CUATRIMESTRAL': 4,
        'SEMESTRAL': 6,
        'ANUAL': 12
      };

      const interval = paymentIntervals[paymentForm.toUpperCase()] || 12;
      let nextPayment = new Date(start);

      while (nextPayment <= today) {
        nextPayment.setMonth(nextPayment.getMonth() + interval);
      }

      return nextPayment;
    } catch (error) {
      console.warn('Error calculating next payment date:', error);
      return null;
    }
  }

  /**
   * Get matrix data for analysis (unique clients, companies, ramos, etc.)
   * @returns {Promise<Object>} Matrix data object
   */
  async getMatrixData() {
    try {
      console.log('📊 Getting matrix data from Firebase...');
      
      const allPolicies = await this.getAllPolicies();
      
      const uniqueClients = [...new Set(allPolicies.map(p => p.nombre_contratante).filter(Boolean))];
      const uniqueCompanies = [...new Set(allPolicies.map(p => p.aseguradora).filter(Boolean))];
      const uniqueRamos = [...new Set(allPolicies.map(p => p.ramo || p.tipo_seguro).filter(Boolean))];
      
      // Build client matrix (clients and their policies by ramo)
      const clientMatrix = {};
      allPolicies.forEach(policy => {
        const client = policy.nombre_contratante;
        const ramo = policy.ramo || policy.tipo_seguro;
        
        if (client && ramo) {
          if (!clientMatrix[client]) {
            clientMatrix[client] = {};
          }
          if (!clientMatrix[client][ramo]) {
            clientMatrix[client][ramo] = [];
          }
          clientMatrix[client][ramo].push(policy);
        }
      });
      
      console.log(`✅ Matrix data: ${uniqueClients.length} clients, ${uniqueCompanies.length} companies, ${uniqueRamos.length} ramos`);
      
      return {
        uniqueClients,
        uniqueCompanies,
        uniqueRamos,
        clientMatrix
      };
      
    } catch (error) {
      console.error('❌ Error getting matrix data from Firebase:', error);
      return {
        uniqueClients: [],
        uniqueCompanies: [],
        uniqueRamos: [],
        clientMatrix: {}
      };
    }
  }

  /**
   * Get policy payment statuses from all collections
   * @returns {Promise<Object>} Policy payment statuses object
   */
  async getPolicyStatuses() {
    try {
      console.log('📊 Getting policy payment statuses from Firebase...');
      
      const insuranceCollections = await this.getAvailableInsuranceCollections();
      const statuses = {};
      
      for (const collectionName of insuranceCollections) {
        try {
          console.log(`🔍 Getting payment statuses from collection: ${collectionName}`);
          
          // Get all documents from this collection via backend API
          const response = await fetch(`${API_URL}/data/${collectionName}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const result = await response.json();
          const documents = result.data || [];
          
          for (const doc of documents) {
            const policyKey = `${collectionName}_${doc.id}`;
            // Get payment status from document, default to 'No Pagado' if not set
            statuses[policyKey] = doc.estado_pago || 'No Pagado';
          }
          
        } catch (error) {
          console.warn(`Could not access collection ${collectionName}:`, error);
        }
      }
      
      console.log(`✅ Payment statuses loaded: ${Object.keys(statuses).length} policies`);
      return statuses;
      
    } catch (error) {
      console.error('❌ Error getting policy payment statuses from Firebase:', error);
      return {};
    }
  }

  /**
   * Update policy payment status in Firebase
   * @param {string} tableName - Collection name (ramo)
   * @param {string} policyId - Policy ID
   * @param {string} paymentStatus - New payment status ('Pagado' or 'No Pagado')
   * @returns {Promise<boolean>} Success status
   */
  async updatePolicyPaymentStatus(tableName, policyId, paymentStatus) {
    try {
      console.log(`🔄 Updating policy ${policyId} payment status to: ${paymentStatus} in collection: ${tableName}`);
      
      // Update the document in Firebase through backend API
      const response = await fetch(`${API_URL}/data/${tableName}/${policyId}`, {
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
      console.log('✅ Payment status updated successfully:', result);
      return true;
      
    } catch (error) {
      console.error('❌ Error updating policy status:', error);
      throw error;
    }
  }

  /**
   * Get policy expirations (vencimientos) from all insurance collections
   * @returns {Promise<Array>} Array of expiring policies
   */
  async getVencimientos() {
    try {
      console.log('📅 Getting policy expirations from Firebase...');
      
      // Get available insurance collections dynamically
      const insuranceCollections = await this.getAvailableInsuranceCollections();
      
      const expirations = [];
      
      for (const collectionName of insuranceCollections) {
        try {
          console.log(`🔍 Checking expirations in collection: ${collectionName}`);
          
          // Get all documents from this collection via backend API
          const response = await fetch(`${API_URL}/data/${collectionName}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const result = await response.json();
          const documents = result.data || [];
          
          for (const doc of documents) {
            // Look for expiration date fields
            let expirationDate = null;
            
            // Common field names for expiration dates
            const expirationFields = ['fecha_fin', 'fecha_vencimiento', 'vigencia_hasta', 'fecha_expiracion'];
            
            for (const field of expirationFields) {
              if (doc[field]) {
                expirationDate = new Date(doc[field]);
                break;
              }
            }
            
            // If we have a valid expiration date
            if (expirationDate && !isNaN(expirationDate.getTime())) {
              const name = this.getNameFromDocument(doc, collectionName);
              
              const expirationEntry = {
                id: doc.id,
                nombre_contratante: name,
                numero_poliza: doc.numero_poliza || doc.poliza || 'Sin número',
                aseguradora: doc.aseguradora || 'Sin aseguradora',
                fecha_fin: expirationDate.toISOString(),
                tipo_seguro: this.getInsuranceType(collectionName),
                source: collectionName,
                rfc: doc.rfc || '',
                email: doc.email || doc.e_mail || '',
                telefono: doc.telefono || doc.telefono_movil || '',
                prima: doc.prima || doc.prima_total || 0,
                moneda: doc.moneda || 'MXN'
              };
              
              expirations.push(expirationEntry);
            }
          }
          
        } catch (error) {
          console.warn(`Could not access collection ${collectionName}:`, error);
        }
      }
      
      // Sort by expiration date (closest first)
      expirations.sort((a, b) => new Date(a.fecha_fin) - new Date(b.fecha_fin));
      
      console.log(`✅ Found ${expirations.length} policy expirations from Firebase`);
      return expirations;
      
    } catch (error) {
      console.error('❌ Error fetching policy expirations from Firebase:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate name from a document based on collection type
   */
  getNameFromDocument(doc, collectionName) {
    switch (collectionName) {
      case 'autos':
        return doc.nombre_contratante || doc.contratante || 'Sin nombre';
      case 'rc':
        return doc.asegurado || doc.nombre_contratante || 'Sin nombre';
      case 'vida':
        return doc.contratante || doc.nombre_contratante || 'Sin nombre';
      case 'hogar':
        return doc.contratante || doc.nombre_contratante || 'Sin nombre';
      case 'gmm':
      case 'transporte':
      case 'mascotas':
      case 'diversos':
      case 'negocio':
      case 'gruposgmm':
        return doc.nombre_contratante || doc.contratante || doc.asegurado || 'Sin nombre';
      default:
        // For dynamic collections, try common field patterns
        return doc.nombre_contratante || doc.contratante || doc.asegurado || doc.nombre || 'Sin nombre';
    }
  }

  /**
   * Get insurance type display name from collection name
   */
  getInsuranceType(collectionName) {
    const typeMap = {
      'autos': 'Seguro de Autos',
      'rc': 'Responsabilidad Civil',
      'vida': 'Seguro de Vida',
      'gmm': 'Gastos Médicos Mayores',
      'hogar': 'Seguro de Hogar',
      'transporte': 'Seguro de Transporte',
      'mascotas': 'Seguro de Mascotas',
      'diversos': 'Seguros Diversos',
      'negocio': 'Seguro de Negocio',
      'gruposgmm': 'Grupos GMM'
    };
    
    // If not in map, create a formatted name from collection name
    if (typeMap[collectionName]) {
      return typeMap[collectionName];
    }
    
    // Convert collection name to readable format
    return collectionName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get expirations for a specific period
   * @param {string} period - 'week', 'month', 'quarter'
   * @returns {Promise<Array>} Array of expiring policies in the period
   */
  async getExpirationsForPeriod(period = 'month') {
    try {
      const allExpirations = await this.getVencimientos();
      const today = new Date();
      let endDate;
      
      switch (period) {
        case 'week':
          endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
          break;
        case 'quarter':
          endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      }

      return allExpirations.filter(policy => {
        const expirationDate = new Date(policy.fecha_fin);
        return expirationDate >= today && expirationDate <= endDate;
      });
      
    } catch (error) {
      console.error(`Error fetching expirations for ${period}:`, error);
      throw error;
    }
  }

  /**
   * Get reports statistics
   * @returns {Promise<Object>} Reports statistics
   */
  async getReportsStats() {
    try {
      console.log('📊 Getting reports statistics from Firebase...');
      
      const [
        weeklyExpirations,
        monthlyExpirations,
        quarterlyExpirations
      ] = await Promise.all([
        this.getExpirationsForPeriod('week'),
        this.getExpirationsForPeriod('month'),
        this.getExpirationsForPeriod('quarter')
      ]);

      const stats = {
        expirations: {
          thisWeek: weeklyExpirations.length,
          thisMonth: monthlyExpirations.length,
          thisQuarter: quarterlyExpirations.length
        },
        totalPolicies: (await this.getVencimientos()).length,
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Reports stats:', stats);
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting reports stats:', error);
      return {
        expirations: { thisWeek: 0, thisMonth: 0, thisQuarter: 0 },
        totalPolicies: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }
}

// Create and export singleton instance
const firebaseReportsService = new FirebaseReportsService();
export default firebaseReportsService; 