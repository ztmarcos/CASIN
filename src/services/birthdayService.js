import { extractBirthdayFromRFC, formatBirthday, calculateAge } from '../utils/rfcUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Fetches birthday data from the server
 * @returns {Promise<Array>} Array of birthday objects
 */
export const fetchBirthdays = async () => {
  try {
    const response = await fetch(`${API_URL}/birthday`);
    if (!response.ok) throw new Error('Failed to fetch birthdays');
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching birthdays:', error);
    throw error;
  }
};

/**
 * Triggers the birthday email check and send process
 * @returns {Promise<Object>} Result of the operation
 */
export const triggerBirthdayEmails = async () => {
  try {
    const response = await fetch(`${API_URL}/birthday/check-and-send`, {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to trigger birthday emails');
    }
    return await response.json();
  } catch (error) {
    console.error('Error triggering birthday emails:', error);
    throw error;
  }
}; 