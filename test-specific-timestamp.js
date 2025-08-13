// Test específico para el valor 458924375 mencionado por el usuario

console.log('🧪 Testing specific timestamp: 458924375\n');

// Función para convertir timestamps de Excel/Google Sheets a fecha
function convertExcelTimestamp(timestamp) {
  if (typeof timestamp !== 'number') return null;
  
  // Excel/Google Sheets timestamps son días desde 1900-01-01
  const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  
  const date = new Date(excelEpoch.getTime() + (timestamp * millisecondsPerDay));
  
  if (isNaN(date.getTime())) return null;
  return date;
}

// Función para detectar si un valor es un timestamp de Excel/Google Sheets
function isExcelTimestamp(value) {
  if (typeof value !== 'number') return false;
  return value >= 1 && value <= 100000;
}

// Función para normalizar fechas (simulando el servicio)
function normalizeDate(dateValue) {
  if (!dateValue || dateValue === 'N/A' || dateValue === '') {
    return 'N/A';
  }

  try {
    // Si ya es una fecha válida
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }

    // Si es un timestamp de Excel/Google Sheets (1-100000)
    if (typeof dateValue === 'number') {
      if (dateValue >= 1 && dateValue <= 100000) {
        console.log(`🔧 Detectado posible timestamp de Excel/Google Sheets: ${dateValue}`);
        
        const excelEpoch = new Date(1899, 11, 30);
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        const date = new Date(excelEpoch.getTime() + (dateValue * millisecondsPerDay));
        
        if (!isNaN(date.getTime())) {
          const result = date.toISOString().split('T')[0];
          console.log(`✅ Timestamp Excel convertido: ${dateValue} -> ${result}`);
          return result;
        }
      }
      
      // Si es un timestamp Unix (segundos desde 1970) - típicamente 10 dígitos
      if (dateValue >= 1000000000 && dateValue <= 9999999999) {
        console.log(`🔧 Detectado posible timestamp Unix (segundos): ${dateValue}`);
        const date = new Date(dateValue * 1000);
        if (!isNaN(date.getTime())) {
          const result = date.toISOString().split('T')[0];
          console.log(`✅ Timestamp Unix (segundos) convertido: ${dateValue} -> ${result}`);
          return result;
        }
      }
      
      // Si es un timestamp Unix en milisegundos - típicamente 13 dígitos
      if (dateValue >= 1000000000000 && dateValue <= 9999999999999) {
        console.log(`🔧 Detectado posible timestamp Unix (milisegundos): ${dateValue}`);
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          const result = date.toISOString().split('T')[0];
          console.log(`✅ Timestamp Unix (milisegundos) convertido: ${dateValue} -> ${result}`);
          return result;
        }
      }
      
      // Para otros números grandes que podrían ser fechas (como 458924375)
      if (dateValue > 100000) {
        console.log(`🔧 Detectado número grande que podría ser fecha: ${dateValue}`);
        
        // Intentar como timestamp Unix en segundos
        let date = new Date(dateValue * 1000);
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1970 && date.getFullYear() <= 2030) {
          const result = date.toISOString().split('T')[0];
          console.log(`✅ Número grande convertido como timestamp Unix (segundos): ${dateValue} -> ${result}`);
          return result;
        }
        
        // Intentar como timestamp Unix en milisegundos
        date = new Date(dateValue);
        if (!isNaN(date.getTime()) && date.getFullYear() >= 1970 && date.getFullYear() <= 2030) {
          const result = date.toISOString().split('T')[0];
          console.log(`✅ Número grande convertido como timestamp Unix (milisegundos): ${dateValue} -> ${result}`);
          return result;
        }
        
        console.warn(`⚠️ Número grande no pudo ser convertido a fecha válida: ${dateValue}`);
      }
    }
    
    return 'N/A';
    
  } catch (error) {
    console.error(`❌ Error procesando fecha ${dateValue}:`, error);
    return 'N/A';
  }
}

// Test del valor específico
const testValue = 458924375;

console.log(`🔍 Analizando valor: ${testValue}`);
console.log(`📊 Tipo: ${typeof testValue}`);
console.log(`📊 Dígitos: ${testValue.toString().length}`);

// Verificar si es timestamp Excel
if (isExcelTimestamp(testValue)) {
  console.log(`✅ Es timestamp de Excel/Google Sheets`);
  const excelDate = convertExcelTimestamp(testValue);
  if (excelDate) {
    console.log(`📅 Fecha Excel: ${excelDate.toISOString().split('T')[0]}`);
  }
} else {
  console.log(`❌ NO es timestamp de Excel/Google Sheets`);
}

// Verificar como timestamp Unix en segundos
const unixSecondsDate = new Date(testValue * 1000);
console.log(`📅 Como timestamp Unix (segundos): ${unixSecondsDate.toISOString().split('T')[0]}`);
console.log(`📅 Año resultante: ${unixSecondsDate.getFullYear()}`);

// Verificar como timestamp Unix en milisegundos
const unixMillisDate = new Date(testValue);
console.log(`📅 Como timestamp Unix (milisegundos): ${unixMillisDate.toISOString().split('T')[0]}`);
console.log(`📅 Año resultante: ${unixMillisDate.getFullYear()}`);

// Usar la función normalizeDate
console.log('\n🎯 Usando función normalizeDate:');
const normalized = normalizeDate(testValue);
console.log(`📅 Resultado normalizado: ${normalized}`);

console.log('\n✅ Test completado!');
