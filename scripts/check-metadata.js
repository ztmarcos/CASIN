/**
 * Script para verificar el estado de los metadatos de Firebase
 */

const API_URL = 'http://localhost:3001/api';

async function checkMetadata() {
  console.log('🔍 Verificando metadatos de Firebase...\n');
  
  try {
    // Hacer una llamada directa al endpoint para obtener metadatos
    // Como no hay endpoint directo, vamos a hacer una eliminación simulada para ver si los metadatos existen
    const response = await fetch(`${API_URL}/data/tables/autos/structure`);
    const structure = await response.json();
    
    console.log('📊 Estructura actual de la tabla autos:');
    console.log(`Total columnas: ${structure.columns.length}`);
    
    // Buscar columnas de prueba
    const testColumns = structure.columns.filter(col => 
      col.name === 'nueva_columna_test' || col.name === 'test_column_heroku'
    );
    
    if (testColumns.length > 0) {
      console.log('\n❌ Columnas de prueba aún presentes:');
      testColumns.forEach(col => {
        console.log(`  - ${col.name} (${col.type}) - isCustom: ${col.isCustom}`);
      });
    } else {
      console.log('\n✅ No se encontraron columnas de prueba');
    }
    
    // Mostrar solo columnas custom
    const customColumns = structure.columns.filter(col => col.isCustom);
    console.log('\n🔧 Columnas personalizadas encontradas:');
    if (customColumns.length > 0) {
      customColumns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    } else {
      console.log('  (ninguna)');
    }
    
  } catch (error) {
    console.error('❌ Error verificando metadatos:', error.message);
  }
}

// Test específico para verificar eliminación
async function testColumnDeletion() {
  console.log('\n🧪 Probando eliminación de columna específica...');
  
  try {
    const response = await fetch(`${API_URL}/tables/autos/columns/nueva_columna_test`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const result = await response.json();
    console.log('Respuesta de eliminación:', result);
    
    // Verificar estructura después de eliminación
    const structureResponse = await fetch(`${API_URL}/data/tables/autos/structure`);
    const structure = await structureResponse.json();
    
    const stillExists = structure.columns.some(col => col.name === 'nueva_columna_test');
    console.log(`¿Columna nueva_columna_test aún existe? ${stillExists ? 'SÍ ❌' : 'NO ✅'}`);
    
  } catch (error) {
    console.error('❌ Error en test de eliminación:', error.message);
  }
}

// Ejecutar verificaciones
checkMetadata().then(() => {
  return testColumnDeletion();
}).then(() => {
  console.log('\n✨ Verificación completada.');
}).catch(error => {
  console.error('💥 Error fatal:', error);
}); 