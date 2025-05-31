const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Try standard date parsing first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try dd/mm/yyyy format
  if (typeof dateStr === 'string') {
    const parts = dateStr.split('/').map(part => part.trim());
    if (parts.length === 3) {
      const [day, month, year] = parts.map(num => parseInt(num, 10));
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  
  return null;
};

export const formatDate = (date, format = 'long-es') => {
  if (!date) return 'Sin fecha';
  
  const parsedDate = typeof date === 'string' ? parseDate(date) : new Date(date);
  if (!parsedDate || isNaN(parsedDate.getTime())) return 'Fecha inválida';

  const day = parsedDate.getDate();
  const month = parsedDate.getMonth();
  const year = parsedDate.getFullYear();
  const shortYear = year.toString().slice(-2);

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
    default:
      return `${day}/${month + 1}/${year}`;
  }
};

export const getDateFormatOptions = () => [
  { value: 'long-es', label: 'Largo (Español) - 15 de enero 2024' },
  { value: 'long-en', label: 'Largo (English) - 15 January 2024' },
  { value: 'short', label: 'Corto - 15/1/24' },
  { value: 'medium', label: 'Medio - 15/1/2024' },
  { value: 'iso', label: 'ISO - 2024-01-15' }
]; 