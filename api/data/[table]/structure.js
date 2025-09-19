import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, limit, getDocs } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { table } = req.query;

  if (!table) {
    return res.status(400).json({ 
      success: false, 
      error: 'Table name is required',
      timestamp: new Date().toISOString()
    });
  }

  console.log(`📋 API Request: ${req.method} /api/data/${table}/structure`);

  if (req.method === 'GET') {
    try {
      // Get a sample of documents to understand the structure
      const collectionRef = collection(db, table);
      const q = query(collectionRef, limit(10)); // Get up to 10 documents for sampling
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log(`📋 Collection '${table}' is empty`);
        return res.status(200).json({
          success: true,
          data: {
            table: table,
            columns: [],
            total_documents: 0,
            sample_size: 0
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // Collect all unique keys from sample documents
      const allKeys = new Set();
      const sampleDocs = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        sampleDocs.push({ id: doc.id, ...data });
        Object.keys(data).forEach(key => allKeys.add(key));
      });
      
      // Convert to column objects with type inference
      const columns = Array.from(allKeys).map(key => {
        // Get sample values for this key
        const sampleValues = sampleDocs
          .map(doc => doc[key])
          .filter(value => value !== null && value !== undefined);
        
        // Infer type from sample values
        let type = 'text';
        if (sampleValues.length > 0) {
          const firstValue = sampleValues[0];
          if (typeof firstValue === 'number') {
            type = 'number';
          } else if (typeof firstValue === 'boolean') {
            type = 'boolean';
          } else if (firstValue instanceof Date || (typeof firstValue === 'object' && firstValue.seconds)) {
            type = 'timestamp';
          } else if (typeof firstValue === 'string') {
            // Check if it looks like a date
            if (firstValue.match(/^\d{4}-\d{2}-\d{2}/) || firstValue.match(/^\d{2}\/\d{2}\/\d{4}/)) {
              type = 'date';
            } else {
              type = 'text';
            }
          }
        }
        
        return {
          name: key,
          type: type,
          nullable: true,
          sample_values: sampleValues.slice(0, 3) // Include first 3 sample values
        };
      });
      
      // Sort columns to put common fields first
      const commonFields = ['id', 'nombre_contratante', 'nombre_del_asegurado', 'numero_poliza', 'aseguradora', 'createdAt', 'updatedAt'];
      const sortedColumns = columns.sort((a, b) => {
        const aIndex = commonFields.indexOf(a.name);
        const bIndex = commonFields.indexOf(b.name);
        
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      
      console.log(`✅ Retrieved structure for '${table}': ${sortedColumns.length} columns`);
      
      return res.status(200).json({
        success: true,
        data: {
          table: table,
          columns: sortedColumns,
          total_documents: snapshot.size,
          sample_size: sampleDocs.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Error getting table structure for ${table}:`, error);
      
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowedMethods: ['GET'],
      timestamp: new Date().toISOString()
    });
  }
}
