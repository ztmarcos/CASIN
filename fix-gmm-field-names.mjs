import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
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

async function fixGMMFieldNames() {
  try {
    console.log('🔧 Corrigiendo nombres de campos en GMM...\n');
    
    // Obtener todos los documentos
    const gmmRef = collection(db, 'gmm');
    const snapshot = await getDocs(gmmRef);
    
    let fixed = 0;
    let checked = 0;
    
    snapshot.forEach(async (docSnapshot) => {
      checked++;
      const data = docSnapshot.data();
      const updateData = {};
      let needsUpdate = false;
      
      // Corregir vigencia__inicio_ -> vigencia_inicio
      if (data.vigencia__inicio_ !== undefined && !data.vigencia_inicio) {
        updateData.vigencia_inicio = data.vigencia__inicio_;
        updateData.vigencia__inicio_ = null; // Eliminar el campo incorrecto
        needsUpdate = true;
        console.log(`  ${data.contratante || docSnapshot.id}: vigencia__inicio_ -> vigencia_inicio`);
      }
      
      // Corregir vigencia__fin_ -> vigencia_fin
      if (data.vigencia__fin_ !== undefined && !data.vigencia_fin) {
        updateData.vigencia_fin = data.vigencia__fin_;
        updateData.vigencia__fin_ = null; // Eliminar el campo incorrecto
        needsUpdate = true;
        console.log(`  ${data.contratante || docSnapshot.id}: vigencia__fin_ -> vigencia_fin`);
      }
      
      // Corregir fecha_de_expedici__n -> fecha_expedicion (si aplica)
      if (data.fecha_de_expedici__n !== undefined && !data.fecha_expedicion) {
        updateData.fecha_expedicion = data.fecha_de_expedici__n;
        updateData.fecha_de_expedici__n = null; // Eliminar el campo incorrecto
        needsUpdate = true;
        console.log(`  ${data.contratante || docSnapshot.id}: fecha_de_expedici__n -> fecha_expedicion`);
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

fixGMMFieldNames();






