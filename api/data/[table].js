import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, limit } from 'firebase/firestore';

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

  console.log(`📝 API Request: ${req.method} /api/data/${table}`);

  try {
    if (req.method === 'POST') {
      // Handle data insertion
      const insertData = req.body;
      console.log(`➕ Inserting new document into collection ${table}:`, insertData);

      // Validate data
      if (!insertData || typeof insertData !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid data provided',
          timestamp: new Date().toISOString()
        });
      }

      // Prepare data with timestamps
      const dataWithTimestamps = {
        ...insertData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add document to Firebase collection
      const docRef = await addDoc(collection(db, table), dataWithTimestamps);
      
      console.log(`✅ Document created successfully in ${table} with ID: ${docRef.id}`);
      
      return res.status(201).json({
        success: true,
        message: 'Document created successfully',
        id: docRef.id,
        data: {
          id: docRef.id,
          collection: table,
          ...dataWithTimestamps
        },
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'GET') {
      // Handle data retrieval
      console.log(`📖 Getting documents from collection ${table}`);
      
      // Get documents from collection
      const collectionRef = collection(db, table);
      const q = query(collectionRef, limit(100)); // Limit to 100 documents for performance
      const snapshot = await getDocs(q);
      
      const documents = [];
      snapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Retrieved ${documents.length} documents from ${table}`);
      
      return res.status(200).json({
        success: true,
        data: documents,
        total: documents.length,
        collection: table,
        timestamp: new Date().toISOString()
      });

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST'],
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error(`❌ Error in API /api/data/${table}:`, error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}
