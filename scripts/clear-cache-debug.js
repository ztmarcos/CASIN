/**
 * Script para limpiar el cache y debuggear problemas de datos
 */

const API_URL = 'http://localhost:3001/api';

async function clearCacheAndDebug() {
  console.log('🧹 Limpiando cache y debuggeando...\n');
  
  try {
    // 1. Test API directly
    console.log('1️⃣ Probando API directamente...');
    const response = await fetch(`${API_URL}/data/autos`);
    
    if (!response.ok) {
      throw new Error(`API respondió con status: ${response.status}`);
    }
    
    const apiData = await response.json();
    console.log(`✅ API responde: ${apiData.data?.length || 0} registros`);
    
    // 2. Clear localStorage (donde está el cache)
    console.log('\n2️⃣ Limpiando localStorage...');
    
    // Check what's in localStorage first
    console.log('📦 Contenido actual de localStorage:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('cache') || key.includes('datasection') || key.includes('airplane'))) {
        console.log(`  - ${key}: ${localStorage.getItem(key)?.substring(0, 100)}...`);
      }
    }
    
    // Clear cache-related items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('cache') || key.includes('datasection') || key.includes('airplane'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Eliminado: ${key}`);
    });
    
    console.log(`✅ Limpiados ${keysToRemove.length} elementos del cache`);
    
    // 3. Instructions for frontend
    console.log('\n3️⃣ Instrucciones para el frontend:');
    console.log('📱 En el navegador, ve a:');
    console.log('   - Developer Tools (F12)');
    console.log('   - Application > Storage > Local Storage');
    console.log('   - Clear All');
    console.log('   - Refresh la página (Ctrl+F5)');
    
    console.log('\n✅ Script completado. Ahora prueba DataSection en el navegador.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check if we're in browser environment
if (typeof localStorage !== 'undefined') {
  clearCacheAndDebug();
} else {
  console.log('⚠️ Este script debe ejecutarse en el navegador o como módulo ES6');
  console.log('\n📋 Para ejecutar:');
  console.log('1. Abre Developer Tools en tu navegador (F12)');
  console.log('2. Ve a la pestaña Console');
  console.log('3. Copia y pega este código:');
  console.log(`
// Clear all cache
const keys = [];
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && (key.includes('cache') || key.includes('datasection') || key.includes('airplane'))) {
    keys.push(key);
  }
}
keys.forEach(key => localStorage.removeItem(key));
console.log('Cache cleared:', keys.length, 'items');
location.reload();
  `);
} 