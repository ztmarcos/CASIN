#!/usr/bin/env node

/**
 * Script to check Alfredo's document in Firebase to see what email field it has
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
try {
  const serviceAccountPath = join(__dirname, 'casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Error initializing Firebase:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function checkAlfredo() {
  try {
    console.log('🔍 Searching for Alfredo Casar Gonzalez in autos collection...\n');
    
    // Search by RFC
    const snapshot = await db.collection('autos')
      .where('rfc', '==', 'CAGX601204JB8')
      .get();
    
    if (snapshot.empty) {
      console.log('❌ No document found with RFC CAGX601204JB8');
      process.exit(1);
    }
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('📄 Document ID:', doc.id);
      console.log('📋 All fields in document:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n📧 Email fields found:');
      const emailFields = Object.keys(data).filter(k => 
        k.toLowerCase().includes('mail') || 
        k.toLowerCase().includes('correo') ||
        k.toLowerCase().includes('email')
      );
      
      if (emailFields.length > 0) {
        emailFields.forEach(field => {
          console.log(`   ${field}: ${data[field]}`);
        });
      } else {
        console.log('   ❌ No email-related fields found');
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAlfredo();

