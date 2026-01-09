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

async function fixMissingVigenciaFields() {
  try {
    console.log('🔧 Corrigiendo campos vigencia_inicio/vigencia_fin...\n');
    
    const gmmRef = collection(db, 'gmm');
    const snapshot = await getDocs(gmmRef);
    
    let fixed = 0;
    let checked = 0;
    
    snapshot.forEach(async (docSnapshot) => {
      checked++;
      const data = docSnapshot.data();
      const updateData = {};
      let needsUpdate = false;
      
      // Si tiene fecha_inicio pero NO tiene vigencia_inicio, copiar
      if (data.fecha_inicio && !data.vigencia_inicio) {
        updateData.vigencia_inicio = data.fecha_inicio;
        needsUpdate = true;
        console.log(`  ${data.contratante || docSnapshot.id}: fecha_inicio -> vigencia_inicio: "${data.fecha_inicio}"`);
      }
      
      // Si tiene fecha_fin pero NO tiene vigencia_fin, copiar
      if (data.fecha_fin && !data.vigencia_fin) {
        updateData.vigencia_fin = data.fecha_fin;
        needsUpdate = true;
        console.log(`  ${data.contratante || docSnapshot.id}: fecha_fin -> vigencia_fin: "${data.fecha_fin}"`);
      }
      
      if (needsUpdate) {
        try {
          const docRef = doc(db, 'gmm', docSnapshot.id);
          await updateDoc(docRef, updateData);
          console.log(`✅ Corregido: ${data.contratante || docSnapshot.id} (${docSnapshot.id})`);
          fixed++;
        } catch (error) {
          console.log(`❌ Error corrigiendo ${docSnapshot.id}: ${error.message}`);
        }
      }
    });
    
    // Esperar un poco para que se completen las actualizaciones
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`\n📊 Resumen:`);
    console.log(`   Documentos revisados: ${checked}`);
    console.log(`   Documentos corregidos: ${fixed}`);
    console.log(`\n✨ Corrección completada!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixMissingVigenciaFields();






