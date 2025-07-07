import { db } from '../../src/config/firebase.js';
import { collection, getDocs } from 'firebase/firestore';

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
      // Try to get collections info from Firebase
      const tables = [];
      const collections = ['autos', 'gmm', 'directorio_contactos', 'vida', 'rc', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];
      
      let hasFirebaseData = false;
      
      for (const collectionName of collections) {
        try {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          tables.push({
            name: collectionName,
            row_count: snapshot.size,
            last_updated: new Date().toISOString()
          });
          
          if (snapshot.size > 0) {
            hasFirebaseData = true;
          }
        } catch (collectionError) {
          // If a specific collection fails, add it with 0 count
          tables.push({
            name: collectionName,
            row_count: 0,
            last_updated: new Date().toISOString()
          });
        }
      }

      res.status(200).json({ 
        success: true,
        tables,
        total_tables: tables.length,
        timestamp: new Date().toISOString(),
        source: hasFirebaseData ? 'Firebase Firestore' : 'Firebase (empty collections)',
        hasData: hasFirebaseData
      });

    } catch (error) {
      console.error('Firebase error:', error);
      
      // Fallback to mock data if Firebase is not available
      const mockTables = [
        { name: 'autos', row_count: 34, last_updated: new Date().toISOString() },
        { name: 'directorio_contactos', row_count: 2701, last_updated: new Date().toISOString() },
        { name: 'vida', row_count: 2, last_updated: new Date().toISOString() },
        { name: 'rc', row_count: 1, last_updated: new Date().toISOString() },
        { name: 'gmm', row_count: 0, last_updated: new Date().toISOString() },
        { name: 'transporte', row_count: 0, last_updated: new Date().toISOString() },
        { name: 'mascotas', row_count: 0, last_updated: new Date().toISOString() },
        { name: 'diversos', row_count: 0, last_updated: new Date().toISOString() },
        { name: 'negocio', row_count: 0, last_updated: new Date().toISOString() },
        { name: 'gruposgmm', row_count: 0, last_updated: new Date().toISOString() }
      ];

      res.status(200).json({ 
        success: true,
        tables: mockTables,
        total_tables: mockTables.length,
        timestamp: new Date().toISOString(),
        source: 'Mock data (Firebase connection failed)',
        hasData: false,
        error: 'Firebase not configured or not accessible'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 