#!/usr/bin/env node
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('🔍 Verificando datos de Test Team...\n');

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

async function checkTestTeamData() {
  try {
    const teamId = 'test_team_001';
    const tables = ['autos', 'gmm', 'vida', 'hogar', 'rc'];
    
    console.log(`📊 Verificando datos en colecciones de Test Team (${teamId}):\n`);
    
    for (const table of tables) {
      const collectionName = `team_${teamId}_${table}`;
      console.log(`━━━ ${collectionName} ━━━`);
      
      const snapshot = await db.collection(collectionName).limit(5).get();
      
      if (snapshot.empty) {
        console.log(`  ⚠️  Colección vacía`);
      } else {
        console.log(`  ✅ ${snapshot.size} documento(s) encontrado(s)`);
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log(`     📄 Doc ID: ${doc.id}`);
          console.log(`        Contratante: ${data.contratante || data.nombre_contratante || 'N/A'}`);
          console.log(`        Aseguradora: ${data.aseguradora || 'N/A'}`);
          console.log(`        teamId: ${data.teamId || 'N/A'}`);
        });
      }
      console.log('');
    }
    
    // Verificar también las colecciones de CASIN para comparar
    console.log('\n📊 Comparación con CASIN (sin prefijo):\n');
    
    for (const table of tables) {
      const snapshot = await db.collection(table).limit(1).get();
      console.log(`${table}: ${snapshot.size} documentos`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  }
}

checkTestTeamData()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
