import { db } from '../../src/config/firebase.js';
import { collection, getDocs, query, limit } from 'firebase/firestore';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Get GMM data from Firebase
      const gmmRef = collection(db, 'gmm');
      const q = query(gmmRef, limit(1000)); // Limit to avoid large responses
      const snapshot = await getDocs(q);
      
      const gmm = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({ 
        success: true,
        data: gmm,
        count: gmm.length,
        timestamp: new Date().toISOString(),
        source: 'Firebase Firestore'
      });
    } catch (error) {
      console.error('Firebase error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch GMM from Firebase',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 