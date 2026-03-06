#!/usr/bin/env node

/**
 * Script para crear Test Team automáticamente
 * Ejecutar: node create-test-team.mjs
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '.env') });

console.log('🚀 Iniciando creación de Test Team...\n');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Configuración de Test Team
const TEST_TEAM_CONFIG = {
  teamId: 'test_team_001',
  teamName: 'Test Team',
  ownerEmail: 'ztmarcos@gmail.com',
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

// Función para generar documento de ejemplo según el tipo de tabla
function generateExampleDocument(tableName) {
  const commonFields = {
    _isPlaceholder: true,
    _description: `Documento de ejemplo para ${tableName}`,
    _createdBy: TEST_TEAM_CONFIG.ownerEmail,
    teamId: TEST_TEAM_CONFIG.teamId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
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
    console.log('📋 Paso 1: Creando equipo en colección "teams"...');
    
    // Crear documento del equipo
    const teamRef = doc(db, 'teams', TEST_TEAM_CONFIG.teamId);
    await setDoc(teamRef, {
      name: TEST_TEAM_CONFIG.teamName,
      description: TEST_TEAM_CONFIG.description,
      owner: TEST_TEAM_CONFIG.ownerEmail,
      createdAt: serverTimestamp(),
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

    console.log('👥 Paso 2: Agregando owner como miembro del equipo...');
    
    // Crear miembro del equipo (owner)
    const memberRef = doc(db, 'team_members', `${TEST_TEAM_CONFIG.teamId}_${TEST_TEAM_CONFIG.ownerEmail.replace(/[@.]/g, '_')}`);
    await setDoc(memberRef, {
      userId: TEST_TEAM_CONFIG.ownerEmail.replace(/[@.]/g, '_'),
      email: TEST_TEAM_CONFIG.ownerEmail,
      name: 'Marcos (Test Team Owner)',
      teamId: TEST_TEAM_CONFIG.teamId,
      role: 'admin',
      invitedBy: TEST_TEAM_CONFIG.ownerEmail,
      joinedAt: serverTimestamp(),
      status: 'active',
      isOwner: true
    });
    
    console.log(`✅ Owner agregado: ${TEST_TEAM_CONFIG.ownerEmail}\n`);

    console.log(`📊 Paso 3: Creando ${TABLES_TO_CREATE.length} tablas con documentos de ejemplo...\n`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const tableName of TABLES_TO_CREATE) {
      try {
        const collectionName = `team_${TEST_TEAM_CONFIG.teamId}_${tableName}`;
        const exampleDoc = generateExampleDocument(tableName);
        
        // Crear documento de ejemplo
        const docRef = doc(db, collectionName, 'ejemplo_001');
        await setDoc(docRef, exampleDoc);
        
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
    console.log('   1. Hacer login con ztmarcos@gmail.com');
    console.log('   2. Usar el selector de equipos para cambiar a "Test Team"');
    console.log('   3. Verificar que aparezcan las tablas con documentos de ejemplo');
    console.log('   4. Probar crear/editar/eliminar registros');

  } catch (error) {
    console.error('\n❌ Error creando Test Team:', error);
    console.error('Detalles:', error.message);
    process.exit(1);
  }
}

// Verificar que las variables de entorno estén configuradas
if (!process.env.VITE_FIREBASE_API_KEY || !process.env.VITE_FIREBASE_PROJECT_ID) {
  console.error('❌ Error: Variables de entorno de Firebase no configuradas');
  console.error('Asegúrate de tener un archivo .env con las siguientes variables:');
  console.error('   - VITE_FIREBASE_API_KEY');
  console.error('   - VITE_FIREBASE_PROJECT_ID');
  console.error('   - VITE_FIREBASE_AUTH_DOMAIN');
  console.error('   - VITE_FIREBASE_STORAGE_BUCKET');
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
