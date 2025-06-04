import { db } from '../src/config/firebase.js';
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
      // Get contacts data from Firebase
      const contactosRef = collection(db, 'directorio_contactos');
      const q = query(contactosRef, limit(50)); // Limit for birthday display
      const snapshot = await getDocs(q);
      
      const contactos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Transform contactos into birthday format
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentDay = today.getDate();

      const birthdays = contactos
        .filter(contacto => contacto.nombre_completo && contacto.status === 'cliente')
        .map((contacto, index) => {
          // Generate a mock birthday based on contact data
          const mockMonth = (contacto.originalMySQLId || index) % 12 + 1;
          const mockDay = ((contacto.originalMySQLId || index) * 3) % 28 + 1;
          
          return {
            id: contacto.id,
            client_name: contacto.nombre_completo,
            birthday: `1980-${mockMonth.toString().padStart(2, '0')}-${mockDay.toString().padStart(2, '0')}`,
            age: 44,
            policy_type: 'Auto',
            phone: contacto.telefono_movil || 'No disponible',
            email: contacto.email || 'No disponible',
            days_until_birthday: calculateDaysUntil(mockMonth, mockDay),
            empresa: contacto.empresa,
            origen: contacto.origen
          };
        })
        .slice(0, 10); // Show only first 10

      function calculateDaysUntil(month, day) {
        const today = new Date();
        const thisYear = today.getFullYear();
        let birthday = new Date(thisYear, month - 1, day);
        
        if (birthday < today) {
          birthday = new Date(thisYear + 1, month - 1, day);
        }
        
        const diffTime = birthday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      }

      res.status(200).json({ 
        success: true,
        data: birthdays,
        count: birthdays.length,
        timestamp: new Date().toISOString(),
        source: 'Firebase Firestore - directorio_contactos'
      });
    } catch (error) {
      console.error('Firebase error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch birthdays from Firebase',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 
            client_name: contacto.nombre_completo,
            birthday: `1980-${mockMonth.toString().padStart(2, '0')}-${mockDay.toString().padStart(2, '0')}`,
            age: 44,
            policy_type: 'Auto',
            phone: contacto.telefono_movil || 'No disponible',
            email: contacto.email || 'No disponible',
            days_until_birthday: calculateDaysUntil(mockMonth, mockDay),
            empresa: contacto.empresa,
            origen: contacto.origen
          };
        })
        .slice(0, 10); // Show only first 10

      function calculateDaysUntil(month, day) {
        const today = new Date();
        const thisYear = today.getFullYear();
        let birthday = new Date(thisYear, month - 1, day);
        
        if (birthday < today) {
          birthday = new Date(thisYear + 1, month - 1, day);
        }
        
        const diffTime = birthday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
      }

      res.status(200).json({ 
        success: true,
        data: birthdays,
        count: birthdays.length,
        timestamp: new Date().toISOString(),
        source: 'Firebase Firestore - directorio_contactos'
      });
    } catch (error) {
      console.error('Firebase error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch birthdays from Firebase',
        message: error.message 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 