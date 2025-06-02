const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware para servir archivos estáticos
app.use(express.static('.'));

// API Routes - Complete development endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'CASIN CRM API is running!',
    frontend: 'integrated',
    backend: 'integrated'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend API is working!',
    timestamp: new Date().toISOString(),
    server: 'integrated'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    frontend: 'running',
    backend: 'integrated',
    database: 'mock (development mode)',
    firebase: 'disabled (development mode)',
    notion: 'disabled (development mode)',
    services: {
      email: 'disabled',
      gpt: 'disabled',
      drive: 'disabled'
    },
    mode: 'development'
  });
});

// Data endpoints - Mock responses for development
app.get('/api/data/tables', (req, res) => {
  res.json([
    {
      name: 'autos1',
      title: 'Autos 1',
      type: 'AUTOS',
      isMainTable: true,
      isSecondaryTable: false,
      columns: [
        { name: 'id', type: 'INT' },
        { name: 'nombre', type: 'VARCHAR' },
        { name: 'telefono', type: 'VARCHAR' },
        { name: 'email', type: 'VARCHAR' },
        { name: 'poliza', type: 'VARCHAR' }
      ]
    },
    {
      name: 'vida1',
      title: 'Vida 1',
      type: 'VIDA',
      isMainTable: true,
      isSecondaryTable: false,
      columns: [
        { name: 'id', type: 'INT' },
        { name: 'nombre', type: 'VARCHAR' },
        { name: 'telefono', type: 'VARCHAR' },
        { name: 'email', type: 'VARCHAR' },
        { name: 'poliza', type: 'VARCHAR' }
      ]
    },
    {
      name: 'directorio_contactos',
      title: 'Directorio Contactos',
      type: 'DIRECTORIO',
      isMainTable: false,
      isSecondaryTable: false,
      columns: [
        { name: 'id', type: 'INT' },
        { name: 'nombre', type: 'VARCHAR' },
        { name: 'telefono', type: 'VARCHAR' },
        { name: 'email', type: 'VARCHAR' }
      ]
    }
  ]);
});

app.get('/api/data/table-types', (req, res) => {
  res.json({
    autos1: {
      type: 'AUTOS',
      isGroup: false,
      childTable: null,
      isMainTable: true,
      isSecondaryTable: false,
      fields: ['nombre', 'telefono', 'email', 'poliza']
    },
    vida1: {
      type: 'VIDA',
      isGroup: false,
      childTable: null,
      isMainTable: true,
      isSecondaryTable: false,
      fields: ['nombre', 'telefono', 'email', 'poliza']
    },
    directorio_contactos: {
      type: 'DIRECTORIO',
      isGroup: false,
      childTable: null,
      isMainTable: false,
      isSecondaryTable: false,
      fields: ['nombre', 'telefono', 'email']
    }
  });
});

app.get('/api/data/:tableName', (req, res) => {
  const { tableName } = req.params;
  res.json({
    data: [
      {
        id: 1,
        nombre: 'Cliente Demo',
        telefono: '555-0123',
        email: 'demo@example.com',
        poliza: 'POL-001'
      }
    ],
    total: 1,
    table: tableName
  });
});

app.post('/api/data/:tableName', (req, res) => {
  const { tableName } = req.params;
  const data = req.body;
  res.json({
    success: true,
    message: `Data inserted into ${tableName}`,
    id: Math.floor(Math.random() * 1000),
    data: data
  });
});

app.get('/api/data/tables/:tableName/structure', (req, res) => {
  const { tableName } = req.params;
  res.json({
    columns: [
      { name: 'id', type: 'INT' },
      { name: 'nombre', type: 'VARCHAR' },
      { name: 'telefono', type: 'VARCHAR' },
      { name: 'email', type: 'VARCHAR' },
      { name: 'poliza', type: 'VARCHAR' }
    ],
    tableName: tableName
  });
});

// Birthday endpoints
app.get('/api/birthday', (req, res) => {
  res.json([]);
});

app.get('/api/birthdays', (req, res) => {
  res.json([]);
});

app.get('/api/birthdays/today', (req, res) => {
  res.json([]);
});

app.get('/api/birthdays/upcoming', (req, res) => {
  res.json([]);
});

// Directorio endpoints
app.get('/api/directorio', (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  res.json({
    data: [
      {
        id: 1,
        nombre: 'Contacto Demo',
        telefono: '555-0123',
        email: 'contacto@example.com'
      }
    ],
    total: 1,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: 1
  });
});

app.get('/api/directorio/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
    total: 1,
      clientes: 1,
      prospectos: 0,
      inactivos: 0,
    withPhone: 1,
    withEmail: 1,
    withBirthday: 0
    }
  });
});

app.post('/api/directorio', (req, res) => {
  res.json({
    success: true,
    message: 'Contact added successfully',
    id: Math.floor(Math.random() * 1000)
  });
});

// Policy status endpoints
app.get('/api/policy-status', (req, res) => {
  res.json([]);
});

app.post('/api/policy-status', (req, res) => {
  res.json({ success: true, message: 'Policy status updated' });
});

// File endpoints
app.get('/api/files', (req, res) => {
  res.json([]);
});

app.post('/api/files/upload', (req, res) => {
  res.json({ success: true, message: 'File upload simulated' });
});

// GPT endpoints
app.post('/api/gpt/analyze', (req, res) => {
  res.json({ 
    success: false, 
    message: 'GPT service disabled in development mode',
    analysis: null 
  });
});

// Notion endpoints
app.get('/api/notion/databases', (req, res) => {
  res.json([]);
});

app.get('/api/notion/raw-table', (req, res) => {
  res.json([]);
});

app.get('/api/notion/users', (req, res) => {
  res.json([]);
});

app.post('/api/notion/pages', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Notion service disabled in development mode' 
  });
});

// Prospeccion endpoints
app.get('/api/prospeccion', (req, res) => {
  res.json([]);
});

app.post('/api/prospeccion', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Prospeccion service disabled in development mode' 
  });
});

// Email endpoints
app.post('/api/email/send', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Email service disabled in development mode' 
  });
});

// Drive endpoints
app.get('/api/drive/files', (req, res) => {
  res.json([]);
});

app.get('/api/drive/test', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Drive service disabled in development mode',
    connected: false
  });
});

app.post('/api/drive/upload', (req, res) => {
  res.json({ 
    success: false, 
    message: 'Drive service disabled in development mode' 
  });
});

// Catch-all for undefined API routes
app.get('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    available_endpoints: [
      '/api/health',
      '/api/test',
      '/api/status',
      '/api/data/tables',
      '/api/data/:tableName',
      '/api/birthday',
      '/api/birthdays',
      '/api/directorio',
      '/api/directorio/stats',
      '/api/policy-status',
      '/api/files',
      '/api/gpt/*',
      '/api/notion/*',
      '/api/prospeccion',
      '/api/email/*',
      '/api/drive/*'
    ],
    requested_path: req.path,
    message: 'This is a development API. Full backend features will be available after database setup.'
  });
});

// Catch-all handler: enviar index.html para rutas SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 CASIN CRM running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`🩺 Health: http://localhost:${PORT}/api/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  console.log(`📊 Data: http://localhost:${PORT}/api/data/tables`);
  console.log(`📞 Directorio: http://localhost:${PORT}/api/directorio`);
  console.log(`🎂 Birthday: http://localhost:${PORT}/api/birthday`);
  console.log(`🎯 Mode: Development with mock data`);
}); 