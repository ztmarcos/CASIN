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

// Definir todas las tablas donde actualizar el orden de columnas
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

// Función para obtener el orden correcto de columnas para una tabla
function getCorrectColumnOrder(tableName, allColumns) {
  console.log(`📋 Procesando orden para tabla: ${tableName}`);
  console.log(`📝 Columnas disponibles: ${allColumns.join(', ')}`);
  
  // Determinar columnas especiales presentes
  const hasNumeroPoliza = allColumns.includes('numero_poliza');
  const hasContratante = allColumns.includes('nombre_contratante');
  const hasPagoTotal = allColumns.includes('pago_total_o_prima_total');
  const hasPrimerPago = allColumns.includes('primer_pago');
  const hasPagoParcial = allColumns.includes('pago_parcial');
  const hasId = allColumns.includes('id');
  
  console.log(`🔍 Columnas especiales encontradas:`, {
    hasNumeroPoliza,
    hasContratante, 
    hasPagoTotal,
    hasPrimerPago,
    hasPagoParcial,
    hasId
  });
  
  // Filtrar columnas especiales (como en DataTable.jsx)
  const excludeColumns = [
    'pdf',
    'firebase_doc_id', 
    'estado_pago',
    'created_at',
    'updated_at',
    'createdat',
    'updatedat'
  ];
  
  let filteredColumns = allColumns.filter(col => {
    const columnName = col.toLowerCase();
    return !excludeColumns.includes(columnName);
  });
  
  // Quitar las columnas que vamos a reordenar
  filteredColumns = filteredColumns.filter(col => 
    col !== 'numero_poliza' && 
    col !== 'nombre_contratante' && 
    col !== 'pago_total_o_prima_total' &&
    col !== 'primer_pago' && 
    col !== 'pago_parcial' &&
    col !== 'id'
  );
  
  // Crear el orden final: numero_poliza, contratante, pago_total, primer_pago, pago_parcial, resto, id
  const finalOrder = [
    ...(hasNumeroPoliza ? ['numero_poliza'] : []),
    ...(hasContratante ? ['nombre_contratante'] : []),
    ...(hasPagoTotal ? ['pago_total_o_prima_total'] : []),
    ...(hasPrimerPago ? ['primer_pago'] : []),
    ...(hasPagoParcial ? ['pago_parcial'] : []),
    ...filteredColumns,
    ...(hasId ? ['id'] : [])
  ];
  
  console.log(`✅ Orden final generado para ${tableName}:`, finalOrder);
  return finalOrder;
}

// Función para obtener todas las columnas de una tabla
async function getTableColumns(tableName) {
  try {
    console.log(`\n🔍 Obteniendo estructura de tabla: ${tableName}`);
    
    // Obtener estructura de la API
    const API_URL = 'http://localhost:3001/api';
    const fetch = require('node-fetch');
    
    const response = await fetch(`${API_URL}/data/tables/${tableName}/structure`);
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const structure = await response.json();
    if (!structure.columns) {
      throw new Error('No se encontraron columnas en la estructura');
    }
    
    const allColumns = structure.columns.map(col => col.name);
    console.log(`📊 ${tableName}: ${allColumns.length} columnas encontradas`);
    
    return allColumns;
  } catch (error) {
    console.error(`❌ Error obteniendo columnas de ${tableName}:`, error.message);
    return null;
  }
}

// Función para actualizar el orden de columnas en Firebase
async function updateColumnOrderInFirebase(tableName, newOrder) {
  try {
    console.log(`\n🔄 Actualizando orden en Firebase para: ${tableName}`);
    
    // Obtener metadatos actuales
    const metadataRef = db.collection('table_metadata').doc(tableName);
    const metadataDoc = await metadataRef.get();
    
    let metadata = {};
    if (metadataDoc.exists) {
      metadata = metadataDoc.data();
      console.log(`📄 Metadatos existentes encontrados para ${tableName}`);
    } else {
      console.log(`📄 Creando nuevos metadatos para ${tableName}`);
    }
    
    // Actualizar el orden de columnas
    const updatedMetadata = {
      ...metadata,
      columnOrder: newOrder,
      updatedAt: new Date().toISOString(),
      lastModifiedBy: 'update-column-order-script'
    };
    
    await metadataRef.set(updatedMetadata, { merge: true });
    
    console.log(`✅ Orden actualizado en Firebase para ${tableName}`);
    console.log(`📝 Nuevo orden: ${newOrder.slice(0, 8).join(', ')}${newOrder.length > 8 ? `, ... +${newOrder.length - 8} más` : ''}`);
    
    return { tableName, status: 'success', columnCount: newOrder.length };
    
  } catch (error) {
    console.error(`❌ Error actualizando ${tableName}:`, error.message);
    return { tableName, status: 'error', error: error.message };
  }
}

