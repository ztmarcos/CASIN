const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

console.log('🚀 DIRECTORIO ROUTES (CommonJS) LOADED - TIMESTAMP:', new Date().toISOString());

// Database configuration
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'crud_db',
  port: process.env.MYSQLPORT || process.env.DB_PORT || '3306',
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci'
};

// Get database connection
async function getConnection() {
  return await mysql.createConnection(dbConfig);
}

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Directorio routes working!', 
    timestamp: new Date().toISOString()
  });
});

// GET /api/directorio - Get all contacts with optional filters
router.get('/', async (req, res) => {
  console.log('🔍 GET /api/directorio');
  let connection;
  
  try {
    const { status, origen, genero, search, letter, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const offset = (pageNum - 1) * limitNum;
    
    connection = await getConnection();
    
    // Build WHERE clause with proper parameter binding
    let whereConditions = [];
    let queryParams = [];
    
    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }
    
    if (origen) {
      whereConditions.push('origen = ?');
      queryParams.push(origen);
    }
    
    if (genero) {
      whereConditions.push('genero = ?');
      queryParams.push(genero);
    }
    
    if (search) {
      whereConditions.push('(nombre_completo LIKE ? OR telefono_movil LIKE ? OR telefono_casa LIKE ? OR telefono_oficina LIKE ? OR email LIKE ? OR empresa LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (letter) {
      whereConditions.push('nombre_completo LIKE ?');
      queryParams.push(`${letter}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count with same filters
    const countQuery = `SELECT COUNT(*) as total FROM directorio_contactos ${whereClause}`;
    const [countResult] = await connection.execute(countQuery, queryParams);
    const total = countResult[0].total;
    
    // Get data with pagination - use string interpolation for LIMIT/OFFSET
    const dataQuery = `
      SELECT * FROM directorio_contactos 
      ${whereClause}
      ORDER BY nombre_completo ASC 
      LIMIT ${parseInt(limitNum)} OFFSET ${parseInt(offset)}
    `;
    
    const [rows] = await connection.execute(dataQuery, queryParams);
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    if (connection) await connection.end();
  }
});

// GET /api/directorio/stats - Get statistics
router.get('/stats', async (req, res) => {
  console.log('📊 GET /api/directorio/stats');
  let connection;
  
  try {
    connection = await getConnection();
    
    // Get total count
    const [totalResult] = await connection.execute('SELECT COUNT(*) as total FROM directorio_contactos');
    const total = totalResult[0].total;
    
    // Get count by status
    const [statusResult] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM directorio_contactos 
      GROUP BY status
    `);
    
    // Get count by origen
    const [origenResult] = await connection.execute(`
      SELECT origen, COUNT(*) as count 
      FROM directorio_contactos 
      GROUP BY origen
    `);
    
    // Get count by genero
    const [generoResult] = await connection.execute(`
      SELECT genero, COUNT(*) as count 
      FROM directorio_contactos 
      GROUP BY genero
    `);
    
    // Transform status data for frontend compatibility
    const statusCounts = {};
    statusResult.forEach(row => {
      statusCounts[row.status || 'sin_estado'] = row.count;
    });
    
    res.json({
      success: true,
      stats: {
        total,
        clientes: statusCounts.cliente || 0,
        prospectos: statusCounts.prospecto || 0,
        inactivos: statusCounts.inactivo || 0,
        byStatus: statusResult,
        byOrigen: origenResult,
        byGenero: generoResult
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    if (connection) await connection.end();
  }
});

// GET /api/directorio/:id - Get specific contact
router.get('/:id', async (req, res) => {
  console.log('🔍 GET /api/directorio/:id');
  let connection;
  
  try {
    const { id } = req.params;
    connection = await getConnection();
    
    const [rows] = await connection.execute(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      data: rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    if (connection) await connection.end();
  }
});

// POST /api/directorio - Create new contact
router.post('/', async (req, res) => {
  console.log('➕ POST /api/directorio');
  let connection;
  
  try {
    const contactData = req.body;
    connection = await getConnection();
    
    const fields = Object.keys(contactData);
    const values = Object.values(contactData);
    const placeholders = fields.map(() => '?').join(', ');
    
    const query = `
      INSERT INTO directorio_contactos (${fields.join(', ')}) 
      VALUES (${placeholders})
    `;
    
    const [result] = await connection.execute(query, values);
    
    res.json({
      success: true,
      message: 'Contact created successfully',
      id: result.insertId
    });
    
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    if (connection) await connection.end();
  }
});

// PUT /api/directorio/:id - Update contact
router.put('/:id', async (req, res) => {
  console.log('✏️ PUT /api/directorio/:id');
  console.log('Request ID:', req.params.id);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  let connection;
  
  try {
    const { id } = req.params;
    const contactData = req.body;
    
    // Validate that we have data to update
    if (!contactData || Object.keys(contactData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }
    
    connection = await getConnection();
    
    // Filter and process data with special handling for ENUM fields
    const filteredData = {};
    Object.keys(contactData).forEach(key => {
      const value = contactData[key];
      
      // Special handling for ENUM fields - convert empty strings to NULL
      if (key === 'genero' || key === 'status') {
        if (value === '' || value === null || value === undefined) {
          filteredData[key] = null;
        } else {
          filteredData[key] = value;
        }
      } else {
        // For other fields, keep the original logic
        if (value !== undefined && value !== null && value !== '') {
          filteredData[key] = value;
        } else if (value === '' || value === null) {
          // Explicitly set empty strings and null values for non-ENUM fields
          filteredData[key] = value;
        }
      }
    });
    
    console.log('Filtered data:', JSON.stringify(filteredData, null, 2));
    
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data provided for update'
      });
    }
    
    const fields = Object.keys(filteredData);
    const values = Object.values(filteredData);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const query = `UPDATE directorio_contactos SET ${setClause} WHERE id = ?`;
    console.log('Update query:', query);
    console.log('Update values:', values);
    
    const [result] = await connection.execute(query, [...values, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Contact updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating contact:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql
    });
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    if (connection) await connection.end();
  }
});

// DELETE /api/directorio/:id - Delete contact
router.delete('/:id', async (req, res) => {
  console.log('🗑️ DELETE /api/directorio/:id');
  let connection;
  
  try {
    const { id } = req.params;
    connection = await getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    if (connection) await connection.end();
  }
});

module.exports = router; 