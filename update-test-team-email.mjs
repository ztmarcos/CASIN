#!/usr/bin/env node
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

console.log('🔧 Actualizando email de Test Team...\n');

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

async function updateTestTeamEmail() {
  try {
    const teamId = 'test_team_001';
    
    console.log(`📝 Actualizando emailConfig de ${teamId}...\n`);
    
    await db.collection('teams').doc(teamId).update({
      'emailConfig.senderEmail': 'z.t.marcos@gmail.com',
      'emailConfig.senderName': 'Test Team - Marcos'
    });
    
    console.log('✅ Email actualizado correctamente');
    console.log('   Nuevo email: z.t.marcos@gmail.com');
    console.log('   Nuevo nombre: Test Team - Marcos');
    
  } catch (error) {
    console.error('❌ Error actualizando email:', error);
  }
}

updateTestTeamEmail()
  .then(() => {
    console.log('\n✅ Actualización completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
