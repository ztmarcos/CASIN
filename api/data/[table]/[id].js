import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

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

  const { table, id } = req.query;

  if (!table || !id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Table name and document ID are required',
      timestamp: new Date().toISOString()
    });
  }

  console.log(`📝 API Request: ${req.method} /api/data/${table}/${id}`);

  try {
    if (req.method === 'PUT') {
      // Handle policy status updates
      const updateData = req.body;
      console.log(`🔄 Updating document ${id} in collection ${table}:`, updateData);

      // Get the document reference
      const docRef = doc(db, table, id);
      
      // Check if document exists
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.error(`❌ Document ${id} not found in collection ${table}`);
        return res.status(404).json({
          success: false,
          error: `Document with ID ${id} not found in collection ${table}`,
          timestamp: new Date().toISOString()
        });
      }

      // Prepare update data with timestamp
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      // Update the document in Firebase
      await updateDoc(docRef, updatePayload);

      console.log(`✅ Document ${id} updated successfully in ${table}`);
      
      return res.status(200).json({
        success: true,
        message: 'Document updated successfully',
        data: {
          id,
          collection: table,
          ...updatePayload
        },
        timestamp: new Date().toISOString()
      });

    } else if (req.method === 'GET') {
      // Handle document retrieval
      console.log(`📖 Getting document ${id} from collection ${table}`);
      
      // Get the document reference
      const docRef = doc(db, table, id);
      
      // Get the document
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.error(`❌ Document ${id} not found in collection ${table}`);
        return res.status(404).json({
          success: false,
          error: `Document with ID ${id} not found in collection ${table}`,
          timestamp: new Date().toISOString()
        });
      }
      
      const documentData = docSnap.data();
      console.log(`✅ Document ${id} retrieved successfully from ${table}`);
      
      return res.status(200).json({
        success: true,
        data: {
          id: docSnap.id,
          ...documentData
        },
        timestamp: new Date().toISOString()
      });

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET', 'PUT'],
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error(`❌ Error in API /api/data/${table}/${id}:`, error);
    
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}