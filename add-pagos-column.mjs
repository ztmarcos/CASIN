#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBvOkBwJ1Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4",
  authDomain: "casinbbdd.firebaseapp.com",
  projectId: "casinbbdd",
  storageBucket: "casinbbdd.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Tables to update
const tables = ['vida', 'hogar', 'negocio', 'emant_caratula', 'emant_listado', 'autos'];

async function addPagosColumn() {
  console.log('🚀 Starting to add "pagos" column to all tables...');
  
  for (const tableName of tables) {
    try {
      console.log(`\n📋 Processing table: ${tableName}`);
      
      // Get all documents from the collection
      const collectionRef = collection(db, tableName);
      const snapshot = await getDocs(collectionRef);
      
      console.log(`📊 Found ${snapshot.size} documents in ${tableName}`);
      
      let updatedCount = 0;
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const docRef = doc(db, tableName, docSnapshot.id);
        
        // Check if pagos column already exists
        if (data.pagos !== undefined) {
          console.log(`⏭️  Document ${docSnapshot.id} already has pagos column, skipping...`);
          continue;
        }
        
        // Add pagos column with default value
        await updateDoc(docRef, {
          pagos: '1/1' // Default value, will be calculated by the frontend
        });
        
        updatedCount++;
        console.log(`✅ Updated document ${docSnapshot.id} in ${tableName}`);
      }
      
      console.log(`🎉 Completed ${tableName}: ${updatedCount} documents updated`);
      
    } catch (error) {
      console.error(`❌ Error processing table ${tableName}:`, error);
    }
  }
  
  console.log('\n🏁 All tables processed!');
}

// Run the script
addPagosColumn()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
