#!/usr/bin/env node

/**
 * Script para verificar qué colecciones tienen el campo 'contratante' vs 'nombre_contratante'
 * 
 * Este script:
 * 1. Revisa todas las colecciones de Firebase
 * 2. Cuenta documentos con 'contratante' vs 'nombre_contratante'
 * 3. Genera un reporte del estado actual
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBvQZvQZvQZvQZvQZvQZvQZvQZvQZvQZvQ",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "casinbbdd.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "casinbbdd",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "casinbbdd.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Colecciones a verificar
const COLLECTIONS_TO_CHECK = [
  'autos',
  'vida',
  'gmm', 
  'hogar',
  'negocio',
  'diversos',
  'mascotas',
  'transporte',
  'emant_caratula',
  'gruposvida',
  'gruposautos',
  'rc'
];

/**
 * Verifica una colección específica
 */
async function checkCollection(collectionName) {
  console.log(`\n🔍 Verificando colección: ${collectionName}`);
  
  try {
    const collectionRef = collection(db, collectionName);
    
    // Obtener muestra de documentos
    const sampleSnapshot = await getDocs(query(collectionRef, limit(10)));
    
    if (sampleSnapshot.empty) {
      console.log(`⏭️  Colección ${collectionName} está vacía`);
      return {
        name: collectionName,
        totalDocuments: 0,
        hasContratante: 0,
        hasNombreContratante: 0,
        sampleFields: []
      };
    }
    
    // Analizar campos en los documentos de muestra
    const fieldAnalysis = {
      contratante: 0,
      nombre_contratante: 0,
      asegurado: 0,
      otherFields: new Set()
    };
    
    sampleSnapshot.docs.forEach(doc => {
      const data = doc.data();
      Object.keys(data).forEach(field => {
        if (field === 'contratante') fieldAnalysis.contratante++;
        else if (field === 'nombre_contratante') fieldAnalysis.nombre_contratante++;
        else if (field === 'asegurado') fieldAnalysis.asegurado++;
        else fieldAnalysis.otherFields.add(field);
      });
    });
    
    // Obtener conteo total de documentos
    const totalSnapshot = await getDocs(collectionRef);
    const totalDocuments = totalSnapshot.size;
    
    // Obtener conteo de documentos con 'contratante'
    let contratanteCount = 0;
    try {
      const contratanteSnapshot = await getDocs(query(collectionRef, where('contratante', '!=', null)));
      contratanteCount = contratanteSnapshot.size;
    } catch (error) {
      console.log(`⚠️  No se pudo contar documentos con 'contratante': ${error.message}`);
    }
    
    // Obtener conteo de documentos con 'nombre_contratante'
    let nombreContratanteCount = 0;
    try {
      const nombreContratanteSnapshot = await getDocs(query(collectionRef, where('nombre_contratante', '!=', null)));
      nombreContratanteCount = nombreContratanteSnapshot.size;
    } catch (error) {
      console.log(`⚠️  No se pudo contar documentos con 'nombre_contratante': ${error.message}`);
    }
    
    const result = {
      name: collectionName,
      totalDocuments,
      hasContratante: contratanteCount,
      hasNombreContratante: nombreContratanteCount,
      sampleFields: Array.from(fieldAnalysis.otherFields).slice(0, 10), // Primeros 10 campos únicos
      fieldAnalysis
    };
    
    console.log(`📊 ${collectionName}:`);
    console.log(`   - Total documentos: ${totalDocuments}`);
    console.log(`   - Con 'contratante': ${contratanteCount}`);
    console.log(`   - Con 'nombre_contratante': ${nombreContratanteCount}`);
    console.log(`   - Muestra de campos: ${result.sampleFields.join(', ')}`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error verificando ${collectionName}:`, error.message);
    return {
      name: collectionName,
      error: error.message,
      totalDocuments: 0,
      hasContratante: 0,
      hasNombreContratante: 0,
      sampleFields: []
    };
  }
}

/**
 * Función principal
 */
async function checkAllCollections() {
  console.log('🔍 Verificando estado de campos contratante/nombre_contratante en Firebase');
  console.log(`📅 Fecha: ${new Date().toISOString()}`);
  console.log(`📋 Colecciones a verificar: ${COLLECTIONS_TO_CHECK.join(', ')}`);
  
  const results = [];
  
  for (const collectionName of COLLECTIONS_TO_CHECK) {
    const result = await checkCollection(collectionName);
    results.push(result);
  }
  
  // Generar reporte resumen
  console.log('\n📊 REPORTE RESUMEN:');
  console.log('='.repeat(80));
  
  let totalDocuments = 0;
  let totalContratante = 0;
  let totalNombreContratante = 0;
  let needsMigration = [];
  
  results.forEach(result => {
    totalDocuments += result.totalDocuments;
    totalContratante += result.hasContratante;
    totalNombreContratante += result.hasNombreContratante;
    
    if (result.hasContratante > 0) {
      needsMigration.push({
        collection: result.name,
        documents: result.hasContratante
      });
    }
    
    const status = result.hasContratante > 0 ? '❌ NECESITA MIGRACIÓN' : 
                   result.hasNombreContratante > 0 ? '✅ CORRECTO' : '⚠️  SIN DATOS';
    
    console.log(`${result.name.padEnd(20)} | ${result.totalDocuments.toString().padStart(6)} docs | ${status}`);
  });
  
  console.log('='.repeat(80));
  console.log(`Total documentos: ${totalDocuments}`);
  console.log(`Con 'contratante': ${totalContratante}`);
  console.log(`Con 'nombre_contratante': ${totalNombreContratante}`);
  
  if (needsMigration.length > 0) {
    console.log('\n🚨 COLECCIONES QUE NECESITAN MIGRACIÓN:');
    needsMigration.forEach(item => {
      console.log(`   - ${item.collection}: ${item.documents} documentos`);
    });
    console.log('\n💡 Ejecuta el script de migración: node migrate-contratante-to-nombre-contratante.mjs');
  } else {
    console.log('\n✅ Todas las colecciones están usando nombre_contratante correctamente');
  }
  
  // Guardar reporte
  const reportFileName = `contratante-field-report-${new Date().toISOString().split('T')[0]}.json`;
  const report = {
    date: new Date().toISOString(),
    summary: {
      totalDocuments,
      totalContratante,
      totalNombreContratante,
      needsMigration: needsMigration.length
    },
    collections: results,
    needsMigration
  };
  
  require('fs').writeFileSync(reportFileName, JSON.stringify(report, null, 2));
  console.log(`\n📄 Reporte guardado en: ${reportFileName}`);
}

// Ejecutar verificación
checkAllCollections().catch(console.error);
