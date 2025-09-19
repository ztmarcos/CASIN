import firebaseService from './firebaseService';
import { API_URL } from '../config/api.js';
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
          
          // Get all documents from this collection via backend API
          const response = await fetch(`${API_URL}/data/${collectionName}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const result = await response.json();
          const documents = result.data || [];
          
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
    // Lista de todos los posibles campos de nombre que pueden existir
    const possibleNameFields = [
      'nombre_completo',
      'nombre_contratante', 
      'contratante',
      'asegurado',
      'nombre',
      'nombre_asegurado',
      'cliente',
      'nombre_cliente'
    ];

    // Buscar el primer campo de nombre que tenga valor
    for (const field of possibleNameFields) {
      if (doc[field] && doc[field].trim() !== '') {
        return doc[field].trim();
      }
    }

    // Debug: Si no se encuentra ningún campo de nombre, loggear los campos disponibles
    console.warn(`🔍 No se encontró campo de nombre en documento de ${collectionName}. Campos disponibles:`, Object.keys(doc));
    console.warn(`🔍 Documento completo:`, doc);

    // Si no se encuentra ningún campo de nombre, devolver 'Sin nombre'
    return 'Sin nombre';
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

  /**
   * Send birthday email using Gmail credentials
   */
  async sendBirthdayEmailWithGmail(birthdayPerson, message = '') {
    try {
      const response = await fetch(`${API_URL}/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: birthdayPerson.email,
          subject: `¡Feliz Cumpleaños ${birthdayPerson.name}! 🎉`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #e74c3c; text-align: center;">🎂 ¡Feliz Cumpleaños! 🎂</h2>
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; color: white; text-align: center;">
                <h3 style="margin: 0; font-size: 24px;">${birthdayPerson.name}</h3>
                <p style="font-size: 18px; margin: 20px 0;">¡Que tengas un día maravilloso lleno de alegría y éxito!</p>
                ${message ? `<p style="font-style: italic; margin: 20px 0;">"${message}"</p>` : ''}
                <div style="margin: 30px 0;">
                  <span style="font-size: 40px;">🎉 🎈 🎁</span>
                </div>
                <p style="font-size: 16px; margin: 0;">Con cariño,<br><strong>Equipo CASIN Seguros</strong></p>
              </div>
              <div style="text-align: center; margin-top: 20px; color: #7f8c8d;">
                <p>Este mensaje fue enviado automáticamente por el sistema de CASIN Seguros</p>
                <p><small>Detalles: ${birthdayPerson.details || 'Cliente CASIN'}</small></p>
              </div>
            </div>
          `,
          from: import.meta.env.VITE_GMAIL_USERNAME || 'casinseguros@gmail.com',
          fromPass: import.meta.env.VITE_GMAIL_APP_PASSWORD || 'espajcgariyhsboq',
          fromName: 'CASIN Seguros - Felicitaciones'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send birthday email');
      }

      const result = await response.json();
      console.log('Birthday email sent successfully with Gmail:', result);
      return result;
    } catch (error) {
      console.error('Error sending birthday email with Gmail:', error);
      throw error;
    }
  }

  /**
   * Send birthday emails to all today's birthdays using Gmail
   */
  async sendTodaysBirthdayEmailsWithGmail(message = '') {
    try {
      console.log('🎂 Sending birthday emails with Gmail...');
      
      const todaysBirthdays = await this.getTodaysBirthdays();
      const emailsSent = [];
      const errors = [];
      
      for (const birthday of todaysBirthdays) {
        if (birthday.email) {
          try {
            const result = await this.sendBirthdayEmailWithGmail(birthday, message);
            emailsSent.push({
              name: birthday.name,
              email: birthday.email,
              result: result
            });
          } catch (error) {
            errors.push({
              name: birthday.name,
              email: birthday.email,
              error: error.message
            });
          }
        }
      }
      
      return {
        success: true,
        emailsSent: emailsSent.length,
        errors: errors.length,
        totalBirthdays: todaysBirthdays.length,
        sentEmails: emailsSent,
        errorDetails: errors
      };
      
    } catch (error) {
      console.error('❌ Error sending today\'s birthday emails:', error);
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
export const sendBirthdayEmailWithGmail = (birthdayPerson, message) => firebaseBirthdayService.sendBirthdayEmailWithGmail(birthdayPerson, message);
export const sendTodaysBirthdayEmailsWithGmail = (message) => firebaseBirthdayService.sendTodaysBirthdayEmailsWithGmail(message); 