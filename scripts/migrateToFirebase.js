const mysql = require('mysql2/promise');
const admin = require('firebase-admin');
const dbConfig = require('../config/database');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin with service account
const serviceAccount = require('../../casinbbdd-firebase-adminsdk-hnwk0-ef7db894a3.json');

console.log('Initializing Firebase with project:', serviceAccount.project_id);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

// Test Firestore connectivity
async function testFirestore() {
  try {
    const testDoc = await db.collection('test').doc('test').set({
      test: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Successfully wrote to Firestore');
    
    const testRead = await db.collection('test').doc('test').get();
    console.log('Successfully read from Firestore:', testRead.data());
    
    await db.collection('test').doc('test').delete();
    console.log('Successfully deleted from Firestore');
    
    return true;
  } catch (error) {
    console.error('Error testing Firestore:', error);
    return false;
  }
}

async function getTables() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute('SHOW TABLES');
    return rows.map(row => Object.values(row)[0]);
  } finally {
    await connection.end();
  }
}

async function getTableData(tableName) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.execute(`SELECT * FROM ${tableName}`);
    return rows;
  } finally {
    await connection.end();
  }
}

async function getLastBackupId() {
  const backupsSnapshot = await db.collection('backups_metadata')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();

  if (backupsSnapshot.empty) {
    return null;
  }

  return backupsSnapshot.docs[0].id;
}

async function compareWithLastBackup(tableName, currentData) {
  const lastBackupId = await getLastBackupId();
  if (!lastBackupId) {
    return {
      isFirstBackup: true,
      added: currentData.length,
      modified: 0,
      deleted: 0
    };
  }

  // Obtener datos del backup anterior
  const lastBackupRef = db.collection('backups').doc(lastBackupId)
    .collection('tables').doc(tableName)
    .collection('records');
  
  const lastBackupDocs = await lastBackupRef.get();
  const lastBackupData = lastBackupDocs.docs.map(doc => doc.data());

  // Crear mapas para comparación eficiente usando un campo único (por ejemplo, id)
  const lastBackupMap = new Map(lastBackupData.map(item => [item.id || JSON.stringify(item), item]));
  const currentDataMap = new Map(currentData.map(item => [item.id || JSON.stringify(item), item]));

  // Calcular diferencias
  const added = [...currentDataMap.keys()]
    .filter(key => !lastBackupMap.has(key)).length;
  
  const deleted = [...lastBackupMap.keys()]
    .filter(key => !currentDataMap.has(key)).length;

  const modified = [...currentDataMap.keys()]
    .filter(key => lastBackupMap.has(key) && 
      JSON.stringify(currentDataMap.get(key)) !== JSON.stringify(lastBackupMap.get(key)))
    .length;

  return {
    isFirstBackup: false,
    added,
    modified,
    deleted
  };
}

async function createBackupMetadata(backupId, tables) {
  const metadata = {
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    backupId,
    source: {
      type: 'mysql',
      host: dbConfig.host,
      database: dbConfig.database,
    },
    tables: tables.map(table => ({
      name: table.name,
      recordCount: table.recordCount,
      changes: table.changes || null
    })),
    status: 'in_progress'
  };

  await db.collection('backups_metadata').doc(backupId).set(metadata);
  return metadata;
}

async function updateBackupStatus(backupId, status, error = null) {
  const update = {
    status,
    completedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  if (error) {
    update.error = error.toString();
  }

  await db.collection('backups_metadata').doc(backupId).update(update);
}

async function migrateTable(backupId, tableName, data) {
  console.log(`Migrando tabla: ${tableName}`);
  
  let batch = db.batch();
  let batchCount = 0;
  const batchSize = 500;

  // Crear la colección con el formato backups/{backupId}/tables/{tableName}/records/{recordId}
  const tableRef = db.collection('backups').doc(backupId).collection('tables').doc(tableName);
  await tableRef.set({
    recordCount: data.length,
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });

  const recordsRef = tableRef.collection('records');

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const docRef = recordsRef.doc();

    // Convert dates to timestamps and handle nulls
    const processedRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) {
        processedRow[key] = admin.firestore.Timestamp.fromDate(value);
      } else if (value === null) {
        processedRow[key] = null;
      } else {
        processedRow[key] = value;
      }
    }

    batch.set(docRef, processedRow);
    batchCount++;

    if (batchCount === batchSize || i === data.length - 1) {
      try {
        await batch.commit();
        console.log(`Batch committed para ${tableName}: ${batchCount} documentos`);
      } catch (error) {
        console.error(`Error al commit del batch para ${tableName}:`, error);
        throw error;
      }
      batchCount = 0;
      batch = db.batch();
    }
  }

  console.log(`Migración completada para ${tableName}`);
  return data.length;
}

async function migrateAllTables() {
  try {
    const tables = await getTables();
    console.log('Tablas encontradas:', tables);

    // Crear un ID único para este backup usando timestamp
    const backupId = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Recopilar información de las tablas y sus cambios
    const tablesInfo = [];
    for (const tableName of tables) {
      const data = await getTableData(tableName);
      const changes = await compareWithLastBackup(tableName, data);
      
      tablesInfo.push({
        name: tableName,
        recordCount: data.length,
        changes: {
          ...changes,
          timestamp: new Date().toISOString(),
          previousRecordCount: data.length - changes.added + changes.deleted
        }
      });

      console.log(`Cambios en ${tableName}:`, {
        registros_actuales: data.length,
        nuevos: changes.added,
        modificados: changes.modified,
        eliminados: changes.deleted
      });
    }

    // Crear metadata del backup
    await createBackupMetadata(backupId, tablesInfo);

    // Migrar cada tabla
    for (const table of tablesInfo) {
      const data = await getTableData(table.name);
      console.log(`Migrando ${data.length} registros de ${table.name}`);
      await migrateTable(backupId, table.name, data);
    }

    // Actualizar estado del backup
    await updateBackupStatus(backupId, 'completed');

    console.log('Migración completada exitosamente');
    console.log('ID del backup:', backupId);
    console.log('\nResumen de cambios:');
    tablesInfo.forEach(table => {
      console.log(`\n${table.name}:`);
      console.log(`- Total registros: ${table.recordCount}`);
      console.log(`- Registros nuevos: ${table.changes.added}`);
      console.log(`- Registros modificados: ${table.changes.modified}`);
      console.log(`- Registros eliminados: ${table.changes.deleted}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    if (typeof backupId !== 'undefined') {
      await updateBackupStatus(backupId, 'failed', error);
    }
    process.exit(1);
  }
}

// Ejecutar la migración
async function main() {
  const firestoreWorks = await testFirestore();
  if (!firestoreWorks) {
    console.error('Failed to connect to Firestore. Please check your credentials and permissions.');
    process.exit(1);
  }
  
  await migrateAllTables();
}

main(); 