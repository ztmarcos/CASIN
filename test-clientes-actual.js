// Script para verificar que los cambios en el manejo de fechas se aplican en el módulo de clientes

console.log('🧪 Verificando cambios en el módulo de clientes...\n');

// Simular la función normalizeDate del servicio actualizado
function normalizeDate(dateValue) {
  if (!dateValue || dateValue === 'N/A' || dateValue === '') {
    return 'N/A';
  }

  try {
    // Si ya es una fecha válida, formatearla
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }

    // Si es un timestamp de Excel/Google Sheets (números como 458924375)
    if (typeof dateValue === 'number') {
      // Detectar si es un timestamp de Excel/Google Sheets (1-100000)
      if (dateValue >= 1 && dateValue <= 100000) {
        console.log(`🔧 Detectado posible timestamp de Excel/Google Sheets: ${dateValue}`);
        
        // Convertir timestamp de Excel a fecha
        const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
        const millisecondsPerDay = 24 * 60 * 60 * 1000;
        
        const date = new Date(excelEpoch.getTime() + (dateValue * millisecondsPerDay));
        
        if (!isNaN(date.getTime())) {
          const result = date.toISOString().split('T')[0];
          console.log(`✅ Timestamp Excel convertido: ${dateValue} -> ${result}`);
          return result;
        } else {
          console.warn(`⚠️ Timestamp Excel inválido: ${dateValue}`);
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
    
    console.warn(`⚠️ Formato de fecha no reconocido: ${dateValue} (tipo: ${typeof dateValue})`);
    return 'N/A';
    
  } catch (error) {
    console.error(`❌ Error procesando fecha ${dateValue}:`, error);
    return 'N/A';
  }
}

// Simular la función formatDate del componente actualizado
function formatDate(dateString) {
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
}

// Test cases para verificar que los cambios funcionan
console.log('📅 Testing date handling in Clientes module:');
console.log('=' .repeat(60));

const testCases = [
  { 
    input: 458924375, 
    description: 'Timestamp Unix mencionado por el usuario',
    expected: '1984-07-17'
  },
  { 
    input: 45292, 
    description: 'Timestamp Excel (2024-01-01)',
    expected: '2024-01-01'
  },
  { 
    input: '31/12/2024', 
    description: 'Fecha DD/MM/YYYY',
    expected: '2024-12-31'
  },
  { 
    input: '12/31/2024', 
    description: 'Fecha MM/DD/YYYY',
    expected: '2024-12-31'
  },
  { 
    input: '2024-12-31', 
    description: 'Fecha ISO',
    expected: '2024-12-31'
  },
  { 
    input: undefined, 
    description: 'Valor undefined',
    expected: 'N/A'
  },
  { 
    input: null, 
    description: 'Valor null',
    expected: 'N/A'
  },
  { 
    input: '', 
    description: 'String vacío',
    expected: 'N/A'
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.description}:`);
  console.log(`   Input: ${testCase.input} (${typeof testCase.input})`);
  
  const normalized = normalizeDate(testCase.input);
  const formatted = formatDate(normalized);
  
  console.log(`   Normalizado: ${normalized}`);
  console.log(`   Formateado: ${formatted}`);
  
  if (normalized === testCase.expected) {
    console.log(`   ✅ PASS - Resultado correcto`);
  } else {
    console.log(`   ❌ FAIL - Esperado: ${testCase.expected}, Obtenido: ${normalized}`);
  }
});

console.log('\n🎯 Verificación de cambios completada!');
console.log('📋 Los cambios deberían estar reflejándose en el directorio de clientes.');
console.log('🌐 Abre http://localhost:5174/clientes para verificar en el navegador.');
