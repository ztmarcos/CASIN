import firebaseBirthdayService from './firebaseBirthdayService';
import firebaseReportsService from './firebaseReportsService';

class FirebaseDashboardService {
  constructor() {
    this.birthdayService = firebaseBirthdayService;
    this.reportsService = firebaseReportsService;
  }

  /**
   * Get birthdays for a specific period
   * @param {string} period - 'today', 'week', 'month'
   * @returns {Promise<Array>} Array of birthday objects
   */
  async getBirthdaysForPeriod(period = 'today') {
    try {
      console.log(`🎂 Dashboard: Getting birthdays for period: ${period}`);
      
      switch (period) {
        case 'today':
          return await this.birthdayService.getTodaysBirthdays();
        case 'week':
          return await this.birthdayService.getUpcomingBirthdays(7);
        case 'month':
          return await this.birthdayService.getCurrentMonthBirthdays();
        default:
          return await this.birthdayService.getTodaysBirthdays();
      }
    } catch (error) {
      console.error(`❌ Error getting birthdays for ${period}:`, error);
      return [];
    }
  }

  /**
   * Get policy expirations for a specific period
   * @param {string} period - 'week', 'month', 'quarter'
   * @returns {Promise<Array>} Array of expiration objects
   */
  async getExpirationForPeriod(period = 'month') {
    try {
      console.log(`📅 Dashboard: Getting expirations for period: ${period}`);
      
      const today = new Date();
      let endDate;
      
      switch (period) {
        case 'week':
          endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          // End of current month
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case 'quarter':
          endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          // End of current month by default
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      // Get expirations from reports service
      const expirations = await this.reportsService.getVencimientos();
      
      // Filter by period (only current month)
      const filteredExpirations = expirations.filter(policy => {
        if (!policy.fecha_fin) {
          console.log('⚠️ Policy without fecha_fin:', policy);
          return false;
        }
        
        const expirationDate = new Date(policy.fecha_fin);
        const isValidDate = !isNaN(expirationDate.getTime());
        
        if (!isValidDate) {
          console.log('⚠️ Invalid fecha_fin:', policy.fecha_fin, 'for policy:', policy);
          return false;
        }
        
        // Filter for current month only
        const isInPeriod = expirationDate >= today && expirationDate <= endDate;
        
        if (isInPeriod) {
          console.log('✅ Valid expiration found (current month):', {
            policy: policy.numero_poliza,
            date: policy.fecha_fin,
            name: policy.nombre_contratante,
            expirationDate: expirationDate.toISOString(),
            today: today.toISOString(),
            endDate: endDate.toISOString()
          });
        } else {
          console.log('❌ Expiration outside period:', {
            policy: policy.numero_poliza,
            date: policy.fecha_fin,
            expirationDate: expirationDate.toISOString(),
            today: today.toISOString(),
            endDate: endDate.toISOString()
          });
        }
        
        return isInPeriod;
      });

      console.log(`📊 Dashboard: Found ${filteredExpirations.length} expirations for ${period}`);
      console.log('📅 Date range:', { today: today.toISOString(), endDate: endDate.toISOString() });
      return filteredExpirations;
      
    } catch (error) {
      console.error(`❌ Error getting expirations for ${period}:`, error);
      return [];
    }
  }

  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard stats object
   */
  async getDashboardStats() {
    try {
      console.log('📊 Dashboard: Getting dashboard statistics');
      
      const [
        todaysBirthdays,
        weeklyExpirations,
        monthlyExpirations
      ] = await Promise.all([
        this.getBirthdaysForPeriod('today'),
        this.getExpirationForPeriod('week'),
        this.getExpirationForPeriod('month')
      ]);

      const stats = {
        birthdays: {
          today: todaysBirthdays.length,
          thisWeek: (await this.getBirthdaysForPeriod('week')).length,
          thisMonth: (await this.getBirthdaysForPeriod('month')).length
        },
        expirations: {
          thisWeek: weeklyExpirations.length,
          thisMonth: monthlyExpirations.length
        },
        lastUpdated: new Date().toISOString()
      };

      console.log('✅ Dashboard stats:', stats);
      return stats;
      
    } catch (error) {
      console.error('❌ Error getting dashboard stats:', error);
      return {
        birthdays: { today: 0, thisWeek: 0, thisMonth: 0 },
        expirations: { thisWeek: 0, thisMonth: 0 },
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get recent activity (placeholder for future implementation)
   * @returns {Promise<Array>} Array of recent activity objects
   */
  async getRecentActivity() {
    try {
      // This is a placeholder - you can implement based on your needs
      return [
        {
          id: 1,
          type: 'policy_created',
          message: 'Nueva póliza creada',
          timestamp: new Date().toISOString(),
          user: 'Sistema'
        },
        {
          id: 2,
          type: 'birthday_reminder',
          message: 'Recordatorio de cumpleaños enviado',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          user: 'Sistema'
        }
      ];
    } catch (error) {
      console.error('❌ Error getting recent activity:', error);
      return [];
    }
  }
}

// Create and export singleton instance
const firebaseDashboardService = new FirebaseDashboardService();
export default firebaseDashboardService; 