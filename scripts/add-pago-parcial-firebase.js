/**
 * Script para agregar la columna "pago_parcial" a todas las tablas en Firebase
 * Utiliza el sistema de metadatos para agregar columnas virtuales
 */

const admin = require('firebase-admin');
const path = require('path');

// Configurar Firebase Admin
const serviceAccount = require('../casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Lista de colecciones principales de seguros
const INSURANCE_COLLECTIONS = [
  'autos',
  'vida', 
  'gmm',
  'hogar',
  'rc', // responsabilidad civil
  'transporte',
  'mascotas',
  'diversos',
  'negocio',
  'gruposgmm',
  'directorio_contactos'
];

async function addPagoParcialToAllTables() {
  console.log('🚀 Iniciando proceso para agregar columna "pago_parcial" a todas las tablas...');
  
  try {
    // Obtener todas las colecciones existentes
    const collections = await db.listCollections();
    const collectionNames = collections.map(col => col.id);
    
    console.log('📋 Colecciones encontradas:', collectionNames);
    
    // Filtrar solo las colecciones de seguros y agregar cualquier otra que contenga datos relevantes
    const targetCollections = [
      ...INSURANCE_COLLECTIONS,
      ...collectionNames.filter(name => 
        !INSURANCE_COLLECTIONS.includes(name) && 
        !name.startsWith('table_metadata') &&
        !name.includes('users') &&
        !name.includes('teams') &&
        !name.includes('system')
      )
    ];
    
    console.log('🎯 Colecciones objetivo:', targetCollections);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const collectionName of targetCollections) {
      try {
        console.log(`\n📊 Procesando colección: ${collectionName}`);
        
        // Verificar si la colección existe y tiene documentos
        const collectionRef = db.collection(collectionName);
        const snapshot = await collectionRef.limit(1).get();
        
        if (snapshot.empty) {
          console.log(`⚠️  Colección ${collectionName} está vacía, omitiendo...`);
          continue;
        }
        
        // Obtener metadatos actuales
        const metadataRef = db.collection('table_metadata').doc(collectionName);
        const metadataDoc = await metadataRef.get();
        
        let metadata = {};
        if (metadataDoc.exists) {
          metadata = metadataDoc.data();
          console.log(`📝 Metadatos existentes encontrados para ${collectionName}`);
        } else {
          console.log(`✨ Creando nuevos metadatos para ${collectionName}`);
        }
        
        // Preparar la nueva columna
        const customColumns = metadata.customColumns || [];
        
        // Verificar si ya existe la columna pago_parcial
        const existingColumn = customColumns.find(col => 
          col.name === 'pago_parcial' || col.name === 'pago parcial'
        );
        
        if (existingColumn) {
          console.log(`✅ Columna "pago_parcial" ya existe en ${collectionName}`);
          continue;
        }
        
        // Agregar la nueva columna
        const newColumn = {
          name: 'pago_parcial',
          type: 'DECIMAL',
          addedAt: new Date().toISOString(),
          description: 'Monto de pago parcial realizado'
        };
        
        customColumns.push(newColumn);
        
        // Actualizar metadatos
        const updatedMetadata = {
          ...metadata,
          customColumns: customColumns,
          updatedAt: new Date().toISOString(),
          lastModifiedBy: 'admin_script'
        };
        
        await metadataRef.set(updatedMetadata, { merge: true });
        
        console.log(`✅ Columna "pago_parcial" agregada exitosamente a ${collectionName}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error procesando ${collectionName}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Proceso completado!');
    console.log(`✅ Exitosos: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    
    if (successCount > 0) {
      console.log('\n📋 Resumen de cambios:');
      console.log('- Se agregó la columna "pago_parcial" tipo DECIMAL');
      console.log('- La columna aparecerá en el ColumnManager de cada tabla');
      console.log('- Los valores por defecto estarán vacíos hasta que se asignen manualmente');
      console.log('- Los cambios son inmediatos en la interfaz web');
    }
    
  } catch (error) {
    console.error('💥 Error general en el proceso:', error);
  } finally {
    // Cerrar conexión
    admin.app().delete();
    console.log('🔌 Conexión Firebase cerrada');
  }
}

// Función para verificar el estado actual
async function checkCurrentStatus() {
  console.log('🔍 Verificando estado actual de las columnas...');
  
  try {
    const metadataCollection = await db.collection('table_metadata').get();
    
    console.log('\n📊 Estado actual de metadatos:');
    
    metadataCollection.forEach(doc => {
      const data = doc.data();
      const customColumns = data.customColumns || [];
      const hasPagoParcial = customColumns.some(col => 
        col.name === 'pago_parcial' || col.name === 'pago parcial'
      );
      
      console.log(`- ${doc.id}: ${hasPagoParcial ? '✅ Tiene pago_parcial' : '❌ Sin pago_parcial'} (${customColumns.length} columnas custom)`);
    });
    
  } catch (error) {
    console.error('Error verificando estado:', error);
  }
}

// Función para revertir cambios si es necesario
async function removePagoParcialFromAllTables() {
  console.log('🔄 Revirtiendo cambios - removiendo columna "pago_parcial"...');
  
  try {
    const metadataCollection = await db.collection('table_metadata').get();
    
    for (const doc of metadataCollection.docs) {
      const data = doc.data();
      const customColumns = data.customColumns || [];
      
      // Filtrar columnas que no sean pago_parcial
      const filteredColumns = customColumns.filter(col => 
        col.name !== 'pago_parcial' && col.name !== 'pago parcial'
      );
      
      if (filteredColumns.length !== customColumns.length) {
        await doc.ref.update({
          customColumns: filteredColumns,
          updatedAt: new Date().toISOString()
        });
        console.log(`🗑️  Removida columna pago_parcial de ${doc.id}`);
      }
    }
    
    console.log('✅ Reversión completada');
    
  } catch (error) {
    console.error('Error en reversión:', error);
  } finally {
    admin.app().delete();
  }
}

// Manejo de argumentos de línea de comandos
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'check':
      await checkCurrentStatus();
      break;
    case 'remove':
      await removePagoParcialFromAllTables();
      break;
    case 'add':
    default:
      await addPagoParcialToAllTables();
      break;
  }
}

// Ejecutar script
main().catch(console.error);

// Exportar funciones para uso programático
module.exports = {
  addPagoParcialToAllTables,
  checkCurrentStatus,
  removePagoParcialFromAllTables
}; 