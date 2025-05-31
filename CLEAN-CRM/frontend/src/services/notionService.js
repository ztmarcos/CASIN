import { API_URL } from '../config/api.js';

const API_BASE_URL = API_URL.replace('/api', '/api/notion');

export const notionService = {
  async createPage(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/create-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Notion page');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating Notion page:', error);
      throw error;
    }
  },

  async getPages() {
    try {
      const response = await fetch(`${API_BASE_URL}/pages`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Notion pages');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching Notion pages:', error);
      throw error;
    }
  },

  async updatePage(pageId, data) {
    try {
      const response = await fetch(`${API_BASE_URL}/pages/${pageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update Notion page');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating Notion page:', error);
      throw error;
    }
  }
}; 