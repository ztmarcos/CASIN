import { extractBirthdayFromRFC, formatBirthday, calculateAge } from '../utils/rfcUtils';

/**
 * Fetches birthday data from the database
 * @returns {Promise<Array>} Array of birthday objects
 */
export const fetchBirthdays = async () => {
  try {
    const response = await fetch('/api/data/gmm');
    if (!response.ok) throw new Error('Failed to fetch data');
    
    const responseData = await response.json();
    const data = responseData.data || []; // Extract the data array from the response
    
    // Process each record to extract birthdays from RFC
    const birthdays = data
      .map(record => {
        const birthdayFromRFC = extractBirthdayFromRFC(record.rfc);
        const explicitBirthday = record.fecha_nacimiento_asegurado 
          ? new Date(record.fecha_nacimiento_asegurado)
          : null;
        
        // Use RFC birthday if explicit birthday is not available or invalid
        const birthday = explicitBirthday && !isNaN(explicitBirthday.getTime())
          ? explicitBirthday
          : birthdayFromRFC;
        
        if (!birthday) return null;
        
        return {
          id: record.id,
          name: record.nombre_del_asegurado,
          date: birthday,
          formattedDate: formatBirthday(birthday),
          age: calculateAge(birthday),
          details: `${record.contratante || ''} - Póliza: ${record.n__mero_de_p__liza || ''}`,
          rfc: record.rfc
        };
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => {
        // Sort by month and day, ignoring year
        const dateA = new Date(new Date().getFullYear(), a.date.getMonth(), a.date.getDate());
        const dateB = new Date(new Date().getFullYear(), b.date.getMonth(), b.date.getDate());
        return dateA - dateB;
      });
    
    return birthdays;
  } catch (error) {
    console.error('Error fetching birthdays:', error);
    throw error;
  }
}; 