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

async function checkCapturedDates() {
  try {
    console.log('🔍 Revisando fechas en registros capturados de GMM...\n');
    
    // Obtener todos los documentos
    const gmmRef = collection(db, 'gmm');
    const snapshot = await getDocs(gmmRef);
    
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Total documentos: ${docs.length}\n`);
    
    // Buscar registros sin fechas de inicio
    const missingDates = [];
    
    docs.forEach(doc => {
      const vigenciaInicio = doc.vigencia_inicio;
      const vigenciaFin = doc.vigencia_fin;
      const fechaInicio = doc.fecha_inicio;
      const fechaFin = doc.fecha_fin;
      
      // Verificar si falta alguna fecha de inicio
      const hasNoInicio = !vigenciaInicio && !fechaInicio;
      const hasNoFin = !vigenciaFin && !fechaFin;
      
      // También verificar si son valores inválidos
      const hasInvalidInicio = (vigenciaInicio === 'undefined' || vigenciaInicio === 'null' || vigenciaInicio === '-' || vigenciaInicio === '') &&
                               (fechaInicio === 'undefined' || fechaInicio === 'null' || fechaInicio === '-' || fechaInicio === '');
      const hasInvalidFin = (vigenciaFin === 'undefined' || vigenciaFin === 'null' || vigenciaFin === '-' || vigenciaFin === '') &&
                           (fechaFin === 'undefined' || fechaFin === 'null' || fechaFin === '-' || fechaFin === '');
      
      if (hasNoInicio || hasInvalidInicio || hasNoFin || hasInvalidFin) {
        missingDates.push({
          id: doc.id,
          numero_poliza: doc.numero_poliza,
          contratante: doc.contratante,
          vigencia_inicio: vigenciaInicio || '❌ FALTA',
          vigencia_fin: vigenciaFin || '❌ FALTA',
          fecha_inicio: fechaInicio || '❌ FALTA',
          fecha_fin: fechaFin || '❌ FALTA',
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        });
      }
    });
    
    console.log(`⚠️  Registros sin fechas de inicio/fin: ${missingDates.length}\n`);
    
    if (missingDates.length > 0) {
      console.log('📋 Detalle de registros con fechas faltantes:\n');
      console.log('='.repeat(100));
      
      missingDates.forEach((record, index) => {
        console.log(`\n${index + 1}. ${record.contratante || 'Sin contratante'} (Póliza: ${record.numero_poliza})`);
        console.log(`   ID Firebase: ${record.id}`);
        console.log(`   📅 vigencia_inicio: ${record.vigencia_inicio}`);
        console.log(`   📅 vigencia_fin: ${record.vigencia_fin}`);
        console.log(`   📅 fecha_inicio: ${record.fecha_inicio}`);
        console.log(`   📅 fecha_fin: ${record.fecha_fin}`);
        if (record.createdAt) {
          console.log(`   📝 Creado: ${record.createdAt.toDate ? record.createdAt.toDate() : record.createdAt}`);
        }
        if (record.updatedAt) {
          console.log(`   📝 Actualizado: ${record.updatedAt.toDate ? record.updatedAt.toDate() : record.updatedAt}`);
        }
      });
      
      console.log('\n' + '='.repeat(100));
      console.log(`\n📊 Resumen:`);
      console.log(`   Total registros revisados: ${docs.length}`);
      console.log(`   Registros con fechas faltantes: ${missingDates.length}`);
      console.log(`   Registros con fechas completas: ${docs.length - missingDates.length}`);
    } else {
      console.log('✅ Todos los registros tienen fechas de inicio y fin!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkCapturedDates();






