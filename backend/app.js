import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();
console.log('Loading environment from:', path.resolve('.env'));
console.log('Environment variables loaded:', Object.keys(process.env));

// Import services (you may need to update these to ES modules too)
// const mysqlDatabase = require('./services/mysqlDatabase');
// const birthdayService = require('./services/birthdayService');

// Import routes (you may need to update these to ES modules too)
// const prospeccionRoutes = require('./routes/prospeccionRoutes');
// const fileRoutes = require('./routes/fileRoutes');
// const dataRoutes = require('./routes/dataRoutes');
// const policyStatusRoutes = require('./routes/policyStatusRoutes');
// const driveRoutes = require('./routes/driveRoutes');
// const emailRoutes = require('./routes/emailRoutes');
// const gptRoutes = require('./routes/gptRoutes');
// const birthdayRoutes = require('./routes/birthdayRoutes');
// const authRoutes = require('./routes/authRoutes');
// const notionRoutes = require('./routes/notionRoutes');
import directorioRoutes from './routes/directorio.js';
// const supportChatRoutes = require('./routes/supportChat');

const app = express();
const port = process.env.PORT || 3001;

// Debug middleware
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path}`);
  next();
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://*.railway.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/directorio', directorioRoutes);

// Temporary basic routes for other services
app.get('/api/*', (req, res) => {
  res.json({ 
    message: 'API endpoint not implemented yet in production',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Print available routes
console.log('Available routes:');
console.log('- /api/directorio (active)');
console.log('- /health');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  console.log('Received shutdown signal');
  
  // Close the HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // If server hasn't finished in 10s, force shutdown
  setTimeout(() => {
    console.log('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

export default app; 