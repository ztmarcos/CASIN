const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Short month names for DD/MMM/YYYY format
const SHORT_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
];

export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Handle empty strings, null, undefined
  if (typeof dateStr === 'string' && dateStr.trim() === '') return null;
  
  // Handle already parsed Date objects
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  
  // Convert to string for processing
  let str = dateStr.toString().trim();
  if (!str) return null;

  // Strip trailing time (e.g. "07/NOV/2026 12:00 P.M." → "07/NOV/2026")
  str = str.replace(/\s+\d{1,2}:\d{2}\s*(A\.?M\.?|P\.?M\.?)?$/i, '').trim();
  
  // Handle Excel numeric dates (e.g., "45537.99958333333")
  if (str.match(/^\d+\.\d+$/)) {
    try {
      const excelDate = parseFloat(str);
      // Excel dates start from 1900-01-01 (but Excel incorrectly treats 1900 as a leap year)
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
        return date;
      }
    } catch (e) {
      // Continue to other parsing methods
    }
  }
  
  // Handle dates with prefix text: "Hasta las 12 hrs del 09/Ene/2027", "12 hrs del 14/Ene/2027", "Desde las 00:00 del 26/01/2027"
  const delMatch = str.match(/del\s+(\d{1,2}[\/\-]\w+[\/\-]\d{2,4})(?:\s|$)/i) || str.match(/del\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})(?:\s|$)/i);
  if (delMatch) {
    str = delMatch[1];
    if (str !== dateStr.toString().trim()) {
      console.log(`🔧 Extracted date from text: "${dateStr}" → "${str}"`);
    }
  }
  
  // Handle short year format (e.g., "29/08/26" -> "29/08/2026")
  if (str.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2}$/)) {
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3 && parts[2].length === 2) {
      const year = parseInt(parts[2], 10);
      // Assume years 00-50 are 2000-2050, 51-99 are 1951-1999
      const fullYear = year <= 50 ? 2000 + year : 1900 + year;
      str = `${parts[0]}/${parts[1]}/${fullYear}`;
    }
  }
  
  // Try DD-MMM-YYYY format (like "18-Dic-2024")
  if (str.includes('-') && !str.match(/^\d+$/)) {
    const parts = str.split('-').map(part => part.trim());
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      
      // Map Spanish month names to indices (including full names and variations)
      const monthMap = {
        'ene': 0, 'enero': 0, 'jan': 0, 'january': 0,
        'feb': 1, 'febrero': 1, 'february': 1,
        'mar': 2, 'marzo': 2, 'march': 2,
        'abr': 3, 'abril': 3, 'apr': 3, 'april': 3,
        'may': 4, 'mayo': 4,
        'jun': 5, 'junio': 5, 'june': 5,
        'jul': 6, 'julio': 6, 'july': 6,
        'ago': 7, 'agosto': 7, 'aug': 7, 'august': 7,
        'sep': 8, 'septiembre': 8, 'sept': 8, 'september': 8,
        'oct': 9, 'octubre': 9, 'october': 9,
        'nov': 10, 'noviembre': 10, 'november': 10,
        'dic': 11, 'diciembre': 11, 'dec': 11, 'december': 11
      };
      
      const monthIndex = monthMap[monthStr.toLowerCase()];
      if (monthIndex !== undefined && !isNaN(day) && !isNaN(year) && day > 0 && day <= 31 && year > 1900) {
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day) {
          return date;
        }
      }
    }
  }
  
  // Try DD/MMM/YYYY format with Spanish month abbreviations first
  if (str.includes('/')) {
    const parts = str.split('/').map(part => part.trim());
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      
      // Check if middle part is a month abbreviation (Spanish)
      const monthIndex = SHORT_MONTHS.findIndex(month => month === monthStr);
      if (monthIndex !== -1 && !isNaN(day) && !isNaN(year) && day > 0 && day <= 31 && year > 1900) {
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day) {
          return date;
        }
      }
      
      // If not a month abbreviation, try numeric format DD/MM/YYYY
      const month = parseInt(parts[1], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
        // Check if this looks like DD/MM/YYYY (day > 12 or month > 12)
        if (day > 12 || month > 12) {
          // Definitely DD/MM/YYYY format
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === (month - 1) && date.getDate() === day) {
            return date;
          }
        } else {
          // Could be either format, but prioritize DD/MM/YYYY for insurance data
          const date = new Date(year, month - 1, day);
          if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === (month - 1) && date.getDate() === day) {
            return date;
          }
        }
      }
    }
  }
  
  // Try YYYY-MM-DD format (ISO)
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try MM/DD/YYYY format (US format)
  if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parts = str.split('/');
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (month > 0 && month <= 12 && day > 0 && day <= 31 && year > 1900) {
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === (month - 1) && date.getDate() === day) {
        return date;
      }
    }
  }
  
  // Try standard date parsing as fallback (but be more careful)
  try {
    const date = new Date(str);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return date;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  // Log problematic dates for debugging
  console.warn('⚠️ Could not parse date:', str, typeof dateStr);
  return null;
};

