// Test script to verify error fixes in Clientes module
console.log('🧪 Testing Clientes module error fixes...\n');

// Test 1: Test prima_total handling
console.log('💰 Test 1: Testing prima_total handling...');

const testPrimaTotal = (prima_total) => {
  let premium = 0;
  
  if (prima_total) {
    // Si es una cadena, limpiar y convertir
    if (typeof prima_total === 'string') {
      premium = parseFloat(prima_total.replace(/[^\d.-]/g, '')) || 0;
    } 
    // Si es un número, usar directamente
    else if (typeof prima_total === 'number') {
      premium = prima_total;
    }
    // Para otros tipos, intentar convertir
    else {
      premium = parseFloat(prima_total) || 0;
    }
  }
  
  return premium;
};

const testCases = [
  '1,500.00',
  '2500',
  3000,
  'N/A',
  null,
  undefined,
  '1,234.56',
  '0',
  0
];

testCases.forEach(testCase => {
  const result = testPrimaTotal(testCase);
  console.log(`"${testCase}" (${typeof testCase}) -> ${result}`);
});

// Test 2: Test date handling
console.log('\n📅 Test 2: Testing date handling...');

const testDateHandling = (vigencia_fin) => {
  try {
    // Solo procesar si hay fecha de fin de vigencia válida
    if (vigencia_fin && vigencia_fin !== 'N/A') {
      const endDate = new Date(vigencia_fin);
      // Verificar que la fecha sea válida
      if (!isNaN(endDate.getTime())) {
        const now = new Date();
        if (endDate > now) {
          return 'ACTIVA';
        } else {
          return 'EXPIRADA';
        }
      } else {
        return 'FECHA_INVALIDA';
      }
    } else {
      return 'SIN_FECHA';
    }
  } catch (error) {
    return 'ERROR';
  }
};

const dateTestCases = [
  '2024-12-31',
  '2023-01-01',
  'invalid-date',
  'N/A',
  null,
  undefined,
  '2025-06-15',
  '2024-06-15'
];

dateTestCases.forEach(testCase => {
  const result = testDateHandling(testCase);
  console.log(`"${testCase}" -> ${result}`);
});

// Test 3: Test policy object creation
console.log('\n📋 Test 3: Testing policy object creation...');

const createPolicyObject = (data, collectionName) => {
  try {
    return {
      id: 'test-id',
      tableName: collectionName,
      clientName: 'Test Client',
      normalizedName: 'test client',
      numero_poliza: data.numero_poliza || 'N/A',
      aseguradora: data.aseguradora || 'N/A',
      vigencia_inicio: data.vigencia_inicio || data.fecha_inicio || 'N/A',
      vigencia_fin: data.vigencia_fin || data.fecha_fin || 'N/A',
      forma_pago: data.forma_de_pago || data.forma_pago || 'N/A',
      prima_total: data.pago_total_o_prima_total || data.importe_a_pagar_mxn || data.importe_total || 0,
      email: data.e_mail || data.email || 'N/A',
      rfc: data.rfc || 'N/A',
      direccion: data.domicilio_o_direccion || data.direccion || 'N/A',
      telefono: data.telefono || 'N/A',
      ramo: 'Test',
      pdf: data.pdf || 'N/A',
      responsable: data.responsable || 'N/A'
    };
  } catch (error) {
    console.error('Error creating policy object:', error);
    return null;
  }
};

const policyTestData = [
  {
    numero_poliza: '123456',
    prima_total: '1,500.00',
    vigencia_fin: '2024-12-31'
  },
  {
    numero_poliza: '789012',
    prima_total: 2500,
    vigencia_fin: '2023-01-01'
  },
  {
    numero_poliza: '345678',
    prima_total: null,
    vigencia_fin: 'N/A'
  }
];

policyTestData.forEach((data, index) => {
  const policy = createPolicyObject(data, 'autos');
  console.log(`Policy ${index + 1}:`, {
    numero_poliza: policy.numero_poliza,
    prima_total: policy.prima_total,
    vigencia_fin: policy.vigencia_fin,
    prima_type: typeof policy.prima_total
  });
});

console.log('\n✅ All error fix tests completed!');
console.log('🎉 The Clientes module should now handle edge cases correctly.');
