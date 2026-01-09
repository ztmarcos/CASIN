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

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Try DD-MMM-YYYY format (like "18-Dic-2024")
  if (dateStr.includes('-') && !dateStr.match(/^\d+$/)) {
    const parts = dateStr.split('-').map(part => part.trim());
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      
      const monthMap = {
        'ene': 0, 'jan': 0, 'enero': 0, 'january': 0,
        'feb': 1, 'febrero': 1, 'february': 1,
        'mar': 2, 'marzo': 2, 'march': 2,
        'abr': 3, 'apr': 3, 'abril': 3, 'april': 3,
        'may': 4, 'mayo': 4, 'may': 4,
        'jun': 5, 'junio': 5, 'june': 5,
        'jul': 6, 'julio': 6, 'july': 6,
        'ago': 7, 'aug': 7, 'agosto': 7, 'august': 7,
        'sep': 8, 'septiembre': 8, 'september': 8,
        'oct': 9, 'octubre': 9, 'october': 9,
        'nov': 10, 'noviembre': 10, 'november': 10,
        'dic': 11, 'dec': 11, 'diciembre': 11, 'december': 11
      };
      
      const monthIndex = monthMap[monthStr.substring(0, 3).toLowerCase()];
      if (monthIndex !== undefined && !isNaN(day) && !isNaN(year)) {
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  
  // Try DD/MMM/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(part => part.trim());
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      
      const monthIndex = SHORT_MONTHS.findIndex(month => month === monthStr);
      if (monthIndex !== -1 && !isNaN(day) && !isNaN(year)) {
        const date = new Date(year, monthIndex, day);
        if (!isNaN(date.getTime())) return date;
      }
      
      // Try numeric DD/MM/YYYY
      const month = parseInt(parts[1], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) return date;
      }
    }
  }
  
  // Try YYYY-MM-DD format (ISO)
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
  }
  
  return null;
}

function toDDMMMYYYY(date) {
  if (!date) return null;
  const parsedDate = typeof date === 'string' ? parseDate(date) : new Date(date);
  if (!parsedDate || isNaN(parsedDate.getTime())) return null;
  
  const day = parsedDate.getDate();
  const month = parsedDate.getMonth();
  const year = parsedDate.getFullYear();
  
  return `${day}/${SHORT_MONTHS[month]}/${year}`;
}

async function normalizeAllGMMDates() {
  try {
    console.log('🔧 Normalizando todas las fechas en GMM a formato dd/mmm/yyyy...\n');
    
    const gmmRef = collection(db, 'gmm');
    const snapshot = await getDocs(gmmRef);
    
    let fixed = 0;
    let checked = 0;
    
    snapshot.forEach(async (docSnapshot) => {
      checked++;
      const data = docSnapshot.data();
      const updateData = {};
      let needsUpdate = false;
      
      // Normalizar vigencia_inicio
      if (data.vigencia_inicio && typeof data.vigencia_inicio === 'string') {
        const normalized = toDDMMMYYYY(data.vigencia_inicio);
        if (normalized && normalized !== data.vigencia_inicio) {
          updateData.vigencia_inicio = normalized;
          needsUpdate = true;
          console.log(`  ${data.contratante || docSnapshot.id}: vigencia_inicio "${data.vigencia_inicio}" -> "${normalized}"`);
        }
      }
      
      // Normalizar vigencia_fin
      if (data.vigencia_fin && typeof data.vigencia_fin === 'string') {
        const normalized = toDDMMMYYYY(data.vigencia_fin);
        if (normalized && normalized !== data.vigencia_fin) {
          updateData.vigencia_fin = normalized;
          needsUpdate = true;
          console.log(`  ${data.contratante || docSnapshot.id}: vigencia_fin "${data.vigencia_fin}" -> "${normalized}"`);
        }
      }
      
      if (needsUpdate) {
        try {
          const docRef = doc(db, 'gmm', docSnapshot.id);
          await updateDoc(docRef, updateData);
          console.log(`✅ Normalizado: ${data.contratante || docSnapshot.id}`);
          fixed++;
        } catch (error) {
          console.log(`❌ Error normalizando ${docSnapshot.id}: ${error.message}`);
        }
      }
    });
    
    // Esperar un poco para que se completen las actualizaciones
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`\n📊 Resumen:`);
    console.log(`   Documentos revisados: ${checked}`);
    console.log(`   Documentos normalizados: ${fixed}`);
    console.log(`\n✨ Normalización completada!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

normalizeAllGMMDates();






