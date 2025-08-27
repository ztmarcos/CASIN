const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '..', 'casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin SDK inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();

// Definir todas las tablas/colecciones donde se debe agregar la columna
const ALL_TABLES = [
  'autos',
  'vida', 
  'gmm',
  'rc',
  'transporte',
  'mascotas',
  'diversos',
  'negocio',
  'hogar',
  'emant_caratula',
  'emant_listado',
  'gruposgmm',
  'gruposautos',
  'listadoautos',
  'gruposvida',
  'listadovida'
];

// También incluir tablas de equipos (teams)
const TEAM_IDS = ['4JlUqhAvfJMlCDhQ4vgH']; // Agregar más team IDs según sea necesario

function generateTeamTableNames() {
  const teamTables = [];
  
  TEAM_IDS.forEach(teamId => {
    ALL_TABLES.forEach(tableName => {
      // Para el equipo CASIN específico, usar directamente las colecciones
      if (teamId === '4JlUqhAvfJMlCDhQ4vgH') {
        // Ya incluidas en ALL_TABLES
      } else {
        // Para otros equipos, usar el namespace
        teamTables.push(`team_${teamId}_${tableName}`);
      }
    });
  });
  
  return teamTables;
}

// Función para verificar si una colección existe
async function collectionExists(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).limit(1).get();
    return !snapshot.empty || snapshot.docs.length >= 0; // Existe si tiene docs o está vacía pero creada
  } catch (error) {
    console.warn(`⚠️  No se puede acceder a la colección ${collectionName}`);
    return false;
  }
}

// Función para agregar la columna primer_pago a una tabla
async function addPrimerPagoColumn(tableName) {
  try {
    console.log(`\n📋 Procesando tabla: ${tableName}`);
    
    // Verificar si la colección existe
    const exists = await collectionExists(tableName);
    if (!exists) {
      console.log(`  ⚠️  Colección ${tableName} no existe o está vacía - saltando`);
      return { tableName, status: 'skipped', reason: 'collection_not_found' };
    }
    
    // Obtener el documento de metadatos actual
    const metadataRef = db.collection('table_metadata').doc(tableName);
    const metadataDoc = await metadataRef.get();
    
    let metadata = {};
    if (metadataDoc.exists) {
      metadata = metadataDoc.data();
      console.log(`  📄 Metadatos existentes encontrados`);
    } else {
      console.log(`  📄 Creando nuevos metadatos`);
    }
    
    // Verificar si la columna ya existe
    const customColumns = metadata.customColumns || [];
    const existingColumn = customColumns.find(col => col.name === 'primer_pago');
    
    if (existingColumn) {
      console.log(`  ✅ La columna 'primer_pago' ya existe en ${tableName}`);
      return { tableName, status: 'already_exists', column: existingColumn };
    }
    
    // Crear la nueva columna
    const newColumn = {
      name: 'primer_pago',
      type: 'DECIMAL(10,2)',
      addedAt: new Date().toISOString(),
      description: 'Monto del primer pago realizado',
      defaultValue: null,
      nullable: true
    };
    
    // Agregar la nueva columna a los metadatos
    customColumns.push(newColumn);
    
    // Actualizar los metadatos en Firebase
    await metadataRef.set({
      ...metadata,
      customColumns: customColumns,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: 'add-primer-pago-script'
    }, { merge: true });
    
    console.log(`  ✅ Columna 'primer_pago' agregada exitosamente a ${tableName}`);
    return { tableName, status: 'added', column: newColumn };
    
  } catch (error) {
    console.error(`  ❌ Error procesando tabla ${tableName}:`, error.message);
    return { tableName, status: 'error', error: error.message };
  }
}

