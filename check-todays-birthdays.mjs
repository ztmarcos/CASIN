#!/usr/bin/env node

/**
 * Script to check today's birthdays and their email status
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

async function checkTodaysBirthdays() {
  try {
    console.log('🎂 Checking today\'s birthdays...\n');
    
    const collections = ['directorio_contactos', 'autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
    const birthdays = [];
    const today = new Date();
    
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).get();
        
        snapshot.forEach(doc => {
          const data = doc.data();
          let birthdayDate = null;
          let birthdaySource = 'unknown';
          
          // First, try to get birthday from explicit fecha_nacimiento field
          if (data.fecha_nacimiento) {
            try {
              birthdayDate = new Date(data.fecha_nacimiento);
              if (!isNaN(birthdayDate.getTime())) {
                birthdaySource = 'fecha_nacimiento';
              } else {
                birthdayDate = null;
              }
            } catch (err) {
              // Skip invalid dates
            }
          }
          
          // If no fecha_nacimiento, try to extract from RFC
          if (!birthdayDate) {
            const rfc = data.rfc || data.RFC;
            
            if (rfc && typeof rfc === 'string') {
              const cleanRFC = rfc.trim().toUpperCase();
              
              // Only process personal RFCs (13 characters)
              if (cleanRFC.length === 13) {
                const personalPattern = /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/;
                if (personalPattern.test(cleanRFC)) {
                  // Extract birthday from RFC (YYMMDD format)
                  const yearDigits = cleanRFC.substring(4, 6);
                  const month = cleanRFC.substring(6, 8);
                  const day = cleanRFC.substring(8, 10);
                  
                  const currentYear = new Date().getFullYear();
                  const century = parseInt(yearDigits) <= 30 ? 2000 : 1900;
                  const year = century + parseInt(yearDigits);
                  
                  try {
                    birthdayDate = new Date(year, parseInt(month) - 1, parseInt(day));
                    
                    if (!isNaN(birthdayDate.getTime())) {
                      birthdaySource = 'RFC';
                    } else {
                      birthdayDate = null;
                    }
                  } catch (err) {
                    // Skip invalid dates
                  }
                }
              }
            }
          }
          
          // If we have a valid birthday, check if it's today
          if (birthdayDate && !isNaN(birthdayDate.getTime())) {
            const birthMonth = birthdayDate.getMonth();
            const birthDay = birthdayDate.getDate();
            
            if (birthMonth === today.getMonth() && birthDay === today.getDate()) {
              const currentYear = new Date().getFullYear();
              const age = currentYear - birthdayDate.getFullYear();
              
              birthdays.push({
                id: doc.id,
                name: data.nombre_contratante || data.contratante || data.nombre || data.nombre_completo || data.nombre_asegurado || 'Sin nombre',
                rfc: data.rfc || data.RFC || '',
                email: data.email || data.correo || data.e_mail || null,
                date: birthdayDate.toISOString(),
                age: age,
                source: collectionName,
                details: `${collectionName} - ${data.numero_poliza || 'Sin póliza'}`,
                birthdaySource: birthdaySource
              });
            }
          }
        });
      } catch (error) {
        console.log(`⚠️  Error fetching ${collectionName}:`, error.message);
      }
    }
    
    console.log(`📊 Total cumpleaños encontrados hoy: ${birthdays.length}\n`);
    
    if (birthdays.length === 0) {
      console.log('❌ No hay cumpleaños hoy');
      process.exit(0);
    }
    
    console.log('🎂 Cumpleaños de hoy:\n');
    birthdays.forEach((b, index) => {
      console.log(`${index + 1}. ${b.name}`);
      console.log(`   📧 Email: ${b.email || '❌ NO TIENE EMAIL'}`);
      console.log(`   🎂 Edad: ${b.age} años`);
      console.log(`   📅 Fecha: ${new Date(b.date).toLocaleDateString('es-MX')}`);
      console.log(`   📋 Fuente: ${b.source} (${b.birthdaySource})`);
      console.log(`   🔍 RFC: ${b.rfc || 'N/A'}`);
      console.log(`   📝 Detalles: ${b.details}`);
      console.log('');
    });
    
    const withEmail = birthdays.filter(b => b.email);
    const withoutEmail = birthdays.filter(b => !b.email);
    
    console.log(`\n📊 Resumen:`);
    console.log(`   ✅ Con email: ${withEmail.length}`);
    console.log(`   ❌ Sin email: ${withoutEmail.length}`);
    
    if (withEmail.length > 0) {
      console.log(`\n📧 Se enviarán ${withEmail.length} correo(s) de cumpleaños`);
      console.log(`   Con copia BCC a: ztmarcos@gmail.com, casinseguros@gmail.com`);
    } else {
      console.log(`\n⚠️  No se enviarán correos porque ningún cumpleañero tiene email registrado`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTodaysBirthdays();

