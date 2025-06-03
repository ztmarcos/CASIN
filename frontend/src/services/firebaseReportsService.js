import firebaseService from './firebaseService';

class FirebaseReportsService {
  constructor() {
    this.firebaseService = firebaseService;
  }

  /**
   * Normalize date formats from different sources
   */
  normalizeDate(dateValue) {
    if (!dateValue) return null;
    
    // Handle different date formats that might come from migration
    try {
      // If it's already a Date object
      if (dateValue instanceof Date) {
        return dateValue.toISOString().split('T')[0];
      }
      
      // If it's a string, try to parse it
      if (typeof dateValue === 'string') {
        // Handle formats like "19-Apr-2024", "4-May-2024", "28-Jun-2024"
        if (dateValue.includes('-') && dateValue.includes('-')) {
          // Try parsing as DD-MMM-YYYY or D-MMM-YYYY
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
        
        // Handle ISO format or other standard formats
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // If it's a number (timestamp)
      if (typeof dateValue === 'number') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Error normalizing date:', dateValue, error);
      return null;
    }
  }

  /**
   * Get all policies from Firebase for reports
   */
  async getAllPolicies() {
    try {
      console.log('📊 Fetching all policies from Firebase for reports...');
      
      // Get policies from all insurance collections
      const autosPolicies = await this.firebaseService.getAllDocuments('autos', 1000);
      const rcPolicies = await this.firebaseService.getAllDocuments('rc', 1000);
      const vidaPolicies = await this.firebaseService.getAllDocuments('vida', 1000);
      
      console.log(`📋 Raw data counts: Autos: ${autosPolicies.length}, RC: ${rcPolicies.length}, Vida: ${vidaPolicies.length}`);
      
      // Transform autos policies
      const transformedAutosPolicies = autosPolicies.map(policy => {
        return {
          id: policy.id,
          ramo: policy.ramo || 'Autos',
          numero_poliza: policy.numero_poliza || 'Sin número',
          contratante: policy.nombre_contratante || 'Sin nombre',
          email: policy.e_mail || policy.email || '',
          aseguradora: policy.aseguradora || 'Sin aseguradora',
          fecha_inicio: this.normalizeDate(policy.vigencia_inicio) || this.normalizeDate(policy.fecha_inicio),
          fecha_fin: this.normalizeDate(policy.vigencia_fin) || this.normalizeDate(policy.fecha_fin),
          prima_total: policy.pago_total_o_prima_total || policy.prima_total || policy.prima_neta || 0,
          forma_pago: policy.forma_de_pago || policy.forma_pago || 'No especificado',
          proximo_pago: policy.proximo_pago || null,
          status: policy.status || 'Activo',
          tipo_vehiculo: policy.tipo_de_vehiculo || policy.tipo_vehiculo || '',
          descripcion_vehiculo: policy.descripcion_del_vehiculo || policy.descripcion_vehiculo || '',
          modelo: policy.modelo || '',
          placas: policy.placas || '',
          serie: policy.serie || '',
          motor: policy.motor || '',
          uso: policy.uso || '',
          rfc: policy.rfc || '',
          domicilio: policy.domicilio_o_direccion || policy.domicilio || '',
          duracion: policy.duracion || '',
          prima_neta: policy.prima_neta || 0,
          derecho_poliza: policy.derecho_de_poliza || policy.derecho_poliza || 0,
          recargo_fraccionado: policy.recargo_por_pago_fraccionado || policy.recargo_fraccionado || 0,
          iva: policy.i_v_a || policy.iva || 0,
          pdf: policy.pdf || ''
        };
      });

      // Transform RC policies
      const transformedRcPolicies = rcPolicies.map(policy => {
        return {
          id: policy.id,
          ramo: policy.ramo || 'Responsabilidad Civil',
          numero_poliza: policy.numero_poliza || 'Sin número',
          contratante: policy.asegurado || 'Sin nombre',
          email: policy.email || '',
          aseguradora: policy.aseguradora || 'Sin aseguradora',
          fecha_inicio: this.normalizeDate(policy.fecha_inicio),
          fecha_fin: this.normalizeDate(policy.fecha_fin),
          prima_total: policy.importe_total || policy.prima_neta || 0,
          forma_pago: policy.forma_pago || 'No especificado',
          proximo_pago: policy.proximo_pago || null,
          status: policy.status || 'Activo',
          limite_responsabilidad: policy.limite_maximo_responsabilidad || '',
          prima_neta: policy.prima_neta || 0,
          derecho_poliza: policy.derecho_poliza || 0,
          recargo_fraccionado: policy.recargo_pago_fraccionado || 0,
          iva: policy.iva || 0,
          responsable: policy.responsable || ''
        };
      });

      // Transform Vida policies
      const transformedVidaPolicies = vidaPolicies.map(policy => {
        return {
          id: policy.id,
          ramo: policy.ramo || 'Vida',
          numero_poliza: policy.numero_poliza || 'Sin número',
          contratante: policy.contratante || 'Sin nombre',
          email: policy.email || '',
          aseguradora: policy.aseguradora || 'Sin aseguradora',
          fecha_inicio: this.normalizeDate(policy.fecha_inicio),
          fecha_fin: this.normalizeDate(policy.fecha_fin),
          prima_total: policy.importe_a_pagar_mxn || policy.prima_neta_mxn || 0,
          forma_pago: policy.forma_pago || 'No especificado',
          proximo_pago: policy.proximo_pago || null,
          status: policy.status || 'Activo',
          tipo_poliza: policy.tipo_de_poliza || '',
          tipo_plan: policy.tipo_de_plan || '',
          rfc: policy.rfc || '',
          direccion: policy.direccion || '',
          telefono: policy.telefono || '',
          beneficiarios: policy.beneficiarios || '',
          edad_contratacion: policy.edad_de_contratacion || '',
          tipo_riesgo: policy.tipo_de_riesgo || '',
          fumador: policy.fumador || '',
          coberturas: policy.coberturas || '',
          prima_neta: policy.prima_neta_mxn || 0,
          derecho_poliza: policy.derecho_poliza || 0,
          recargo_fraccionado: policy.recargo_pago_fraccionado || 0,
          iva: policy.iva || 0,
          pdf: policy.pdf || '',
          responsable: policy.responsable || '',
          cobrar_a: policy.cobrar_a || ''
        };
      });

      // Combine all policies
      const allPolicies = [
        ...transformedAutosPolicies,
        ...transformedRcPolicies, 
        ...transformedVidaPolicies
      ];

      console.log(`✅ Found ${allPolicies.length} total policies from Firebase (Autos: ${transformedAutosPolicies.length}, RC: ${transformedRcPolicies.length}, Vida: ${transformedVidaPolicies.length})`);
      console.log('📋 Sample policy structure:', allPolicies[0]);
      return allPolicies;
      
    } catch (error) {
      console.error('❌ Error fetching policies from Firebase:', error);
      throw error;
    }
  }

  /**
   * Get policies filtered by type and month
   */
  async getPoliciesByType(type = 'Vencimientos', month = null) {
    try {
      const allPolicies = await this.getAllPolicies();
      
      let filteredPolicies = allPolicies;
      
      // Filter by type
      switch (type) {
        case 'Vencimientos':
          // Filter policies that are expiring
          filteredPolicies = allPolicies.filter(policy => {
            if (!policy.fecha_fin) return false;
            
            const endDate = new Date(policy.fecha_fin);
            if (isNaN(endDate.getTime())) return false;
            
            const today = new Date();
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Show policies expiring in the next 90 days or recently expired
            return diffDays >= -30 && diffDays <= 90;
          });
          break;
          
        case 'Pagos Parciales':
          // Filter policies with partial payments
          filteredPolicies = allPolicies.filter(policy => 
            policy.forma_pago && 
            (policy.forma_pago.toLowerCase().includes('parcial') || 
             policy.forma_pago.toLowerCase().includes('mensual') ||
             policy.forma_pago.toLowerCase().includes('trimestral'))
          );
          break;
          
        case 'Matriz de Productos':
          // For matrix, return all policies
          filteredPolicies = allPolicies;
          break;
          
        default:
          filteredPolicies = allPolicies;
      }
      
      // Filter by month if specified
      if (month !== null && type === 'Vencimientos') {
        filteredPolicies = filteredPolicies.filter(policy => {
          if (!policy.fecha_fin) return false;
          const endDate = new Date(policy.fecha_fin);
          return endDate.getMonth() === month;
        });
      }
      
      // Sort by expiration date for vencimientos
      if (type === 'Vencimientos') {
        filteredPolicies.sort((a, b) => {
          const dateA = new Date(a.fecha_fin || 0);
          const dateB = new Date(b.fecha_fin || 0);
          return dateA - dateB;
        });
      }
      
      console.log(`✅ Filtered ${filteredPolicies.length} policies for type: ${type}`);
      return filteredPolicies;
      
    } catch (error) {
      console.error('Error filtering policies:', error);
      throw error;
    }
  }

  /**
   * Get unique values for matrix analysis
   */
  async getMatrixData() {
    try {
      const allPolicies = await this.getAllPolicies();
      
      const uniqueClients = [...new Set(allPolicies.map(p => p.contratante).filter(Boolean))].sort();
      const uniqueCompanies = [...new Set(allPolicies.map(p => p.aseguradora).filter(Boolean))].sort();
      const uniqueRamos = [...new Set(allPolicies.map(p => p.ramo).filter(Boolean))].sort();
      
      // Create client matrix
      const clientMatrix = {};
      uniqueClients.forEach(client => {
        const clientPolicies = allPolicies.filter(p => p.contratante === client);
        clientMatrix[client] = {
          ramos: [...new Set(clientPolicies.map(p => p.ramo))],
          companies: [...new Set(clientPolicies.map(p => p.aseguradora))],
          totalPolicies: clientPolicies.length,
          policies: clientPolicies
        };
      });
      
      console.log(`📊 Matrix data: ${uniqueClients.length} clients, ${uniqueCompanies.length} companies, ${uniqueRamos.length} ramos`);
      
      return {
        uniqueClients,
        uniqueCompanies,
        uniqueRamos,
        clientMatrix,
        totalPolicies: allPolicies.length
      };
      
    } catch (error) {
      console.error('Error getting matrix data:', error);
      throw error;
    }
  }

  /**
   * Get policy status information
   */
  async getPolicyStatuses() {
    try {
      const allPolicies = await this.getAllPolicies();
      const statuses = {};
      
      allPolicies.forEach(policy => {
        const status = this.calculatePolicyStatus(policy);
        statuses[policy.id] = status;
      });
      
      return statuses;
    } catch (error) {
      console.error('Error getting policy statuses:', error);
      throw error;
    }
  }

  /**
   * Calculate policy status based on dates and payments
   */
  calculatePolicyStatus(policy) {
    if (!policy.fecha_fin) return 'Sin fecha';
    
    const endDate = new Date(policy.fecha_fin);
    if (isNaN(endDate.getTime())) return 'Fecha inválida';
    
    const today = new Date();
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Vencida';
    } else if (diffDays <= 30) {
      return 'Por vencer';
    } else if (diffDays <= 90) {
      return 'Próximo vencimiento';
    } else {
      return 'Vigente';
    }
  }

  /**
   * Update policy status
   */
  async updatePolicyStatus(policyId, status) {
    try {
      // Validate policyId
      if (!policyId || typeof policyId !== 'string') {
        console.error('Invalid policy ID:', policyId);
        throw new Error('ID de póliza inválido');
      }

      console.log(`🔄 Updating policy status: ID=${policyId}, status=${status}`);

      // First, find which collection this policy belongs to
      const collections = ['autos', 'rc', 'vida'];
      let foundCollection = null;
      let policyData = null;

      for (const collectionName of collections) {
        try {
          const doc = await this.firebaseService.getDocumentById(collectionName, policyId);
          if (doc) {
            foundCollection = collectionName;
            policyData = doc;
            break;
          }
        } catch (error) {
          // Continue searching in other collections
          console.log(`Policy ${policyId} not found in ${collectionName}`);
        }
      }

      if (!foundCollection) {
        throw new Error(`Póliza con ID ${policyId} no encontrada en ninguna colección`);
      }

      console.log(`📍 Found policy in collection: ${foundCollection}`);

      // Update the policy status in the correct collection
      const updateData = {
        status: status,
        status_updated_at: new Date()
      };

      // If the document doesn't have a status field, add it
      if (!policyData.hasOwnProperty('status')) {
        console.log(`➕ Adding status field to policy ${policyId}`);
        updateData.status_created_at = new Date();
      }

      await this.firebaseService.updateDocument(foundCollection, policyId, updateData);
      
      console.log(`✅ Successfully updated policy ${policyId} status to ${status} in ${foundCollection}`);
      return { success: true, collection: foundCollection };
      
    } catch (error) {
      console.error('Error updating policy status:', error);
      throw error;
    }
  }

  /**
   * Get policies for email reports
   */
  async getPoliciesForEmail(type, month) {
    try {
      const policies = await this.getPoliciesByType(type, month);
      
      // Format policies for email
      return policies.map(policy => ({
        numero_poliza: policy.numero_poliza,
        contratante: policy.contratante,
        email: policy.email,
        aseguradora: policy.aseguradora,
        fecha_fin: policy.fecha_fin,
        status: this.calculatePolicyStatus(policy),
        ramo: policy.ramo
      }));
      
    } catch (error) {
      console.error('Error getting policies for email:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const firebaseReportsService = new FirebaseReportsService();
export default firebaseReportsService; 