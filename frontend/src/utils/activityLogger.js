import { API_URL } from '../config/api.js';

/**
 * Activity Logger Utility
 * Centralized service for logging user activities to Firebase
 */

class ActivityLogger {
  constructor() {
    this.pendingLogs = [];
    this.isSending = false;
  }

  /**
   * Get current user info from localStorage
   */
  getCurrentUser() {
    try {
      const userEmail = localStorage.getItem('userEmail');
      const userName = localStorage.getItem('userName');
      const userUid = localStorage.getItem('userUid');
      
      // Try to get from user object if individual keys not found
      if (!userEmail) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          return {
            userId: user.uid || 'unknown',
            userEmail: user.email || 'unknown',
            userName: user.name || user.displayName || 'Unknown User'
          };
        }
      }
      
      return {
        userId: userUid || 'unknown',
        userEmail: userEmail || 'unknown',
        userName: userName || 'Unknown User'
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return {
        userId: 'unknown',
        userEmail: 'unknown',
        userName: 'Unknown User'
      };
    }
  }

  /**
   * Log an activity to Firebase
   * @param {string} action - Type of activity (email_sent, data_captured, etc.)
   * @param {string} tableName - Affected table/collection
   * @param {object} details - Additional context
   * @param {object} metadata - Extra information
   */
  async logActivity(action, tableName = null, details = {}, metadata = {}) {
    try {
      const user = this.getCurrentUser();
      
      const activityLog = {
        timestamp: new Date().toISOString(),
        userId: user.userId,
        userEmail: user.userEmail,
        userName: user.userName,
        action: action,
        tableName: tableName,
        details: details,
        metadata: metadata
      };

      console.log('📝 Logging activity:', activityLog);

      // Send to backend to store in Firebase
      const response = await fetch(`${API_URL}/activity-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityLog)
      });

      if (!response.ok) {
        throw new Error(`Failed to log activity: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Activity logged successfully:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      // Don't throw - activity logging should not break main functionality
      return null;
    }
  }

  /**
   * Log email sent activity
   */
  async logEmailSent(recipientEmail, subject, tableName = null, metadata = {}) {
    return this.logActivity(
      'email_sent',
      tableName,
      {
        recipientEmail,
        subject,
        sentAt: new Date().toISOString()
      },
      metadata
    );
  }

  /**
   * Log data capture activity
   */
  async logDataCapture(tableName, recordId = null, data = {}) {
    return this.logActivity(
      'data_captured',
      tableName,
      {
        recordId,
        fieldCount: Object.keys(data).length,
        capturedAt: new Date().toISOString()
      },
      {
        dataPreview: Object.keys(data).slice(0, 5) // Log first 5 field names
      }
    );
  }

  /**
   * Log data update activity
   */
  async logDataUpdate(tableName, recordId, field, oldValue, newValue) {
    return this.logActivity(
      'data_updated',
      tableName,
      {
        recordId,
        field,
        oldValue: String(oldValue).substring(0, 100), // Limit length
        newValue: String(newValue).substring(0, 100),
        updatedAt: new Date().toISOString()
      }
    );
  }

  /**
   * Log data deletion activity
   */
  async logDataDeletion(tableName, recordId, metadata = {}) {
    return this.logActivity(
      'data_deleted',
      tableName,
      {
        recordId,
        deletedAt: new Date().toISOString()
      },
      metadata
    );
  }

  /**
   * Log PDF analysis activity
   */
  async logPDFAnalysis(tableName, fieldsExtracted, metadata = {}) {
    return this.logActivity(
      'pdf_analyzed',
      tableName,
      {
        fieldsExtracted,
        analyzedAt: new Date().toISOString()
      },
      metadata
    );
  }

  /**
   * Log report generation activity
   */
  async logReportGeneration(reportType, recordCount, metadata = {}) {
    return this.logActivity(
      'report_generated',
      null,
      {
        reportType,
        recordCount,
        generatedAt: new Date().toISOString()
      },
      metadata
    );
  }

  /**
   * Log user login activity
   */
  async logLogin() {
    return this.logActivity(
      'user_login',
      null,
      {
        loginAt: new Date().toISOString()
      }
    );
  }

  /**
   * Log user logout activity
   */
  async logLogout() {
    return this.logActivity(
      'user_logout',
      null,
      {
        logoutAt: new Date().toISOString()
      }
    );
  }

  /**
   * Log daily activity entry
   */
  async logDailyActivity(activityTitle, activityDescription, metadata = {}) {
    return this.logActivity(
      'daily_activity',
      null,
      {
        title: activityTitle,
        description: activityDescription,
        createdAt: new Date().toISOString()
      },
      metadata
    );
  }
}

// Create and export singleton instance
const activityLogger = new ActivityLogger();
export default activityLogger;

