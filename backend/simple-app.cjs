const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Starting Simple Directorio Backend...');

// Railway MySQL configuration
const dbConfig = {
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway',
  charset: 'utf8mb4',
  timezone: '+00:00'
};

console.log('🔧 Database config:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

// Create connection pool
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get all contacts with filters
app.get('/api/directorio', async (req, res) => {
  try {
    console.log('📞 Getting contacts from database...');
    console.log('🔍 Query params:', req.query);
    
    const { status, origen, genero, search, letter, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offset = (pageNum - 1) * limitNum;
    
    // Build WHERE clause
    let whereConditions = ['1=1'];
    
    if (status) {
      whereConditions.push(`status = '${status.replace(/'/g, "''")}'`);
    }
    
    if (origen) {
      whereConditions.push(`origen = '${origen.replace(/'/g, "''")}'`);
    }
    
    if (genero) {
      whereConditions.push(`genero = '${genero.replace(/'/g, "''")}'`);
    }

    if (letter) {
      const letterFilter = letter.toUpperCase().replace(/'/g, "''");
      whereConditions.push(`UPPER(LEFT(nombre_completo, 1)) = '${letterFilter}'`);
    }
    
    if (search) {
      const searchTerm = search.replace(/'/g, "''");
      whereConditions.push(`(
        nombre_completo LIKE '%${searchTerm}%' OR 
        email LIKE '%${searchTerm}%' OR 
        telefono_movil LIKE '%${searchTerm}%'
      )`);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get total count and data
    const connection = await pool.getConnection();
    
    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM directorio_contactos WHERE ${whereClause}`;
    const [countResult] = await connection.execute(countQuery);
    const total = countResult[0].total;
    
    // Data query
    const dataQuery = `
      SELECT * FROM directorio_contactos 
      WHERE ${whereClause} 
      ORDER BY nombre_completo ASC 
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    const [rows] = await connection.execute(dataQuery);
    
    connection.release();
    
    console.log(`✅ Found ${rows.length} contacts (${total} total)`);
    
    res.json({
      success: true,
      data: rows,
      total: total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get contact by ID
app.get('/api/directorio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📞 Getting contact ID: ${id}`);
    
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM directorio_contactos WHERE id = ?', [id]);
    connection.release();
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('❌ Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create contact
app.post('/api/directorio', async (req, res) => {
  try {
    const contactData = req.body;
    console.log('➕ Creating new contact:', contactData.nombre_completo);
    
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'INSERT INTO directorio_contactos (nombre_completo, empresa, telefono_movil, email, ocupacion, origen, comentario) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        contactData.nombre_completo,
        contactData.empresa,
        contactData.telefono_movil,
        contactData.email,
        contactData.ocupacion,
        contactData.origen || 'WEB',
        contactData.comentario
      ]
    );
    connection.release();
    
    res.json({
      success: true,
      data: { id: result.insertId, ...contactData }
    });
  } catch (error) {
    console.error('❌ Error creating contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update contact
app.put('/api/directorio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contactData = req.body;
    console.log(`✏️ Updating contact ID: ${id}`);
    
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      'UPDATE directorio_contactos SET nombre_completo = ?, empresa = ?, telefono_movil = ?, email = ?, ocupacion = ?, comentario = ? WHERE id = ?',
      [
        contactData.nombre_completo,
        contactData.empresa,
        contactData.telefono_movil,
        contactData.email,
        contactData.ocupacion,
        contactData.comentario,
        id
      ]
    );
    connection.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      data: { id, ...contactData }
    });
  } catch (error) {
    console.error('❌ Error updating contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete contact
app.delete('/api/directorio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting contact ID: ${id}`);
    
    const connection = await pool.getConnection();
    const [result] = await connection.execute('DELETE FROM directorio_contactos WHERE id = ?', [id]);
    connection.release();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test database connection
async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    const connection = await pool.getConnection();
    await connection.execute('SELECT 1');
    connection.release();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Directorio standalone backend running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 API endpoint: http://localhost:${PORT}/api/directorio`);
  
  // Test database connection on startup
  testConnection();
});

module.exports = app; 