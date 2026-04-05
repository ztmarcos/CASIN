import firebaseService from './firebaseService';
import firebaseClientesService from './firebaseClientesService';
import { API_URL } from '../config/api.js';
import { extractBirthdayFromRFC, formatBirthday, calculateAge } from '../utils/rfcUtils';

/** Returns true if email is corporate (GNP, Qualitas) and should be avoided for birthday emails */
function isCorporateEmail(email) {
  if (!email || typeof email !== 'string') return true;
  const e = email.toLowerCase().trim();
  return e.includes('@gnp') || e.includes('@qualitas');
}

/** Prefer personal email, then other; never use @gnp / @qualitas */
function pickBestEmail(personal, other) {
  const p = (personal && String(personal).trim()) || '';
  const o = (other && String(other).trim()) || '';
  if (p && !isCorporateEmail(p)) return p;
  if (o && !isCorporateEmail(o)) return o;
  return '';
}

class FirebaseBirthdayService {
  constructor() {
    this.firebaseService = firebaseService;
  }

  /**
   * Fetches birthday data from Firebase collections with RFC (for a specific team)
   * Uses email personal from directorio de clientes (clientes_metadata), fallback to doc email; excludes @gnp / @qualitas.
   * @param {string} [teamId] - Team document ID. If omitted, uses default/CASIN collections.
   * @returns {Promise<Array>} Array of birthday objects
   */
  async fetchBirthdays(teamId) {
    try {
      console.log('🎂 Fetching birthdays from Firebase...', teamId ? `team: ${teamId}` : 'default/CASIN');
      
      const metadataMap = await firebaseClientesService.getClientesMetadataMap();
      const collections = ['directorio_contactos', 'autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
      const teamParam = teamId ? `&team=${encodeURIComponent(teamId)}` : '';
      const birthdays = [];
      
      for (const collectionName of collections) {
        try {
          console.log(`🔍 Checking collection: ${collectionName}`);
          
          const response = await fetch(`${API_URL}/data/${collectionName}?nocache=${Date.now()}${teamParam}`);
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
              const normalizedName = firebaseClientesService.normalizeClientName(name);
              const emailPersonal = (metadataMap.get(normalizedName)?.emailPersonal || '').trim();
              const otherEmail = (doc.email || doc.e_mail || '').trim();
              const email = pickBestEmail(emailPersonal, otherEmail);
              
              const birthdayEntry = {
                id: doc.id,
                name: name,
                rfc: doc.rfc || '',
                email: email,
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
   * Actually sends emails via backend endpoint with BCC to ztmarcos@gmail.com and casinseguros@gmail.com
   */
  async triggerBirthdayEmails() {
    try {
      console.log('🎂 Triggering birthday emails check (Firebase mode)...');
      
      // Call the backend endpoint that actually sends the emails
      const response = await fetch(`${API_URL}/cron/birthday-emails`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Birthday emails triggered:', result);
      
      return {
        success: true,
        emailsSent: result.result?.emailsSent || 0,
        message: result.result?.emailsSent > 0 
          ? `✅ Se enviaron ${result.result.emailsSent} correo(s) de cumpleaños con copia a ztmarcos@gmail.com y casinseguros@gmail.com`
          : `Se encontraron ${result.result?.totalBirthdays || 0} cumpleaños para hoy, pero no todos tienen email registrado`,
        birthdays: result.result?.birthdays || [],
        emailResults: result.result?.emailResults || []
      };
      
    } catch (error) {
      console.error('❌ Error triggering birthday emails:', error);
      throw error;
    }
  }

  /**
   * Send birthday email using Gmail credentials
   * Includes BCC to ztmarcos@gmail.com and casinseguros@gmail.com
   */
  async sendBirthdayEmailWithGmail(birthdayPerson, message = '') {
    try {
      const logoBase = import.meta.env.VITE_PUBLIC_CRM_URL || 'https://casin-crm.web.app';
      const casinLogoUrl = `${String(logoBase).replace(/\/$/, '')}/logo.png`;
      const response = await fetch(`${API_URL}/email/send-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: birthdayPerson.email,
          bcc: 'ztmarcos@gmail.com,casinseguros@gmail.com',
          subject: `Feliz Cumpleaños ${birthdayPerson.name}`,
          htmlContent: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#e8edf3;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#e8edf3;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(15,40,64,0.12);border:1px solid #dbe2ea;">
      <tr><td style="padding:28px 32px 12px;text-align:center;background-color:#ffffff;">
        <img src="${casinLogoUrl}" alt="CASIN Seguros" width="80" height="80" style="display:block;margin:0 auto;border:0;"/>
      </td></tr>
      <tr><td style="height:4px;line-height:4px;background-color:#ea580c;background-image:linear-gradient(90deg,#fb923c,#ea580c);font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:26px 32px;background-color:#123b66;background-image:linear-gradient(160deg,#1a4d7a 0%,#0c2847 100%);">
        <h1 style="margin:0;font-family:Segoe UI,Tahoma,sans-serif;font-size:26px;font-weight:700;color:#ffffff;text-align:center;">¡Feliz cumpleaños!</h1>
        <p style="margin:10px 0 0;font-family:Segoe UI,Tahoma,sans-serif;font-size:15px;color:#fde68a;text-align:center;">Un mensaje especial para ti</p>
      </td></tr>
      <tr><td style="padding:32px 32px 28px;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#ea580c;text-transform:uppercase;letter-spacing:0.06em;">Para</p>
        <h2 style="margin:0 0 20px;font-size:24px;font-weight:600;color:#0f2840;line-height:1.3;">${birthdayPerson.name}</h2>
        <p style="margin:0 0 12px;font-size:17px;line-height:1.65;color:#475569;">En este día tan especial, te deseamos un día maravilloso lleno de alegría y éxito.</p>
        <p style="margin:0 0 12px;font-size:17px;line-height:1.65;color:#475569;">Que este nuevo año de vida esté lleno de momentos gratificantes y logros importantes.</p>
        ${message ? `<p style="margin:0;font-size:17px;line-height:1.65;color:#475569;font-style:italic;">"${message}"</p>` : ''}
        <p style="margin:16px 0 0;font-size:44px;line-height:1.2;text-align:center;">🎉&nbsp;&nbsp;🎈&nbsp;&nbsp;🎁</p>
        <div style="margin-top:28px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:15px;color:#64748b;">Atentamente,</p>
          <p style="margin:8px 0 0;font-size:17px;font-weight:600;color:#0f2840;">Equipo CASIN Seguros</p>
        </div>
      </td></tr>
      <tr><td style="padding:18px 32px 24px;background-color:#f1f5f9;text-align:center;font-family:Segoe UI,Tahoma,sans-serif;font-size:12px;color:#64748b;line-height:1.5;">
        <p style="margin:0;">Este mensaje fue enviado automáticamente por el sistema de CASIN Seguros.</p>
        ${birthdayPerson.details ? `<p style="margin:8px 0 0;">Detalles: ${birthdayPerson.details}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>
          `,
          from: import.meta.env.VITE_GMAIL_USERNAME || 'casinseguros@gmail.com',
          fromPass: import.meta.env.VITE_GMAIL_APP_PASSWORD,
          fromName: 'CASIN Seguros - Felicitaciones'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send birthday email');
      }

      const result = await response.json();
      console.log('Birthday email sent successfully with Gmail (BCC included):', result);
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

  /**
   * Check if birthday emails were sent today by querying activity logs
   */
  async checkTodaysEmailStatus() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayEnd = tomorrow.toISOString();
      
      const response = await fetch(
        `${API_URL}/activity-logs?startDate=${encodeURIComponent(todayStart)}&endDate=${encodeURIComponent(todayEnd)}&action=birthday_emails_sent&limit=10`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activity logs: ${response.status}`);
      }
      
      const result = await response.json();
      const logs = result.data || [];
      
      // Find the most recent birthday email log for today
      const todayLog = logs.find(log => {
        const logDate = new Date(log.timestamp);
        return logDate.toDateString() === today.toDateString();
      });
      
      if (todayLog) {
        return {
          sent: true,
          timestamp: todayLog.timestamp,
          details: todayLog.details || {},
          message: `✅ Se enviaron ${todayLog.details?.emailsSent || 0} correo(s) de cumpleaños hoy a las ${new Date(todayLog.timestamp).toLocaleTimeString('es-MX')}`
        };
      }
      
      return {
        sent: false,
        message: '⚠️ No se encontraron registros de envío de correos de cumpleaños hoy'
      };
      
    } catch (error) {
      console.error('❌ Error checking today\'s email status:', error);
      return {
        sent: false,
        error: error.message,
        message: '❌ Error al verificar el estado de los correos de hoy'
      };
    }
  }
}

// Create and export singleton instance
const firebaseBirthdayService = new FirebaseBirthdayService();
export default firebaseBirthdayService;

// Export individual functions for compatibility
export const fetchBirthdays = (teamId) => firebaseBirthdayService.fetchBirthdays(teamId);
export const triggerBirthdayEmails = () => firebaseBirthdayService.triggerBirthdayEmails();
export const sendBirthdayEmailWithGmail = (birthdayPerson, message) => firebaseBirthdayService.sendBirthdayEmailWithGmail(birthdayPerson, message);
export const sendTodaysBirthdayEmailsWithGmail = (message) => firebaseBirthdayService.sendTodaysBirthdayEmailsWithGmail(message);
export const checkTodaysEmailStatus = () => firebaseBirthdayService.checkTodaysEmailStatus(); 