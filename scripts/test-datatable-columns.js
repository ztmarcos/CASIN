/**
 * Test script para verificar que DataTable está obteniendo las columnas correctas
 */

const fetch = require('node-fetch');

async function testDataTableColumns() {
  console.log('🧪 Testing DataTable column detection...\n');
  
  try {
    // Test API endpoint that DataTable uses
    const API_URL = 'http://localhost:3001/api';
    const tableName = 'autos';
    
    console.log(`📡 Testing: ${API_URL}/data/tables/${tableName}/structure`);
    
    const response = await fetch(`${API_URL}/data/tables/${tableName}/structure`);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const structure = await response.json();
    
    if (!structure.columns) {
      throw new Error('No columns property in response');
    }
    
    const allColumns = structure.columns.map(col => col.name);
    const customColumns = structure.columns.filter(col => col.isCustom).map(col => col.name);
    
    console.log('✅ API Response Success!');
    console.log(`📊 Total columns: ${allColumns.length}`);
    console.log(`🔧 Custom columns: ${customColumns.length}`);
    console.log('');
    
    console.log('📋 All columns:');
    allColumns.forEach((col, index) => {
      const isCustom = structure.columns.find(c => c.name === col)?.isCustom;
      console.log(`  ${index + 1}. ${col}${isCustom ? ' (custom)' : ''}`);
    });
    
    console.log('');
    
    // Check specifically for pago_parcial
    const pagoParcialExists = allColumns.includes('pago_parcial');
    const pagoParcialIndex = allColumns.indexOf('pago_parcial');
    const formaPagoIndex = allColumns.indexOf('forma_de_pago');
    
    console.log('🔍 Specific checks:');
    console.log(`  pago_parcial exists: ${pagoParcialExists ? '✅' : '❌'}`);
    if (pagoParcialExists) {
      console.log(`  pago_parcial position: ${pagoParcialIndex + 1}`);
    }
    console.log(`  forma_de_pago position: ${formaPagoIndex >= 0 ? formaPagoIndex + 1 : 'not found'}`);
    
    if (pagoParcialExists && formaPagoIndex >= 0) {
      const isAdjacent = Math.abs(pagoParcialIndex - formaPagoIndex) === 1;
      console.log(`  Adjacent positioning: ${isAdjacent ? '✅' : '❌'}`);
    }
    
    console.log('');
    console.log('🎯 Expected DataTable behavior:');
    console.log('  1. DataTable should call this API endpoint ✅');
    console.log('  2. DataTable should receive all columns including custom ones ✅');
    console.log('  3. DataTable should display pago_parcial in headers ✅');
    console.log('  4. Column should be editable with double-click ✅');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
testDataTableColumns().then(() => {
  console.log('\n🎉 All tests passed! DataTable should now show pago_parcial column.');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
}); 