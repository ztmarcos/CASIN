/**
 * Script para posicionar la columna "pago_parcial" junto a "forma_de_pago" en todas las tablas de Firebase
 */

const admin = require('firebase-admin');

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
  'rc',
  'transporte',
  'mascotas',
  'diversos',
  'negocio',
  'gruposgmm',
  'directorio_contactos'
];

async function moveColumnPosition(collectionName) {
  try {
    console.log(`📋 Procesando: ${collectionName}`);
    
    // Obtener metadatos actuales
    const metadataRef = db.collection('table_metadata').doc(collectionName);
    const metadataDoc = await metadataRef.get();
    
    if (!metadataDoc.exists) {
      console.log(`⚠️  No metadata found for ${collectionName}, creating basic structure`);
      
      // Crear estructura básica con orden específico
      const basicOrder = [
        'id',
        'nombre_contratante', 
        'numero_poliza',
        'aseguradora',
        'vigencia_inicio',
        'vigencia_fin',
        'forma_de_pago',
        'pago_parcial', // ← AQUÍ junto a forma_de_pago
        'pago_total_o_prima_total',
        'prima_neta',
        'email'
      ];
      
      await metadataRef.set({
        customColumns: [{
          name: "pago_parcial",
          type: "DECIMAL",
          addedAt: new Date().toISOString(),
          description: "Monto de pago parcial"
        }],
        columnOrder: basicOrder,
        updatedAt: new Date().toISOString()
      });
      
      console.log(`✅ ${collectionName}: Configuración básica creada con pago_parcial en posición correcta`);
      return;
    }
    
    const metadata = metadataDoc.data();
    let currentOrder = metadata.columnOrder || [];
    
    // Si no hay orden definido, obtener de una muestra de documentos
    if (currentOrder.length === 0) {
      console.log(`📄 Obteniendo estructura de documentos para ${collectionName}`);
      const sampleQuery = await db.collection(collectionName).limit(1).get();
      
      if (!sampleQuery.empty) {
        const sampleData = sampleQuery.docs[0].data();
        currentOrder = Object.keys(sampleData);
        console.log(`📋 Estructura encontrada: ${currentOrder.length} columnas`);
      }
    }
    
    // Buscar posiciones actuales
    const pagoParcialIndex = currentOrder.indexOf('pago_parcial');
    const formaPagoIndex = currentOrder.indexOf('forma_de_pago');
    
    console.log(`🔍 Estado actual:`, {
      pagoParcial: pagoParcialIndex >= 0 ? `posición ${pagoParcialIndex}` : 'no encontrado',
      formaPago: formaPagoIndex >= 0 ? `posición ${formaPagoIndex}` : 'no encontrado',
      totalColumnas: currentOrder.length
    });
    
    // Si no existe forma_de_pago, buscar variaciones
    let targetIndex = formaPagoIndex;
    if (targetIndex === -1) {
      const variations = ['forma_pago', 'formaPago', 'payment_method'];
      for (const variation of variations) {
        const varIndex = currentOrder.indexOf(variation);
        if (varIndex >= 0) {
          targetIndex = varIndex;
          console.log(`📍 Usando variación: ${variation} en posición ${targetIndex}`);
          break;
        }
      }
    }
    
    if (targetIndex === -1) {
      console.log(`⚠️  No se encontró columna de forma de pago en ${collectionName}`);
      return;
    }
    
    // Si pago_parcial ya está en la posición correcta, skip
    if (pagoParcialIndex === targetIndex + 1) {
      console.log(`✅ ${collectionName}: pago_parcial ya está en la posición correcta`);
      return;
    }
    
    // Crear nuevo orden
    let newOrder = [...currentOrder];
    
    // Remover pago_parcial si ya existe
    if (pagoParcialIndex >= 0) {
      newOrder.splice(pagoParcialIndex, 1);
      // Actualizar targetIndex si se removió un elemento antes
      if (pagoParcialIndex < targetIndex) {
        targetIndex--;
      }
    }
    
    // Insertar pago_parcial después de forma_de_pago
    newOrder.splice(targetIndex + 1, 0, 'pago_parcial');
    
    // Asegurar que existe en customColumns
    const customColumns = metadata.customColumns || [];
    const hasCustomColumn = customColumns.some(col => col.name === 'pago_parcial');
    
    if (!hasCustomColumn) {
      customColumns.push({
        name: "pago_parcial",
        type: "DECIMAL", 
        addedAt: new Date().toISOString(),
        description: "Monto de pago parcial"
      });
    }
    
    // Actualizar metadatos
    await metadataRef.update({
      columnOrder: newOrder,
      customColumns: customColumns,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ ${collectionName}: pago_parcial movido a posición ${targetIndex + 1} (después de forma_de_pago)`);
    
  } catch (error) {
    console.error(`❌ Error procesando ${collectionName}:`, error.message);
  }
}

async function moveAllColumns() {
  console.log('🚀 Iniciando reposicionamiento de columna pago_parcial...\n');
  
  let successful = 0;
  let errors = 0;
  
  for (const collectionName of INSURANCE_COLLECTIONS) {
    try {
      await moveColumnPosition(collectionName);
      successful++;
    } catch (error) {
      console.error(`❌ Error general en ${collectionName}:`, error);
      errors++;
    }
    console.log(''); // Línea en blanco entre tablas
  }
  
  console.log('📊 RESUMEN FINAL:');
  console.log(`✅ Exitosos: ${successful}`);
  console.log(`❌ Errores: ${errors}`);
  console.log(`📋 Total procesadas: ${INSURANCE_COLLECTIONS.length}`);
}

// Verificar argumentos de línea de comandos
const command = process.argv[2];

if (command === 'check') {
  console.log('🔍 VERIFICANDO estado actual de posiciones...\n');
  
  INSURANCE_COLLECTIONS.forEach(async (collectionName, index) => {
    try {
      const metadataRef = db.collection('table_metadata').doc(collectionName);
      const metadataDoc = await metadataRef.get();
      
      if (metadataDoc.exists) {
        const metadata = metadataDoc.data();
        const columnOrder = metadata.columnOrder || [];
        const pagoParcialIndex = columnOrder.indexOf('pago_parcial');
        const formaPagoIndex = columnOrder.indexOf('forma_de_pago');
        
        console.log(`📋 ${collectionName}:`);
        console.log(`   forma_de_pago: ${formaPagoIndex >= 0 ? `posición ${formaPagoIndex}` : 'no encontrado'}`);
        console.log(`   pago_parcial: ${pagoParcialIndex >= 0 ? `posición ${pagoParcialIndex}` : 'no encontrado'}`);
        
        if (pagoParcialIndex === formaPagoIndex + 1) {
          console.log(`   ✅ Posición correcta\n`);
        } else {
          console.log(`   ⚠️  Necesita reposicionamiento\n`);
        }
      } else {
        console.log(`📋 ${collectionName}: No metadata\n`);
      }
    } catch (error) {
      console.error(`❌ Error verificando ${collectionName}:`, error.message);
    }
    
    // Terminar proceso después del último elemento
    if (index === INSURANCE_COLLECTIONS.length - 1) {
      setTimeout(() => process.exit(0), 1000);
    }
  });
  
} else if (command === 'move') {
  moveAllColumns().then(() => {
    console.log('\n🎉 Proceso completado!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
  
} else {
  console.log(`
🔧 Script de Reposicionamiento de Columnas

Uso:
  node scripts/move-pago-parcial-position.js check  # Verificar posiciones actuales
  node scripts/move-pago-parcial-position.js move   # Ejecutar reposicionamiento

Objetivo:
  Mover la columna 'pago_parcial' para que aparezca siempre después de 'forma_de_pago'
  `);
  process.exit(0);
} 