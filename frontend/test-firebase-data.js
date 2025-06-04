import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbpUAe9MZwYHcT6XB0jPU4Nz2kJkGvGho",
  authDomain: "casinbbdd.firebaseapp.com",
  projectId: "casinBBDD",
  storageBucket: "casinBBDD.firebasestorage.app",
  messagingSenderId: "590507108414",
  appId: "1:590507108414:web:03e3c30b8d0f3fcfd86b8a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebaseData() {
  console.log('🔍 Testing Firebase data...');
  
  try {
    // Test directorio_contactos
    const contactsQuery = query(collection(db, 'directorio_contactos'), limit(3));
    const contactsSnapshot = await getDocs(contactsQuery);
    console.log(`📋 directorio_contactos: ${contactsSnapshot.size} documents (showing first 3)`);
    contactsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('  - Contact:', {
        id: doc.id,
        nombre: data.nombre_completo,
        email: data.email,
        telefono: data.telefono_movil,
        status: data.status
      });
    });

    // Test autos
    const autosQuery = query(collection(db, 'autos'), limit(3));
    const autosSnapshot = await getDocs(autosQuery);
    console.log(`🚗 autos: ${autosSnapshot.size} documents (showing first 3)`);
    autosSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('  - Auto:', {
        id: doc.id,
        contratante: data.nombre_contratante,
        poliza: data.numero_poliza,
        aseguradora: data.aseguradora,
        vigencia_inicio: data.vigencia_inicio,
        vigencia_fin: data.vigencia_fin
      });
    });

    // Test rc
    const rcQuery = query(collection(db, 'rc'), limit(2));
    const rcSnapshot = await getDocs(rcQuery);
    console.log(`⚖️ rc: ${rcSnapshot.size} documents (showing first 2)`);
    rcSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('  - RC:', {
        id: doc.id,
        asegurado: data.asegurado,
        poliza: data.numero_poliza,
        aseguradora: data.aseguradora
      });
    });

    // Test vida
    const vidaQuery = query(collection(db, 'vida'), limit(2));
    const vidaSnapshot = await getDocs(vidaQuery);
    console.log(`🛡️ vida: ${vidaSnapshot.size} documents (showing first 2)`);
    vidaSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('  - Vida:', {
        id: doc.id,
        contratante: data.contratante,
        poliza: data.numero_poliza,
        aseguradora: data.aseguradora
      });
    });

    console.log('✅ Firebase data test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing Firebase data:', error);
  }
}

testFirebaseData(); 
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbpUAe9MZwYHcT6XB0jPU4Nz2kJkGvGho",
  authDomain: "casinbbdd.firebaseapp.com",
  projectId: "casinBBDD",
  storageBucket: "casinBBDD.firebasestorage.app",
  messagingSenderId: "590507108414",
  appId: "1:590507108414:web:03e3c30b8d0f3fcfd86b8a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebaseData() {
  console.log('🔍 Testing Firebase data...');
  
  try {
    // Test directorio_contactos
    const contactsQuery = query(collection(db, 'directorio_contactos'), limit(3));
    const contactsSnapshot = await getDocs(contactsQuery);
    console.log(`📋 directorio_contactos: ${contactsSnapshot.size} documents (showing first 3)`);
    contactsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('  - Contact:', {
        id: doc.id,
        nombre: data.nombre_completo,
        email: data.email,
        telefono: data.telefono_movil,
        status: data.status
      });
    });

    // Test autos
    const autosQuery = query(collection(db, 'autos'), limit(3));
    const autosSnapshot = await getDocs(autosQuery);
    console.log(`🚗 autos: ${autosSnapshot.size} documents (showing first 3)`);
    autosSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('  - Auto:', {
        id: doc.id,
        contratante: data.nombre_contratante,
        poliza: data.numero_poliza,
        aseguradora: data.aseguradora,
        vigencia_inicio: data.vigencia_inicio,
        vigencia_fin: data.vigencia_fin
      });
    });

    // Test rc
    const rcQuery = query(collection(db, 'rc'), limit(2));
    const rcSnapshot = await getDocs(rcQuery);
    console.log(`⚖️ rc: ${rcSnapshot.size} documents (showing first 2)`);
    rcSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('  - RC:', {
        id: doc.id,
        asegurado: data.asegurado,
        poliza: data.numero_poliza,
        aseguradora: data.aseguradora
      });
    });

    // Test vida
    const vidaQuery = query(collection(db, 'vida'), limit(2));
    const vidaSnapshot = await getDocs(vidaQuery);
    console.log(`🛡️ vida: ${vidaSnapshot.size} documents (showing first 2)`);
    vidaSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('  - Vida:', {
        id: doc.id,
        contratante: data.contratante,
        poliza: data.numero_poliza,
        aseguradora: data.aseguradora
      });
    });

    console.log('✅ Firebase data test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing Firebase data:', error);
  }
}

testFirebaseData(); 