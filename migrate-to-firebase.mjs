import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: "casinbbdd.firebaseapp.com",
  projectId: "casinbbdd",
  storageBucket: "casinbbdd.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// MySQL connection
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crud_db',
};

async function connectMySQL() {
  try {
    const connection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Connected to MySQL');
    return connection;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    throw error;
  }
}

async function migrateTable(connection, tableName) {
  try {
    console.log(`📋 Starting migration of table: ${tableName}`);
    
    // Get all data from MySQL table
    const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
    console.log(`📊 Found ${rows.length} records in ${tableName}`);
    
    if (rows.length === 0) {
      console.log(`⚠️  No data to migrate for ${tableName}`);
      return;
    }
    
    // Batch write to Firebase (max 500 docs per batch)
    const batchSize = 500;
    let migrated = 0;
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchData = rows.slice(i, i + batchSize);
      
      for (const row of batchData) {
        // Convert MySQL row to Firestore document
        const docData = { ...row };
        
        // Convert MySQL dates to Firebase timestamps
        Object.keys(docData).forEach(key => {
          if (docData[key] instanceof Date) {
            docData[key] = docData[key].toISOString();
          }
          // Handle null values
          if (docData[key] === null) {
            docData[key] = null;
          }
        });
        
        // Create document reference
        const docRef = doc(collection(db, tableName));
        batch.set(docRef, docData);
      }
      
      // Commit batch
      await batch.commit();
      migrated += batchData.length;
      console.log(`📝 Migrated ${migrated}/${rows.length} records from ${tableName}`);
    }
    
    console.log(`✅ Successfully migrated ${tableName}: ${migrated} records`);
    
  } catch (error) {
    console.error(`❌ Error migrating ${tableName}:`, error);
    throw error;
  }
}

async function getTableList(connection) {
  try {
    const [tables] = await connection.execute('SHOW TABLES');
    return tables.map(table => Object.values(table)[0]);
  } catch (error) {
    console.error('❌ Error getting table list:', error);
    throw error;
  }
}

async function main() {
  let connection;
  
  try {
    console.log('🚀 Starting MySQL to Firebase migration...');
    console.log('🔥 Target: Firebase Firestore (pdfcasin project)');
    
    // Connect to MySQL
    connection = await connectMySQL();
    
    // Get all tables
    const tables = await getTableList(connection);
    console.log(`📋 Found ${tables.length} tables:`, tables.join(', '));
    
    // Migrate each table
    for (const table of tables) {
      await migrateTable(connection, table);
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('🔥 Your data is now in Firebase Firestore');
    console.log('🌐 Ready for production deployment!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📝 MySQL connection closed');
    }
  }
}

// Run migration
main(); 