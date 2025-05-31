const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://192.168.1.125:5174',
    'https://*.railway.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import working routes
const dataRoutes = require('./backend/routes/dataRoutes');
const birthdayRoutes = require('./backend/routes/birthdayRoutes');
const notionRoutes = require('./backend/routes/notionRoutes');
const tableRoutes = require('./backend/routes/tableRoutes'); // Fixed router definition issues
const driveRoutes = require('./backend/routes/driveRoutes');
const fileRoutes = require('./backend/routes/fileRoutes');
const gptRoutes = require('./backend/routes/gptRoutes');
const authRoutes = require('./backend/routes/authRoutes');
const emailRoutes = require('./backend/routes/emailRoutes');
const policyStatusRoutes = require('./backend/routes/policyStatusRoutes');
const prospeccionRoutes = require('./backend/routes/prospeccionRoutes');
const sharepointRoutes = require('./backend/routes/sharepointRoutes');
const supportChatRoutes = require('./backend/routes/supportChat');
const directorioRoutes = require('./backend/routes/directorioRoutes'); // New directorio routes

// Use working routes
app.use('/api/data', dataRoutes);
app.use('/api/birthday', birthdayRoutes);
app.use('/api/notion', notionRoutes);
app.use('/api/tables', tableRoutes); // Now working
app.use('/api/drive', driveRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/gpt', gptRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/policy-status', policyStatusRoutes);
app.use('/api/prospeccion', prospeccionRoutes);
app.use('/api/sharepoint', sharepointRoutes);
app.use('/api/support', supportChatRoutes);
app.use('/api/directorio', directorioRoutes); // Add directorio routes

// Catch-all for undefined API routes
app.get('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    available_endpoints: [
      '/api/data/*',
      '/api/birthday/*',
      '/api/notion/*',
      '/api/tables/*',
      '/api/drive/*',
      '/api/files/*',
      '/api/gpt/*',
      '/api/auth/*',
      '/api/email/*',
      '/api/policy-status/*',
      '/api/prospeccion/*',
      '/api/sharepoint/*',
      '/api/support/*',
      '/api/directorio/*',
      '/health'
    ],
    requested_path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CASIN Backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 API endpoints:`);
  console.log(`   - Data: http://localhost:${PORT}/api/data/*`);
  console.log(`   - Birthday: http://localhost:${PORT}/api/birthday/*`);
  console.log(`   - Notion: http://localhost:${PORT}/api/notion/*`);
  console.log(`   - Tables: http://localhost:${PORT}/api/tables/*`);
  console.log(`   - Drive: http://localhost:${PORT}/api/drive/*`);
  console.log(`   - Files: http://localhost:${PORT}/api/files/*`);
  console.log(`   - GPT: http://localhost:${PORT}/api/gpt/*`);
  console.log(`   - Auth: http://localhost:${PORT}/api/auth/*`);
  console.log(`   - Email: http://localhost:${PORT}/api/email/*`);
  console.log(`   - Policy Status: http://localhost:${PORT}/api/policy-status/*`);
  console.log(`   - Prospeccion: http://localhost:${PORT}/api/prospeccion/*`);
  console.log(`   - Sharepoint: http://localhost:${PORT}/api/sharepoint/*`);
  console.log(`   - Support: http://localhost:${PORT}/api/support/*`);
  console.log(`   - Directorio: http://localhost:${PORT}/api/directorio/*`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app; 