const API_URL = 'http://localhost:3001/api';

export const fetchBirthdays = async () => {
  try {
    const response = await fetch(`${API_URL}/birthday`);
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