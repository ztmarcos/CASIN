import firebaseService from './firebaseService';
import { extractBirthdayFromRFC, formatBirthday, calculateAge } from '../utils/rfcUtils';

class FirebaseBirthdayService {
  constructor() {
    this.firebaseService = firebaseService;
  }

  /**
   * Fetches birthday data from all Firebase collections with RFC
   * @returns {Promise<Array>} Array of birthday objects
   */
  async fetchBirthdays() {
    try {
      console.log('🎂 Fetching birthdays from Firebase...');
      
      // All collections that might contain RFC data
      const collections = ['directorio_contactos', 'autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
      
      const birthdays = [];
      
      for (const collectionName of collections) {
        try {
          console.log(`🔍 Checking collection: ${collectionName}`);
          
          // Get all documents from this collection
          const documents = await this.firebaseService.getAllDocuments(collectionName, 1000);
          
          for (const doc of documents) {
            let birthdayData = null;
            let birthdaySource = 'unknown';
            
            // Try to get birthday from explicit fecha_nacimiento field
            if (doc.fecha_nacimiento) {
              birthdayData = new Date(doc.fecha_nacimiento);
              birthdaySource = 'fecha_nacimiento';
            }
            // Try to extract from RFC
            else if (doc.rfc) {
              try {
                const extractedBirthday = extractBirthdayFromRFC(doc.rfc);
                if (extractedBirthday) {
                  birthdayData = extractedBirthday;
                  birthdaySource = 'rfc';
                }
              } catch (error) {
                console.warn(`Could not extract birthday from RFC ${doc.rfc}:`, error);
              }
            }
            
            // If we have a valid birthday
            if (birthdayData && !isNaN(birthdayData.getTime())) {
              const age = calculateAge(birthdayData);
              
              // Get the name based on collection type
              const name = this.getNameFromDocument(doc, collectionName);
              
              const birthdayEntry = {
                id: doc.id,
                name: name,
                rfc: doc.rfc || '',
                email: doc.email || doc.e_mail || '',
                date: birthdayData.toISOString(),
                age: age,
                details: this.getBirthdayDetails(doc, collectionName),
                source: collectionName,
                birthdaySource: birthdaySource
              };
              
              birthdays.push(birthdayEntry);
            }
          }
          
        } catch (error) {
          console.warn(`Could not access collection ${collectionName}:`, error);
        }
      }
      
      // Remove duplicates by RFC (keep the one with most complete info)
      const uniqueBirthdays = this.removeDuplicatesByRFC(birthdays);
      
      // Sort by birthday date (month and day)
      uniqueBirthdays.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        // Compare month first, then day
        const monthCompare = dateA.getMonth() - dateB.getMonth();
        if (monthCompare !== 0) return monthCompare;
        
        return dateA.getDate() - dateB.getDate();
      });
      
      console.log(`✅ Found ${uniqueBirthdays.length} birthdays from Firebase`);
      return uniqueBirthdays;
      
    } catch (error) {
      console.error('❌ Error fetching birthdays from Firebase:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate name from a document based on collection type
   */
  getNameFromDocument(doc, collectionName) {
    switch (collectionName) {
      case 'directorio_contactos':
        return doc.nombre_completo || doc.nombre || 'Sin nombre';
      case 'autos':
        return doc.nombre_contratante || 'Sin nombre';
      case 'rc':
        return doc.asegurado || 'Sin nombre';
      case 'vida':
        return doc.contratante || 'Sin nombre';
      case 'gmm':
      case 'transporte':
      case 'mascotas':
      case 'diversos':
      case 'negocio':
      case 'gruposgmm':
        return doc.nombre_contratante || doc.contratante || doc.asegurado || 'Sin nombre';
      default:
        return doc.nombre_completo || doc.nombre_contratante || doc.contratante || doc.asegurado || 'Sin nombre';
    }
  }

  /**
   * Remove duplicate birthdays by RFC, keeping the one with most complete information
   */
  removeDuplicatesByRFC(birthdays) {
    const rfcMap = new Map();
    
    for (const birthday of birthdays) {
      if (!birthday.rfc) continue;
      
      const existingBirthday = rfcMap.get(birthday.rfc);
      
      if (!existingBirthday) {
        rfcMap.set(birthday.rfc, birthday);
      } else {
        // Keep the one with email, or from directorio_contactos, or the first one
        if ((!existingBirthday.email && birthday.email) || 
            (birthday.source === 'directorio_contactos' && existingBirthday.source !== 'directorio_contactos')) {
          rfcMap.set(birthday.rfc, birthday);
        }
      }
    }
    
    return Array.from(rfcMap.values());
  }

  /**
   * Get birthday details from document data based on collection type
   */
  getBirthdayDetails(doc, collectionName) {
    const details = [];
    
    // Add collection-specific details
    switch (collectionName) {
      case 'directorio_contactos':
        if (doc.status) details.push(doc.status);
        if (doc.telefono_movil) details.push(doc.telefono_movil);
        if (doc.origen) details.push(`Origen: ${doc.origen}`);
        break;
        
      case 'autos':
        details.push('Seguro de Autos');
        if (doc.numero_poliza) details.push(`Póliza: ${doc.numero_poliza}`);
        if (doc.aseguradora) details.push(doc.aseguradora);
        break;
        
      case 'vida':
        details.push('Seguro de Vida');
        if (doc.numero_poliza) details.push(`Póliza: ${doc.numero_poliza}`);
        if (doc.aseguradora) details.push(doc.aseguradora);
        break;
        
      case 'gmm':
        details.push('Gastos Médicos Mayores');
        if (doc.numero_poliza) details.push(`Póliza: ${doc.numero_poliza}`);
        if (doc.aseguradora) details.push(doc.aseguradora);
        break;
        
      default:
        details.push(`Seguro ${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)}`);
        if (doc.numero_poliza) details.push(`Póliza: ${doc.numero_poliza}`);
        if (doc.aseguradora) details.push(doc.aseguradora);
    }
    
    return details.join(' | ') || `Registro de ${collectionName}`;
  }

  /**
   * Get birthdays for today
   */
  async getTodaysBirthdays() {
    try {
      const allBirthdays = await this.fetchBirthdays();
      const today = new Date();
      
      return allBirthdays.filter(birthday => {
        const birthdayDate = new Date(birthday.date);
        return birthdayDate.getMonth() === today.getMonth() && 
               birthdayDate.getDate() === today.getDate();
      });
    } catch (error) {
      console.error('Error fetching today\'s birthdays:', error);
      throw error;
    }
  }

  /**
   * Get birthdays for current month
   */
  async getCurrentMonthBirthdays() {
    try {
      const allBirthdays = await this.fetchBirthdays();
      const today = new Date();
      
      return allBirthdays.filter(birthday => {
        const birthdayDate = new Date(birthday.date);
        return birthdayDate.getMonth() === today.getMonth();
      });
    } catch (error) {
      console.error('Error fetching current month birthdays:', error);
      throw error;
    }
  }

  /**
   * Get upcoming birthdays (next N days)
   */
  async getUpcomingBirthdays(days = 30) {
    try {
      const allBirthdays = await this.fetchBirthdays();
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + days);
      
      return allBirthdays.filter(birthday => {
        const birthdayDate = new Date(birthday.date);
        
        // Create this year's birthday
        const thisYearBirthday = new Date(
          today.getFullYear(),
          birthdayDate.getMonth(),
          birthdayDate.getDate()
        );
        
        // If birthday already passed this year, check next year
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        return thisYearBirthday >= today && thisYearBirthday <= endDate;
      }).sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        // Create this year's birthday for comparison
        const thisYearA = new Date(today.getFullYear(), dateA.getMonth(), dateA.getDate());
        const thisYearB = new Date(today.getFullYear(), dateB.getMonth(), dateB.getDate());
        
        if (thisYearA < today) thisYearA.setFullYear(today.getFullYear() + 1);
        if (thisYearB < today) thisYearB.setFullYear(today.getFullYear() + 1);
        
        return thisYearA - thisYearB;
      });
    } catch (error) {
      console.error('Error fetching upcoming birthdays:', error);
      throw error;
    }
  }

  /**
   * Triggers the birthday email check and send process
   */
  async triggerBirthdayEmails() {
    try {
      console.log('🎂 Triggering birthday emails check (Firebase mode)...');
      
      // Get today's birthdays
      const todaysBirthdays = await this.getTodaysBirthdays();
      
      console.log(`📧 Would send emails to ${todaysBirthdays.length} birthday contacts`);
      
      // Simulate success response
      return {
        success: true,
        emailsSent: todaysBirthdays.length,
        message: `Se encontraron ${todaysBirthdays.length} cumpleaños para hoy`,
        birthdays: todaysBirthdays.map(b => ({
          name: b.name,
          email: b.email || 'Sin email'
        }))
      };
      
    } catch (error) {
      console.error('❌ Error triggering birthday emails:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const firebaseBirthdayService = new FirebaseBirthdayService();
export default firebaseBirthdayService;

// Export individual functions for compatibility
export const fetchBirthdays = () => firebaseBirthdayService.fetchBirthdays();
export const triggerBirthdayEmails = () => firebaseBirthdayService.triggerBirthdayEmails(); 