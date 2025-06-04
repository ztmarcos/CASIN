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
      // Try to get autos data from Firebase
      const autosRef = collection(db, 'autos');
      const q = query(autosRef, limit(1000));
      const snapshot = await getDocs(q);
      
      const autos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.status(200).json({ 
        success: true,
        data: autos,
        count: autos.length,
        timestamp: new Date().toISOString(),
        source: 'Firebase Firestore'
      });
    } catch (error) {
      console.error('Firebase error:', error);
      
      // Fallback to mock data from your real database
      const mockAutos = [
        {
          id: 1,
          nombre_contratante: 'Ricardo Oswaldo de la Parra Silva',
          numero_poliza: '4711747',
          aseguradora: 'Qualitas',
          vigencia_inicio: '19-Apr-2024',
          vigencia_fin: '19-Apr-2025',
          forma_de_pago: 'Anual',
          pago_total_o_prima_total: '1,691.86',
          prima_neta: '1,358.50',
          descripcion_del_vehiculo: 'HONDA PILOT LX 4X2 C/A AC EE AUT.',
          placas: 'NXN3323',
          modelo: '2006',
          ramo: 'Autos'
        },
        {
          id: 2,
          nombre_contratante: 'Leonardo Lopez Leon',
          numero_poliza: '4711550',
          aseguradora: 'Qualitas',
          vigencia_inicio: '4-May-2024',
          vigencia_fin: '4-May-2025',
          forma_de_pago: 'Anual',
          pago_total_o_prima_total: '4,010.82',
          prima_neta: '2,915.92',
          descripcion_del_vehiculo: '67536 (I)MO CARABELA VECTOR 250CC STD.',
          placas: '6626G2',
          modelo: '2020',
          tipo_de_vehiculo: 'moto',
          ramo: 'Autos'
        },
        {
          id: 3,
          nombre_contratante: 'Laura Hernandez Huitron',
          numero_poliza: '4763856',
          aseguradora: 'Qualitas',
          vigencia_inicio: '28-Jun-2024',
          vigencia_fin: '28-Jun-2025',
          forma_de_pago: 'Anual',
          pago_total_o_prima_total: '4,600.26',
          prima_neta: '3,434.43',
          descripcion_del_vehiculo: 'HONDA ELITE SCOOTER 125CC STD.',
          placas: '6F7ZR',
          modelo: '2018',
          tipo_de_vehiculo: 'moto',
          ramo: 'Autos'
        }
      ];

      res.status(200).json({ 
        success: true,
        data: mockAutos,
        count: mockAutos.length,
        timestamp: new Date().toISOString(),
        source: 'Mock data (Firebase connection failed)',
        error: 'Firebase not configured or not accessible'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 
        {
          id: 2,
          nombre_contratante: 'Leonardo Lopez Leon',
          numero_poliza: '4711550',
          aseguradora: 'Qualitas',
          vigencia_inicio: '4-May-2024',
          vigencia_fin: '4-May-2025',
          forma_de_pago: 'Anual',
          pago_total_o_prima_total: '4,010.82',
          prima_neta: '2,915.92',
          descripcion_del_vehiculo: '67536 (I)MO CARABELA VECTOR 250CC STD.',
          placas: '6626G2',
          modelo: '2020',
          tipo_de_vehiculo: 'moto',
          ramo: 'Autos'
        },
        {
          id: 3,
          nombre_contratante: 'Laura Hernandez Huitron',
          numero_poliza: '4763856',
          aseguradora: 'Qualitas',
          vigencia_inicio: '28-Jun-2024',
          vigencia_fin: '28-Jun-2025',
          forma_de_pago: 'Anual',
          pago_total_o_prima_total: '4,600.26',
          prima_neta: '3,434.43',
          descripcion_del_vehiculo: 'HONDA ELITE SCOOTER 125CC STD.',
          placas: '6F7ZR',
          modelo: '2018',
          tipo_de_vehiculo: 'moto',
          ramo: 'Autos'
        }
      ];

      res.status(200).json({ 
        success: true,
        data: mockAutos,
        count: mockAutos.length,
        timestamp: new Date().toISOString(),
        source: 'Mock data (Firebase connection failed)',
        error: 'Firebase not configured or not accessible'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 