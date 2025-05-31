import express from 'express';
import mysql from 'mysql2/promise';
// import mysqlDatabase from '../services/mysqlDatabase.js';

const router = express.Router();

console.log('🚀 BACKEND DIRECTORIO ROUTES FILE LOADED - VERSION 4.1 - TIMESTAMP:', new Date().toISOString());

// FIRST ROUTE - Test route to verify loading order
router.get('/route-order-test', (req, res) => {
  res.json({ 
    message: 'Route order test - this should work!', 
    timestamp: new Date().toISOString()
  });
});

// Simple test route to verify the file is being loaded
router.get('/file-test', (req, res) => {
  res.json({ 
    message: 'Directorio routes file loaded successfully!', 
    timestamp: new Date().toISOString(),
    version: '2.0'
  });
});

// Test route to verify routing is working
router.get('/test-route-working', (req, res) => {
  res.json({ message: 'Routes are working!', timestamp: new Date().toISOString() });
});

// Simple working test route - MUST BE BEFORE /:id route
router.get('/working-test', async (req, res) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crud_db',
      port: 3306,
      charset: 'utf8mb4'
    });
    
    const [rows] = await connection.query('SELECT * FROM directorio_contactos LIMIT 5');
    
    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
    
  } catch (error) {
    console.error('Working test error:', error);
    res.status(500).json({ 
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
});

// Database configuration - Updated for Railway's new variable names
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

// Test endpoint for emoji handling
router.get('/emoji-test', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const query = 'SELECT * FROM directorio_contactos ORDER BY id ASC LIMIT 3';
    console.log('Emoji test query:', query);
    
    const [rows] = await connection.query(query);
    console.log('Emoji test - got', rows.length, 'rows');
    
    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
    
  } catch (error) {
    console.error('Emoji test error:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      errno: error.errno
    });
  } finally {
    if (connection) await connection.end();
  }
});

// Test endpoint for debugging - MUST BE BEFORE /:id route
router.get('/debug-test', async (req, res) => {
  let connection;
  try {
    console.log('Testing database connection with config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      hasPassword: !!dbConfig.password
    });
    
    connection = await getConnection();
    console.log('Connection established successfully');
    
    const [result] = await connection.execute('SELECT COUNT(*) as count FROM directorio_contactos');
    console.log('Query result:', result);
    
    res.json({ 
      success: true, 
      count: result[0].count,
      config: {
        host: dbConfig.host,
        user: dbConfig.user,
        database: dbConfig.database,
        port: dbConfig.port
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      errno: error.errno
    });
  } finally {
    if (connection) await connection.end();
  }
});

// Test endpoint without pagination - MUST BE BEFORE /:id route
router.get('/simple-test', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const query = 'SELECT * FROM directorio_contactos ORDER BY nombre_completo ASC LIMIT 5';
    console.log('Simple test query:', query);
    
    // Use query() instead of execute() to avoid parameter binding issues
    const [rows] = await connection.query(query);
    console.log('Simple test - got', rows.length, 'rows');
    
    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
    
  } catch (error) {
    console.error('Simple test error:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code,
      errno: error.errno
    });
  } finally {
    if (connection) await connection.end();
  }
});