// Función principal
async function updateAllColumnOrders() {
  console.log('🚀 Iniciando actualización de orden de columnas para TODAS las tablas...\n');
  console.log(`📋 Tablas a procesar: ${ALL_TABLES.length}`);
  console.log(`📝 Tablas: ${ALL_TABLES.join(', ')}\n`);
  
  const results = [];
  
  for (const tableName of ALL_TABLES) {
    try {
      // 1. Obtener columnas actuales
      const allColumns = await getTableColumns(tableName);
      if (!allColumns) {
        results.push({ tableName, status: 'error', error: 'No se pudieron obtener las columnas' });
        continue;
      }
      
      // 2. Calcular nuevo orden
      const newOrder = getCorrectColumnOrder(tableName, allColumns);
      
      // 3. Actualizar en Firebase
      const result = await updateColumnOrderInFirebase(tableName, newOrder);
      results.push(result);
      
      // Pausa entre actualizaciones
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ Error procesando ${tableName}:`, error.message);
      results.push({ tableName, status: 'error', error: error.message });
    }
  }
  
  // Mostrar resumen final
  console.log('\n' + '='.repeat(70));
  console.log('🎉 ACTUALIZACIÓN COMPLETADA - RESUMEN FINAL');
  console.log('='.repeat(70));
  
  const summary = {
    success: 0,
    error: 0
  };
  
  results.forEach(result => {
    summary[result.status]++;
    
    if (result.status === 'success') {
      console.log(`✅ ${result.tableName} - ${result.columnCount} columnas ordenadas`);
    } else {
      console.log(`❌ ${result.tableName} - Error: ${result.error}`);
    }
  });
  
  console.log(`\n📊 ESTADÍSTICAS:`);
  console.log(`✅ Exitosas: ${summary.success}`);
  console.log(`❌ Errores: ${summary.error}`);
  
  if (summary.error > 0) {
    console.log('\n💥 ERRORES ENCONTRADOS:');
    results.filter(r => r.status === 'error').forEach(result => {
      console.log(`  - ${result.tableName}: ${result.error}`);
    });
  }
  
  console.log('\n📝 PRÓXIMOS PASOS:');
  console.log('1. Reiniciar el servidor backend para aplicar cambios');
  console.log('2. Refrescar el frontend para ver el nuevo orden');
  console.log('3. Verificar que primer_pago aparezca después de pago_total_o_prima_total');
  
  return results;
}

// Función para verificar el orden actual
async function checkCurrentOrder() {
  console.log('🔍 Verificando orden actual de columnas en Firebase...\n');
  
  for (const tableName of ALL_TABLES) {
    try {
      const metadataRef = db.collection('table_metadata').doc(tableName);
      const metadataDoc = await metadataRef.get();
      
      if (metadataDoc.exists) {
        const metadata = metadataDoc.data();
        const columnOrder = metadata.columnOrder || [];
        
        console.log(`📋 ${tableName}:`);
        if (columnOrder.length > 0) {
          const firstFew = columnOrder.slice(0, 6);
          console.log(`   Orden actual: ${firstFew.join(' → ')}${columnOrder.length > 6 ? ` → ... (+${columnOrder.length - 6} más)` : ''}`);
          
          // Verificar si tiene las columnas de pago en orden correcto
          const pagoTotalIndex = columnOrder.indexOf('pago_total_o_prima_total');
          const primerPagoIndex = columnOrder.indexOf('primer_pago');
          const pagoParcialIndex = columnOrder.indexOf('pago_parcial');
          
          if (pagoTotalIndex !== -1 && primerPagoIndex !== -1 && pagoParcialIndex !== -1) {
            if (pagoTotalIndex < primerPagoIndex && primerPagoIndex < pagoParcialIndex) {
              console.log(`   💰 Orden de pagos: ✅ Correcto`);
            } else {
              console.log(`   💰 Orden de pagos: ❌ Incorrecto (pos: ${pagoTotalIndex}, ${primerPagoIndex}, ${pagoParcialIndex})`);
            }
          } else {
            console.log(`   💰 Orden de pagos: ⚠️ Columnas faltantes`);
          }
        } else {
          console.log(`   ⚠️ Sin orden definido`);
        }
      } else {
        console.log(`📋 ${tableName}: ❌ Sin metadatos`);
      }
    } catch (error) {
      console.log(`📋 ${tableName}: 💥 Error - ${error.message}`);
    }
  }
}

// Función principal CLI
async function main() {
  const command = process.argv[2];
  
  console.log('🔧 Script para actualizar orden de columnas en Firebase');
  console.log('='.repeat(60));
  
  try {
    switch (command) {
      case 'update':
        await updateAllColumnOrders();
        break;
        
      case 'check':
        await checkCurrentOrder();
        break;
        
      default:
        console.log('📖 USO:');
        console.log('  node update-column-order-firebase.js update  # Actualizar orden en todas las tablas');
        console.log('  node update-column-order-firebase.js check   # Verificar orden actual');
        console.log('');
        console.log('📋 ORDEN DESEADO:');
        console.log('  numero_poliza → nombre_contratante → pago_total_o_prima_total → primer_pago → pago_parcial → resto → id');
        console.log('');
        console.log(`📝 TABLAS A PROCESAR: ${ALL_TABLES.join(', ')}`);
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
  updateAllColumnOrders,
  checkCurrentOrder
};
