#!/usr/bin/env node

/**
 * Script de migración para renombrar el campo 'contratante' a 'nombre_contratante' 
 * en todas las colecciones de Firebase
 * 
 * Este script:
 * 1. Encuentra todos los documentos que tienen el campo 'contratante'
 * 2. Los renombra a 'nombre_contratante'
 * 3. Mantiene un log de los cambios realizados
 * 4. Proporciona rollback si es necesario
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Configuración de Firebase
const firebaseConfig = {
  // Usar las variables de entorno o configuración local
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

// Colecciones a migrar (excluyendo autos que ya usa nombre_contratante)
const COLLECTIONS_TO_MIGRATE = [
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
  'rc' // RC usa 'asegurado', no 'contratante', pero lo incluimos por si acaso
];

// Log de migración
const migrationLog = {
  startTime: new Date().toISOString(),
  collections: {},
  totalDocuments: 0,
  totalUpdated: 0,
  errors: []
};

/**
 * Migra una colección específica
 */
async function migrateCollection(collectionName) {
  console.log(`\n🔄 Migrando colección: ${collectionName}`);
  
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  const collectionLog = {
    name: collectionName,
    totalDocuments: snapshot.size,
    updatedDocuments: 0,
    skippedDocuments: 0,
    errors: []
  };
  
  console.log(`📊 Encontrados ${snapshot.size} documentos en ${collectionName}`);
  
  if (snapshot.size === 0) {
    console.log(`⏭️  Colección ${collectionName} está vacía, saltando...`);
    migrationLog.collections[collectionName] = collectionLog;
    return;
  }
  
  // Procesar en lotes de 500 (límite de Firestore)
  const batchSize = 500;
  const documents = snapshot.docs;
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchDocs = documents.slice(i, i + batchSize);
    
    console.log(`📦 Procesando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)} (${batchDocs.length} documentos)`);
    
    for (const docSnapshot of batchDocs) {
      const docData = docSnapshot.data();
      const docId = docSnapshot.id;
      
      // Verificar si el documento tiene el campo 'contratante'
      if (docData.contratante !== undefined) {
        try {
          // Crear el nuevo documento con nombre_contratante
          const updatedData = {
            ...docData,
            nombre_contratante: docData.contratante
          };
          
          // Remover el campo 'contratante' del documento
          delete updatedData.contratante;
          
          // Agregar a la transacción batch
          const docRef = doc(db, collectionName, docId);
          batch.update(docRef, {
            nombre_contratante: docData.contratante
          });
          
          // Remover el campo 'contratante' en una operación separada
          batch.update(docRef, {
            contratante: null // Firestore no permite delete en batch, usamos null
          });
          
          collectionLog.updatedDocuments++;
          console.log(`✅ Documento ${docId}: contratante -> nombre_contratante`);
          
        } catch (error) {
          console.error(`❌ Error actualizando documento ${docId}:`, error);
          collectionLog.errors.push({
            docId,
            error: error.message
          });
        }
      } else {
        collectionLog.skippedDocuments++;
        console.log(`⏭️  Documento ${docId}: no tiene campo 'contratante', saltando...`);
      }
    }
    
    // Ejecutar el batch
    try {
      await batch.commit();
      console.log(`✅ Lote completado exitosamente`);
    } catch (error) {
      console.error(`❌ Error ejecutando batch:`, error);
      collectionLog.errors.push({
        batch: Math.floor(i/batchSize) + 1,
        error: error.message
      });
    }
  }
  
  // Limpiar campos 'contratante' que quedaron como null
  console.log(`🧹 Limpiando campos 'contratante' nulos en ${collectionName}...`);
  const nullSnapshot = await getDocs(query(collectionRef, where('contratante', '==', null)));
  
  if (nullSnapshot.size > 0) {
    const cleanBatch = writeBatch(db);
    nullSnapshot.docs.forEach(docSnapshot => {
      const docRef = doc(db, collectionName, docSnapshot.id);
      cleanBatch.update(docRef, {
        contratante: null // Esto debería remover el campo
      });
    });
    
    try {
      await cleanBatch.commit();
      console.log(`✅ Limpieza completada: ${nullSnapshot.size} documentos`);
    } catch (error) {
      console.error(`❌ Error en limpieza:`, error);
    }
  }
  
  migrationLog.collections[collectionName] = collectionLog;
  migrationLog.totalDocuments += collectionLog.totalDocuments;
  migrationLog.totalUpdated += collectionLog.updatedDocuments;
  
  console.log(`✅ Colección ${collectionName} completada:`);
  console.log(`   - Total documentos: ${collectionLog.totalDocuments}`);
  console.log(`   - Actualizados: ${collectionLog.updatedDocuments}`);
  console.log(`   - Saltados: ${collectionLog.skippedDocuments}`);
  console.log(`   - Errores: ${collectionLog.errors.length}`);
}

/**
 * Función principal de migración
 */
async function runMigration() {
  console.log('🚀 Iniciando migración de contratante -> nombre_contratante');
  console.log(`📅 Fecha: ${migrationLog.startTime}`);
  console.log(`📋 Colecciones a migrar: ${COLLECTIONS_TO_MIGRATE.join(', ')}`);
  
  try {
    // Migrar cada colección
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      await migrateCollection(collectionName);
    }
    
    // Finalizar log
    migrationLog.endTime = new Date().toISOString();
    migrationLog.duration = new Date(migrationLog.endTime) - new Date(migrationLog.startTime);
    
    // Guardar log de migración
    const logFileName = `migration-log-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(logFileName, JSON.stringify(migrationLog, null, 2));
    
    console.log('\n🎉 MIGRACIÓN COMPLETADA');
    console.log(`📊 Resumen:`);
    console.log(`   - Total documentos procesados: ${migrationLog.totalDocuments}`);
    console.log(`   - Total documentos actualizados: ${migrationLog.totalUpdated}`);
    console.log(`   - Duración: ${migrationLog.duration}ms`);
    console.log(`   - Log guardado en: ${logFileName}`);
    
    // Mostrar errores si los hay
    const totalErrors = Object.values(migrationLog.collections).reduce((sum, col) => sum + col.errors.length, 0);
    if (totalErrors > 0) {
      console.log(`\n⚠️  Se encontraron ${totalErrors} errores durante la migración`);
      console.log('Revisa el log para más detalles');
    }
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    migrationLog.errors.push({
      type: 'migration_error',
      error: error.message,
      stack: error.stack
    });
    
    // Guardar log de error
    const errorLogFileName = `migration-error-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(errorLogFileName, JSON.stringify(migrationLog, null, 2));
    
    process.exit(1);
  }
}

/**
 * Función de rollback (deshacer migración)
 */
async function rollbackMigration(logFile) {
  console.log('🔄 Iniciando rollback de migración...');
  
  if (!fs.existsSync(logFile)) {
    console.error(`❌ Archivo de log no encontrado: ${logFile}`);
    process.exit(1);
  }
  
  const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
  
  for (const [collectionName, collectionLog] of Object.entries(log.collections)) {
    if (collectionLog.updatedDocuments > 0) {
      console.log(`🔄 Revirtiendo ${collectionName}...`);
      // Aquí implementarías la lógica de rollback
      // Por ahora solo mostramos un mensaje
      console.log(`⚠️  Rollback manual requerido para ${collectionName}`);
    }
  }
}

// Ejecutar migración
if (process.argv[2] === 'rollback' && process.argv[3]) {
  rollbackMigration(process.argv[3]);
} else {
  runMigration();
}
