import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbpUAe9MZwYHcT6XB0jPU4Nz2kJkGvGho",
  authDomain: "casinbbdd.firebaseapp.com",
  projectId: "casinBBDD",
  storageBucket: "casinBBDD.firebasestorage.app",
  messagingSenderId: "590507108414",
  appId: "1:590507108414:web:03e3c30b8d0f3fcfd86b8a"
};

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

async function testBirthdays() {
  console.log('🔍 Testing birthday extraction from Firebase...');
  
  try {
    // Get contacts from Firebase
    const contactsQuery = query(collection(db, 'directorio_contactos'), limit(50));
    const snapshot = await getDocs(contactsQuery);
    
    console.log(`📋 Retrieved ${snapshot.size} contacts from Firebase`);
    
    let contactsWithRFC = 0;
    let validBirthdays = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Check if contact has RFC
      if (data.rfc) {
        contactsWithRFC++;
        console.log(`\n✅ Contact with RFC: ${data.nombre_completo || 'Sin nombre'}`);
        console.log(`   RFC: ${data.rfc}`);
        
        // Try to extract birthday
        const birthday = extractBirthdayFromRFC(data.rfc);
        if (birthday) {
          validBirthdays++;
          console.log(`   🎂 Birthday extracted: ${birthday.toLocaleDateString()}`);
        } else {
          console.log(`   ❌ Could not extract birthday from RFC: ${data.rfc}`);
        }
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total contacts: ${snapshot.size}`);
    console.log(`   Contacts with RFC: ${contactsWithRFC}`);
    console.log(`   Valid birthdays extracted: ${validBirthdays}`);
    
    if (contactsWithRFC === 0) {
      console.log('\n🔍 Checking contact structure...');
      let sampleCount = 0;
      snapshot.forEach(doc => {
        if (sampleCount < 3) {
          const data = doc.data();
          console.log(`\nSample contact ${sampleCount + 1}:`, {
            id: doc.id,
            nombre_completo: data.nombre_completo,
            rfc: data.rfc || 'NO RFC',
            email: data.email || 'NO EMAIL',
            keys: Object.keys(data).slice(0, 10)
          });
          sampleCount++;
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing birthdays:', error);
  }
}

// Run the test
testBirthdays().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbpUAe9MZwYHcT6XB0jPU4Nz2kJkGvGho",
  authDomain: "casinbbdd.firebaseapp.com",
  projectId: "casinBBDD",
  storageBucket: "casinBBDD.firebasestorage.app",
  messagingSenderId: "590507108414",
  appId: "1:590507108414:web:03e3c30b8d0f3fcfd86b8a"
};

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

async function testBirthdays() {
  console.log('🔍 Testing birthday extraction from Firebase...');
  
  try {
    // Get contacts from Firebase
    const contactsQuery = query(collection(db, 'directorio_contactos'), limit(50));
    const snapshot = await getDocs(contactsQuery);
    
    console.log(`📋 Retrieved ${snapshot.size} contacts from Firebase`);
    
    let contactsWithRFC = 0;
    let validBirthdays = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Check if contact has RFC
      if (data.rfc) {
        contactsWithRFC++;
        console.log(`\n✅ Contact with RFC: ${data.nombre_completo || 'Sin nombre'}`);
        console.log(`   RFC: ${data.rfc}`);
        
        // Try to extract birthday
        const birthday = extractBirthdayFromRFC(data.rfc);
        if (birthday) {
          validBirthdays++;
          console.log(`   🎂 Birthday extracted: ${birthday.toLocaleDateString()}`);
        } else {
          console.log(`   ❌ Could not extract birthday from RFC: ${data.rfc}`);
        }
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total contacts: ${snapshot.size}`);
    console.log(`   Contacts with RFC: ${contactsWithRFC}`);
    console.log(`   Valid birthdays extracted: ${validBirthdays}`);
    
    if (contactsWithRFC === 0) {
      console.log('\n🔍 Checking contact structure...');
      let sampleCount = 0;
      snapshot.forEach(doc => {
        if (sampleCount < 3) {
          const data = doc.data();
          console.log(`\nSample contact ${sampleCount + 1}:`, {
            id: doc.id,
            nombre_completo: data.nombre_completo,
            rfc: data.rfc || 'NO RFC',
            email: data.email || 'NO EMAIL',
            keys: Object.keys(data).slice(0, 10)
          });
          sampleCount++;
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing birthdays:', error);
  }
}

// Run the test
testBirthdays().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
}); 