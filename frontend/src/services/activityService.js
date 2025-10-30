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
        
        // Collect daily activities - REMOVED to avoid duplication with teamActivities
        // Daily activities are now handled by teamActivities from the tasks collection
        
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
      
      console.log('📊 Team activities fetched:', teamActivities.length);
      
      // Contar pólizas capturadas
      const policiesCaptured = activities.filter(act => act.action === 'data_captured').length;
      
      // Contar pólizas pagadas (basado en estado_pago)
      const policiesPaid = activities.filter(act => 
        act.action === 'data_updated' && 
        act.details && 
        act.details.field === 'estado_pago' && 
        act.details.newValue === 'Pagado'
      ).length;
      
      // Contar emails enviados
      const emailsSent = activities.filter(act => act.action === 'email_sent').length;
      
      // Contar actualizaciones de datos
      const dataUpdates = activities.filter(act => act.action === 'data_updated').length;
      
      // Obtener pólizas capturadas (con detalles)
      const capturedPolicies = await this.getCapturedPolicies(startDate, endDate);
      
      // Obtener pólizas canceladas (CAP/CFP)
      const cancelledPolicies = await this.getCancelledPolicies();
      
      // Obtener pagos realizados
      const paymentsMade = await this.getPaymentsMade(startDate, endDate);
      
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
        teamActivities: teamActivities, // Actividades de la sección Actividad
        capturedPolicies: {
          total: capturedPolicies.length,
          policies: capturedPolicies.slice(0, 10) // Top 10 most recent
        },
        cancelledPolicies: {
          total: cancelledPolicies.length,
          policies: cancelledPolicies.slice(0, 10) // Top 10 most recent
        },
        paymentsMade: {
          total: paymentsMade.length,
          payments: paymentsMade.slice(0, 10), // Top 10 most recent
          totalAmount: this.calculateTotalAmount(paymentsMade)
        },
        summary: {
          totalActivities: activities.length,
          totalExpiring: expiringPolicies.length,
          totalPartialPayments: partialPayments.length,
          activeUsers: Object.keys(userStats.byUser).length,
          totalDailyActivities: teamActivities.length,
          policiesCaptured: policiesCaptured,
          policiesPaid: policiesPaid,
          emailsSent: emailsSent,
          dataUpdates: dataUpdates
        }
      };
      
      console.log('✅ Summary data generated successfully');
      console.log('📋 Team activities in summary:', summaryData.teamActivities?.length || 0);
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
          activeUsers: 0,
          policiesCaptured: 0,
          policiesPaid: 0,
          emailsSent: 0,
          dataUpdates: 0
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
      
      // Use the actividadService directly to get tasks
      const { default: actividadService } = await import('./actividadService');
      
      const startISO = typeof startDate === 'string' ? startDate : startDate.toISOString();
      const endISO = typeof endDate === 'string' ? endDate : endDate.toISOString();
      
      console.log('📅 Querying tasks from', startISO, 'to', endISO);
      
      // Get all tasks from the actividad service
      const allTasks = await actividadService.getAllTasks(false); // Don't use cache
      console.log(`📊 Found ${allTasks.length} total tasks from actividadService`);
      
      // Filter by date range and exclude cancelled - CLEAN VERSION
      const activities = allTasks
        .filter(task => {
          // Solo excluir canceladas, vacías y con status 'deleted'
          return task.status !== 'cancelled' && 
                 task.status !== 'deleted' &&
                 task.title && 
                 task.title.trim() !== '' &&
                 task.description && 
                 task.description.trim() !== '';
        })
        .map(task => ({
          id: task.id,
          userName: task.userName || task.createdBy,
          title: task.title,
          description: task.description,
          status: task.status,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt || task.createdAt
        }))
        // Eliminar duplicados por título, usuario y fecha - MÁS ESTRICTO
        .filter((task, index, array) => {
          const isDuplicate = array.findIndex(t => 
            t.title === task.title && 
            t.userName === task.userName &&
            t.description === task.description &&
            t.createdAt === task.createdAt
          ) !== index;
          
          if (isDuplicate) {
            console.log('🗑️ Removing duplicate:', task.title, 'by', task.userName);
          }
          
          return !isDuplicate;
        });
      
      console.log(`✅ Found ${activities.length} team activities in date range (excluding cancelled)`);
      
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

  /**
   * Get captured policies from activities
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Array of captured policies
   */
  async getCapturedPolicies(startDate, endDate) {
    try {
      console.log('📋 Fetching captured policies...');
      
      const activities = await this.getActivitiesForDateRange(startDate, endDate);
      const capturedActivities = activities.filter(act => act.action === 'data_captured');
      
      console.log(`📊 Found ${capturedActivities.length} captured activities`);
      
      // Get policy details from Firebase using the recordId
      const capturedPolicies = [];
      
      for (const act of capturedActivities) {
        try {
          const recordId = act.details?.recordId;
          const tableName = act.tableName;
          
          if (recordId && tableName) {
            console.log(`🔍 Looking up policy ${recordId} in table ${tableName}`);
            console.log(`📊 Activity details:`, {
              recordId,
              tableName,
              dataPreview: act.details?.dataPreview,
              userName: act.userName
            });
            
            // Get the policy details from Firebase
            const policyDoc = await this.firebaseService.getDocument(tableName, recordId);
            
            if (policyDoc) {
              console.log(`✅ Policy document found:`, {
                numero_poliza: policyDoc.numero_poliza,
                contratante: policyDoc.nombre_contratante || policyDoc.contratante,
                aseguradora: policyDoc.aseguradora,
                ramo: policyDoc.ramo,
                fecha_inicio: policyDoc.fecha_inicio || policyDoc.fecha_inicio_poliza
              });
              
              capturedPolicies.push({
                id: recordId,
                numero_poliza: policyDoc.numero_poliza || act.details?.dataPreview?.[0] || 'N/A',
                contratante: policyDoc.nombre_contratante || policyDoc.contratante || 'N/A',
                aseguradora: policyDoc.aseguradora || 'N/A',
                ramo: policyDoc.ramo || tableName,
                fecha_inicio: policyDoc.fecha_inicio || policyDoc.fecha_inicio_poliza || 'N/A',
                tableName: tableName,
                capturedBy: act.userName,
                capturedAt: act.timestamp,
                fieldCount: act.details?.fieldCount || 0
              });
              console.log(`✅ Added policy details for ${recordId}`);
            } else {
              console.log(`⚠️ Policy ${recordId} not found in ${tableName}, using fallback data`);
              // Fallback to activity data if policy not found
              capturedPolicies.push({
                id: recordId,
                numero_poliza: act.details?.dataPreview?.[0] || 'N/A',
                contratante: 'N/A',
                aseguradora: 'N/A',
                ramo: tableName,
                fecha_inicio: 'N/A',
                tableName: tableName,
                capturedBy: act.userName,
                capturedAt: act.timestamp,
                fieldCount: act.details?.fieldCount || 0
              });
            }
          } else {
            console.log(`⚠️ Missing recordId or tableName for activity:`, act);
          }
        } catch (policyError) {
          console.error(`❌ Error fetching policy details for activity ${act.id}:`, policyError);
          // Fallback to activity data
          capturedPolicies.push({
            id: act.details?.recordId || 'unknown',
            numero_poliza: act.details?.dataPreview?.[0] || 'N/A',
            contratante: 'N/A',
            aseguradora: 'N/A',
            ramo: act.tableName || 'General',
            fecha_inicio: 'N/A',
            tableName: act.tableName,
            capturedBy: act.userName,
            capturedAt: act.timestamp,
            fieldCount: act.details?.fieldCount || 0
          });
        }
      }
      
      console.log(`✅ Found ${capturedPolicies.length} captured policies with details`);
      return capturedPolicies;
    } catch (error) {
      console.error('❌ Error fetching captured policies:', error);
      return [];
    }
  }

  /**
   * Get cancelled policies (both CAP and CFP inactive)
   * @returns {Promise<Array>} Array of cancelled policies
   */
  async getCancelledPolicies() {
    try {
      console.log('📋 Fetching cancelled policies...');
      
      // Get all policies from Firebase
      const allPolicies = await this.reportsService.getAllPolicies();
      
      // Filter policies with BOTH CAP and CFP inactive (truly cancelled)
      const cancelledPolicies = allPolicies.filter(policy => 
        policy.estado_cap === 'Inactivo' && policy.estado_cfp === 'Inactivo'
      ).map(policy => ({
        id: policy.id || policy.firebase_doc_id,
        numero_poliza: policy.numero_poliza,
        contratante: policy.nombre_contratante || policy.contratante,
        aseguradora: policy.aseguradora,
        ramo: policy.ramo || policy.sourceTable,
        estado_cap: policy.estado_cap,
        estado_cfp: policy.estado_cfp,
        fecha_fin: policy.fecha_fin
      }));
      
      console.log(`✅ Found ${cancelledPolicies.length} truly cancelled policies (both CAP and CFP inactive)`);
      return cancelledPolicies;
    } catch (error) {
      console.error('❌ Error fetching cancelled policies:', error);
      return [];
    }
  }

  /**
   * Get payments made from activities
   * @param {Date|string} startDate - Start date
   * @param {Date|string} endDate - End date
   * @returns {Promise<Array>} Array of payments made
   */
  async getPaymentsMade(startDate, endDate) {
    try {
      console.log('📋 Fetching payments made...');
      
      const activities = await this.getActivitiesForDateRange(startDate, endDate);
      
      // Filter payment-related activities
      const paymentActivities = activities.filter(act => 
        (act.action === 'data_updated' && 
         act.details && 
         (act.details.field === 'estado_pago' && act.details.newValue === 'Pagado')) ||
        (act.action === 'data_updated' && 
         act.details && 
         act.details.field === 'primer_pago_realizado' && act.details.newValue === true)
      );
      
      // Get policy details for payments
      const paymentsMade = paymentActivities.map(act => ({
        id: act.details?.recordId || 'unknown',
        numero_poliza: act.details?.dataPreview?.[0] || 'N/A',
        tableName: act.tableName,
        paidBy: act.userName,
        paidAt: act.timestamp,
        paymentType: act.details?.field === 'estado_pago' ? 'Pago Completo' : 'Primer Pago'
      }));
      
      console.log(`✅ Found ${paymentsMade.length} payments made`);
      return paymentsMade;
    } catch (error) {
      console.error('❌ Error fetching payments made:', error);
      return [];
    }
  }
}

// Create and export singleton instance
const activityService = new ActivityService();
export default activityService;

