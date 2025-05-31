import { API_URL } from '../config/api.js';

const API_BASE_URL = API_URL.replace('/api', '/api/prospeccion');

export const prospeccionService = {
  async generateProspect(data) {
    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate prospect');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating prospect:', error);
      throw error;
    }
  },

  async analyzeProspect(prospectData) {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prospectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze prospect');
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing prospect:', error);
      throw error;
    }
  },

  async getProspects(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`${API_BASE_URL}/prospects?${queryParams}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prospects');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching prospects:', error);
      throw error;
    }
  },

  async updateProspect(prospectId, data) {
    try {
      const response = await fetch(`${API_BASE_URL}/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update prospect');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating prospect:', error);
      throw error;
    }
  }
}; 