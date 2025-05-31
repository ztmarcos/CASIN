import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

// ES modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);

// Load environment variables
dotenv.config();

// Database configuration - Updated for Railway's new variable names
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'crud_db',
  port: process.env.MYSQLPORT || process.env.DB_PORT || '3306',
  charset: 'utf8mb4'
};

// Create MySQL pool
const pool = mysql.createPool(dbConfig);

// Import ONLY directorio routes
import directorioRoutes from './routes/directorio-simple.js';

const app = express();
const port = process.env.PORT || 3001;

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ONLY directorio routes
app.use('/api/directorio', directorioRoutes);

// Catch-all for other API endpoints
app.get('/api/*', (req, res) => {
  res.json({ 
    message: 'This is a standalone directorio API',
    available_endpoints: ['/api/directorio', '/health'],
    requested_path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Database initialization for Railway
async function initializeDatabase() {
  if (process.env.RAILWAY_ENVIRONMENT || process.env.MYSQLDATABASE) {
    console.log('🚀 Checking Railway database...');
    try {
      const connection = await pool.getConnection();
      const [existing] = await connection.execute('SELECT COUNT(*) as count FROM directorio_contactos LIMIT 1');
      connection.release();
      
      console.log(`✅ Database connected - ${existing[0].count} contacts found`);
      
    } catch (error) {
      console.log('ℹ️ Database initialization not needed or failed:', error.message);
    }
  }
}

// Start server
const server = app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Directorio standalone backend running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`📱 API endpoint: http://localhost:${port}/api/directorio`);
  
  // Initialize database
  await initializeDatabase();
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

export default app; 