import firebaseService from './firebaseService';

class FirebaseReportsService {
  constructor() {
    this.firebaseService = firebaseService;
  }

  /**
   * Get policy expirations (vencimientos) from all insurance collections
   * @returns {Promise<Array>} Array of expiring policies
   */
  async getVencimientos() {
    try {
      console.log('📅 Getting policy expirations from Firebase...');
      
      // Insurance collections that have policy expiration dates
      const insuranceCollections = ['autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
      
      const expirations = [];
      
      for (const collectionName of insuranceCollections) {
        try {
          console.log(`🔍 Checking expirations in collection: ${collectionName}`);
          
          // Get all documents from this collection
          const documents = await this.firebaseService.getAllDocuments(collectionName, 1000);
          
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
      case 'gmm':
      case 'transporte':
      case 'mascotas':
      case 'diversos':
      case 'negocio':
      case 'gruposgmm':
        return doc.nombre_contratante || doc.contratante || doc.asegurado || 'Sin nombre';
      default:
        return doc.nombre_contratante || doc.contratante || doc.asegurado || 'Sin nombre';
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
      'transporte': 'Seguro de Transporte',
      'mascotas': 'Seguro de Mascotas',
      'diversos': 'Seguros Diversos',
      'negocio': 'Seguro de Negocio',
      'gruposgmm': 'Grupos GMM'
    };
    
    return typeMap[collectionName] || collectionName.charAt(0).toUpperCase() + collectionName.slice(1);
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