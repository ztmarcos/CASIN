import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log('🔧 Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 20)}...` : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
  storageBucket: firebaseConfig.storageBucket || 'MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
  appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 20)}...` : 'MISSING'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// RFC extraction function
function extractBirthdayFromRFC(rfc) {
  if (!rfc) return null;

  // Clean the RFC string (remove dots and spaces)
  const cleanRFC = rfc.replace(/[.\s]/g, '').toUpperCase();

  // RFC should be at least 10 characters (4 letters + 6 digits)
  if (cleanRFC.length < 10) return null;

  // Extract the date portion (positions 4-9)
  const dateStr = cleanRFC.substring(4, 10);
  
  // Extract year, month, and day
  const year = parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1; // JS months are 0-based
  const day = parseInt(dateStr.substring(4, 6));

  // Determine the full year (assuming 20th or 21st century)
  const fullYear = year < 30 ? 2000 + year : 1900 + year;

  // Create and validate the date
  const date = new Date(fullYear, month, day);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) return null;
  
  return date;
}

async function testAllCollections() {
  console.log('🔍 Testing birthday extraction from all Firebase collections...');
  
  // All collections to check
  const collections = ['directorio_contactos', 'autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
  
  let totalRecords = 0;
  let totalWithRFC = 0;
  let totalValidBirthdays = 0;
  
  for (const collectionName of collections) {
    try {
      console.log(`\n📋 Checking collection: ${collectionName}`);
      
      // Get documents from this collection
      const collectionQuery = query(collection(db, collectionName), limit(20));
      const snapshot = await getDocs(collectionQuery);
      
      console.log(`   Retrieved ${snapshot.size} documents`);
      totalRecords += snapshot.size;
      
      let collectionRFCCount = 0;
      let collectionBirthdayCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Check if document has RFC
        if (data.rfc) {
          collectionRFCCount++;
          totalWithRFC++;
          
          console.log(`   ✅ RFC found: ${data.rfc} (${data.nombre_completo || data.contratante || data.asegurado || 'Sin nombre'})`);
          
          // Try to extract birthday
          const birthday = extractBirthdayFromRFC(data.rfc);
          if (birthday) {
            collectionBirthdayCount++;
            totalValidBirthdays++;
            console.log(`     🎂 Birthday: ${birthday.toLocaleDateString()}`);
          } else {
            console.log(`     ❌ Invalid RFC format: ${data.rfc}`);
          }
        }
      });
      
      console.log(`   📊 Collection summary: ${collectionRFCCount} with RFC, ${collectionBirthdayCount} valid birthdays`);
      
    } catch (error) {
      console.warn(`   ⚠️  Error accessing collection ${collectionName}:`, error.message);
    }
  }
  
  console.log(`\n🎯 TOTAL SUMMARY:`);
  console.log(`   Total records checked: ${totalRecords}`);
  console.log(`   Records with RFC: ${totalWithRFC}`);
  console.log(`   Valid birthdays extracted: ${totalValidBirthdays}`);
  
  return { totalRecords, totalWithRFC, totalValidBirthdays };
}

// Run the test
testAllCollections().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

console.log('🔧 Firebase Config:', {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 20)}...` : 'MISSING',
  authDomain: firebaseConfig.authDomain || 'MISSING',
  projectId: firebaseConfig.projectId || 'MISSING',
  storageBucket: firebaseConfig.storageBucket || 'MISSING',
  messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
  appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 20)}...` : 'MISSING'
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// RFC extraction function
function extractBirthdayFromRFC(rfc) {
  if (!rfc) return null;

  // Clean the RFC string (remove dots and spaces)
  const cleanRFC = rfc.replace(/[.\s]/g, '').toUpperCase();

  // RFC should be at least 10 characters (4 letters + 6 digits)
  if (cleanRFC.length < 10) return null;

  // Extract the date portion (positions 4-9)
  const dateStr = cleanRFC.substring(4, 10);
  
  // Extract year, month, and day
  const year = parseInt(dateStr.substring(0, 2));
  const month = parseInt(dateStr.substring(2, 4)) - 1; // JS months are 0-based
  const day = parseInt(dateStr.substring(4, 6));

  // Determine the full year (assuming 20th or 21st century)
  const fullYear = year < 30 ? 2000 + year : 1900 + year;

  // Create and validate the date
  const date = new Date(fullYear, month, day);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) return null;
  
  return date;
}

async function testAllCollections() {
  console.log('🔍 Testing birthday extraction from all Firebase collections...');
  
  // All collections to check
  const collections = ['directorio_contactos', 'autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
  
  let totalRecords = 0;
  let totalWithRFC = 0;
  let totalValidBirthdays = 0;
  
  for (const collectionName of collections) {
    try {
      console.log(`\n📋 Checking collection: ${collectionName}`);
      
      // Get documents from this collection
      const collectionQuery = query(collection(db, collectionName), limit(20));
      const snapshot = await getDocs(collectionQuery);
      
      console.log(`   Retrieved ${snapshot.size} documents`);
      totalRecords += snapshot.size;
      
      let collectionRFCCount = 0;
      let collectionBirthdayCount = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Check if document has RFC
        if (data.rfc) {
          collectionRFCCount++;
          totalWithRFC++;
          
          console.log(`   ✅ RFC found: ${data.rfc} (${data.nombre_completo || data.contratante || data.asegurado || 'Sin nombre'})`);
          
          // Try to extract birthday
          const birthday = extractBirthdayFromRFC(data.rfc);
          if (birthday) {
            collectionBirthdayCount++;
            totalValidBirthdays++;
            console.log(`     🎂 Birthday: ${birthday.toLocaleDateString()}`);
          } else {
            console.log(`     ❌ Invalid RFC format: ${data.rfc}`);
          }
        }
      });
      
      console.log(`   📊 Collection summary: ${collectionRFCCount} with RFC, ${collectionBirthdayCount} valid birthdays`);
      
    } catch (error) {
      console.warn(`   ⚠️  Error accessing collection ${collectionName}:`, error.message);
    }
  }
  
  console.log(`\n🎯 TOTAL SUMMARY:`);
  console.log(`   Total records checked: ${totalRecords}`);
  console.log(`   Records with RFC: ${totalWithRFC}`);
  console.log(`   Valid birthdays extracted: ${totalValidBirthdays}`);
  
  return { totalRecords, totalWithRFC, totalValidBirthdays };
}

// Run the test
testAllCollections().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 