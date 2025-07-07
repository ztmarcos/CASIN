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
      // Get directorio_contactos data from Firebase
      const contactosRef = collection(db, 'directorio_contactos');
      const q = query(contactosRef, limit(1000));
      const snapshot = await getDocs(q);
      
      const contactos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({ 
        success: true,
        data: contactos,
        count: contactos.length,
        timestamp: new Date().toISOString(),
        source: 'Firebase Firestore'
      });
    } catch (error) {
      console.error('Firebase error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch contactos from Firebase',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 