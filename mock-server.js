const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5174', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Mock data for different collections
const mockData = {
  autos: Array.from({ length: 125 }, (_, i) => ({
    id: `auto_${i + 1}`,
    poliza: `AUTO${String(i + 1).padStart(6, '0')}`,
    asegurado: `Cliente Auto ${i + 1}`,
    vehiculo: `Vehículo ${i + 1}`,
    modelo: 2020 + (i % 5),
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2024-12-31',
    prima: Math.floor(Math.random() * 50000) + 10000,
    status: 'Vigente'
  })),
  
  vida: Array.from({ length: 89 }, (_, i) => ({
    id: `vida_${i + 1}`,
    poliza: `VIDA${String(i + 1).padStart(6, '0')}`,
    asegurado: `Cliente Vida ${i + 1}`,
    beneficiario: `Beneficiario ${i + 1}`,
    suma_asegurada: Math.floor(Math.random() * 1000000) + 100000,
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2024-12-31',
    prima: Math.floor(Math.random() * 20000) + 5000,
    status: 'Vigente'
  })),
  
  gmm: Array.from({ length: 234 }, (_, i) => ({
    id: `gmm_${i + 1}`,
    poliza: `GMM${String(i + 1).padStart(6, '0')}`,
    asegurado: `Cliente GMM ${i + 1}`,
    plan: `Plan ${['Básico', 'Intermedio', 'Premium'][i % 3]}`,
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2024-12-31',
    prima: Math.floor(Math.random() * 30000) + 8000,
    status: 'Vigente'
  })),
  
  transporte: Array.from({ length: 67 }, (_, i) => ({
    id: `transporte_${i + 1}`,
    poliza: `TRANS${String(i + 1).padStart(6, '0')}`,
    asegurado: `Cliente Transporte ${i + 1}`,
    tipo_vehiculo: ['Camión', 'Trailer', 'Autobús'][i % 3],
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2024-12-31',
    prima: Math.floor(Math.random() * 80000) + 20000,
    status: 'Vigente'
  })),
  
  mascotas: Array.from({ length: 45 }, (_, i) => ({
    id: `mascota_${i + 1}`,
    poliza: `MASC${String(i + 1).padStart(6, '0')}`,
    asegurado: `Cliente Mascota ${i + 1}`,
    mascota: `Mascota ${i + 1}`,
    especie: ['Perro', 'Gato', 'Otro'][i % 3],
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2024-12-31',
    prima: Math.floor(Math.random() * 5000) + 1000,
    status: 'Vigente'
  })),
  
  diversos: Array.from({ length: 112 }, (_, i) => ({
    id: `diversos_${i + 1}`,
    poliza: `DIV${String(i + 1).padStart(6, '0')}`,
    asegurado: `Cliente Diversos ${i + 1}`,
    tipo_bien: ['Casa', 'Negocio', 'Equipo'][i % 3],
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2024-12-31',
    prima: Math.floor(Math.random() * 40000) + 5000,
    status: 'Vigente'
  })),
  
  negocio: Array.from({ length: 78 }, (_, i) => ({
    id: `negocio_${i + 1}`,
    poliza: `NEG${String(i + 1).padStart(6, '0')}`,
    asegurado: `Cliente Negocio ${i + 1}`,
    tipo_negocio: ['Restaurante', 'Tienda', 'Oficina'][i % 3],
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2024-12-31',
    prima: Math.floor(Math.random() * 60000) + 15000,
    status: 'Vigente'
  })),
  
  gruposgmm: Array.from({ length: 156 }, (_, i) => ({
    id: `grupo_${i + 1}`,
    poliza: `GRUGMM${String(i + 1).padStart(6, '0')}`,
    empresa: `Empresa ${i + 1}`,
    empleados: Math.floor(Math.random() * 100) + 5,
    plan: `Plan Empresarial ${['A', 'B', 'C'][i % 3]}`,
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2024-12-31',
    prima_total: Math.floor(Math.random() * 200000) + 50000,
    status: 'Vigente'
  })),
  
  rc: Array.from({ length: 93 }, (_, i) => ({
    id: `rc_${i + 1}`,
    poliza: `RC${String(i + 1).padStart(6, '0')}`,
    asegurado: `Cliente RC ${i + 1}`,
    actividad: ['Profesional', 'Comercial', 'Industrial'][i % 3],
    vigencia_desde: '2024-01-01',
    vigencia_hasta: '2024-12-31',
    prima: Math.floor(Math.random() * 70000) + 10000,
    status: 'Vigente'
  })),
  
  directorio_contactos: Array.from({ length: 2750 }, (_, i) => ({
    id: `contacto_${i + 1}`,
    nombre: `Contacto ${i + 1}`,
    telefono: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    email: `contacto${i + 1}@email.com`,
    empresa: `Empresa ${i + 1}`,
    categoria: ['Cliente', 'Prospecto', 'Proveedor'][i % 3]
  }))
};

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: 'mock-development',
    message: 'CASIN CRM Mock Server is running!',
    database: 'connected',
    databaseType: 'Mock Data',
    firebaseConfigured: false,
    debug: {
      isVercel: false,
      isFirebaseEnabled: false,
      hasDb: true,
      hasAdmin: false,
      firebaseProjectId: 'mock',
      firebasePrivateKey: 'mock'
    },
    services: {
      notion: false,
      openai: false,
      googleDrive: false,
      email: false
    }
  });
});