// GET /api/directorio - Get all contacts with optional filters
router.get('/', async (req, res) => {
  console.log('🔍 GET /api/directorio');
  
  try {
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
    let connection;
    try {
      connection = await getConnection();
      
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM directorio_contactos WHERE ${whereClause}`;
      const [countResult] = await connection.execute(countQuery);
      const totalCount = countResult[0].total;
      
      // Get data with pagination
      const dataQuery = `
        SELECT *
        FROM directorio_contactos 
        WHERE ${whereClause}
        ORDER BY nombre_completo ASC
        LIMIT ${limitNum} OFFSET ${offset}
      `;
      const [rows] = await connection.execute(dataQuery);
      
      res.json({
        success: true,
        data: rows,
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      });
      
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ 
        error: error.message
      });
    } finally {
      if (connection) await connection.end();
    }
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// GET /api/directorio/search - Search contacts
router.get('/search', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json({ data: [] });
    }
    
    const searchTerm = `%${q.trim()}%`;
    
    const query = `
      SELECT * FROM directorio_contactos 
      WHERE nombre_completo LIKE ? 
         OR empresa LIKE ? 
         OR email LIKE ? 
         OR telefono_movil LIKE ? 
         OR telefono_oficina LIKE ?
         OR ocupacion LIKE ?
      ORDER BY nombre_completo ASC 
      LIMIT 100
    `;
    
    const [rows] = await connection.execute(query, [
      searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm
    ]);
    
    res.json({ data: rows });
    
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({ error: 'Error al buscar contactos' });
  } finally {
    if (connection) await connection.end();
  }
});

// GET /api/directorio/stats - Get contact statistics
router.get('/stats', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const [totalResult] = await connection.execute('SELECT COUNT(*) as total FROM directorio_contactos');
    
    const [statusResult] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM directorio_contactos 
      GROUP BY status
    `);
    
    const [origenResult] = await connection.execute(`
      SELECT 
        origen,
        COUNT(*) as count
      FROM directorio_contactos 
      WHERE origen IS NOT NULL AND origen != ''
      GROUP BY origen
      ORDER BY count DESC
    `);
    
    const stats = {
      total: totalResult[0].total,
      by_status: {},
      by_origen: {}
    };
    
    statusResult.forEach(row => {
      stats.by_status[row.status || 'sin_estado'] = row.count;
    });
    
    origenResult.forEach(row => {
      stats.by_origen[row.origen] = row.count;
    });
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: error.message
    });
  } finally {
    if (connection) await connection.end();
  }
});

// GET /api/directorio/relationships - Find relationships between directory contacts and policy tables
router.get('/relationships', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    console.log('🔍 Finding relationships between directorio and policy tables...');
    
    // Get all policy tables (excluding directorio_contactos and system tables)
    const policyTables = ['autos', 'diversos', 'gmm', 'hogar', 'mascotas', 'negocio', 'rc', 'transporte', 'vida'];
    
    const relationships = [];
    
    // For each policy table, find matching names
    for (const tableName of policyTables) {
      try {
        console.log(`🔍 Checking relationships with table: ${tableName}`);
        
        // Get contacts from directorio
        const [directorioContacts] = await connection.execute(`
          SELECT id, nombre_completo, email, status 
          FROM directorio_contactos 
          WHERE nombre_completo IS NOT NULL AND nombre_completo != ''
        `);
        
        // Get clients from policy table
        const [policyClients] = await connection.execute(`
          SELECT contratante, email, numero_poliza, ramo
          FROM ${tableName} 
          WHERE contratante IS NOT NULL AND contratante != ''
        `);
        
        // Find matches by name similarity
        for (const contact of directorioContacts) {
          for (const client of policyClients) {
            const similarity = calculateNameSimilarity(contact.nombre_completo, client.contratante);
            
            if (similarity > 0.8) { // 80% similarity threshold
              relationships.push({
                directorio_id: contact.id,
                directorio_nombre: contact.nombre_completo,
                directorio_email: contact.email,
                directorio_status: contact.status,
                tabla_poliza: tableName,
                cliente_nombre: client.contratante,
                cliente_email: client.email,
                numero_poliza: client.numero_poliza,
                ramo: client.ramo || tableName,
                similarity_score: similarity,
                match_type: 'name_similarity'
              });
            }
          }
        }
        
        // Also find exact email matches
        for (const contact of directorioContacts) {
          if (contact.email) {
            for (const client of policyClients) {
              if (client.email && contact.email.toLowerCase() === client.email.toLowerCase()) {
                // Check if we already have this relationship
                const existingRelationship = relationships.find(r => 
                  r.directorio_id === contact.id && 
                  r.tabla_poliza === tableName && 
                  r.numero_poliza === client.numero_poliza
                );
                
                if (!existingRelationship) {
                  relationships.push({
                    directorio_id: contact.id,
                    directorio_nombre: contact.nombre_completo,
                    directorio_email: contact.email,
                    directorio_status: contact.status,
                    tabla_poliza: tableName,
                    cliente_nombre: client.contratante,
                    cliente_email: client.email,
                    numero_poliza: client.numero_poliza,
                    ramo: client.ramo || tableName,
                    similarity_score: 1.0,
                    match_type: 'email_exact'
                  });
                }
              }
            }
          }
        }
        
      } catch (tableError) {
        console.error(`Error checking table ${tableName}:`, tableError.message);
        // Continue with other tables
      }
    }
    
    // Sort relationships by similarity score (highest first)
    relationships.sort((a, b) => b.similarity_score - a.similarity_score);
    
    // Group relationships by directorio contact
    const groupedRelationships = {};
    relationships.forEach(rel => {
      if (!groupedRelationships[rel.directorio_id]) {
        groupedRelationships[rel.directorio_id] = {
          contacto: {
            id: rel.directorio_id,
            nombre: rel.directorio_nombre,
            email: rel.directorio_email,
            status: rel.directorio_status
          },
          polizas: []
        };
      }
      
      groupedRelationships[rel.directorio_id].polizas.push({
        tabla: rel.tabla_poliza,
        cliente_nombre: rel.cliente_nombre,
        cliente_email: rel.cliente_email,
        numero_poliza: rel.numero_poliza,
        ramo: rel.ramo,
        similarity_score: rel.similarity_score,
        match_type: rel.match_type
      });
    });
    
    const summary = {
      total_relationships: relationships.length,
      contacts_with_policies: Object.keys(groupedRelationships).length,
      by_match_type: {
        email_exact: relationships.filter(r => r.match_type === 'email_exact').length,
        name_similarity: relationships.filter(r => r.match_type === 'name_similarity').length
      },
      by_table: {}
    };
    
    // Count relationships by table
    policyTables.forEach(table => {
      summary.by_table[table] = relationships.filter(r => r.tabla_poliza === table).length;
    });
    
    console.log(`🔍 Found ${relationships.length} relationships across ${Object.keys(groupedRelationships).length} contacts`);
    
    res.json({
      success: true,
      summary,
      relationships: Object.values(groupedRelationships)
    });
    
  } catch (error) {
    console.error('Error finding relationships:', error);
    res.status(500).json({ error: 'Error al buscar relaciones' });
  } finally {
    if (connection) await connection.end();
  }
});

