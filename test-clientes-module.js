// Test script for the Clientes module
import firebaseClientesService from './frontend/src/services/firebaseClientesService.js';

async function testClientesModule() {
  console.log('🧪 Testing Clientes Module...\n');

  try {
    // Test 1: Get all clients
    console.log('📋 Test 1: Getting all clients...');
    const allClients = await firebaseClientesService.getAllClients();
    console.log(`✅ Found ${allClients.length} unique clients`);
    
    if (allClients.length > 0) {
      const sampleClient = allClients[0];
      console.log('📊 Sample client:', {
        name: sampleClient.clientName,
        totalPolicies: sampleClient.totalPolicies,
        totalPremium: sampleClient.totalPremium,
        activePolicies: sampleClient.activePolicies,
        expiredPolicies: sampleClient.expiredPolicies,
        collections: sampleClient.collections
      });
    }

    // Test 2: Get client stats
    console.log('\n📊 Test 2: Getting client statistics...');
    const stats = await firebaseClientesService.getClientStats();
    console.log('✅ Client stats:', {
      totalClients: stats.totalClients,
      totalPolicies: stats.totalPolicies,
      totalPremium: stats.totalPremium,
      activePolicies: stats.activePolicies,
      expiredPolicies: stats.expiredPolicies,
      collections: stats.collections
    });

    // Test 3: Search clients
    console.log('\n🔍 Test 3: Searching clients...');
    if (allClients.length > 0) {
      const searchTerm = allClients[0].clientName.split(' ')[0]; // First name
      const searchResults = await firebaseClientesService.searchClients(searchTerm, 5);
      console.log(`✅ Search for "${searchTerm}" returned ${searchResults.length} results`);
    }

    // Test 4: Test client name normalization
    console.log('\n🔄 Test 4: Testing name normalization...');
    const testNames = [
      'José María González',
      'JOSE MARIA GONZALEZ',
      'José María González.',
      'José María González,',
      'José María  González'
    ];
    
    testNames.forEach(name => {
      const normalized = firebaseClientesService.normalizeClientName(name);
      console.log(`"${name}" -> "${normalized}"`);
    });

    // Test 5: Test collection name resolution
    console.log('\n🏷️ Test 5: Testing collection name resolution...');
    const testCollections = ['autos', 'vida', 'gmm'];
    testCollections.forEach(collection => {
      const resolvedName = firebaseClientesService.getCollectionName(collection);
      console.log(`${collection} -> ${resolvedName}`);
    });

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testClientesModule();
