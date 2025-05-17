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

/**
 * Triggers the birthday email check and send process
 * @returns {Promise<Object>} Result of the operation
 */
export const triggerBirthdayEmails = async () => {
  try {
    console.log('Triggering birthday emails check...');
    const response = await fetch(`${API_URL}/birthday/check-and-send`, {
      method: 'POST'
    });
    
    // Get the full error response
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Server error details:', data);
      throw new Error(data.error || 'Failed to trigger birthday emails');
    }
    
    console.log('Birthday emails triggered successfully:', data);
    return data;
  } catch (error) {
    console.error('Error triggering birthday emails:', error);
    throw error;
  }
}; 