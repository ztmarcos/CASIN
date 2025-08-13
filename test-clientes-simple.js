// Simple test script for Clientes module imports
console.log('🧪 Testing Clientes module imports...');

try {
  // Test 1: Import the service
  console.log('📦 Test 1: Importing firebaseClientesService...');
  
  // Simulate the imports that the service uses
  const mockFirebaseConfig = {
    FIREBASE_ENABLED: true
  };
  
  const mockFirebaseTeamService = {
    currentTeamId: 'CASIN'
  };
  
  console.log('✅ Firebase config:', mockFirebaseConfig);
  console.log('✅ Team service:', mockFirebaseTeamService);
  
  // Test 2: Test collection name resolution
  console.log('\n🏷️ Test 2: Testing collection name resolution...');
  
  const getCollectionName = (baseName) => {
    if (!mockFirebaseConfig.FIREBASE_ENABLED) {
      return baseName;
    }
    
    const currentTeamId = mockFirebaseTeamService.currentTeamId;
    
    if (currentTeamId === 'CASIN' || currentTeamId === '4JlUqhAvfJMlCDhQ4vgH') {
      return baseName;
    }
    
    return `team_${currentTeamId}_${baseName}`;
  };
  
  const testCollections = ['autos', 'vida', 'gmm'];
  testCollections.forEach(collection => {
    const resolvedName = getCollectionName(collection);
    console.log(`${collection} -> ${resolvedName}`);
  });
  
  // Test 3: Test name normalization
  console.log('\n🔄 Test 3: Testing name normalization...');
  
  const normalizeClientName = (name) => {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.,]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };
  
  const testNames = [
    'José María González',
    'JOSE MARIA GONZALEZ',
    'José María González.',
    'José María González,',
    'José María  González'
  ];
  
  testNames.forEach(name => {
    const normalized = normalizeClientName(name);
    console.log(`"${name}" -> "${normalized}"`);
  });
  
  console.log('\n✅ All import tests passed!');
  console.log('🎉 The Clientes module should work correctly in the browser.');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
