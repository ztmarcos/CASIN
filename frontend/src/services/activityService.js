import { API_URL } from '../config/api.js';
import firebaseReportsService from './firebaseReportsService';

/**
 * Activity Service
 * Service for aggregating and querying activity data for the Resumen component
 */

class ActivityService {
  constructor() {
    this.reportsService = firebaseReportsService;
  }

  /**
   * Get activities for a date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Array of activity logs
   */
  async getActivitiesForDateRange(startDate, endDate) {
    try {
      const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
      const end = typeof endDate === 'string' ? endDate : endDate.toISOString();
      
      console.log('📊 Fetching activities from', start, 'to', end);
      
      const response = await fetch(
        `${API_URL}/activity-logs?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&limit=500`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✅ Found ${result.data.length} activities`);
      
      return result.data || [];
    } catch (error) {
      console.error('❌ Error fetching activities:', error);
      return [];
    }
  }

  /**
   * Get expiring policies (next N days)
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array>} Array of expiring policies with table/ramo info
   */
  async getExpiringPolicies(daysAhead = 7) {
    try {
      console.log(`📅 Fetching policies expiring in next ${daysAhead} days`);
      
      const allPolicies = await this.reportsService.getAllPolicies();
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);
      
      const expiringPolicies = allPolicies.filter(policy => {
        if (!policy.fecha_fin) return false;
        
        const endDate = new Date(policy.fecha_fin);
        return endDate >= today && endDate <= futureDate;
      });
      
      // Add table/ramo name to each policy
      const policiesWithTable = expiringPolicies.map(policy => ({
        ...policy,
        tabla: policy.sourceTable || policy.ramo || 'General'
      }));
      
      console.log(`✅ Found ${policiesWithTable.length} policies expiring soon`);
      return policiesWithTable;
    } catch (error) {
      console.error('❌ Error fetching expiring policies:', error);
      return [];
    }
  }

  /**
   * Get partial payments due in date range
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Array of policies with partial payments due and table info
   */
  async getPartialPaymentsDue(startDate, endDate) {
    try {
      console.log('💰 Fetching partial payments due');
      
      const allPolicies = await this.reportsService.getAllPolicies();
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const partialPayments = allPolicies.filter(policy => {
        // Check if policy has partial payment form
        const hasPartialPayments = policy.forma_pago && [
          'MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'CUATRIMESTRAL', 'SEMESTRAL'
        ].some(form => policy.forma_pago.toUpperCase().includes(form));
        
        if (!hasPartialPayments) return false;
        
        // Check if next payment is in range
        if (policy.fecha_proximo_pago) {
          const nextPayment = new Date(policy.fecha_proximo_pago);
          return nextPayment >= start && nextPayment <= end;
        }
        
        return false;
      });
      
      // Add table/ramo name to each policy
      const paymentsWithTable = partialPayments.map(policy => ({
        ...policy,
        tabla: policy.sourceTable || policy.ramo || 'General'
      }));
      
      console.log(`✅ Found ${paymentsWithTable.length} partial payments due`);
      return paymentsWithTable;
    } catch (error) {
      console.error('❌ Error fetching partial payments:', error);
      return [];
    }
  }

  /**
   * Get user activity statistics
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Object>} User activity stats
   */
  async getUserActivityStats(startDate, endDate) {
    try {
      console.log('📈 Calculating user activity statistics');
      
      const activities = await this.getActivitiesForDateRange(startDate, endDate);
      
      const stats = {
        byUser: {},
        byAction: {},
        total: activities.length,
        dailyActivities: []
      };
      
      activities.forEach(activity => {
        const user = activity.userName || activity.userEmail || 'Unknown';
        const action = activity.action;
        
        // Count by user
        if (!stats.byUser[user]) {
          stats.byUser[user] = {
            total: 0,
            email_sent: 0,
            data_captured: 0,
            data_updated: 0,
            pdf_analyzed: 0,
            daily_activity: 0
          };
        }
        stats.byUser[user].total++;
        if (stats.byUser[user][action] !== undefined) {
          stats.byUser[user][action]++;
        }
        
        // Collect daily activities
        if (action === 'daily_activity') {
          stats.dailyActivities.push({
            user: user,
            title: activity.details?.title || 'Actividad sin título',
            description: activity.details?.description || '',
            date: activity.timestamp,
            metadata: activity.metadata || {}
          });
        }
        
        // Count by action
        if (!stats.byAction[action]) {
          stats.byAction[action] = 0;
        }
        stats.byAction[action]++;
      });
      
      console.log('✅ User activity stats calculated:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error calculating user activity stats:', error);
      return { byUser: {}, byAction: {}, total: 0, dailyActivities: [] };
    }
  }

  /**
   * Generate comprehensive summary data for GPT analysis
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Object>} Summary data object
   */
  async generateSummaryData(startDate, endDate) {
    try {
      console.log('📊 Generating comprehensive summary data');
      
      const [
        activities,
        expiringPolicies,
        partialPayments,
        userStats,
        teamActivities
      ] = await Promise.all([
        this.getActivitiesForDateRange(startDate, endDate),
        this.getExpiringPolicies(7),
        this.getPartialPaymentsDue(new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        this.getUserActivityStats(startDate, endDate),
        this.getTeamActivities(startDate, endDate)
      ]);
      
      // Contar pólizas capturadas
      const policiesCaptured = activities.filter(act => act.activityType === 'data_captured').length;
      
      const summaryData = {
        dateRange: {
          start: typeof startDate === 'string' ? startDate : startDate.toISOString(),
          end: typeof endDate === 'string' ? endDate : endDate.toISOString()
        },
        activities: {
          total: activities.length,
          byAction: userStats.byAction,
          recent: activities.slice(0, 10) // Most recent 10
        },
        expiringPolicies: {
          total: expiringPolicies.length,
          policies: expiringPolicies.slice(0, 10), // Top 10 most urgent
          byInsurer: this.groupByField(expiringPolicies, 'aseguradora')
        },
        partialPayments: {
          total: partialPayments.length,
          payments: partialPayments.slice(0, 10), // Top 10 most urgent
          totalAmount: this.calculateTotalAmount(partialPayments)
        },
        userActivity: userStats.byUser,
        dailyActivities: userStats.dailyActivities || [],
        teamActivities: teamActivities, // Actividades de la sección Actividad
        summary: {
          totalActivities: activities.length,
          totalExpiring: expiringPolicies.length,
          totalPartialPayments: partialPayments.length,
          activeUsers: Object.keys(userStats.byUser).length,
          totalDailyActivities: userStats.dailyActivities?.length || 0,
          policiesCaptured: policiesCaptured
        }
      };
      
      console.log('✅ Summary data generated successfully');
      return summaryData;
    } catch (error) {
      console.error('❌ Error generating summary data:', error);
      return {
        dateRange: { start: startDate, end: endDate },
        activities: { total: 0, byAction: {}, recent: [] },
        expiringPolicies: { total: 0, policies: [], byInsurer: {} },
        partialPayments: { total: 0, payments: [], totalAmount: 0 },
        userActivity: {},
        summary: {
          totalActivities: 0,
          totalExpiring: 0,
          totalPartialPayments: 0,
          activeUsers: 0
        }
      };
    }
  }

  /**
   * Helper: Group array by field
   */
  groupByField(array, field) {
    return array.reduce((acc, item) => {
      const key = item[field] || 'Unknown';
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {});
  }

  /**
   * Helper: Calculate total amount from policies
   */
  calculateTotalAmount(policies) {
    return policies.reduce((sum, policy) => {
      // Prioritize pago_parcial for partial payments (same as Reports component)
      const amount = policy.pago_parcial || 0;
      return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
    }, 0);
  }

  /**
   * Get team activities from Firebase tasks collection
   * Excludes cancelled activities and orders by most recent
   */
  async getTeamActivities(startDate, endDate) {
    try {
      console.log('📋 Fetching team activities from Firebase');
      
      // Dynamic import to avoid circular dependencies
      const firebaseModule = await import('firebase/firestore');
      const { getFirestore, collection, query, where, orderBy, getDocs } = firebaseModule;
      
      const db = getFirestore();
      const tasksRef = collection(db, 'tasks');
      
      const startISO = typeof startDate === 'string' ? startDate : startDate.toISOString();
      const endISO = typeof endDate === 'string' ? endDate : endDate.toISOString();
      
      console.log('📅 Querying tasks from', startISO, 'to', endISO);
      
      // Query tasks within date range
      const q = query(
        tasksRef,
        where('createdAt', '>=', startISO),
        where('createdAt', '<=', endISO),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const activities = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        // Solo incluir actividades que NO estén canceladas
        if (data.status !== 'cancelled') {
          activities.push({
            id: doc.id,
            userName: data.userName || data.createdBy,
            title: data.title,
            description: data.description,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt || data.createdAt
          });
        }
      });
      
      console.log(`✅ Found ${activities.length} team activities (excluding cancelled)`);
      
      // Ordenar por última actualización o creación (más reciente primero)
      activities.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt);
        const dateB = new Date(b.updatedAt || b.createdAt);
        return dateB - dateA;
      });
      
      return activities;
    } catch (error) {
      console.error('❌ Error fetching team activities:', error);
      return [];
    }
  }

  /**
   * Get last week's date range (previous Monday to Sunday)
   * @returns {Object} {startDate, endDate}
   */
  getLastWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 + 7;
    
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysToLastMonday);
    lastMonday.setHours(0, 0, 0, 0);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    
    return {
      startDate: lastMonday,
      endDate: lastSunday
    };
  }

  /**
   * Get last 7 days date range
   * @returns {Object} {startDate, endDate}
   */
  getLast7DaysRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
  }
}

// Create and export singleton instance
const activityService = new ActivityService();
export default activityService;

