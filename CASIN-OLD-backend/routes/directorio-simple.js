import express from 'express';
import mysql from 'mysql2/promise';

const router = express.Router();

console.log('🚀 SIMPLE DIRECTORIO ROUTES LOADED');

// Database configuration
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'crud_db',
  port: process.env.MYSQLPORT || process.env.DB_PORT || '3306',
  charset: 'utf8mb4'
};

// Get database connection
async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Simple directorio routes working!', timestamp: new Date().toISOString() });
});

// Get all contacts - basic version
router.get('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT * FROM directorio_contactos ORDER BY nombre_completo ASC LIMIT 50');
    
    res.json({
      success: true,
      data: rows,
      total: rows.length
    });
    
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

// Get contact by ID - basic version  
router.get('/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const { id } = req.params;
    
    const [rows] = await connection.execute('SELECT * FROM directorio_contactos WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(rows[0]);
    
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) await connection.end();
  }
});

export default router; 