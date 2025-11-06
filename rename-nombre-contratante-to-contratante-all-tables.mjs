#!/usr/bin/env node

/**
 * Script para RENOMBRAR el campo 'nombre_contratante' a 'contratante' 
 * en TODAS las tablas de Firebase
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch, query, where } from 'firebase/firestore';
import fs from 'fs';

// Configuración de Firebase desde .env
const firebaseConfig = {
  apiKey: "AIzaSyAbpUOH4D4Q_GyJBV-fgDEo3khkbIMNvZs",
  authDomain: "casinbbdd.firebaseapp.com",
  projectId: "casinbbdd",
  storageBucket: "casinbbdd.firebasestorage.app",
  messagingSenderId: "812853971334",
  appId: "1:812853971334:web:f9735b0d95307277ce8407"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// TODAS las tablas (excepto autos y vida que ya están bien)
const COLLECTIONS_TO_MIGRATE = [
  'gmm',
  'hogar',
  'negocio',
  'diversos',
  'mascotas',
  'transporte',
  'emant_caratula',
  'gruposvida',
  'gruposautos',
  'rc' // Esta tiene 'asegurado' que también cambiaremos a 'contratante'
];

// Log de migración
const migrationLog = {
  startTime: new Date().toISOString(),
  collections: {},
  totalDocuments: 0,
  totalRenamed: 0,
  errors: []
};

/**
 * Renombra una colección específica
 */
async function renameCollection(collectionName) {
  console.log(`\n🔄 Renombrando colección: ${collectionName}`);
  
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  const collectionLog = {
    name: collectionName,
    totalDocuments: snapshot.size,
    renamedDocuments: 0,
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
      
      // Para tabla 'rc', cambiar 'asegurado' a 'contratante'
      if (collectionName === 'rc' && docData.asegurado !== undefined && docData.asegurado !== null) {
        try {
          const docRef = doc(db, collectionName, docId);
          
          // Agregar el nuevo campo 'contratante' con el valor de 'asegurado'
          batch.update(docRef, {
            contratante: docData.asegurado
          });
          
          collectionLog.renamedDocuments++;
          console.log(`✅ Documento ${docId}: asegurado -> contratante (${docData.asegurado})`);
          
        } catch (error) {
          console.error(`❌ Error renombrando documento ${docId}:`, error);
          collectionLog.errors.push({
            docId,
            error: error.message
          });
        }
      }
      // Para todas las demás tablas, cambiar 'nombre_contratante' a 'contratante'
      else if (docData.nombre_contratante !== undefined && docData.nombre_contratante !== null) {
        try {
          const docRef = doc(db, collectionName, docId);
          
          // Agregar el nuevo campo 'contratante' con el valor de 'nombre_contratante'
          batch.update(docRef, {
            contratante: docData.nombre_contratante
          });
          
          collectionLog.renamedDocuments++;
          console.log(`✅ Documento ${docId}: nombre_contratante -> contratante (${docData.nombre_contratante})`);
          
        } catch (error) {
          console.error(`❌ Error renombrando documento ${docId}:`, error);
          collectionLog.errors.push({
            docId,
            error: error.message
          });
        }
      } else {
        collectionLog.skippedDocuments++;
        console.log(`⏭️  Documento ${docId}: no tiene campo a renombrar, saltando...`);
      }
    }
    
    // Ejecutar el batch para agregar contratante
    try {
      await batch.commit();
      console.log(`✅ Lote de renombrado completado exitosamente`);
    } catch (error) {
      console.error(`❌ Error ejecutando batch de renombrado:`, error);
      collectionLog.errors.push({
        batch: Math.floor(i/batchSize) + 1,
        error: error.message
      });
    }
  }
  
  // PASO 2: Eliminar los campos originales
  console.log(`🧹 Eliminando campos originales en ${collectionName}...`);
  
  if (collectionName === 'rc') {
    // Para tabla 'rc', eliminar 'asegurado'
    const aseguradoSnapshot = await getDocs(query(collectionRef, where('asegurado', '!=', null)));
    
    if (aseguradoSnapshot.size > 0) {
      const deleteBatch = writeBatch(db);
      aseguradoSnapshot.docs.forEach(docSnapshot => {
        const docRef = doc(db, collectionName, docSnapshot.id);
        deleteBatch.update(docRef, {
          asegurado: null
        });
      });
      
      try {
        await deleteBatch.commit();
        console.log(`✅ Eliminación de campos 'asegurado' completada: ${aseguradoSnapshot.size} documentos`);
      } catch (error) {
        console.error(`❌ Error eliminando campos 'asegurado':`, error);
      }
    }
  } else {
    // Para todas las demás tablas, eliminar 'nombre_contratante'
    const nombreContratanteSnapshot = await getDocs(query(collectionRef, where('nombre_contratante', '!=', null)));
    
    if (nombreContratanteSnapshot.size > 0) {
      const deleteBatch = writeBatch(db);
      nombreContratanteSnapshot.docs.forEach(docSnapshot => {
        const docRef = doc(db, collectionName, docSnapshot.id);
        deleteBatch.update(docRef, {
          nombre_contratante: null
        });
      });
      
      try {
        await deleteBatch.commit();
        console.log(`✅ Eliminación de campos 'nombre_contratante' completada: ${nombreContratanteSnapshot.size} documentos`);
      } catch (error) {
        console.error(`❌ Error eliminando campos 'nombre_contratante':`, error);
      }
    }
  }
  
  migrationLog.collections[collectionName] = collectionLog;
  migrationLog.totalDocuments += collectionLog.totalDocuments;
  migrationLog.totalRenamed += collectionLog.renamedDocuments;
  
  console.log(`✅ Colección ${collectionName} completada:`);
  console.log(`   - Total documentos: ${collectionLog.totalDocuments}`);
  console.log(`   - Renombrados: ${collectionLog.renamedDocuments}`);
  console.log(`   - Saltados: ${collectionLog.skippedDocuments}`);
  console.log(`   - Errores: ${collectionLog.errors.length}`);
}