// GET /api/directorio/:id - Get contact by ID
router.get('/:id', async (req, res) => {
  let connection;
  try {
    console.log('🔍 /:id route hit with params:', req.params);
    console.log('🔍 Full URL:', req.originalUrl);
    
    connection = await getConnection();
    
    const { id } = req.params;
    
    const [rows] = await connection.execute(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }
    
    res.json(rows[0]);
    
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Error al obtener el contacto' });
  } finally {
    if (connection) await connection.end();
  }
});

// POST /api/directorio - Create new contact
router.post('/', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const {
      origen, comentario, nombre_completo, nombre_completo_oficial,
      nickname, apellido, display_name, empresa, telefono_oficina,
      telefono_casa, telefono_asistente, telefono_movil, telefonos_corregidos,
      email, entidad, genero, status_social, ocupacion, pais, status
    } = req.body;
    
    // Validate required fields
    if (!nombre_completo || !nombre_completo.trim()) {
      return res.status(400).json({ error: 'El nombre completo es requerido' });
    }
    
    const query = `
      INSERT INTO directorio_contactos (
        origen, comentario, nombre_completo, nombre_completo_oficial,
        nickname, apellido, display_name, empresa, telefono_oficina,
        telefono_casa, telefono_asistente, telefono_movil, telefonos_corregidos,
        email, entidad, genero, status_social, ocupacion, pais, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.execute(query, [
      origen, comentario, nombre_completo, nombre_completo_oficial,
      nickname, apellido, display_name, empresa, telefono_oficina,
      telefono_casa, telefono_asistente, telefono_movil, telefonos_corregidos,
      email, entidad, (genero && genero.trim()) ? genero : null, status_social, ocupacion, pais || 'MÉXICO', (status && status.trim()) ? status : 'prospecto'
    ]);
    
    res.status(201).json({
      message: 'Contacto creado exitosamente',
      id: result.insertId
    });
    
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Error al crear el contacto' });
  } finally {
    if (connection) await connection.end();
  }
});

// PUT /api/directorio/:id - Update contact
router.put('/:id', async (req, res) => {
  let connection;
  try {
    console.log('🔄 PUT /api/directorio/:id - Update contact');
    console.log('📋 Request params:', req.params);
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
    
    connection = await getConnection();
    console.log('✅ Database connection established');
    
    const { id } = req.params;
    const {
      origen, comentario, nombre_completo, nombre_completo_oficial,
      nickname, apellido, display_name, empresa, telefono_oficina,
      telefono_casa, telefono_asistente, telefono_movil, telefonos_corregidos,
      email, entidad, genero, status_social, ocupacion, pais, status
    } = req.body;
    
    console.log('📋 Extracted fields:', {
      id,
      nombre_completo,
      email,
      status,
      genero,
      genero_processed: genero || null,
      genero_length: genero ? genero.length : 'undefined/null'
    });
    
    // Validate required fields
    if (!nombre_completo || !nombre_completo.trim()) {
      console.log('❌ Validation failed: nombre_completo is required');
      return res.status(400).json({ error: 'El nombre completo es requerido' });
    }
    
    console.log('✅ Validation passed');
    
    // Check if contact exists
    console.log('🔍 Checking if contact exists with ID:', id);
    const [existingContact] = await connection.execute(
      'SELECT id FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    console.log('📊 Existing contact result:', existingContact);
    
    if (existingContact.length === 0) {
      console.log('❌ Contact not found');
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }
    
    console.log('✅ Contact exists, proceeding with update');
    
    const query = `
      UPDATE directorio_contactos SET
        origen = ?, comentario = ?, nombre_completo = ?, nombre_completo_oficial = ?,
        nickname = ?, apellido = ?, display_name = ?, empresa = ?, telefono_oficina = ?,
        telefono_casa = ?, telefono_asistente = ?, telefono_movil = ?, telefonos_corregidos = ?,
        email = ?, entidad = ?, genero = ?, status_social = ?, ocupacion = ?, pais = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    const updateParams = [
      origen, comentario, nombre_completo, nombre_completo_oficial,
      nickname, apellido, display_name, empresa, telefono_oficina,
      telefono_casa, telefono_asistente, telefono_movil, telefonos_corregidos,
      email, entidad, (genero && genero.trim()) ? genero : null, status_social, ocupacion, pais || 'MÉXICO', (status && status.trim()) ? status : 'prospecto',
      id
    ];
    
    console.log('📋 Update parameters:', updateParams);
    console.log('🔄 Executing update query...');
    
    await connection.execute(query, updateParams);
    
    console.log('✅ Update successful');
    res.json({ message: 'Contacto actualizado exitosamente' });
    
  } catch (error) {
    console.error('❌ Error updating contact:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    res.status(500).json({ error: 'Error al actualizar el contacto', details: error.message });
  } finally {
    if (connection) {
      console.log('🔌 Closing database connection');
      await connection.end();
    }
  }
});

