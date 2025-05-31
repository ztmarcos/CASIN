import { API_URL } from '../config/api.js';

const API_BASE_URL = API_URL.replace('/api', '/api/gpt');

export const gptService = {
  async generateResponse(prompt, context = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          context,
          model: 'gpt-4o-mini'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate GPT response');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating GPT response:', error);
      throw error;
    }
  },

  async analyzeData(data, analysisType = 'general') {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          analysisType,
          model: 'gpt-4o-mini'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze data');
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing data:', error);
      throw error;
    }
  },

  async generateInsights(tableData, tableName) {
    try {
      const response = await fetch(`${API_BASE_URL}/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableData,
          tableName,
          model: 'gpt-4o-mini'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate insights');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating insights:', error);
      throw error;
    }
  }
}; 