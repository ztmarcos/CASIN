#!/usr/bin/env node

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBe8jgFgGG4VCOjYzlPVNLEgJzZrFHIEKs",
  authDomain: "casinbbdd.firebaseapp.com",
  databaseURL: "https://casinbbdd-default-rtdb.firebaseio.com",
  projectId: "casinbbdd",
  storageBucket: "casinbbdd.firebasestorage.app",
  messagingSenderId: "990053961044",
  appId: "1:990053961044:web:b5f5c8d5e6f7a8b9c0d1e2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('🔍 VERIFICACIÓN DETALLADA DE DATOS - AUTOS');
console.log('='.repeat(60));

async function checkDetailedData() {
  try {
    // 1. Verificar colección directa 'autos'
    console.log('\n📊 1. COLECCIÓN DIRECTA: autos');
    const autosDirectCollection = collection(db, 'autos');
    const autosDirectSnapshot = await getDocs(autosDirectCollection);
    
    console.log(`   📋 Total documentos: ${autosDirectSnapshot.size}`);
    
    if (autosDirectSnapshot.size > 0) {
      console.log('   📄 Primeros 3 documentos:');
      let count = 0;
      autosDirectSnapshot.forEach(doc => {
        if (count < 3) {
          const data = doc.data();
          console.log(`      ${count + 1}. ID: ${doc.id}`);
          console.log(`         Aseguradora: ${data.aseguradora || 'N/A'}`);
          console.log(`         Cliente: ${data.cliente || data.nombre || 'N/A'}`);
          console.log(`         Fecha: ${data.fecha || data.createdAt || 'N/A'}`);
          count++;
        }
      });
    }

    // 2. Verificar colecciones con prefijo team_ para ambos equipos CASIN
    const casinTeamIds = ['4JlUqhAvfJMlCDhQ4vgH', 'ngXzjqxlBy8Bsv8ks3vc'];
    
    for (const teamId of casinTeamIds) {
      console.log(`\n📊 2. COLECCIÓN CON PREFIJO: team_${teamId}_autos`);
      
      try {
        const teamAutosCollection = collection(db, `team_${teamId}_autos`);
        const teamAutosSnapshot = await getDocs(teamAutosCollection);
        
        console.log(`   📋 Total documentos: ${teamAutosSnapshot.size}`);
        
        if (teamAutosSnapshot.size > 0) {
          console.log('   📄 Primeros 3 documentos:');
          let count = 0;
          teamAutosSnapshot.forEach(doc => {
            if (count < 3) {
              const data = doc.data();
              console.log(`      ${count + 1}. ID: ${doc.id}`);
              console.log(`         Aseguradora: ${data.aseguradora || 'N/A'}`);
              console.log(`         Cliente: ${data.cliente || data.nombre || 'N/A'}`);
              console.log(`         Fecha: ${data.fecha || data.createdAt || 'N/A'}`);
              count++;
            }
          });
        }
      } catch (error) {
        console.log(`   ❌ Error accediendo a team_${teamId}_autos:`, error.message);
      }
    }

    // 3. Verificar otras posibles colecciones de autos
    const possibleAutosCollections = [
      'autos_casin',
      'autos_main', 
      'casin_autos',
      'main_autos',
      'team_CASIN_autos',
      'CASIN_autos'
    ];

    console.log('\n📊 3. VERIFICANDO OTRAS POSIBLES COLECCIONES DE AUTOS:');
    
    for (const collectionName of possibleAutosCollections) {
      try {
        const testCollection = collection(db, collectionName);
        const testSnapshot = await getDocs(query(testCollection, limit(1)));
        
        if (!testSnapshot.empty) {
          const fullSnapshot = await getDocs(testCollection);
          console.log(`   ✅ ${collectionName}: ${fullSnapshot.size} documentos`);
          
          // Mostrar primer documento para identificar la colección
          const firstDoc = testSnapshot.docs[0];
          const data = firstDoc.data();
          console.log(`      📄 Primer documento: ${data.aseguradora || data.cliente || 'N/A'}`);
        } else {
          console.log(`   ❌ ${collectionName}: vacía`);
        }
      } catch (error) {
        console.log(`   ❌ ${collectionName}: no accesible`);
      }
    }

    // 4. Verificar qué ve cada usuario según su configuración
    console.log('\n🎯 4. SIMULACIÓN DE ACCESO POR USUARIO:');
    
    // Simular z.t.marcos (usuario CASIN)
    console.log('\n   👤 z.t.marcos@gmail.com (Usuario CASIN):');
    console.log('      🔍 Detectado como usuario CASIN → Usa colecciones directas');
    console.log(`      📊 Vería colección: autos (${autosDirectSnapshot.size} documentos)`);
    
    // Simular marcoszavala09 (ahora también usuario CASIN)
    console.log('\n   👤 marcoszavala09@gmail.com (Ahora Usuario CASIN):');
    console.log('      🔍 Detectado como usuario CASIN → Usa colecciones directas');
    console.log(`      📊 Debería ver colección: autos (${autosDirectSnapshot.size} documentos)`);

    // 5. Verificar si hay diferencias en los datos de backend vs frontend
    console.log('\n🌐 5. VERIFICACIÓN DE API BACKEND:');
    
    // Simular llamada al backend API
    const API_URL = 'https://sis-casin-216c74c28e12.herokuapp.com/api';
    
    try {
      console.log('   🔄 Probando API /api/data/autos...');
      
      const response = await fetch(`${API_URL}/data/autos?limit=5`);
      if (response.ok) {
        const apiData = await response.json();
        console.log(`   📊 API Response: ${apiData.data?.length || 0} documentos`);
        
        if (apiData.data && apiData.data.length > 0) {
          console.log('   📄 Primer documento de API:');
          const firstApiDoc = apiData.data[0];
          console.log(`      Aseguradora: ${firstApiDoc.aseguradora || 'N/A'}`);
          console.log(`      Cliente: ${firstApiDoc.cliente || firstApiDoc.nombre || 'N/A'}`);
        }
      } else {
        console.log(`   ❌ API Error: ${response.status} ${response.statusText}`);
      }
    } catch (apiError) {
      console.log(`   ❌ API Error: ${apiError.message}`);
    }

    // 6. Análisis y recomendaciones
    console.log('\n📋 6. ANÁLISIS Y RECOMENDACIONES:');
    console.log('='.repeat(60));
    
    if (autosDirectSnapshot.size === 33) {
      console.log('✅ La colección directa "autos" tiene 33 documentos (como z.t.marcos)');
    } else if (autosDirectSnapshot.size === 34) {
      console.log('⚠️ La colección directa "autos" tiene 34 documentos (como marcoszavala09)');
    } else {
      console.log(`🤔 La colección directa "autos" tiene ${autosDirectSnapshot.size} documentos (diferente a ambos)`);
    }
    
    console.log('\n💡 POSIBLES CAUSAS DE LA DIFERENCIA:');
    console.log('1. 🕐 Cache del navegador - datos desactualizados');
    console.log('2. 📱 Diferentes dispositivos con cache local');
    console.log('3. 🔄 Sincronización pendiente entre frontend y backend');
    console.log('4. 📊 Uno de los usuarios ve datos cacheados/offline');
    console.log('5. 🎯 Diferentes colecciones siendo accedidas sin darse cuenta');
    
    console.log('\n🔧 SOLUCIONES RECOMENDADAS:');
    console.log('1. 🧹 Limpiar cache del navegador en ambas cuentas');
    console.log('2. 🔄 Hacer hard refresh (Ctrl+Shift+R)');
    console.log('3. 📱 Verificar en modo incógnito');
    console.log('4. 🕐 Verificar si uno tiene "airplane mode" activado');
    console.log('5. 📊 Comparar timestamps de los datos');

  } catch (error) {
    console.error('❌ Error en verificación detallada:', error);
  }
}

checkDetailedData().then(() => {
  console.log('\n✅ Verificación detallada completada');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error en la verificación:', error);
  process.exit(1);
}); 