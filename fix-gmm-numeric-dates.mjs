import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
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

async function fixNumericDates() {
  try {
    console.log('🔧 Buscando y corrigiendo fechas numéricas en GMM...\n');
    
    const gmmRef = collection(db, 'gmm');
    const snapshot = await getDocs(gmmRef);
    
    let fixed = 0;
    let checked = 0;
    
    snapshot.forEach(async (docSnapshot) => {
      const data = docSnapshot.data();
      const updateData = {};
      let needsUpdate = false;
      
      // Verificar vigencia_inicio
      if (typeof data.vigencia_inicio === 'number' && data.vigencia_inicio > 1000) {
        const converted = convertExcelTimestamp(data.vigencia_inicio);
        if (converted) {
          updateData.vigencia_inicio = converted;
          needsUpdate = true;
          console.log(`  ${data.contratante || data.numero_poliza}: vigencia_inicio ${data.vigencia_inicio} -> ${converted}`);
        }
      } else if (!data.vigencia_inicio || data.vigencia_inicio === '-' || data.vigencia_inicio === 'undefined') {
        // Si no tiene vigencia_inicio pero tiene fecha_inicio, copiarla
        if (data.fecha_inicio && typeof data.fecha_inicio === 'number' && data.fecha_inicio > 1000) {
          const converted = convertExcelTimestamp(data.fecha_inicio);
          if (converted) {
            updateData.vigencia_inicio = converted;
            needsUpdate = true;
            console.log(`  ${data.contratante || data.numero_poliza}: fecha_inicio ${data.fecha_inicio} -> vigencia_inicio ${converted}`);
          }
        }
      }
      
      // Verificar vigencia_fin
      if (typeof data.vigencia_fin === 'number' && data.vigencia_fin > 1000) {
        const converted = convertExcelTimestamp(data.vigencia_fin);
        if (converted) {
          updateData.vigencia_fin = converted;
          needsUpdate = true;
          console.log(`  ${data.contratante || data.numero_poliza}: vigencia_fin ${data.vigencia_fin} -> ${converted}`);
        }
      } else if (!data.vigencia_fin || data.vigencia_fin === '-' || data.vigencia_fin === 'undefined') {
        // Si no tiene vigencia_fin pero tiene fecha_fin, copiarla
        if (data.fecha_fin && typeof data.fecha_fin === 'number' && data.fecha_fin > 1000) {
          const converted = convertExcelTimestamp(data.fecha_fin);
          if (converted) {
            updateData.vigencia_fin = converted;
            needsUpdate = true;
            console.log(`  ${data.contratante || data.numero_poliza}: fecha_fin ${data.fecha_fin} -> vigencia_fin ${converted}`);
          }
        }
      }
      
      if (needsUpdate) {
        try {
          await updateDoc(doc(db, 'gmm', docSnapshot.id), updateData);
          fixed++;
          console.log(`  ✅ Actualizado: ${docSnapshot.id}`);
        } catch (error) {
          console.log(`  ❌ Error actualizando ${docSnapshot.id}: ${error.message}`);
        }
      }
      
      checked++;
    });
    
    // Esperar un poco para que se completen las actualizaciones
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`\n📊 Resumen:`);
    console.log(`  ✅ Corregidos: ${fixed}`);
    console.log(`  📋 Revisados: ${checked}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixNumericDates();






