import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase config
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function formatValue(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (value === '') return '(string vacío)';
  if (typeof value === 'number') return `NÚMERO: ${value}`;
  return `"${value}"`;
}

async function checkAllGMMDates() {
  try {
    console.log('🔍 Revisando TODAS las fechas en GMM...\n');
    
    // Obtener todos los documentos
    const gmmRef = collection(db, 'gmm');
    const snapshot = await getDocs(gmmRef);
    
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Total documentos: ${docs.length}\n`);
    console.log('='.repeat(120));
    
    let countWithMissingDates = 0;
    let countWithNumericDates = 0;
    
    docs.forEach((doc, index) => {
      const vigenciaInicio = doc.vigencia_inicio;
      const vigenciaFin = doc.vigencia_fin;
      const fechaInicio = doc.fecha_inicio;
      const fechaFin = doc.fecha_fin;
      
      // Verificar si falta alguna fecha
      const hasMissingInicio = !vigenciaInicio && !fechaInicio;
      const hasMissingFin = !vigenciaFin && !fechaFin;
      const hasNumericInicio = typeof vigenciaInicio === 'number' || typeof fechaInicio === 'number';
      const hasNumericFin = typeof vigenciaFin === 'number' || typeof fechaFin === 'number';
      
      if (hasMissingInicio || hasMissingFin || hasNumericInicio || hasNumericFin) {
        if (hasMissingInicio || hasMissingFin) countWithMissingDates++;
        if (hasNumericInicio || hasNumericFin) countWithNumericDates++;
        
        console.log(`\n${index + 1}. ${doc.contratante || 'Sin contratante'}`);
        console.log(`   Póliza: ${doc.numero_poliza || 'Sin póliza'}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   📅 vigencia_inicio: ${formatValue(vigenciaInicio)} (${typeof vigenciaInicio})`);
        console.log(`   📅 vigencia_fin: ${formatValue(vigenciaFin)} (${typeof vigenciaFin})`);
        console.log(`   📅 fecha_inicio: ${formatValue(fechaInicio)} (${typeof fechaInicio})`);
        console.log(`   📅 fecha_fin: ${formatValue(fechaFin)} (${typeof fechaFin})`);
        
        // Mostrar todas las claves del documento para debugging
        const dateKeys = Object.keys(doc).filter(key => 
          key.toLowerCase().includes('fecha') || 
          key.toLowerCase().includes('vigencia') ||
          key.toLowerCase().includes('inicio') ||
          key.toLowerCase().includes('fin')
        );
        if (dateKeys.length > 0) {
          console.log(`   🔑 Otras claves de fecha encontradas: ${dateKeys.join(', ')}`);
        }
      }
    });
    
    console.log('\n' + '='.repeat(120));
    console.log(`\n📊 Resumen:`);
    console.log(`   Total registros: ${docs.length}`);
    console.log(`   Registros con fechas faltantes: ${countWithMissingDates}`);
    console.log(`   Registros con fechas numéricas: ${countWithNumericDates}`);
    console.log(`   Registros con fechas completas: ${docs.length - countWithMissingDates - countWithNumericDates}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAllGMMDates();