// Get available tables
app.get('/api/tables', (req, res) => {
  const tables = Object.keys(mockData).map(name => ({
    name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    collection: name,
    icon: getTableIcon(name)
  }));
  
  res.json({ tables });
});

function getTableIcon(tableName) {
  const icons = {
    autos: '🚗',
    vida: '❤️',
    gmm: '🏥',
    transporte: '🚛',
    mascotas: '🐕',
    diversos: '🏠',
    negocio: '🏢',
    gruposgmm: '👥',
    rc: '🛡️',
    directorio_contactos: '📞'
  };
  return icons[tableName] || '📄';
}

// Get data from a specific table
app.get('/api/data/:tableName', (req, res) => {
  const { tableName } = req.params;
  const { limit = 1000, page = 1 } = req.query;
  
  if (!mockData[tableName]) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  const data = mockData[tableName];
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedData = data.slice(startIndex, endIndex);
  
  res.json({
    data: paginatedData,
    total: data.length,
    table: tableName,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(data.length / limit)
  });
});

// Get child tables (for compatibility)
app.get('/api/child-tables/:parentTable', (req, res) => {
  res.json({ childTables: [] });
});

// Birthday endpoint
app.get('/api/birthdays', (req, res) => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  
  // Generate some mock birthdays for current month
  const birthdays = Array.from({ length: 8 }, (_, i) => ({
    id: `birthday_${i + 1}`,
    nombre: `Cliente Cumpleaños ${i + 1}`,
    fecha_nacimiento: `${currentMonth.toString().padStart(2, '0')}/${(i + 1).toString().padStart(2, '0')}`,
    telefono: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    email: `cumple${i + 1}@email.com`,
    polizas: ['AUTO123456', 'VIDA789012'][i % 2]
  }));
  
  res.json({ data: birthdays });
});

// Reports endpoint
app.get('/api/reports', (req, res) => {
  res.json({
    data: {
      totalPolicies: Object.values(mockData).reduce((sum, table) => 
        table === mockData.directorio_contactos ? sum : sum + table.length, 0
      ),
      totalContacts: mockData.directorio_contactos.length,
      recentActivity: []
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Server running on http://localhost:${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   • GET /api/health - Server status`);
  console.log(`   • GET /api/tables - Available tables`);
  console.log(`   • GET /api/data/:tableName - Table data`);
  console.log(`   • GET /api/birthdays - Birthday data`);
  console.log(`   • GET /api/reports - Reports data`);
  console.log(`\n📋 Mock data available for: ${Object.keys(mockData).join(', ')}`);
  console.log(`📈 Total policies (excluding directorio): ${Object.values(mockData).reduce((sum, table) => 
    table === mockData.directorio_contactos ? sum : sum + table.length, 0)}`);
  console.log(`📞 Total contacts: ${mockData.directorio_contactos.length}`);
}); 