// DELETE /api/directorio/:id - Delete contact
router.delete('/:id', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const { id } = req.params;
    
    // Check if contact exists
    const [existingContact] = await connection.execute(
      'SELECT id FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (existingContact.length === 0) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }
    
    await connection.execute(
      'DELETE FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    res.json({ message: 'Contacto eliminado exitosamente' });
    
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Error al eliminar el contacto' });
  } finally {
    if (connection) await connection.end();
  }
});

// POST /api/directorio/:id/link-cliente - Link contact to existing client
router.post('/:id/link-cliente', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    const { id } = req.params;
    const { clienteData } = req.body;
    
    // Check if contact exists
    const [existingContact] = await connection.execute(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (existingContact.length === 0) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }
    
    // Update contact status to cliente
    await connection.execute(
      'UPDATE directorio_contactos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cliente', id]
    );
    
    // Here you could add logic to create relationships with existing policies
    // For now, we'll just update the status
    
    res.json({ message: 'Contacto vinculado como cliente exitosamente' });
    
  } catch (error) {
    console.error('Error linking contact to client:', error);
    res.status(500).json({ error: 'Error al vincular el contacto' });
  } finally {
    if (connection) await connection.end();
  }
});

// Helper function to calculate name similarity
function calculateNameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  
  // Normalize names (remove accents, convert to lowercase, remove extra spaces)
  const normalize = (str) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  };
  
  const norm1 = normalize(name1);
  const norm2 = normalize(name2);
  
  // Exact match
  if (norm1 === norm2) return 1.0;
  
  // Check if one name contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.9;
  }
  
  // Split names into words and check for word matches
  const words1 = norm1.split(' ').filter(w => w.length > 2); // Ignore short words
  const words2 = norm2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  let matchingWords = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2) {
        matchingWords++;
        break;
      }
    }
  }
  
  // Calculate similarity based on matching words
  const similarity = (matchingWords * 2) / (words1.length + words2.length);
  return similarity;
}

