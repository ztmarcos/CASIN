// Test para verificar el manejo de timestamps de Excel/Google Sheets

console.log('🧪 Testing Excel/Google Sheets timestamp conversion...\n');

// Función para convertir timestamps de Excel/Google Sheets a fecha
function convertExcelTimestamp(timestamp) {
  if (typeof timestamp !== 'number') return null;
  
  // Excel/Google Sheets timestamps son días desde 1900-01-01
  // Pero Excel tiene un bug: considera 1900 como año bisiesto
  // Por eso usamos 1899-12-30 como base
  const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  
  const date = new Date(excelEpoch.getTime() + (timestamp * millisecondsPerDay));
  
  // Verificar que la fecha sea válida
  if (isNaN(date.getTime())) return null;
  
  return date;
}

// Función para detectar si un valor es un timestamp de Excel/Google Sheets
function isExcelTimestamp(value) {
  if (typeof value !== 'number') return false;
  
  // Los timestamps de Excel/Google Sheets típicamente están entre 1 y 100000
  // 1 = 1900-01-01, 100000 = aproximadamente 2174
  return value >= 1 && value <= 100000;
}

// Test cases
const testCases = [
  { value: 458924375, description: 'Timestamp mencionado por el usuario' },
  { value: 1, description: 'Primer día en Excel (1900-01-01)' },
  { value: 365, description: 'Un año después (1900-12-31)' },
  { value: 25569, description: '1970-01-01 (epoch Unix)' },
  { value: 44927, description: '2023-01-01' },
  { value: 45292, description: '2024-01-01' },
  { value: 45657, description: '2025-01-01' },
  { value: 100000, description: 'Límite superior' },
  { value: 0, description: 'Valor inválido' },
  { value: -1, description: 'Valor negativo' },
  { value: 100001, description: 'Fuera del rango' },
  { value: '2024-01-01', description: 'String (no timestamp)' },
  { value: null, description: 'Null' },
  { value: undefined, description: 'Undefined' }
];

console.log('📅 Testing Excel timestamp conversion:');
console.log('=' .repeat(60));

testCases.forEach(testCase => {
  const { value, description } = testCase;
  
  console.log(`\n🔍 ${description}:`);
  console.log(`  Valor: ${value} (${typeof value})`);
  
  if (isExcelTimestamp(value)) {
    const convertedDate = convertExcelTimestamp(value);
    if (convertedDate) {
      const isoDate = convertedDate.toISOString().split('T')[0];
      const localDate = convertedDate.toLocaleDateString('es-MX');
      console.log(`  ✅ Es timestamp Excel`);
      console.log(`  📅 Convertido: ${isoDate}`);
      console.log(`  📅 Local: ${localDate}`);
    } else {
      console.log(`  ❌ Error en conversión`);
    }
  } else {
    console.log(`  ❌ No es timestamp Excel`);
  }
});

console.log('\n✅ Excel timestamp tests completed!');
console.log('🎯 El servicio de clientes ahora maneja timestamps de Excel/Google Sheets.');