// Función para verificar el estado actual
async function checkPrimerPagoStatus() {
  console.log('🔍 Verificando estado actual de la columna "primer_pago" en todas las tablas...\n');
  
  const allTables = [...ALL_TABLES, ...generateTeamTableNames()];
  const results = [];
  
  for (const tableName of allTables) {
    try {
      // Verificar si la colección existe
      const exists = await collectionExists(tableName);
      if (!exists) {
        results.push({ tableName, status: 'collection_not_found' });
        continue;
      }
      
      const metadataRef = db.collection('table_metadata').doc(tableName);
      const metadataDoc = await metadataRef.get();
      
      if (!metadataDoc.exists) {
        results.push({ tableName, status: 'no_metadata' });
      } else {
        const metadata = metadataDoc.data();
        const customColumns = metadata.customColumns || [];
        const primerPagoColumn = customColumns.find(col => col.name === 'primer_pago');
        
        if (primerPagoColumn) {
          results.push({ 
            tableName, 
            status: 'has_column', 
            column: primerPagoColumn 
          });
        } else {
          results.push({ tableName, status: 'missing_column' });
        }
      }
    } catch (error) {
      results.push({ tableName, status: 'error', error: error.message });
    }
  }
  
  // Mostrar resumen
  console.log('📊 RESUMEN DEL ESTADO ACTUAL:');
  console.log('=' .repeat(50));
  
  const summary = {
    has_column: 0,
    missing_column: 0,
    no_metadata: 0,
    collection_not_found: 0,
    error: 0
  };
  
  results.forEach(result => {
    summary[result.status]++;
    
    switch (result.status) {
      case 'has_column':
        console.log(`✅ ${result.tableName} - Columna presente`);
        break;
      case 'missing_column':
        console.log(`❌ ${result.tableName} - Falta columna`);
        break;
      case 'no_metadata':
        console.log(`⚠️  ${result.tableName} - Sin metadatos`);
        break;
      case 'collection_not_found':
        console.log(`🚫 ${result.tableName} - Colección no encontrada`);
        break;
      case 'error':
        console.log(`💥 ${result.tableName} - Error: ${result.error}`);
        break;
    }
  });
  
  console.log('\n📈 ESTADÍSTICAS:');
  console.log(`✅ Tablas con columna: ${summary.has_column}`);
  console.log(`❌ Tablas sin columna: ${summary.missing_column}`);
  console.log(`⚠️  Tablas sin metadatos: ${summary.no_metadata}`);
  console.log(`🚫 Colecciones no encontradas: ${summary.collection_not_found}`);
  console.log(`💥 Errores: ${summary.error}`);
  
  return results;
}

