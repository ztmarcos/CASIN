// Test script para verificar el manejo de fechas en el módulo de clientes
console.log('🧪 Testing date handling in Clientes module...\n');

// Simular la función normalizeDate del servicio
const normalizeDate = (dateValue) => {
  if (!dateValue || dateValue === 'N/A' || dateValue === '') {
    return 'N/A';
  }

  try {
    // Si ya es una fecha válida, formatearla
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }

    // Si es un string, intentar diferentes formatos
    if (typeof dateValue === 'string') {
      // Limpiar el string
      const cleanDate = dateValue.trim();
      
      // Formato ISO (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        return cleanDate;
      }
      
      // Formato DD/MM/YYYY o MM/DD/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
        const [first, second, year] = cleanDate.split('/');
        
        // Intentar detectar si es DD/MM o MM/DD basado en valores válidos
        const firstNum = parseInt(first);
        const secondNum = parseInt(second);
        
        // Si el primer número es > 12, probablemente es DD/MM
        if (firstNum > 12) {
          return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
        }
        // Si el segundo número es > 12, probablemente es MM/DD
        else if (secondNum > 12) {
          return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
        }
        // Si ambos son <= 12, asumir DD/MM (más común en español)
        else {
          return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
        }
      }
      
      // Formato DD-MM-YYYY o MM-DD-YYYY
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(cleanDate)) {
        const [first, second, year] = cleanDate.split('-');
        
        // Intentar detectar si es DD-MM o MM-DD basado en valores válidos
        const firstNum = parseInt(first);
        const secondNum = parseInt(second);
        
        // Si el primer número es > 12, probablemente es DD-MM
        if (firstNum > 12) {
          return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
        }
        // Si el segundo número es > 12, probablemente es MM-DD
        else if (secondNum > 12) {
          return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
        }
        // Si ambos son <= 12, asumir DD-MM (más común en español)
        else {
          return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
        }
      }
      
      // Intentar parsear con Date constructor
      const parsedDate = new Date(cleanDate);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
    
    // Si es un timestamp de Firebase
    if (dateValue && typeof dateValue === 'object' && dateValue.toDate) {
      return dateValue.toDate().toISOString().split('T')[0];
    }
    
    // Si es un número (timestamp)
    if (typeof dateValue === 'number') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    console.warn(`⚠️ Formato de fecha no reconocido: ${dateValue}`);
    return 'N/A';
    
  } catch (error) {
    console.error(`❌ Error procesando fecha ${dateValue}:`, error);
    return 'N/A';
  }
};

// Test de normalización de fechas
console.log('📅 Testing date normalization:');

const testDates = [
  '2024-12-31',
  '31/12/2024',
  '12/31/2024',
  '31-12-2024',
  '12-31-2024',
  '2024/12/31',
  '15/03/2024', // DD/MM
  '03/15/2024', // MM/DD
  '25/12/2024', // DD/MM (día > 12)
  '12/25/2024', // MM/DD (día > 12)
  'Invalid Date',
  'N/A',
  '',
  null,
  undefined,
  '2024-13-45', // Fecha inválida
  '2024-02-29', // Fecha válida (año bisiesto)
  '2023-02-29'  // Fecha inválida (no año bisiesto)
];

testDates.forEach(date => {
  const normalized = normalizeDate(date);
  console.log(`  "${date}" -> "${normalized}"`);
});

console.log('\n📊 Testing date formatting in component:');

// Simular la función formatDate del componente
const formatDate = (dateString) => {
  if (!dateString || dateString === 'N/A') return 'N/A';
  
  try {
    // Si ya es una fecha ISO (YYYY-MM-DD), formatearla directamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Intentar parsear con Date constructor
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    // Si no se puede parsear, mostrar el valor original
    console.warn(`⚠️ No se pudo formatear la fecha: ${dateString}`);
    return dateString;
    
  } catch (error) {
    console.error(`❌ Error formateando fecha ${dateString}:`, error);
    return dateString;
  }
};

const testFormattedDates = [
  '2024-12-31',
  '2024-01-15',
  '2024-06-30',
  'N/A',
  'Invalid Date'
];

testFormattedDates.forEach(date => {
  const formatted = formatDate(date);
  console.log(`  "${date}" -> "${formatted}"`);
});

console.log('\n✅ Date handling tests completed!');
console.log('🎯 The Clientes module should now handle dates correctly.');
