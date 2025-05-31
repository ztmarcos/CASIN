const mysql = require('mysql2/promise');
const admin = require('firebase-admin');
const dbConfig = require('../config/database');
require('dotenv').config();

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || `firebase-adminsdk-hnwk0@${process.env.VITE_FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  }),
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();

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

async function backupTable(tableName, data) {
  console.log(`Backing up table: ${tableName}`);
  
  // Create a backup document with timestamp
  const timestamp = admin.firestore.Timestamp.now();
  const backupRef = db.collection('backups').doc(timestamp.toDate().toISOString());
  
  // Store metadata about the backup
  await backupRef.set({
    timestamp,
    tableName,
    recordCount: data.length,
    status: 'in_progress'
  });

  // Store the actual data in a subcollection
  const dataCollection = backupRef.collection('data');
  const batch = db.batch();
  let batchCount = 0;
  const batchSize = 500;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const docRef = dataCollection.doc();

    // Convert dates to Firestore timestamps
    const processedRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) {
        processedRow[key] = admin.firestore.Timestamp.fromDate(value);
      } else {
        processedRow[key] = value;
      }
    }

    batch.set(docRef, processedRow);
    batchCount++;

    if (batchCount === batchSize || i === data.length - 1) {
      try {
        await batch.commit();
        console.log(`Batch committed for ${tableName}: ${batchCount} records`);
        batchCount = 0;
        batch = db.batch();
      } catch (error) {
        console.error(`Error committing batch for ${tableName}:`, error);
        // Update backup status to error
        await backupRef.update({
          status: 'error',
          error: error.message
        });
        throw error;
      }
    }
  }

  // Update backup status to completed
  await backupRef.update({
    status: 'completed',
    completedAt: admin.firestore.Timestamp.now()
  });

  console.log(`Backup completed for ${tableName}`);
}

async function backupAllTables() {
  try {
    const tables = await getTables();
    console.log('Found tables:', tables);

    for (const tableName of tables) {
      const data = await getTableData(tableName);
      console.log(`Backing up ${data.length} records from ${tableName}`);
      await backupTable(tableName, data);
    }

    console.log('All tables backed up successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error during backup:', error);
    process.exit(1);
  }
}

// Run the backup
backupAllTables(); 