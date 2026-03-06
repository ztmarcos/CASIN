#!/usr/bin/env node

/**
 * Script para crear Test Team usando Firebase Admin SDK
 * Ejecutar: node create-test-team-admin.js
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('🚀 Iniciando creación de Test Team con Firebase Admin...\n');

// Inicializar Firebase Admin
try {
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.VITE_FIREBASE_PROJECT_ID || 'casinbbdd',
    private_key: privateKey,
    client_email: `firebase-adminsdk-hnwk0@${process.env.VITE_FIREBASE_PROJECT_ID || 'casinbbdd'}.iam.gserviceaccount.com`,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseio.com`
  });

  console.log('✅ Firebase Admin inicializado correctamente\n');
} catch (error) {
  console.error('❌ Error inicializando Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// Configuración de Test Team
const TEST_TEAM_CONFIG = {
  teamId: 'test_team_001',
  teamName: 'Test Team',
  ownerEmail: 'z.t.marcos@gmail.com',
  description: 'Equipo de pruebas para validar sistema multi-equipos',
  emailConfig: {
    senderEmail: 'ztmarcos@gmail.com',
    senderName: 'Test Team - Marcos'
  }
};

// Tablas a crear (mismas que CASIN)
const TABLES_TO_CREATE = [
  'autos',
  'vida',
  'gmm',
  'hogar',
  'rc',
  'transporte',
  'mascotas',
  'diversos',
  'negocio',
  'emant_caratula',
  'emant_listado',
  'gruposvida',
  'listadovida',
  'gruposautos',
  'listadoautos',
  'directorio_contactos'
];

// Función para generar documento de ejemplo
function generateExampleDocument(tableName) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  const commonFields = {
    _isPlaceholder: true,
    _description: `Documento de ejemplo para ${tableName}`,
    _createdBy: TEST_TEAM_CONFIG.ownerEmail,
    teamId: TEST_TEAM_CONFIG.teamId,
    createdAt: now,
    updatedAt: now
  };

  const specificFields = {
    autos: {
      contratante: 'CLIENTE EJEMPLO S.A. DE C.V.',
      numero_poliza: 'AUTO-EJEMPLO-001',
      aseguradora: 'ASEGURADORA EJEMPLO',
      forma_pago: 'Anual',
      importe_total_a_pagar: '10,000.00',
      prima_neta: '8,000.00',
      iva_16: '1,280.00',
      marca: 'Toyota',
      modelo: 'Corolla',
      año: '2024',
      placas: 'ABC-123-D',
      rfc: 'XEXX010101000',
      telefono: '5512345678',
      email: 'ejemplo@empresa.com'
    },
    vida: {
      contratante: 'CLIENTE EJEMPLO S.A. DE C.V.',
      numero_poliza: 'VIDA-EJEMPLO-001',
      aseguradora: 'ASEGURADORA EJEMPLO',
      suma_asegurada: '100,000.00',
      prima_anual: '12,000.00',
      beneficiario: 'BENEFICIARIO EJEMPLO',
      rfc: 'XEXX010101000'
    },
    gmm: {
      contratante: 'CLIENTE EJEMPLO S.A. DE C.V.',
      numero_poliza: 'GMM-EJEMPLO-001',
      aseguradora: 'ASEGURADORA EJEMPLO',
      tipo_plan: 'Plan Básico',
      deducible: '5,000.00',
      coaseguro: '10%',
      suma_asegurada: '500,000.00',
      prima_anual: '15,000.00'
    },
    hogar: {
      contratante: 'CLIENTE EJEMPLO S.A. DE C.V.',
      numero_poliza: 'HOGAR-EJEMPLO-001',
      aseguradora: 'ASEGURADORA EJEMPLO',
      direccion: 'Av. Ejemplo #123, Col. Centro, Ciudad de México',
      valor_inmueble: '500,000.00',
      prima_anual: '8,000.00'
    },
    rc: {
      contratante: 'CLIENTE EJEMPLO S.A. DE C.V.',
      numero_poliza: 'RC-EJEMPLO-001',
      aseguradora: 'ASEGURADORA EJEMPLO',
      tipo_responsabilidad: 'Civil General',
      suma_asegurada: '1,000,000.00'
    },
    transporte: {
      contratante: 'CLIENTE EJEMPLO S.A. DE C.V.',
      numero_poliza: 'TRANS-EJEMPLO-001',
      aseguradora: 'ASEGURADORA EJEMPLO',
      tipo_mercancia: 'Mercancía General',
      valor_mercancia: '100,000.00'
    },
    mascotas: {
      contratante: 'CLIENTE EJEMPLO S.A. DE C.V.',
      numero_poliza: 'MASC-EJEMPLO-001',
      aseguradora: 'ASEGURADORA EJEMPLO',
      nombre_mascota: 'Mascota Ejemplo',
      especie: 'Perro',
      raza: 'Labrador'
    },
    diversos: {
      contratante: 'CLIENTE EJEMPLO S.A. DE C.V.',
      numero_poliza: 'DIV-EJEMPLO-001',
      aseguradora: 'ASEGURADORA EJEMPLO',
      tipo_seguro: 'Seguro Diverso',
      descripcion: 'Descripción del seguro'
    },
    negocio: {
      contratante: 'CLIENTE EJEMPLO S.A. DE C.V.',
      numero_poliza: 'NEG-EJEMPLO-001',
      aseguradora: 'ASEGURADORA EJEMPLO',
      tipo_negocio: 'Comercio',
      giro_comercial: 'Servicios'
    },
    directorio_contactos: {
      nombre: 'Cliente Ejemplo',
      email: 'cliente@ejemplo.com',
      telefono: '555-0123',
      empresa: 'Empresa Demo',
      rfc: 'XEXX010101000'
    }
  };

  return {
    ...commonFields,
    ...(specificFields[tableName] || {
      nombre: 'EJEMPLO',
      descripcion: `Documento de ejemplo para ${tableName}`,
      activo: true
    })
  };
}

async function createTestTeam() {
  try {
    console.log('📋 Paso 1: Verificando si Test Team ya existe...');
    
    const existingTeam = await db.collection('teams').doc(TEST_TEAM_CONFIG.teamId).get();
    
    if (existingTeam.exists) {
      console.log('⚠️  Test Team ya existe. ¿Deseas recrearlo?');
      console.log('   Para recrear, primero elimínalo manualmente en Firebase Console.');
      console.log('   O cambia el teamId en el script.\n');
      process.exit(0);
    }

    console.log('📋 Paso 2: Creando equipo en colección "teams"...');
    
    await db.collection('teams').doc(TEST_TEAM_CONFIG.teamId).set({
      name: TEST_TEAM_CONFIG.teamName,
      description: TEST_TEAM_CONFIG.description,
      owner: TEST_TEAM_CONFIG.ownerEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      firebaseProject: process.env.VITE_FIREBASE_PROJECT_ID,
      isMainTeam: false,
      settings: {
        allowInvites: true,
        maxMembers: 10,
        useDirectCollections: false,
        driveStorageEnabled: true
      },
      emailConfig: TEST_TEAM_CONFIG.emailConfig
    });
    
    console.log(`✅ Equipo "${TEST_TEAM_CONFIG.teamName}" creado con ID: ${TEST_TEAM_CONFIG.teamId}\n`);

    console.log('👥 Paso 3: Agregando owner como miembro del equipo...');
    
    const memberId = `${TEST_TEAM_CONFIG.teamId}_${TEST_TEAM_CONFIG.ownerEmail.replace(/[@.]/g, '_')}`;
    await db.collection('team_members').doc(memberId).set({
      userId: TEST_TEAM_CONFIG.ownerEmail.replace(/[@.]/g, '_'),
      email: TEST_TEAM_CONFIG.ownerEmail,
      name: 'Marcos (Test Team Owner)',
      teamId: TEST_TEAM_CONFIG.teamId,
      role: 'admin',
      invitedBy: TEST_TEAM_CONFIG.ownerEmail,
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
      isOwner: true
    });
    
    console.log(`✅ Owner agregado: ${TEST_TEAM_CONFIG.ownerEmail}\n`);

    console.log(`📊 Paso 4: Creando ${TABLES_TO_CREATE.length} tablas con documentos de ejemplo...\n`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const tableName of TABLES_TO_CREATE) {
      try {
        const collectionName = `team_${TEST_TEAM_CONFIG.teamId}_${tableName}`;
        const exampleDoc = generateExampleDocument(tableName);
        
        await db.collection(collectionName).doc('ejemplo_001').set(exampleDoc);
        
        console.log(`   ✅ ${tableName.padEnd(25)} → ${collectionName}`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ ${tableName.padEnd(25)} → Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Resumen de creación de tablas:`);
    console.log(`   ✅ Exitosas: ${successCount}/${TABLES_TO_CREATE.length}`);
    console.log(`   ❌ Errores: ${errorCount}/${TABLES_TO_CREATE.length}`);

    console.log('\n🎉 ¡Test Team creado exitosamente!\n');
    console.log('📝 Detalles del equipo:');
    console.log(`   ID: ${TEST_TEAM_CONFIG.teamId}`);
    console.log(`   Nombre: ${TEST_TEAM_CONFIG.teamName}`);
    console.log(`   Owner: ${TEST_TEAM_CONFIG.ownerEmail}`);
    console.log(`   Email remitente: ${TEST_TEAM_CONFIG.emailConfig.senderEmail}`);
    console.log(`   Tablas creadas: ${successCount}`);
    
    console.log('\n✅ Próximos pasos:');
    console.log('   1. Recarga la página en el navegador (F5)');
    console.log('   2. Busca el selector de equipos en la barra superior');
    console.log('   3. Abre la consola del navegador (F12) y busca logs de TeamSelector');
    console.log('   4. Deberías ver: "📊 TeamSelector: Available teams: 2"');
    console.log('   5. Cambia a "Test Team" usando el selector');

  } catch (error) {
    console.error('\n❌ Error creando Test Team:', error);
    console.error('Detalles:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Verificar variables de entorno
if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.VITE_FIREBASE_PROJECT_ID) {
  console.error('❌ Error: Variables de entorno de Firebase no configuradas');
  console.error('\nAsegúrate de tener en .env:');
  console.error('   - FIREBASE_PRIVATE_KEY');
  console.error('   - VITE_FIREBASE_PROJECT_ID');
  console.error('\nEstas variables ya deberían estar configuradas para el servidor.');
  process.exit(1);
}

// Ejecutar
createTestTeam()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
