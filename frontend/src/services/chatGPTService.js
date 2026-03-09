import { API_URL } from '../config/api.js';

class ChatGPTService {
  constructor() {
    this.apiUrl = API_URL;
  }

  /**
   * Send a message to the ChatGPT service with full database access
   * @param {string} message - The user's message
   * @param {Object} context - Additional context (teamId, userId, userEmail)
   * @returns {Promise<Object>} Response from GPT with message and metadata
   */
  async sendMessage(message, context = {}) {
    try {
      console.log('🤖 Sending message to ChatGPT service:', { message, context });

      const response = await fetch(`${this.apiUrl}/chat-gpt/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: {
            teamId: context.teamId,
            userId: context.userId,
            userEmail: context.userEmail,
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get response from ChatGPT');
      }

      console.log('✅ ChatGPT response received:', result);
      return result;

    } catch (error) {
      console.error('❌ Error sending message to ChatGPT:', error);
      throw error;
    }
  }

  /**
   * Get available database collections and their schemas
   * @param {string} teamId - Team ID for context
   * @returns {Promise<Object>} Available collections and their structure
   */
  async getDatabaseSchema(teamId) {
    try {
      const response = await fetch(`${this.apiUrl}/chat-gpt/schema${teamId ? `?team=${encodeURIComponent(teamId)}` : ''}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ Error fetching database schema:', error);
      throw error;
    }
  }

  /**
   * Query specific data from Firebase collections
   * @param {string} collection - Collection name
   * @param {Object} filters - Query filters
   * @param {string} teamId - Team ID for context
   * @returns {Promise<Object>} Query results
   */
  async queryData(collection, filters = {}, teamId) {
    try {
      const response = await fetch(`${this.apiUrl}/chat-gpt/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          collection,
          filters,
          teamId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ Error querying data:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for the current user
   * @param {string} userId - User ID
   * @param {number} limit - Number of messages to retrieve
   * @returns {Promise<Array>} Conversation history
   */
  async getConversationHistory(userId, limit = 50) {
    try {
      const response = await fetch(`${this.apiUrl}/chat-gpt/history?userId=${encodeURIComponent(userId)}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.history || [];

    } catch (error) {
      console.error('❌ Error fetching conversation history:', error);
      return [];
    }
  }

  /**
   * Clear conversation history for the current user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Success response
   */
  async clearHistory(userId) {
    try {
      const response = await fetch(`${this.apiUrl}/chat-gpt/history`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ Error clearing conversation history:', error);
      throw error;
    }
  }

  /**
   * Get system stats and capabilities
   * @returns {Promise<Object>} System information
   */
  async getSystemInfo() {
    try {
      const response = await fetch(`${this.apiUrl}/chat-gpt/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ Error fetching system info:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const chatGPTService = new ChatGPTService();
export default chatGPTService;