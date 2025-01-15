/**
 * Extracts the birthday from an RFC code.
 * RFC format: First 4 letters are name initials, followed by 6 digits (YY/MM/DD), then 3 alphanumeric characters
 * @param {string} rfc - The RFC code to extract birthday from
 * @returns {Date|null} The extracted birthday as a Date object, or null if invalid
 */
export const extractBirthdayFromRFC = (rfc) => {
  if (!rfc) return null;

  // Clean the RFC string (remove dots and spaces)
  const cleanRFC = rfc.replace(/[.\s]/g, '').toUpperCase();

  // RFC should be at least 10 characters (4 letters + 6 digits)
  if (cleanRFC.length < 10) return null;

  // Extract the date portion (positions 4-9)
  const dateStr = cleanRFC.substring(4, 10);
  
  // Extract year, month, and day
  const year = parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1; // JS months are 0-based
  const day = parseInt(dateStr.substring(4, 6));

  // Determine the full year (assuming 20th or 21st century)
  const fullYear = year < 30 ? 2000 + year : 1900 + year;

  // Create and validate the date
  const date = new Date(fullYear, month, day);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) return null;
  
  return date;
};

/**
 * Formats a date as a localized string
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string
 */
export const formatBirthday = (date) => {
  if (!date) return '';
  
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Calculates age from a birthday
 * @param {Date} birthday - The birthday to calculate age from
 * @returns {number} The calculated age
 */
export const calculateAge = (birthday) => {
  if (!birthday) return 0;
  
  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDiff = today.getMonth() - birthday.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
    age--;
  }
  
  return age;
}; 