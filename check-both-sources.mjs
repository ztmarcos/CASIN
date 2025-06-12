import admin from 'firebase-admin';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

console.log('🔍 Checking both Firebase and MySQL data sources...\n');

// Initialize Firebase
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

if (!privateKey || !projectId) {
  throw new Error('❌ Missing Firebase credentials');
}

const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
const serviceAccount = {
  type: 'service_account',
  project_id: projectId,
  private_key: formattedPrivateKey,
  client_email: 'firebase-adminsdk-hnwk0@casinbbdd.iam.gserviceaccount.com',
};

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId
  });
}

const firebaseDb = admin.firestore();

// Initialize MySQL
const mysqlConnection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crud_db'
});

async function checkFirebaseStats() {
  try {
    console.log('🔥 Checking Firebase stats...');
    const snapshot = await firebaseDb.collection('directorio_contactos').get();
    const allContactos = snapshot.docs.map(doc => doc.data());
    
    const total = allContactos.length;
    const withPhone = allContactos.filter(c => c.telefono_movil && c.telefono_movil.trim() !== '').length;
    const withEmail = allContactos.filter(c => c.email && c.email.trim() !== '').length;
    const clientes = allContactos.filter(c => c.status === 'cliente').length;
    const prospectos = allContactos.filter(c => c.status === 'prospecto').length;
    
    console.log('📊 Firebase Results:');
    console.log(`   Total contacts: ${total}`);
    console.log(`   With phone: ${withPhone}`);
    console.log(`   With email: ${withEmail}`);
    console.log(`   Clientes: ${clientes}`);
    console.log(`   Prospectos: ${prospectos}`);
    
    return { total, withPhone, withEmail, clientes, prospectos, source: 'Firebase' };
  } catch (error) {
    console.error('❌ Firebase error:', error.message);
    return null;
  }
}

async function checkMySQLStats() {
  try {
    console.log('\n🐬 Checking MySQL stats...');
    
    const [totalResult] = await mysqlConnection.execute('SELECT COUNT(*) as total FROM directorio_contactos');
    const [withPhoneResult] = await mysqlConnection.execute('SELECT COUNT(*) as total FROM directorio_contactos WHERE telefono_movil IS NOT NULL AND telefono_movil != ""');
    const [withEmailResult] = await mysqlConnection.execute('SELECT COUNT(*) as total FROM directorio_contactos WHERE email IS NOT NULL AND email != ""');
    const [clientesResult] = await mysqlConnection.execute('SELECT COUNT(*) as total FROM directorio_contactos WHERE status = "cliente"');
    const [prospectosResult] = await mysqlConnection.execute('SELECT COUNT(*) as total FROM directorio_contactos WHERE status = "prospecto"');
    
    const stats = {
      total: totalResult[0].total,
      withPhone: withPhoneResult[0].total,
      withEmail: withEmailResult[0].total,
      clientes: clientesResult[0].total,
      prospectos: prospectosResult[0].total,
      source: 'MySQL'
    };
    
    console.log('📊 MySQL Results:');
    console.log(`   Total contacts: ${stats.total}`);
    console.log(`   With phone: ${stats.withPhone}`);
    console.log(`   With email: ${stats.withEmail}`);
    console.log(`   Clientes: ${stats.clientes}`);
    console.log(`   Prospectos: ${stats.prospectos}`);
    
    return stats;
  } catch (error) {
    console.error('❌ MySQL error:', error.message);
    return null;
  }
}

async function main() {
  try {
    const firebaseStats = await checkFirebaseStats();
    const mysqlStats = await checkMySQLStats();
    
    console.log('\n📈 COMPARISON:');
    console.log('='.repeat(50));
    
    if (firebaseStats && mysqlStats) {
      const diff = firebaseStats.total - mysqlStats.total;
      console.log(`Total contacts difference: ${diff} (Firebase - MySQL)`);
      
      if (diff > 0) {
        console.log(`⚠️  Firebase has ${diff} MORE contacts than MySQL`);
        console.log('   This suggests duplicate data or incomplete cleanup');
      } else if (diff < 0) {
        console.log(`⚠️  MySQL has ${Math.abs(diff)} MORE contacts than Firebase`);
        console.log('   This suggests incomplete migration');
      } else {
        console.log('✅ Both sources have the same number of contacts');
      }
      
      console.log('\nDetailed comparison:');
      console.log(`   Total: Firebase ${firebaseStats.total} vs MySQL ${mysqlStats.total}`);
      console.log(`   Phone: Firebase ${firebaseStats.withPhone} vs MySQL ${mysqlStats.withPhone}`);
      console.log(`   Email: Firebase ${firebaseStats.withEmail} vs MySQL ${mysqlStats.withEmail}`);
      console.log(`   Clientes: Firebase ${firebaseStats.clientes} vs MySQL ${mysqlStats.clientes}`);
      console.log(`   Prospectos: Firebase ${firebaseStats.prospectos} vs MySQL ${mysqlStats.prospectos}`);
    } else {
      console.log('❌ Could not compare - one or both sources failed');
    }
    
    console.log('\n✅ Comparison completed');
  } catch (error) {
    console.error('❌ Main function error:', error);
  } finally {
    await mysqlConnection.end();
    process.exit(0);
  }
}

main(); 