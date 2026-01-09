import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkGameTime() {
  try {
    console.log('🔍 Buscando Game Time y revisando problemas...\n');
    
    const gmmRef = collection(db, 'gmm');
    const snapshot = await getDocs(gmmRef);
    
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    
    // Buscar Game Time
    const gameTime = docs.find(d => 
      d.contratante?.toLowerCase().includes('game time') || 
      d.numero_poliza === '595340944'
    );
    
    if (gameTime) {
      console.log('🎮 GAME TIME ENCONTRADO:');
      console.log('='.repeat(80));
      console.log(`ID: ${gameTime.id}`);
      console.log(`Contratante: ${gameTime.contratante}`);
      console.log(`Número Póliza: ${gameTime.numero_poliza}`);
      console.log(`vigencia_inicio: ${gameTime.vigencia_inicio} (${typeof gameTime.vigencia_inicio})`);
      console.log(`vigencia_fin: ${gameTime.vigencia_fin} (${typeof gameTime.vigencia_fin})`);
      console.log(`fecha_inicio: ${gameTime.fecha_inicio} (${typeof gameTime.fecha_inicio})`);
      console.log(`fecha_fin: ${gameTime.fecha_fin} (${typeof gameTime.fecha_fin})`);
      
      // Mostrar TODOS los campos que contienen "vigencia" o "fecha"
      console.log('\n📋 TODOS LOS CAMPOS DE FECHA:');
      Object.keys(gameTime).forEach(key => {
        if (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('vigencia') || 
            key.toLowerCase().includes('inicio') || key.toLowerCase().includes('fin')) {
          console.log(`  ${key}: ${gameTime[key]} (${typeof gameTime[key]})`);
        }
      });
    } else {
      console.log('❌ Game Time NO encontrado');
    }
    
    // Buscar registros con números raros (timestamps)
    console.log('\n\n🔢 REGISTROS CON NÚMEROS RAROS (timestamps):');
    console.log('='.repeat(80));
    const numericDates = docs.filter(d => {
      const vigInicio = d.vigencia_inicio;
      const vigFin = d.vigencia_fin;
      return (typeof vigInicio === 'number' && vigInicio > 1000) ||
             (typeof vigFin === 'number' && vigFin > 1000);
    });
    
    numericDates.forEach(d => {
      console.log(`\n${d.contratante || 'Sin contratante'} (${d.numero_poliza || 'Sin póliza'})`);
      console.log(`  vigencia_inicio: ${d.vigencia_inicio} (${typeof d.vigencia_inicio})`);
      console.log(`  vigencia_fin: ${d.vigencia_fin} (${typeof d.vigencia_fin})`);
    });
    
    // Contar registros sin fechas
    const missingDates = docs.filter(d => {
      const vigInicio = d.vigencia_inicio;
      const vigFin = d.vigencia_fin;
      return (!vigInicio || vigInicio === '' || vigInicio === '-' || vigInicio === 'undefined') &&
             (!vigFin || vigFin === '' || vigFin === '-' || vigFin === 'undefined');
    });
    
    console.log(`\n\n❌ REGISTROS SIN FECHAS: ${missingDates.length}`);
    if (missingDates.length > 0) {
      missingDates.forEach(d => {
        console.log(`  - ${d.contratante || 'Sin contratante'} (${d.numero_poliza || 'Sin póliza'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkGameTime();






