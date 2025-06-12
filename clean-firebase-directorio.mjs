import admin from 'firebase-admin';
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

async function cleanFirebaseDirectorio() {
  try {
    console.log('🧹 Starting cleanup of Firebase directorio_contactos...');
    
    // Get all documents from Firebase
    const snapshot = await db.collection('directorio_contactos').get();
    console.log(`📊 Found ${snapshot.size} documents in Firebase directorio_contactos`);
    
    if (snapshot.size === 0) {
      console.log('❌ No documents found in Firebase. Nothing to clean.');
      return;
    }
    
    let batch = db.batch();
    let batchCount = 0;
    let totalDeleted = 0;
    
    for (const doc of snapshot.docs) {
      try {
        // Add to delete batch
        batch.delete(doc.ref);
        batchCount++;
        
        console.log(`🗑️  Added document ${doc.id} to deletion batch`);
        
        // Commit batch every 500 documents (Firestore limit)
        if (batchCount >= 500) {
          console.log(`🔄 Committing deletion batch of ${batchCount} documents...`);
          await batch.commit();
          totalDeleted += batchCount;
          console.log(`✅ Deleted ${batchCount} documents. Total deleted: ${totalDeleted}`);
          
          // Create a new batch for the next set of operations
          batch = db.batch();
          batchCount = 0;
          
          // Add a small delay to avoid hitting rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing document ${doc.id}:`, error);
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      console.log(`🔄 Committing final deletion batch of ${batchCount} documents...`);
      await batch.commit();
      totalDeleted += batchCount;
      console.log(`✅ Deleted final batch. Total deleted: ${totalDeleted}`);
    }
    
    console.log(`🎉 Cleanup completed! Deleted ${totalDeleted} documents from Firebase`);
    
    // Verify cleanup
    const verifySnapshot = await db.collection('directorio_contactos').get();
    console.log(`🔍 Verification: Firebase now has ${verifySnapshot.size} documents`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await cleanFirebaseDirectorio();
    console.log('✅ Cleanup script completed successfully!');
  } catch (error) {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main(); 