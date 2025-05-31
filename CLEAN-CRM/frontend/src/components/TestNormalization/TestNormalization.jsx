import React, { useState } from 'react';
import tableService from '../../services/data/tableService';

const TestNormalization = () => {
  const [testText, setTestText] = useState('');
  const [fieldType, setFieldType] = useState('general');
  const [normalizedText, setNormalizedText] = useState('');
  const [testTableData, setTestTableData] = useState({
    nombre_contratante: 'JUAN PÉREZ LÓPEZ DE LA CRUZ',
    direccion: 'AV. INSURGENTES SUR NO. 123 COL. DEL VALLE',
    aseguradora: 'Grupo Nacional Provincial S.A.B.',
    rfc: ' XEXX010101000 ',
    email: 'juan@example.com'
  });
  const [autoNormalizationResult, setAutoNormalizationResult] = useState(null);

  const handleNormalize = () => {
    const normalized = tableService.normalizeText(testText, fieldType);
    setNormalizedText(normalized);
  };

  const testAutoNormalization = () => {
    console.log('🧪 Testing automatic normalization...');
    
    // Simulate the normalization process that happens in insertData
    const result = {};
    
    Object.entries(testTableData).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim() !== '') {
        console.log(`🔄 Auto-normalizing field "${key}" with value: "${value}"`);
        
        // Determine field type based on column name (same logic as in insertData)
        const columnName = key.toLowerCase();
        let normalizedValue;
        
        if (columnName.includes('rfc')) {
          normalizedValue = tableService.normalizeText(value, 'rfc');
        } else if (columnName.includes('nombre') || columnName.includes('contratante') || 
                  columnName.includes('propietario') || columnName.includes('agente') ||
                  columnName.includes('responsable') || columnName.includes('beneficiario')) {
          normalizedValue = tableService.normalizeText(value, 'name');
        } else if (columnName.includes('direccion') || columnName.includes('domicilio') || 
                  columnName.includes('ubicacion') || columnName.includes('origen') ||
                  columnName.includes('destino')) {
          normalizedValue = tableService.normalizeText(value, 'address');
        } else if (columnName.includes('aseguradora') || columnName.includes('compania') ||
                  columnName.includes('empresa')) {
          normalizedValue = tableService.normalizeText(value, 'general');
        } else {
          // Apply general normalization for other text fields
          normalizedValue = tableService.normalizeText(value, 'general');
        }
        
        result[key] = {
          original: value,
          normalized: normalizedValue,
          changed: value !== normalizedValue
        };
        
        console.log(`✅ Normalized "${key}": "${value}" → "${normalizedValue}"`);
      } else {
        result[key] = {
          original: value,
          normalized: value,
          changed: false
        };
      }
    });
    
    setAutoNormalizationResult(result);
  };

  const testCases = [
    {
      type: 'name',
      input: 'JUAN PÉREZ LÓPEZ DE LA CRUZ',
      expected: 'Juan Pérez López de la Cruz'
    },
    {
      type: 'name',
      input: 'MARÍA DEL CARMEN GONZÁLEZ Y HERNÁNDEZ',
      expected: 'María del Carmen González y Hernández'
    },
    {
      type: 'address',
      input: 'AV. INSURGENTES SUR NO. 123 COL. DEL VALLE',
      expected: 'Avenida Insurgentes Sur Número 123 Colonia del Valle'
    },
    {
      type: 'general',
      input: 'Grupo Nacional Provincial S.A.B.',
      expected: 'GNP'
    },
    {
      type: 'general',
      input: 'GRUPO NACIÓN APROVINCIAL',
      expected: 'GNP'
    },
    {
      type: 'rfc',
      input: ' XEXX010101000 ',
      expected: 'XEXX010101000'
    }
  ];

  const runAllTests = () => {
    console.log('🧪 Running normalization tests...');
    
    testCases.forEach((testCase, index) => {
      const result = tableService.normalizeText(testCase.input, testCase.type);
      const passed = result === testCase.expected;
      
      console.log(`Test ${index + 1} (${testCase.type}):`, {
        input: testCase.input,
        expected: testCase.expected,
        result: result,
        passed: passed ? '✅' : '❌'
      });
    });
  };

  const handleTestDataChange = (field, value) => {
    setTestTableData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>🔧 Text Normalization Tester</h2>
      
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '8px' }}>
        <h3>🔄 Automatic Normalization Test</h3>
        <p>This simulates what happens when data is inserted into the database. All text fields are automatically normalized based on their column names.</p>
        
        <div style={{ marginBottom: '15px' }}>
          <h4>Test Data (edit to test different values):</h4>
          {Object.entries(testTableData).map(([field, value]) => (
            <div key={field} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ minWidth: '150px', fontWeight: 'bold' }}>{field}:</label>
              <input
                type="text"
                value={value}
                onChange={(e) => handleTestDataChange(field, e.target.value)}
                style={{ 
                  flex: 1,
                  padding: '8px', 
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </div>
          ))}
        </div>
        
        <button 
          onClick={testAutoNormalization}
          style={{
            padding: '10px 20px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          🔄 Test Auto-Normalization
        </button>
        
        {autoNormalizationResult && (
          <div style={{ marginTop: '20px' }}>
            <h4>Results:</h4>
            {Object.entries(autoNormalizationResult).map(([field, result]) => (
              <div key={field} style={{ 
                marginBottom: '10px', 
                padding: '10px', 
                backgroundColor: result.changed ? '#fef3c7' : '#f3f4f6',
                border: `1px solid ${result.changed ? '#f59e0b' : '#d1d5db'}`,
                borderRadius: '4px'
              }}>
                <strong>{field}:</strong>
                <div style={{ marginLeft: '10px' }}>
                  <div>Original: "{result.original}"</div>
                  <div>Normalized: "{result.normalized}"</div>
                  <div style={{ color: result.changed ? '#059669' : '#6b7280' }}>
                    {result.changed ? '✅ Changed' : '⚪ No change needed'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Manual Test</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>Field Type: </label>
          <select 
            value={fieldType} 
            onChange={(e) => setFieldType(e.target.value)}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value="general">General</option>
            <option value="name">Name</option>
            <option value="address">Address</option>
            <option value="rfc">RFC</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label>Input Text: </label>
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter text to normalize..."
            style={{ 
              marginLeft: '10px', 
              padding: '8px', 
              width: '300px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <button 
          onClick={handleNormalize}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Normalize
        </button>
        
        {normalizedText && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#f0f9ff', 
            border: '1px solid #0ea5e9',
            borderRadius: '4px'
          }}>
            <strong>Result:</strong> {normalizedText}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Predefined Test Cases</h3>
        <button 
          onClick={runAllTests}
          style={{
            padding: '8px 16px',
            backgroundColor: '#10B981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '15px'
          }}
        >
          Run All Tests (Check Console)
        </button>
        
        <div style={{ fontSize: '14px' }}>
          {testCases.map((testCase, index) => (
            <div key={index} style={{ 
              marginBottom: '8px', 
              padding: '8px', 
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '4px'
            }}>
              <strong>{testCase.type}:</strong> "{testCase.input}" → "{testCase.expected}"
            </div>
          ))}
        </div>
      </div>

      <div style={{ 
        padding: '15px', 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffeaa7',
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <h4>📋 Normalization Rules:</h4>
        <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
          <li><strong>Names:</strong> Convert to Title Case, keep "de", "del", "la", "y" in lowercase</li>
          <li><strong>Addresses:</strong> Standardize abbreviations (Av. → Avenida, Col. → Colonia, etc.)</li>
          <li><strong>Companies:</strong> Normalize GNP variations to "GNP"</li>
          <li><strong>RFC:</strong> Only uppercase and trim spaces</li>
          <li><strong>General:</strong> Clean spaces, normalize quotes, apply company rules</li>
        </ul>
        
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d1fae5', border: '1px solid #10b981', borderRadius: '4px' }}>
          <strong>🔄 Auto-Normalization is now ACTIVE!</strong>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>
            All new data added to the database (via Add Entry, CSV Import, etc.) will be automatically normalized based on column names. No manual action required!
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestNormalization; 