/**
 * Función principal de renombrado
 */
async function runRename() {
  console.log('🚀 Iniciando RENOMBRADO a contratante en TODAS las tablas');
  console.log(`📅 Fecha: ${migrationLog.startTime}`);
  console.log(`📋 Colecciones a renombrar: ${COLLECTIONS_TO_MIGRATE.join(', ')}`);
  
  try {
    // Renombrar cada colección
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      await renameCollection(collectionName);
    }
    
    // Finalizar log
    migrationLog.endTime = new Date().toISOString();
    migrationLog.duration = new Date(migrationLog.endTime) - new Date(migrationLog.startTime);
    
    // Guardar log de migración
    const logFileName = `rename-all-to-contratante-log-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(logFileName, JSON.stringify(migrationLog, null, 2));
    
    console.log('\n🎉 RENOMBRADO COMPLETADO');
    console.log(`📊 Resumen:`);
    console.log(`   - Total documentos procesados: ${migrationLog.totalDocuments}`);
    console.log(`   - Total documentos renombrados: ${migrationLog.totalRenamed}`);
    console.log(`   - Duración: ${migrationLog.duration}ms`);
    console.log(`   - Log guardado en: ${logFileName}`);
    
    // Mostrar errores si los hay
    const totalErrors = Object.values(migrationLog.collections).reduce((sum, col) => sum + col.errors.length, 0);
    if (totalErrors > 0) {
      console.log(`\n⚠️  Se encontraron ${totalErrors} errores durante el renombrado`);
      console.log('Revisa el log para más detalles');
    }
    
  } catch (error) {
    console.error('❌ Error durante el renombrado:', error);
    migrationLog.errors.push({
      type: 'rename_error',
      error: error.message,
      stack: error.stack
    });
    
    // Guardar log de error
    const errorLogFileName = `rename-all-to-contratante-error-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(errorLogFileName, JSON.stringify(migrationLog, null, 2));
    
    process.exit(1);
  }
}

// Ejecutar renombrado
runRename();
