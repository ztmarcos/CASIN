import firebaseService from './firebaseService.js';

class FirebaseDashboardService {
  constructor() {
    this.firebaseService = firebaseService; // Use the existing instance
    
    // Available Firebase collections (equivalent to MySQL tables)
    this.availableCollections = [
      {
        name: 'directorio_contactos',
        title: 'Directorio Contactos',
        type: 'primary',
        icon: '👥'
      },
      {
        name: 'autos',
        title: 'Seguros de Autos',
        type: 'primary', 
        icon: '🚗'
      },
      {
        name: 'rc',
        title: 'Responsabilidad Civil',
        type: 'primary',
        icon: '⚖️'
      },
      {
        name: 'vida',
        title: 'Seguros de Vida',
        type: 'primary',
        icon: '🛡️'
      },
      {
        name: 'gmm',
        title: 'Gastos Médicos Mayores',
        type: 'secondary',
        icon: '🏥'
      },
      {
        name: 'transporte',
        title: 'Seguros de Transporte',
        type: 'secondary',
        icon: '🚛'
      },
      {
        name: 'mascotas',
        title: 'Seguros de Mascotas',
        type: 'secondary',
        icon: '🐕'
      },
      {
        name: 'diversos',
        title: 'Seguros Diversos',
        type: 'secondary',
        icon: '📦'
      },
      {
        name: 'negocio',
        title: 'Seguros de Negocio',
        type: 'secondary',
        icon: '🏢'
      },
      {
        name: 'gruposgmm',
        title: 'Grupos GMM',
        type: 'secondary',
        icon: '👨‍👩‍👧‍👦'
      },
      {
        name: 'prospeccion_cards',
        title: 'Tarjetas de Prospección',
        type: 'secondary',
        icon: '💡'
      }
    ];
  }

  /**
   * Get birthdays from Firebase directorio_contactos collection
   * Equivalent to the old fetchBirthdays function
   */
  async getBirthdays() {
    try {
      console.log('🎂 Fetching birthdays from Firebase...');
      
      // Get all contacts with birthdate
      const contacts = await this.firebaseService.getAllDocuments('directorio_contactos', 3000);
      
      // Filter and process contacts with valid birthdates
      const birthdays = contacts
        .filter(contact => contact.fecha_nacimiento || contact.birthdate)
        .map(contact => {
          const birthdate = contact.fecha_nacimiento || contact.birthdate;
          
          // Handle different date formats
          let birthdateObj;
          if (typeof birthdate === 'string') {
            birthdateObj = new Date(birthdate);
          } else if (birthdate && typeof birthdate === 'object' && birthdate.seconds) {
            // Firestore timestamp
            birthdateObj = new Date(birthdate.seconds * 1000);
          } else {
            birthdateObj = new Date(birthdate);
          }
          
          if (isNaN(birthdateObj.getTime())) {
            return null; // Invalid date
          }
          
          // Calculate if birthday is in the next 7 days
          const today = new Date();
          const thisYear = today.getFullYear();
          const thisBirthday = new Date(thisYear, birthdateObj.getMonth(), birthdateObj.getDate());
          
          // If birthday already passed this year, check next year
          if (thisBirthday < today) {
            thisBirthday.setFullYear(thisYear + 1);
          }
          
          const daysUntilBirthday = Math.ceil((thisBirthday - today) / (1000 * 60 * 60 * 24));
          
          return {
            id: contact.id,
            nombre: contact.nombre_completo || contact.nombre || 'Sin nombre',
            fecha_nacimiento: birthdateObj.toISOString().split('T')[0],
            dias_hasta: daysUntilBirthday,
            telefono: contact.telefono_movil || contact.telefono || null,
            email: contact.email || null
          };
        })
        .filter(birthday => birthday !== null && birthday.dias_hasta <= 7) // Next 7 days
        .sort((a, b) => a.dias_hasta - b.dias_hasta);
      
      console.log(`✅ Found ${birthdays.length} upcoming birthdays from Firebase`);
      return birthdays;
      
    } catch (error) {
      console.error('❌ Error fetching birthdays from Firebase:', error);
      throw error;
    }
  }

