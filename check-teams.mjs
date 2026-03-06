#!/usr/bin/env node
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('🔍 Verificando equipos en Firebase...\n');

try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey) {
    throw new Error('FIREBASE_PRIVATE_KEY no encontrada en .env');
  }

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.VITE_FIREBASE_PROJECT_ID || 'casinbbdd',
    private_key: privateKey,
    client_email: `firebase-adminsdk-hnwk0@${process.env.VITE_FIREBASE_PROJECT_ID || 'casinbbdd'}.iam.gserviceaccount.com`,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('✅ Firebase Admin inicializado\n');
} catch (error) {
  console.error('❌ Error inicializando Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function checkTeams() {
  try {
    console.log('📋 Listando todos los equipos en la colección "teams":\n');
    
    const teamsSnapshot = await db.collection('teams').get();
    
    if (teamsSnapshot.empty) {
      console.log('❌ No se encontraron equipos en la colección "teams"');
      return;
    }
    
    console.log(`✅ Encontrados ${teamsSnapshot.size} equipos:\n`);
    
    teamsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📌 ID del documento: ${doc.id}`);
      console.log(`   Nombre: ${data.name || 'Sin nombre'}`);
      console.log(`   Descripción: ${data.description || 'Sin descripción'}`);
      console.log(`   Owner: ${data.owner || 'Sin owner'}`);
      console.log(`   isMainTeam: ${data.isMainTeam || false}`);
      console.log(`   Creado: ${data.createdAt?.toDate?.() || 'N/A'}`);
      console.log('');
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Verificar específicamente test_team_001
    console.log('🔍 Verificando específicamente "test_team_001"...\n');
    const testTeamDoc = await db.collection('teams').doc('test_team_001').get();
    
    if (testTeamDoc.exists) {
      console.log('✅ test_team_001 EXISTE');
      console.log('   Datos:', JSON.stringify(testTeamDoc.data(), null, 2));
    } else {
      console.log('❌ test_team_001 NO EXISTE');
      console.log('   Necesitas ejecutar: npm run create:test-team');
    }
    
  } catch (error) {
    console.error('❌ Error verificando equipos:', error);
  }
}

checkTeams()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
