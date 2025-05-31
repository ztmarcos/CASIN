import { API_URL } from '../config/api.js';

const API_BASE_URL = API_URL;

export const fetchBirthdays = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/birthday`);
    if (!response.ok) {
      throw new Error('Failed to fetch birthdays');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching birthdays:', error);
    return [];
  }
}; 