  /**
   * Get policy expirations from Firebase autos collection
   * Equivalent to the old tableService.getData('autos') function
   */
  async getPolicyExpirations() {
    try {
      console.log('📄 Fetching policy expirations from Firebase...');
      
      // Get all insurance policies
      const policies = await this.firebaseService.getAllDocuments('autos', 3000);
      
      // Filter and process policies with valid expiration dates
      const expirations = policies
        .filter(policy => policy.vigencia_hasta || policy.fecha_vencimiento)
        .map(policy => {
          const expirationDate = policy.vigencia_hasta || policy.fecha_vencimiento;
          
          // Handle different date formats
          let expirationObj;
          if (typeof expirationDate === 'string') {
            expirationObj = new Date(expirationDate);
          } else if (expirationDate && typeof expirationDate === 'object' && expirationDate.seconds) {
            // Firestore timestamp
            expirationObj = new Date(expirationDate.seconds * 1000);
          } else {
            expirationObj = new Date(expirationDate);
          }
          
          if (isNaN(expirationObj.getTime())) {
            return null; // Invalid date
          }
          
          // Calculate days until expiration
          const today = new Date();
          const daysUntilExpiration = Math.ceil((expirationObj - today) / (1000 * 60 * 60 * 24));
          
          // Determine policy type and status
          const policyType = this.determinePolicyType(policy);
          const isExpired = daysUntilExpiration < 0;
          const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration >= 0;
          
          return {
            id: policy.id,
            nombre_contratante: policy.nombre_contratante || policy.nombre || 'Sin nombre',
            numero_poliza: policy.numero_poliza || policy.numero_de_poliza || 'Sin número',
            aseguradora: policy.aseguradora || 'Sin aseguradora',
            vigencia_hasta: expirationObj.toISOString().split('T')[0],
            dias_hasta_vencimiento: daysUntilExpiration,
            tipo_poliza: policyType,
            estado: isExpired ? 'vencida' : isExpiringSoon ? 'por_vencer' : 'vigente',
            telefono: policy.telefono || policy.telefono_movil || null,
            email: policy.email || null
          };
        })
        .filter(expiration => expiration !== null)
        .sort((a, b) => a.dias_hasta_vencimiento - b.dias_hasta_vencimiento);
      
      console.log(`✅ Found ${expirations.length} policy expirations from Firebase`);
      return expirations;
      
    } catch (error) {
      console.error('❌ Error fetching policy expirations from Firebase:', error);
      throw error;
    }
  }

  /**
   * Determine policy type based on available data
   */
  determinePolicyType(policy) {
    // Check various fields to determine the type of insurance policy
    if (policy.tipo_seguro) {
      return policy.tipo_seguro;
    }
    
    // Infer from collection or other fields
    if (policy.placas || policy.vehiculo || policy.auto) {
      return 'Auto';
    }
    
    if (policy.gastos_medicos || policy.gmm) {
      return 'GMM';
    }
    
    return 'Seguro'; // Default
  }

  /**
   * Get birthdays for a specific period
   */
  async getBirthdaysForPeriod(period = 'week') {
    try {
      const contacts = await this.firebaseService.getAllDocuments('directorio_contactos', 3000);
      const days = period === 'today' ? 0 : period === 'week' ? 7 : period === 'month' ? 30 : 365;
      
      const birthdays = contacts
        .filter(contact => contact.fecha_nacimiento || contact.birthdate)
        .map(contact => {
          const birthdate = contact.fecha_nacimiento || contact.birthdate;
          let birthdateObj = new Date(birthdate);
          
          if (isNaN(birthdateObj.getTime())) return null;
          
          const today = new Date();
          const thisYear = today.getFullYear();
          const thisBirthday = new Date(thisYear, birthdateObj.getMonth(), birthdateObj.getDate());
          
          // For "today" period, check exact match
          if (period === 'today') {
            const isToday = thisBirthday.getMonth() === today.getMonth() && 
                           thisBirthday.getDate() === today.getDate();
            if (!isToday) return null;
          } else {
            // For other periods, check if birthday is in range
            if (thisBirthday < today) {
              thisBirthday.setFullYear(thisYear + 1);
            }
            
            const daysUntilBirthday = Math.ceil((thisBirthday - today) / (1000 * 60 * 60 * 24));
            if (daysUntilBirthday > days) return null;
          }
          
          const age = thisYear - birthdateObj.getFullYear();
          
          return {
            id: contact.id,
            name: contact.nombre_completo || contact.nombre || 'Sin nombre',
            email: contact.email || null,
            rfc: contact.rfc || null,
            date: birthdateObj.toISOString(),
            age: age,
            dias_hasta: period === 'today' ? 0 : Math.ceil((thisBirthday - today) / (1000 * 60 * 60 * 24))
          };
        })
        .filter(birthday => birthday !== null)
        .sort((a, b) => a.dias_hasta - b.dias_hasta);
      
      console.log(`✅ Found ${birthdays.length} birthdays for period: ${period}`);
      return birthdays;
    } catch (error) {
      console.error('Error fetching birthdays for period:', error);
      throw error;
    }
  }

  /**
   * Get policy expirations for a specific period
   */
  async getExpirationForPeriod(period = 'month') {
    try {
      const policies = await this.firebaseService.getAllDocuments('autos', 3000);
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
      
      const expirations = policies
        .filter(policy => policy.vigencia_hasta || policy.fecha_vencimiento)
        .map(policy => {
          const expirationDate = policy.vigencia_hasta || policy.fecha_vencimiento;
          let expirationObj = new Date(expirationDate);
          
          if (isNaN(expirationObj.getTime())) return null;
          
          const today = new Date();
          const daysUntilExpiration = Math.ceil((expirationObj - today) / (1000 * 60 * 60 * 24));
          
          return {
            ...policy,
            dias_hasta_vencimiento: daysUntilExpiration
          };
        })
        .filter(expiration => expiration !== null && expiration.dias_hasta_vencimiento <= days && expiration.dias_hasta_vencimiento >= -30)
        .sort((a, b) => a.dias_hasta_vencimiento - b.dias_hasta_vencimiento);
      
      return expirations;
    } catch (error) {
      console.error('Error fetching expirations for period:', error);
      throw error;
    }
  }
}

export default new FirebaseDashboardService(); 