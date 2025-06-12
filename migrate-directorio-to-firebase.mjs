import admin from 'firebase-admin';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: join(__dirname, '.env') });

console.log('🔥 Initializing Firebase Admin...');

// Initialize Firebase Admin with the same pattern as server-mysql.js
console.log('🔑 Setting up Firebase credentials...');

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;

if (!privateKey || !projectId) {
  throw new Error('❌ Missing Firebase credentials in .env file');
}

// Format private key properly
const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

const serviceAccount = {
  type: 'service_account',
  project_id: projectId,
  private_key: formattedPrivateKey,
  client_email: 'firebase-adminsdk-hnwk0@casinbbdd.iam.gserviceaccount.com',
};

console.log('🔥 Initializing Firebase app...');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId
  });
}

console.log('✅ Firebase Admin initialized successfully');

const db = admin.firestore();

// MySQL connection
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crud_db'
});

async function checkFirebaseState() {
  try {
    console.log('🔍 Checking current Firebase state...');
    const snapshot = await db.collection('directorio_contactos').get();
    console.log(`📊 Firebase currently has ${snapshot.size} contacts`);
    
    if (snapshot.size > 0) {
      console.log('⚠️  Firebase already has contacts. To prevent duplicates, please run clean-firebase-directorio.mjs first.');
      // Auto-continue for incremental migration (add missing contacts only)
      console.log('🔄 Continuing with incremental migration to add missing contacts...');
      const answer = 'y';
      
      if (answer !== 'y' && answer !== 'yes') {
        console.log('❌ Migration cancelled by user');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking Firebase state:', error);
    return false;
  }
}

async function migrateDirectorioToFirebase() {
  try {
    console.log('📋 Starting migration of directorio_contactos from MySQL to Firebase...');
    
    // Check Firebase state first
    const shouldContinue = await checkFirebaseState();
    if (!shouldContinue) {
      return;
    }
    
    // Get all contacts from MySQL
    const [rows] = await connection.execute('SELECT * FROM directorio_contactos ORDER BY id ASC');
    console.log(`📊 Found ${rows.length} contacts in MySQL directorio_contactos`);
    
    if (rows.length === 0) {
      console.log('❌ No contacts found in MySQL. Nothing to migrate.');
      return;
    }
    
    // First, get all existing Firebase IDs to avoid duplicates
    console.log('🔍 Checking existing contacts in Firebase...');
    const firebaseSnapshot = await db.collection('directorio_contactos').get();
    const existingIds = new Set();
    firebaseSnapshot.forEach(doc => {
      existingIds.add(doc.id);
    });
    console.log(`📊 Found ${existingIds.size} existing contacts in Firebase`);
    
    const batch = db.batch();
    let batchCount = 0;
    let totalMigrated = 0;
    let skipped = 0;
    
    for (const contact of rows) {
      try {
        const contactIdStr = contact.id.toString();
        
        // Check if contact already exists
        if (existingIds.has(contactIdStr)) {
          console.log(`⏭️  Contact ${contact.id} already exists in Firebase, skipping...`);
          skipped++;
          continue;
        }
        
        // Prepare contact data for Firebase
        const firebaseData = {
          ...contact,
          id: contactIdStr, // Ensure ID is string for Firebase
          created_at: contact.created_at ? contact.created_at.toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Remove any undefined or null values and convert to strings where appropriate
        Object.keys(firebaseData).forEach(key => {
          if (firebaseData[key] === null || firebaseData[key] === undefined) {
            firebaseData[key] = '';
          } else if (typeof firebaseData[key] === 'object' && firebaseData[key] instanceof Date) {
            firebaseData[key] = firebaseData[key].toISOString();
          }
        });
        
        // Add to batch
        const docRef = db.collection('directorio_contactos').doc(contactIdStr);
        batch.set(docRef, firebaseData);
        batchCount++;
        existingIds.add(contactIdStr); // Add to existing set to prevent duplicates within this batch
        
        console.log(`➕ Added contact ${contact.id} (${contact.nombre_completo || 'N/A'}) to migration batch`);
        
        // Commit batch every 500 documents (Firestore limit)
        if (batchCount >= 500) {
          console.log(`🔄 Committing batch of ${batchCount} contacts...`);
          await batch.commit();
          totalMigrated += batchCount;
          console.log(`✅ Committed ${batchCount} contacts. Total migrated: ${totalMigrated}`);
          batchCount = 0;
          
          // Add a small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing contact ${contact.id}:`, error);
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      console.log(`🔄 Committing final batch of ${batchCount} contacts...`);
      await batch.commit();
      totalMigrated += batchCount;
      console.log(`✅ Committed final batch. Total migrated: ${totalMigrated}`);
    }
    
    console.log(`🎉 Migration completed!`);
    console.log(`📊 Total contacts processed: ${rows.length}`);
    console.log(`➕ New contacts migrated: ${totalMigrated}`);
    console.log(`⏭️  Contacts skipped (already existed): ${skipped}`);
    
    // Verify migration
    const finalSnapshot = await db.collection('directorio_contactos').get();
    console.log(`🔍 Verification: Firebase now has ${finalSnapshot.size} contacts`);
    
    if (finalSnapshot.size === rows.length) {
      console.log('✅ Perfect! Firebase count matches MySQL count');
    } else {
      console.log(`⚠️  Count mismatch: MySQL has ${rows.length}, Firebase has ${finalSnapshot.size}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await migrateDirectorioToFirebase();
    console.log('✅ Migration script completed successfully!');
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
    process.exit(0);
  }
}

main(); 