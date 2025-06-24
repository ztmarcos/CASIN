#!/usr/bin/env node
import { config } from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';

// Cargar variables de entorno
config();

console.log('🔍 Diagnóstico de Colecciones Faltantes');
console.log('=====================================');

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log('🔥 Inicializando Firebase...');
console.log('📊 Proyecto:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Lista COMPLETA de posibles nombres de colecciones
const allPossibleCollectionNames = [
  // Colecciones globales
  'teams', 'team_members', 'users', 'notifications',
  
  // Colecciones originales de CASIN (sin prefijo team_)
  'directorio_contactos', 'autos', 'vida', 'gmm', 'hogar', 'mascotas', 'rc', 'negocio', 'transporte',
  'emant', 'emant_caratula', 'emant_listado', 'gruposgmm', 'gruposautos', 'gruposvida', 
  'listadoautos', 'listadovida', 'birthdays', 'policy_status', 'diversos',
  
  // Variaciones posibles para equipos CASIN
  'team_4JlUqhAvfJMlCDhQ4vgH_directorio_contactos',
  'team_4JlUqhAvfJMlCDhQ4vgH_autos',
  'team_4JlUqhAvfJMlCDhQ4vgH_vida',
  'team_4JlUqhAvfJMlCDhQ4vgH_gmm',
  'team_4JlUqhAvfJMlCDhQ4vgH_hogar',
  'team_4JlUqhAvfJMlCDhQ4vgH_mascotas',
  'team_4JlUqhAvfJMlCDhQ4vgH_rc',
  'team_4JlUqhAvfJMlCDhQ4vgH_negocio',
  'team_4JlUqhAvfJMlCDhQ4vgH_transporte',
  'team_4JlUqhAvfJMlCDhQ4vgH_emant',
  'team_4JlUqhAvfJMlCDhQ4vgH_emant_caratula',
  'team_4JlUqhAvfJMlCDhQ4vgH_emant_listado',
  'team_4JlUqhAvfJMlCDhQ4vgH_gruposgmm',
  'team_4JlUqhAvfJMlCDhQ4vgH_gruposautos',
  'team_4JlUqhAvfJMlCDhQ4vgH_gruposvida',
  'team_4JlUqhAvfJMlCDhQ4vgH_listadoautos',
  'team_4JlUqhAvfJMlCDhQ4vgH_listadovida',
  'team_4JlUqhAvfJMlCDhQ4vgH_birthdays',
  'team_4JlUqhAvfJMlCDhQ4vgH_policy_status',
  'team_4JlUqhAvfJMlCDhQ4vgH_diversos',
  'team_4JlUqhAvfJMlCDhQ4vgH_contactos',
  'team_4JlUqhAvfJMlCDhQ4vgH_polizas',
  'team_4JlUqhAvfJMlCDhQ4vgH_tareas',
  'team_4JlUqhAvfJMlCDhQ4vgH_reportes',
  'team_4JlUqhAvfJMlCDhQ4vgH_configuracion',
  
  // Para el segundo equipo CASIN
  'team_ngXzjqxlBy8Bsv8ks3vc_directorio_contactos',
  'team_ngXzjqxlBy8Bsv8ks3vc_autos',
  'team_ngXzjqxlBy8Bsv8ks3vc_vida',
  'team_ngXzjqxlBy8Bsv8ks3vc_gmm',
  'team_ngXzjqxlBy8Bsv8ks3vc_hogar',
  'team_ngXzjqxlBy8Bsv8ks3vc_mascotas',
  'team_ngXzjqxlBy8Bsv8ks3vc_rc',
  'team_ngXzjqxlBy8Bsv8ks3vc_negocio',
  'team_ngXzjqxlBy8Bsv8ks3vc_transporte',
  'team_ngXzjqxlBy8Bsv8ks3vc_emant',
  'team_ngXzjqxlBy8Bsv8ks3vc_emant_caratula',
  'team_ngXzjqxlBy8Bsv8ks3vc_emant_listado',
  'team_ngXzjqxlBy8Bsv8ks3vc_gruposgmm',
  'team_ngXzjqxlBy8Bsv8ks3vc_gruposautos',
  'team_ngXzjqxlBy8Bsv8ks3vc_gruposvida',
  'team_ngXzjqxlBy8Bsv8ks3vc_listadoautos',
  'team_ngXzjqxlBy8Bsv8ks3vc_listadovida',
  'team_ngXzjqxlBy8Bsv8ks3vc_birthdays',
  'team_ngXzjqxlBy8Bsv8ks3vc_policy_status',
  'team_ngXzjqxlBy8Bsv8ks3vc_diversos',
  'team_ngXzjqxlBy8Bsv8ks3vc_contactos',
  'team_ngXzjqxlBy8Bsv8ks3vc_polizas',
  'team_ngXzjqxlBy8Bsv8ks3vc_tareas',
  'team_ngXzjqxlBy8Bsv8ks3vc_reportes',
  'team_ngXzjqxlBy8Bsv8ks3vc_configuracion',
  
  // Posibles variaciones con prefijo CASIN
  'team_CASIN_directorio_contactos',
  'team_CASIN_autos',
  'team_CASIN_vida',
  'team_CASIN_gmm',
  'team_CASIN_hogar',
  'team_CASIN_mascotas',
  'team_CASIN_rc',
  'team_CASIN_negocio',
  'team_CASIN_transporte',
  'team_CASIN_emant',
  'team_CASIN_emant_caratula',
  'team_CASIN_emant_listado',
  'team_CASIN_gruposgmm',
  'team_CASIN_gruposautos',
  'team_CASIN_gruposvida',
  'team_CASIN_listadoautos',
  'team_CASIN_listadovida',
  'team_CASIN_birthdays',
  'team_CASIN_policy_status',
  'team_CASIN_diversos'
];

async function checkCollectionExists(collectionName) {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(query(collectionRef, limit(1)));
    
    if (!snapshot.empty) {
      return {
        exists: true,
        documentCount: snapshot.size,
        hasMoreDocs: snapshot.size === 1 // Si tiene 1 doc con limit(1), probablemente tiene más
      };
    }
    return { exists: false };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

async function getFullDocumentCount(collectionName) {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    return snapshot.size;
  } catch (error) {
    return 0;
  }
}

async function main() {
  console.log('🔍 Escaneando todas las posibles colecciones...');
  console.log(`📋 Total de nombres a verificar: ${allPossibleCollectionNames.length}`);
  console.log('');
  
  const existingCollections = [];
  const globalCollections = [];
  const casinCollections = [];
  const otherTeamCollections = [];
  
  for (const collectionName of allPossibleCollectionNames) {
    const result = await checkCollectionExists(collectionName);
    
    if (result.exists) {
      const fullCount = await getFullDocumentCount(collectionName);
      
      const collectionInfo = {
        name: collectionName,
        documentCount: fullCount,
        ...result
      };
      
      console.log(`✅ ${collectionName} - ${fullCount} documentos`);
      existingCollections.push(collectionInfo);
      
      // Categorizar
      if (collectionName.includes('team_4JlUqhAvfJMlCDhQ4vgH_') || 
          collectionName.includes('team_ngXzjqxlBy8Bsv8ks3vc_') ||
          collectionName.includes('team_CASIN_')) {
        casinCollections.push(collectionInfo);
      } else if (collectionName.startsWith('team_')) {
        otherTeamCollections.push(collectionInfo);
      } else {
        globalCollections.push(collectionInfo);
      }
    }
  }
  
  console.log('');
  console.log('📊 RESUMEN DEL DIAGNÓSTICO:');
  console.log('=========================');
  console.log(`🌐 Colecciones Globales: ${globalCollections.length}`);
  console.log(`🏢 Colecciones CASIN: ${casinCollections.length}`);
  console.log(`👥 Colecciones Otros Equipos: ${otherTeamCollections.length}`);
  console.log(`📁 Total Encontradas: ${existingCollections.length}`);
  console.log('');
  
  if (globalCollections.length > 0) {
    console.log('🌐 COLECCIONES GLOBALES:');
    globalCollections.forEach(col => {
      console.log(`   • ${col.name} (${col.documentCount} docs)`);
    });
    console.log('');
  }
  
  if (casinCollections.length > 0) {
    console.log('🏢 COLECCIONES CASIN ENCONTRADAS:');
    casinCollections.forEach(col => {
      console.log(`   • ${col.name} (${col.documentCount} docs)`);
    });
    console.log('');
  } else {
    console.log('❌ NO SE ENCONTRARON COLECCIONES CASIN');
    console.log('   Esto explica por qué no aparecen en el dashboard');
    console.log('');
  }
  
  if (otherTeamCollections.length > 0) {
    console.log('👥 COLECCIONES DE OTROS EQUIPOS:');
    otherTeamCollections.forEach(col => {
      console.log(`   • ${col.name} (${col.documentCount} docs)`);
    });
  }
  
  console.log('');
  console.log('🔍 ANÁLISIS:');
  console.log('============');
  
  if (casinCollections.length === 0) {
    console.log('❌ PROBLEMA IDENTIFICADO:');
    console.log('   Los equipos CASIN no tienen colecciones creadas con el patrón esperado.');
    console.log('   Esto puede deberse a:');
    console.log('   1. Las colecciones CASIN están en la base de datos original (no migradas)');
    console.log('   2. Los equipos CASIN se crearon pero nunca se inicializaron las colecciones');
    console.log('   3. Se usó un patrón de nombres diferente');
    console.log('');
    console.log('💡 SOLUCIÓN SUGERIDA:');
    console.log('   1. Inicializar colecciones para los equipos CASIN existentes');
    console.log('   2. O migrar datos de las colecciones globales a las colecciones de equipo');
  }
  
  // Guardar diagnóstico en archivo
  const diagnosticResult = {
    timestamp: new Date().toISOString(),
    totalChecked: allPossibleCollectionNames.length,
    totalFound: existingCollections.length,
    globalCollections,
    casinCollections,
    otherTeamCollections,
    analysis: {
      casinTeamsHaveCollections: casinCollections.length > 0,
      possibleIssue: casinCollections.length === 0 ? 'CASIN teams have no collections' : null
    }
  };
  
  const fs = await import('fs');
  const filename = `diagnostic-missing-collections-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(diagnosticResult, null, 2));
  
  console.log(`📄 Diagnóstico guardado en: ${filename}`);
  console.log('🎉 Diagnóstico completado');
}

main().catch(console.error); 