// Función para agregar la columna a todas las tablas
async function addPrimerPagoToAllTables() {
  console.log('🚀 Iniciando proceso para agregar columna "primer_pago" a todas las tablas...\n');
  
  const allTables = [...ALL_TABLES, ...generateTeamTableNames()];
  const results = [];
  
  console.log(`📋 Tablas a procesar: ${allTables.length}`);
  console.log(`📝 Tablas base: ${ALL_TABLES.join(', ')}`);
  
  const teamTables = generateTeamTableNames();
  if (teamTables.length > 0) {
    console.log(`👥 Tablas de equipos: ${teamTables.join(', ')}`);
  }
  
  for (const tableName of allTables) {
    const result = await addPrimerPagoColumn(tableName);
    results.push(result);
    
    // Pequeña pausa para evitar sobrecargar Firebase
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Mostrar resumen final
  console.log('\n' + '='.repeat(60));
  console.log('🎉 PROCESO COMPLETADO - RESUMEN FINAL');
  console.log('='.repeat(60));
  
  const summary = {
    added: 0,
    already_exists: 0,
    skipped: 0,
    error: 0
  };
  
  results.forEach(result => {
    summary[result.status]++;
  });
  
  console.log(`✅ Columnas agregadas: ${summary.added}`);
  console.log(`🔄 Ya existían: ${summary.already_exists}`);
  console.log(`⏭️  Saltadas: ${summary.skipped}`);
  console.log(`❌ Errores: ${summary.error}`);
  
  if (summary.error > 0) {
    console.log('\n💥 ERRORES ENCONTRADOS:');
    results.filter(r => r.status === 'error').forEach(result => {
      console.log(`  - ${result.tableName}: ${result.error}`);
    });
  }
  
  console.log('\n📝 PRÓXIMOS PASOS:');
  console.log('1. Reiniciar el servidor backend para aplicar cambios');
  console.log('2. Actualizar el frontend para mostrar la nueva columna');
  console.log('3. Verificar que la columna aparezca en todas las tablas');
  
  return results;
}

// Función para remover la columna (para rollback)
async function removePrimerPagoColumn() {
  console.log('🗑️  Iniciando proceso para REMOVER columna "primer_pago" de todas las tablas...\n');
  
  const allTables = [...ALL_TABLES, ...generateTeamTableNames()];
  const results = [];
  
  for (const tableName of allTables) {
    try {
      console.log(`\n📋 Procesando tabla: ${tableName}`);
      
      const metadataRef = db.collection('table_metadata').doc(tableName);
      const metadataDoc = await metadataRef.get();
      
      if (!metadataDoc.exists) {
        console.log(`  ⚠️  No hay metadatos para ${tableName}`);
        results.push({ tableName, status: 'no_metadata' });
        continue;
      }
      
      const metadata = metadataDoc.data();
      const customColumns = metadata.customColumns || [];
      
      // Filtrar para remover la columna primer_pago
      const filteredColumns = customColumns.filter(col => col.name !== 'primer_pago');
      
      if (filteredColumns.length === customColumns.length) {
        console.log(`  ℹ️  La columna 'primer_pago' no estaba presente en ${tableName}`);
        results.push({ tableName, status: 'not_present' });
      } else {
        // Actualizar metadatos sin la columna
        await metadataRef.set({
          ...metadata,
          customColumns: filteredColumns,
          updatedAt: new Date().toISOString(),
          lastModifiedBy: 'remove-primer-pago-script'
        }, { merge: true });
        
        console.log(`  ✅ Columna 'primer_pago' removida de ${tableName}`);
        results.push({ tableName, status: 'removed' });
      }
      
    } catch (error) {
      console.error(`  ❌ Error removiendo columna de ${tableName}:`, error.message);
      results.push({ tableName, status: 'error', error: error.message });
    }
  }
  
  console.log('\n🎉 Proceso de remoción completado');
  return results;
}

// Función principal
async function main() {
  const command = process.argv[2];
  
  console.log('🔥 Script para gestión de columna "primer_pago" en Firebase');
  console.log('=' .repeat(60));
  
  try {
    switch (command) {
      case 'add':
        await addPrimerPagoToAllTables();
        break;
        
      case 'check':
        await checkPrimerPagoStatus();
        break;
        
      case 'remove':
        console.log('⚠️  ¿Estás seguro que quieres REMOVER la columna primer_pago de TODAS las tablas?');
        console.log('   Esta acción no se puede deshacer fácilmente.');
        console.log('   Para confirmar, ejecuta: node add-primer-pago-firebase.js remove confirm');
        
        if (process.argv[3] === 'confirm') {
          await removePrimerPagoColumn();
        } else {
          console.log('❌ Operación cancelada. Agrega "confirm" para proceder.');
        }
        break;
        
      default:
        console.log('📖 USO:');
        console.log('  node add-primer-pago-firebase.js add     # Agregar columna a todas las tablas');
        console.log('  node add-primer-pago-firebase.js check   # Verificar estado actual');
        console.log('  node add-primer-pago-firebase.js remove confirm  # Remover columna (¡cuidado!)');
        console.log('');
        console.log('📋 TABLAS QUE SE PROCESARÁN:');
        console.log(`   Base: ${ALL_TABLES.join(', ')}`);
        console.log(`   Teams: ${generateTeamTableNames().join(', ') || 'ninguna'}`);
        break;
    }
  } catch (error) {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }
  
  console.log('\n✅ Script finalizado');
  process.exit(0);
}

// Ejecutar el script
if (require.main === module) {
  main();
}

module.exports = {
  addPrimerPagoToAllTables,
  checkPrimerPagoStatus,
  removePrimerPagoColumn
};
