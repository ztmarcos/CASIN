import { extractBirthdayFromRFC, formatBirthday, calculateAge } from '../utils/rfcUtils';

const API_URL = 'http://localhost:3001/api';

/**
 * Fetches birthday data from the server
 * @returns {Promise<Array>} Array of birthday objects
 */
export const fetchBirthdays = async () => {
  try {
    console.log('Fetching birthdays from:', `${API_URL}/birthday`);
    const response = await fetch(`${API_URL}/birthday`);
    if (!response.ok) throw new Error('Failed to fetch birthdays');
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching birthdays:', error);
    throw error;
  }
}; 