export const formatDate = (date, format = 'long-es') => {
  // Handle null, undefined, empty string
  if (date === null || date === undefined) return 'Sin fecha';
  if (typeof date === 'string' && date.trim() === '') return 'Sin fecha';
  
  // Handle different input types
  let parsedDate = null;
  if (typeof date === 'string') {
    parsedDate = parseDate(date);
  } else if (date instanceof Date) {
    parsedDate = date;
  } else {
    // Try to parse as Date object
    try {
      parsedDate = new Date(date);
    } catch (e) {
      console.warn('⚠️ Error parsing date in formatDate:', date, e);
      return 'Sin fecha';
    }
  }
  
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    // For debugging, only show detailed error in development
    if (process.env.NODE_ENV === 'development') {
      const originalValue = typeof date === 'string' ? date : JSON.stringify(date);
      console.warn('⚠️ Invalid date in formatDate:', originalValue);
      return `Fecha inválida (${originalValue.length > 20 ? originalValue.substring(0, 20) + '...' : originalValue})`;
    }
    return 'Sin fecha';
  }

  const day = parsedDate.getDate();
  const month = parsedDate.getMonth();
  const year = parsedDate.getFullYear();
  const shortYear = year.toString().slice(-2);

  // Validate date components
  if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    console.warn('⚠️ Date components out of range:', { day, month, year, originalDate: date });
    return `Fecha inválida (${day}/${month + 1}/${year})`;
  }

  switch (format) {
    case 'long-es':
      return `${day} de ${MESES[month]} ${year}`;
    case 'long-en':
      return `${day} ${MONTHS[month]} ${year}`;
    case 'short':
      return `${day}/${month + 1}/${shortYear}`;
    case 'medium':
      return `${day}/${month + 1}/${year}`;
    case 'iso':
      const monthStr = (month + 1).toString().padStart(2, '0');
      const dayStr = day.toString().padStart(2, '0');
      return `${year}-${monthStr}-${dayStr}`;
    case 'dd-mmm-yyyy':
      return `${day}/${SHORT_MONTHS[month]}/${year}`;
    default:
      return `${day}/${month + 1}/${year}`;
  }
};

// Function to convert DD/MMM/YYYY format to Date object
export const parseDDMMMYYYY = (dateStr) => {
  if (!dateStr) return null;
  
  // Handle DD/MMM/YYYY format (like "31/mar/2025")
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      
      // Find month index
      const monthIndex = SHORT_MONTHS.findIndex(month => month === monthStr);
      if (monthIndex !== -1 && !isNaN(day) && !isNaN(year)) {
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  
  return null;
};

// Function to convert any date format to DD/MMM/YYYY
export const toDDMMMYYYY = (date) => {
  if (!date) return null;
  
  const parsedDate = typeof date === 'string' ? parseDate(date) : new Date(date);
  if (!parsedDate || isNaN(parsedDate.getTime())) return null;
  
  const day = parsedDate.getDate();
  const month = parsedDate.getMonth();
  const year = parsedDate.getFullYear();
  
  return `${day}/${SHORT_MONTHS[month]}/${year}`;
};

export const getDateFormatOptions = () => [
  { value: 'long-es', label: 'Largo (Español) - 15 de enero 2024' },
  { value: 'long-en', label: 'Largo (English) - 15 January 2024' },
  { value: 'short', label: 'Corto - 15/1/24' },
  { value: 'medium', label: 'Medio - 15/1/2024' },
  { value: 'iso', label: 'ISO - 2024-01-15' },
  { value: 'dd-mmm-yyyy', label: 'DD/MMM/YYYY - 31/mar/2025' }
]; 