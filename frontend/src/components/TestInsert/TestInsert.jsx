import React, { useState } from 'react';
import firebaseTableService from '../../services/firebaseTableService';
import { notifyDataInsert } from '../../utils/dataUpdateNotifier';
import { toast } from 'react-hot-toast';

const TestInsert = ({ tableName = 'autos' }) => {
  const [isInserting, setIsInserting] = useState(false);
  const [result, setResult] = useState(null);

  const insertTestData = async () => {
    setIsInserting(true);
    setResult(null);

    try {
      const testData = {
        numero_poliza: `TEST-${Date.now()}`,
        asegurado: 'Cliente de Prueba Animación',
        aseguradora: 'Aseguradora Test',
        fecha_inicio: '2024-01-01',
        fecha_fin: '2025-01-01',
        prima: Math.floor(Math.random() * 10000) + 1000,
        rfc: 'TEST123456789',
        email: 'test@prueba.com'
      };

      console.log('🧪 TEST: Inserting test data:', testData);

      // Step 1: Insert data via Firebase service
      const insertResult = await firebaseTableService.insertData(tableName, testData);
      console.log('🧪 TEST: Insert result:', insertResult);

      // Step 2: Wait a moment for the backend to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Dispatch policyDataUpdated event (simulate PDF parser)
      const policyEvent = new CustomEvent('policyDataUpdated', {
        detail: { table: tableName, shouldCloseModal: true }
      });
      window.dispatchEvent(policyEvent);
      console.log('🧪 TEST: Dispatched policyDataUpdated event');

      // Step 4: Notify via data update notifier
      notifyDataInsert(tableName);
      console.log('🧪 TEST: Called notifyDataInsert');

      setResult({
        success: true,
        message: `Datos insertados exitosamente. ID: ${insertResult.id}`,
        data: testData
      });

      toast.success('¡Test exitoso! Revisa la tabla para ver la nueva fila destacada');

    } catch (error) {
      console.error('🧪 TEST ERROR:', error);
      setResult({
        success: false,
        message: error.message,
        error: error
      });
      toast.error('Test falló: ' + error.message);
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: '#f8f9fa',
      border: '2px solid #007bff',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
        🧪 Test Inserción
      </h4>
      
      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#6c757d' }}>
        Tabla: <strong>{tableName}</strong>
      </p>

      <button
        onClick={insertTestData}
        disabled={isInserting}
        style={{
          background: isInserting ? '#6c757d' : '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '4px',
          cursor: isInserting ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '10px'
        }}
      >
        {isInserting ? '⏳ Insertando...' : '🚀 Test Insert + Animación'}
      </button>

      {result && (
        <div style={{
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          background: result.success ? '#d4edda' : '#f8d7da',
          color: result.success ? '#155724' : '#721c24',
          marginTop: '8px'
        }}>
          <strong>{result.success ? '✅ Éxito:' : '❌ Error:'}</strong>
          <br />
          {result.message}
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '11px', color: '#6c757d' }}>
        Este componente:
        <br />• Inserta datos de prueba
        <br />• Dispara eventos necesarios
        <br />• Debe mostrar fila verde arriba
      </div>
    </div>
  );
};

export default TestInsert; 