// GET /api/directorio/:id/policies - Get policies for a specific contact
router.get('/:id/policies', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Getting policies for contact ID: ${id}`);
    
    // Get contact info using the consistent database service
    const contactResult = await getConnection().execute(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (contactResult.length === 0) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }
    
    const contact = contactResult[0];
    console.log(`📋 Found contact: ${contact.nombre_completo}`);
    
    const policyTables = ['autos', 'diversos', 'gmm', 'hogar', 'mascotas', 'negocio', 'rc', 'transporte', 'vida'];
    const policies = [];
    
    // Search for policies in each table
    for (const tableName of policyTables) {
      try {
        console.log(`🔍 Searching in table: ${tableName}`);
        
        // Search by name similarity and email
        const tableResults = await getConnection().execute(
          `
            SELECT *, '${tableName}' as tabla_origen
            FROM ${tableName} 
            WHERE contratante LIKE ? OR (email IS NOT NULL AND email = ?)
          `,
          [`%${contact.nombre_completo}%`, contact.email || '']
        );
        
        console.log(`📊 Found ${tableResults.length} potential matches in ${tableName}`);
        
        tableResults.forEach(policy => {
          const similarity = calculateNameSimilarity(contact.nombre_completo, policy.contratante);
          if (similarity > 0.7 || (contact.email && policy.email === contact.email)) {
            policies.push({
              ...policy,
              similarity_score: similarity,
              match_type: (contact.email && policy.email === contact.email) ? 'email' : 'name'
            });
          }
        });
        
      } catch (tableError) {
        console.error(`❌ Error searching in table ${tableName}:`, tableError.message);
        // Continue with other tables
      }
    }
    
    // Sort by similarity score
    policies.sort((a, b) => b.similarity_score - a.similarity_score);
    
    console.log(`✅ Found ${policies.length} total policies for contact ${contact.nombre_completo}`);
    
    res.json({
      contact,
      policies,
      total_policies: policies.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching contact policies:', error);
    res.status(500).json({ error: 'Error al obtener las pólizas del contacto' });
  }
});

// POST /api/directorio/update-client-status - Update status of contacts who already have policies
router.post('/update-client-status', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    
    console.log('🔄 Starting automatic client status update...');
    
    // Get relationships to find contacts with policies
    const relationshipsResponse = await fetch('http://localhost:3001/api/directorio/relationships');
    const relationshipsData = await relationshipsResponse.json();
    
    if (!relationshipsData.success) {
      throw new Error('Failed to get relationships data');
    }
    
    const contactsToUpdate = relationshipsData.relationships.map(rel => rel.contacto.id);
    const uniqueContactIds = [...new Set(contactsToUpdate)];
    
    console.log(`📊 Found ${uniqueContactIds.length} contacts that should be marked as clients`);
    
    if (uniqueContactIds.length === 0) {
      return res.json({
        success: true,
        message: 'No contacts need status update',
        updated_count: 0
      });
    }
    
    // Update status to 'cliente' for all contacts with policies
    const placeholders = uniqueContactIds.map(() => '?').join(',');
    const updateQuery = `
      UPDATE directorio_contactos 
      SET status = 'cliente' 
      WHERE id IN (${placeholders}) AND status = 'prospecto'
    `;
    
    console.log('🔄 Executing update query...');
    const [result] = await connection.execute(updateQuery, uniqueContactIds);
    
    console.log(`✅ Updated ${result.affectedRows} contacts from prospecto to cliente`);
    
    // Get updated stats
    const [statsResult] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM directorio_contactos 
      GROUP BY status
    `);
    
    const stats = {};
    statsResult.forEach(row => {
      stats[row.status] = row.count;
    });
    
    res.json({
      success: true,
      message: `Successfully updated ${result.affectedRows} contacts to client status`,
      updated_count: result.affectedRows,
      new_stats: stats,
      updated_contact_ids: uniqueContactIds
    });
    
  } catch (error) {
    console.error('❌ Error updating client status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;

 