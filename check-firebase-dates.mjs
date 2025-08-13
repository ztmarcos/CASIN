// Script para revisar problemas con fechas en Firebase
// Especialmente timestamps de Google Sheets como 458924375

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit } from 'firebase/firestore';

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

// Función para convertir timestamps de Excel/Google Sheets a fecha
function convertExcelTimestamp(timestamp) {
  if (typeof timestamp !== 'number') return null;
  
  // Excel/Google Sheets timestamps son días desde 1900-01-01
  // Pero Excel tiene un bug: considera 1900 como año bisiesto
  // Por eso usamos 1899-12-30 como base
  const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  
  const date = new Date(excelEpoch.getTime() + (timestamp * millisecondsPerDay));
  
  // Verificar que la fecha sea válida
  if (isNaN(date.getTime())) return null;
  
  return date;
}

// Función para detectar si un valor es un timestamp de Excel/Google Sheets
function isExcelTimestamp(value) {
  if (typeof value !== 'number') return false;
  
  // Los timestamps de Excel/Google Sheets típicamente están entre 1 y 100000
  // 1 = 1900-01-01, 100000 = aproximadamente 2174
  return value >= 1 && value <= 100000;
}

// Función para normalizar fechas
function normalizeDate(value) {
  if (!value || value === 'N/A' || value === '') return 'N/A';
  
  try {
    // Si es un timestamp de Excel/Google Sheets
    if (isExcelTimestamp(value)) {
      const date = convertExcelTimestamp(value);
      if (date) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // Si ya es una fecha válida
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    // Si es un string, intentar diferentes formatos
    if (typeof value === 'string') {
      const cleanDate = value.trim();
      
      // Formato ISO (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        return cleanDate;
      }
      
      // Formato DD/MM/YYYY o MM/DD/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanDate)) {
        const [first, second, year] = cleanDate.split('/');
        const firstNum = parseInt(first);
        const secondNum = parseInt(second);
        
        if (firstNum > 12) {
          return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
        } else if (secondNum > 12) {
          return `${year}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
        } else {
          return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
        }
      }
      
      // Intentar parsear con Date constructor
      const parsedDate = new Date(cleanDate);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
    
    // Si es un timestamp de Firebase
    if (value && typeof value === 'object' && value.toDate) {
      return value.toDate().toISOString().split('T')[0];
    }
    
    return 'N/A';
    
  } catch (error) {
    console.error(`❌ Error procesando fecha ${value}:`, error);
    return 'N/A';
  }
}

// Función para revisar una colección
async function checkCollectionDates(collectionName, limitCount = 50) {
  console.log(`\n🔍 Revisando fechas en colección: ${collectionName}`);
  console.log('=' .repeat(60));
  
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents = [];
    
    querySnapshot.forEach(doc => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    
    // Limitar para no sobrecargar
    const limitedDocs = documents.slice(0, limitCount);
    
    let totalDateFields = 0;
    let problematicDates = 0;
    let excelTimestamps = 0;
    let undefinedDates = 0;
    
    limitedDocs.forEach(doc => {
      console.log(`\n📄 Documento: ${doc.id}`);
      
      // Buscar campos que podrían ser fechas
      const dateFields = [
        'vigencia_inicio', 'vigencia_fin', 'fecha_inicio', 'fecha_fin',
        'fecha_expedicion', 'fecha_nacimiento', 'fecha_pago', 'fecha_vencimiento',
        'desde_vigencia', 'hasta_vigencia', 'fecha_creacion', 'fecha_modificacion'
      ];
      
      dateFields.forEach(fieldName => {
        if (doc.hasOwnProperty(fieldName)) {
          totalDateFields++;
          const value = doc[fieldName];
          
          console.log(`  📅 ${fieldName}: ${value} (${typeof value})`);
          
          if (value === undefined || value === null) {
            undefinedDates++;
            console.log(`    ⚠️  UNDEFINED/NULL`);
          } else if (isExcelTimestamp(value)) {
            excelTimestamps++;
            const convertedDate = convertExcelTimestamp(value);
            const normalizedDate = normalizeDate(value);
            console.log(`    🔧 Excel Timestamp detectado!`);
            console.log(`    📅 Convertido: ${convertedDate}`);
            console.log(`    📅 Normalizado: ${normalizedDate}`);
          } else if (value === 'N/A' || value === '' || value === 'Invalid Date') {
            problematicDates++;
            console.log(`    ⚠️  Valor problemático`);
          } else {
            const normalizedDate = normalizeDate(value);
            if (normalizedDate === 'N/A') {
              problematicDates++;
              console.log(`    ⚠️  No se pudo normalizar`);
            } else {
              console.log(`    ✅ Normalizado: ${normalizedDate}`);
            }
          }
        }
      });
    });
    
    console.log(`\n📊 Resumen para ${collectionName}:`);
    console.log(`  Total campos de fecha revisados: ${totalDateFields}`);
    console.log(`  Timestamps de Excel detectados: ${excelTimestamps}`);
    console.log(`  Fechas problemáticas: ${problematicDates}`);
    console.log(`  Fechas undefined/null: ${undefinedDates}`);
    
    return {
      collectionName,
      totalDateFields,
      excelTimestamps,
      problematicDates,
      undefinedDates
    };
    
  } catch (error) {
    console.error(`❌ Error revisando ${collectionName}:`, error);
    return {
      collectionName,
      error: error.message
    };
  }
}

// Función principal
async function checkAllCollections() {
  console.log('🔍 Revisando problemas con fechas en todas las colecciones de Firebase');
  console.log('=' .repeat(80));
  
  const collections = [
    'autos', 'vida', 'gmm', 'hogar', 'negocio', 'diversos', 
    'mascotas', 'transporte', 'rc', 'emant_caratula', 
    'gruposvida', 'gruposautos'
  ];
  
  const results = [];
  
  for (const collectionName of collections) {
    const result = await checkCollectionDates(collectionName, 20); // Revisar solo 20 docs por colección
    results.push(result);
  }
  
  // Resumen general
  console.log('\n' + '=' .repeat(80));
  console.log('📊 RESUMEN GENERAL DE PROBLEMAS CON FECHAS');
  console.log('=' .repeat(80));
  
  let totalExcelTimestamps = 0;
  let totalProblematicDates = 0;
  let totalUndefinedDates = 0;
  
  results.forEach(result => {
    if (!result.error) {
      console.log(`${result.collectionName}:`);
      console.log(`  📅 Timestamps Excel: ${result.excelTimestamps}`);
      console.log(`  ⚠️  Problemáticas: ${result.problematicDates}`);
      console.log(`  ❓ Undefined: ${result.undefinedDates}`);
      
      totalExcelTimestamps += result.excelTimestamps;
      totalProblematicDates += result.problematicDates;
      totalUndefinedDates += result.undefinedDates;
    } else {
      console.log(`${result.collectionName}: ERROR - ${result.error}`);
    }
  });
  
  console.log('\n🎯 TOTALES:');
  console.log(`  📅 Total Timestamps Excel: ${totalExcelTimestamps}`);
  console.log(`  ⚠️  Total Problemáticas: ${totalProblematicDates}`);
  console.log(`  ❓ Total Undefined: ${totalUndefinedDates}`);
  
  if (totalExcelTimestamps > 0) {
    console.log('\n💡 RECOMENDACIÓN:');
    console.log('Se detectaron timestamps de Excel/Google Sheets.');
    console.log('Necesitas actualizar el servicio firebaseClientesService.js para manejar estos casos.');
  }
}

// Ejecutar el análisis
checkAllCollections().catch(console.error);
