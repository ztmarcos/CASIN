/**
 * Script para eliminar columnas de prueba del sistema
 */

const API_URL = 'http://localhost:3001/api';

async function deleteTestColumns() {
  console.log('🗑️ Iniciando eliminación de columnas de prueba...\n');
  
  const testColumns = ['nueva_columna_test', 'test_column_heroku'];
  const tables = [
    'autos', 'vida', 'gmm', 'rc', 'transporte', 'mascotas', 'diversos', 
    'negocio', 'gruposgmm', 'directorio_contactos', 'hogar'
  ];
  
  let totalDeleted = 0;
  let errors = 0;
  
  for (const tableName of tables) {
    console.log(`📊 Procesando tabla: ${tableName}`);
    
    for (const columnName of testColumns) {
      try {
        console.log(`  🗑️ Eliminando columna: ${columnName}`);
        
        const response = await fetch(`${API_URL}/tables/${tableName}/columns/${columnName}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`    ✅ ${result.message}`);
          totalDeleted++;
        } else {
          const error = await response.json();
          if (response.status === 404) {
            console.log(`    ℹ️ Columna ${columnName} no existe en ${tableName}`);
          } else {
            console.log(`    ❌ Error: ${error.error}`);
            errors++;
          }
        }
        
      } catch (error) {
        console.error(`    💥 Error eliminando ${columnName} de ${tableName}:`, error.message);
        errors++;
      }
      
      // Pequeña pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(''); // Línea en blanco entre tablas
  }
  
  console.log('📋 Resumen:');
  console.log(`  ✅ Columnas eliminadas: ${totalDeleted}`);
  console.log(`  ❌ Errores: ${errors}`);
  
  if (errors === 0) {
    console.log('\n🎉 ¡Todas las columnas de prueba han sido eliminadas exitosamente!');
  } else {
    console.log(`\n⚠️ Se completó con ${errors} errores.`);
  }
}

async function verifyDeletion() {
  console.log('\n🔍 Verificando eliminación...');
  
  try {
    const response = await fetch(`${API_URL}/data/tables/autos/structure`);
    const structure = await response.json();
    
    const testColumnsFound = structure.columns.filter(col => 
      col.name === 'nueva_columna_test' || col.name === 'test_column_heroku'
    );
    
    if (testColumnsFound.length === 0) {
      console.log('✅ Verificación exitosa: No se encontraron columnas de prueba');
    } else {
      console.log('⚠️ Aún se encontraron columnas de prueba:', testColumnsFound.map(c => c.name));
    }
    
  } catch (error) {
    console.error('❌ Error verificando:', error.message);
  }
}

// Ejecutar el script
deleteTestColumns().then(() => {
  return verifyDeletion();
}).then(() => {
  console.log('\n✨ Script completado.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
}); 