#!/usr/bin/env node

console.log('✈️ VERIFICACIÓN DE AIRPLANE MODE Y CACHE');
console.log('='.repeat(60));

console.log('\n🔍 DIAGNÓSTICO DEL PROBLEMA:');
console.log('   📊 Firebase real: 34 documentos en autos');
console.log('   👤 marcoszavala09: Ve 34 documentos ✅');
console.log('   👤 z.t.marcos: Ve 33 documentos ❌');
console.log('   💡 Causa probable: Airplane mode o cache desactualizado');

console.log('\n✈️ VERIFICACIÓN DE AIRPLANE MODE:');
console.log('   🌐 Para verificar si airplane mode está activado:');
console.log('   1. Abrir consola del navegador en la cuenta de z.t.marcos');
console.log('   2. Ejecutar: localStorage.getItem("airplaneMode")');
console.log('   3. Si retorna "true" → Airplane mode ACTIVADO');

console.log('\n🧹 SOLUCIONES PARA LIMPIAR CACHE:');
console.log('\n   📋 OPCIÓN 1: Limpiar Airplane Mode (si está activado)');
console.log('   ```javascript');
console.log('   // En consola del navegador de z.t.marcos:');
console.log('   localStorage.removeItem("airplaneMode");');
console.log('   localStorage.removeItem("airplaneModeTimestamp");');
console.log('   localStorage.removeItem("airplane_tables");');
console.log('   // Limpiar datos cacheados de autos:');
console.log('   localStorage.removeItem("airplane_table_autos");');
console.log('   window.location.reload();');
console.log('   ```');

console.log('\n   📋 OPCIÓN 2: Limpiar TODO el cache local');
console.log('   ```javascript');
console.log('   // En consola del navegador de z.t.marcos:');
console.log('   localStorage.clear();');
console.log('   sessionStorage.clear();');
console.log('   window.location.reload();');
console.log('   ```');

console.log('\n   📋 OPCIÓN 3: Hard Refresh');
console.log('   - Presionar Ctrl+Shift+R (Windows/Linux)');
console.log('   - Presionar Cmd+Shift+R (Mac)');
console.log('   - O F5 mientras se mantiene Shift');

console.log('\n   📋 OPCIÓN 4: Modo Incógnito');
console.log('   - Abrir ventana de incógnito');
console.log('   - Iniciar sesión como z.t.marcos');
console.log('   - Verificar si ve 34 documentos');

console.log('\n🔍 VERIFICACIÓN POST-LIMPIEZA:');
console.log('   ```javascript');
console.log('   // Verificar que airplane mode esté desactivado:');
console.log('   console.log("Airplane mode:", localStorage.getItem("airplaneMode"));');
console.log('   // Debe retornar null o undefined');
console.log('   ');
console.log('   // Verificar detección CASIN:');
console.log('   console.log("Es usuario CASIN:", tableServiceAdapter?.isCasinUser());');
console.log('   // Debe retornar true');
console.log('   ');
console.log('   // Verificar sistema de equipos:');
console.log('   console.log("Usa equipos:", tableServiceAdapter?.isTeamSystemAvailable());');
console.log('   // Debe retornar false');
console.log('   ```');

console.log('\n📊 RESULTADO ESPERADO:');
console.log('   ✅ Ambos usuarios ven 34 documentos en autos');
console.log('   ✅ Mismos datos en todas las tablas');
console.log('   ✅ Sin diferencias de cache');

console.log('\n⚠️ PREVENCIÓN FUTURA:');
console.log('   1. 🚫 No activar airplane mode a menos que sea necesario');
console.log('   2. 🧹 Si se activa, recordar desactivarlo después');
console.log('   3. 🔄 Hacer refresh periódicamente para datos actualizados');
console.log('   4. 📱 Verificar en modo incógnito si hay dudas sobre cache');

console.log('\n' + '='.repeat(60));
console.log('✅ Guía de solución completada');
console.log('💡 Ejecutar los comandos en la consola del navegador de z.t.marcos'); 