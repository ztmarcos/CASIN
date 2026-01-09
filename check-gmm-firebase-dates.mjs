import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

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

// Función para convertir timestamp de Excel/Google Sheets a fecha
function convertExcelTimestamp(timestamp) {
  if (typeof timestamp !== 'number') return null;
  const excelEpoch = new Date(1899, 11, 30);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + (timestamp * millisecondsPerDay));
  if (isNaN(date.getTime())) return null;
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${day}/${monthNames[month]}/${year}`;
}

async function checkGMMDates() {
  try {
    console.log('🔍 Revisando fechas en Firebase GMM...\n');
    
    // Obtener todos los documentos
    const gmmRef = collection(db, 'gmm');
    const snapshot = await getDocs(gmmRef);
    
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 Total documentos: ${docs.length}\n`);
    
    // Buscar registros sin fechas o con fechas numéricas
    const problematicDocs = [];
    const gameTimeDocs = [];
    
    docs.forEach(doc => {
      const vigenciaInicio = doc.vigencia_inicio || doc.fecha_inicio;
      const vigenciaFin = doc.vigencia_fin || doc.fecha_fin;
      
      const hasMissingDates = !vigenciaInicio || !vigenciaFin || 
                             vigenciaInicio === '-' || vigenciaFin === '-' ||
                             vigenciaInicio === 'undefined' || vigenciaFin === 'undefined' ||
                             vigenciaInicio === 'null' || vigenciaFin === 'null';
      
      const hasNumericDates = (typeof vigenciaInicio === 'number' && vigenciaInicio > 1000) ||
                              (typeof vigenciaFin === 'number' && vigenciaFin > 1000);
      
      if (hasMissingDates || hasNumericDates) {
        problematicDocs.push({
          numero_poliza: doc.numero_poliza,
          contratante: doc.contratante,
          vigencia_inicio: vigenciaInicio,
          vigencia_fin: vigenciaFin,
          tipo_inicio: typeof vigenciaInicio,
          tipo_fin: typeof vigenciaFin,
          id: doc.id
        });
      }
      
      if (doc.numero_poliza === '595340944' || doc.contratante?.includes('GAME TIME')) {
        gameTimeDocs.push(doc);
      }
    });
    
    console.log(`⚠️  Documentos con fechas problemáticas: ${problematicDocs.length}\n`);
    
    if (problematicDocs.length > 0) {
      console.log('📋 Registros con fechas faltantes o numéricas:');
      problematicDocs.slice(0, 10).forEach(doc => {
        console.log(`\n  ${doc.contratante} (${doc.numero_poliza}):`);
        console.log(`    vigencia_inicio: ${doc.vigencia_inicio} (${doc.tipo_inicio})`);
        console.log(`    vigencia_fin: ${doc.vigencia_fin} (${doc.tipo_fin})`);
        
        // Si son números, convertir
        if (typeof doc.vigencia_inicio === 'number' && doc.vigencia_inicio > 1000) {
          const converted = convertExcelTimestamp(doc.vigencia_inicio);
          console.log(`    → Convertido inicio: ${converted}`);
        }
        if (typeof doc.vigencia_fin === 'number' && doc.vigencia_fin > 1000) {
          const converted = convertExcelTimestamp(doc.vigencia_fin);
          console.log(`    → Convertido fin: ${converted}`);
        }
      });
    }
    
    if (gameTimeDocs.length > 0) {
      console.log('\n\n🎮 GAME TIME MEXICO:');
      gameTimeDocs.forEach(doc => {
        console.log(`\n  ID: ${doc.id}`);
        console.log(`  Número Póliza: ${doc.numero_poliza}`);
        console.log(`  Contratante: ${doc.contratante}`);
        console.log(`  vigencia_inicio: ${doc.vigencia_inicio} (${typeof doc.vigencia_inicio})`);
        console.log(`  vigencia_fin: ${doc.vigencia_fin} (${typeof doc.vigencia_fin})`);
        console.log(`  fecha_inicio: ${doc.fecha_inicio} (${typeof doc.fecha_inicio})`);
        console.log(`  fecha_fin: ${doc.fecha_fin} (${typeof doc.fecha_fin})`);
        console.log(`  createdAt: ${doc.createdAt}`);
        console.log(`  updatedAt: ${doc.updatedAt}`);
        
        // Mostrar todas las columnas relacionadas con fechas
        Object.keys(doc).forEach(key => {
          if (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('vigencia')) {
            console.log(`  ${key}: ${doc[key]} (${typeof doc[key]})`);
          }
        });
      });
    }
    
    // Leer CSV y comparar
    console.log('\n\n📄 Comparando con CSV...');
    const csvPath = './Copia de CASINDBdic2024 - GMM (1).csv';
    const csvContent = readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    const gameTimeLine = lines.find(l => l.includes('595340944') || l.includes('GAME TIME'));
    
    if (gameTimeLine) {
      console.log('\n  CSV Game Time:');
      const cols = gameTimeLine.split(',');
      console.log(`    Vigencia (Inicio): ${cols[4]}`);
      console.log(`    Vigencia (Fin): ${cols[5]}`);
      
      // Convertir si son números
      const inicioNum = parseInt(cols[4]);
      const finNum = parseInt(cols[5]);
      if (!isNaN(inicioNum) && inicioNum > 1000) {
        console.log(`    → Convertido inicio: ${convertExcelTimestamp(inicioNum)}`);
      }
      if (!isNaN(finNum) && finNum > 1000) {
        console.log(`    → Convertido fin: ${convertExcelTimestamp(finNum)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkGMMDates();






