const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');

// Load environment variables from root .env file FIRST
const dotenv = require('dotenv');
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️  Could not load .env file from root directory:', result.error.message);
} else {
  console.log('✅ Environment variables loaded from root .env file');
  
  // Debug: Show which important variables are loaded
  const importantVars = [
    'NOTION_API_KEY',
    'VITE_NOTION_API_KEY', 
    'NOTION_DATABASE_ID',
    'VITE_NOTION_DATABASE_ID',
    'OPENAI_API_KEY',
    'VITE_OPENAI_API_KEY',
    'VITE_FIREBASE_API_KEY',
    'GOOGLE_DRIVE_CLIENT_EMAIL',
    'GOOGLE_DRIVE_PROJECT_ID',
    'GOOGLE_DRIVE_PRIVATE_KEY',
    'GOOGLE_DRIVE_FOLDER_ID',
    'SMTP_HOST',
    'SMTP_USER',
    'DB_HOST',
    'DB_USER',
    'DB_NAME'
  ];
  
  console.log('🔑 Environment Variables Status:');
  importantVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      const maskedValue = value.length > 10 ? value.substring(0, 10) + '...' : value;
      console.log(`   ✅ ${varName}: ${maskedValue}`);
    } else {
      console.log(`   ❌ ${varName}: Missing`);
    }
  });
}

const app = express();
const PORT = process.env.PORT || 3000;

// MySQL connection configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Add your MySQL password here if needed
  database: 'crud_db',
  port: 3306
};

// Create MySQL connection pool
let pool;
try {
  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('✅ MySQL connection pool created');
} catch (error) {
  console.error('❌ MySQL connection failed:', error);
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware para servir archivos estáticos
app.use(express.static('.'));

// Initialize Notion client if credentials are available
let notion = null;
let isNotionEnabled = false;

try {
  const notionApiKey = process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY;
  const notionDatabaseId = process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID;
  
  if (notionApiKey && notionDatabaseId) {
    const { Client } = require('@notionhq/client');
    notion = new Client({ auth: notionApiKey });
    isNotionEnabled = true;
    console.log('✅ Notion client initialized');
  } else {
    console.log('⚠️  Notion credentials not found - Notion features disabled');
  }
} catch (error) {
  console.warn('⚠️  Could not initialize Notion client:', error.message);
}

// Helper function to execute queries
async function executeQuery(query, params = []) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Helper function to get table structure
async function getTableStructure(tableName) {
  try {
    const columns = await executeQuery(`DESCRIBE \`${tableName}\``);
    return columns.map(col => ({
      name: col.Field,
      type: col.Type,
      nullable: col.Null === 'YES',
      key: col.Key,
      default: col.Default
    }));
  } catch (error) {
    console.error(`Error getting structure for table ${tableName}:`, error);
    return [];
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    message: 'CASIN CRM API with MySQL is running!',
    database: 'MySQL connected'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend API with MySQL is working!',
    timestamp: new Date().toISOString(),
    server: 'mysql-integrated'
  });
});

// Get all tables from MySQL
app.get('/api/data/tables', async (req, res) => {
  try {
    const tables = await executeQuery('SHOW TABLES');
    const relationships = await executeQuery('SELECT * FROM table_relationships');
    
    const tableList = [];
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const structure = await getTableStructure(tableName);
      
      // Check if this table is in any relationship
      const asMainTable = relationships.find(rel => rel.main_table_name === tableName);
      const asSecondaryTable = relationships.find(rel => rel.secondary_table_name === tableName);
      
      // Determine table type and relationship status
      let type = 'UNKNOWN';
      let isMainTable = !!asMainTable;
      let isSecondaryTable = !!asSecondaryTable;
      let relatedTableName = null;
      let relationshipType = null;
      
      if (asMainTable) {
        relatedTableName = asMainTable.secondary_table_name;
        relationshipType = asMainTable.relationship_type;
      } else if (asSecondaryTable) {
        relatedTableName = asSecondaryTable.main_table_name;
        relationshipType = asSecondaryTable.relationship_type;
      }
      
      // Set type based on table name or relationship
      if (tableName.includes('autos')) {
        type = 'AUTOS';
      } else if (tableName.includes('vida')) {
        type = 'VIDA';
      } else if (tableName.includes('gmm')) {
        type = 'GMM';
      } else if (tableName.includes('hogar')) {
        type = 'HOGAR';
      } else if (tableName.includes('directorio')) {
        type = 'DIRECTORIO';
      } else if (tableName.includes('listado')) {
        type = 'LISTADO';
      } else if (tableName.includes('caratula')) {
        type = 'CARATULA';
      }
      
      // Add table to list
      tableList.push({
        name: tableName,
        title: tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' '),
        type: type,
        isMainTable: isMainTable,
        isSecondaryTable: isSecondaryTable,
        relatedTableName: relatedTableName,
        relationshipType: relationshipType,
        columns: structure
      });
    }
    
    res.json(tableList);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get table types
app.get('/api/data/table-types', async (req, res) => {
  try {
    const tables = await executeQuery('SHOW TABLES');
    const tableTypes = {};
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const structure = await getTableStructure(tableName);
      
      let type = 'simple';
      if (tableName.includes('autos')) type = 'AUTOS';
      else if (tableName.includes('vida')) type = 'VIDA';
      else if (tableName.includes('gmm')) type = 'GMM';
      else if (tableName.includes('hogar')) type = 'HOGAR';
      else if (tableName.includes('directorio')) type = 'DIRECTORIO';
      
      tableTypes[tableName] = {
        type: type,
        isGroup: false,
        childTable: null,
        isMainTable: !tableName.includes('listado') && !tableName.includes('directorio'),
        isSecondaryTable: tableName.includes('listado'),
        fields: structure.filter(col => col.name !== 'id').map(col => col.name)
      };
    }
    
    res.json(tableTypes);
  } catch (error) {
    console.error('Error fetching table types:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get data from specific table
app.get('/api/data/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = await executeQuery(`SELECT * FROM \`${tableName}\` LIMIT 1000`);
    
    res.json({
      data: data,
      total: data.length,
      table: tableName
    });
  } catch (error) {
    console.error(`Error fetching data from ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Insert data into table
app.post('/api/data/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Valid data object is required' });
    }
    
    const columns = Object.keys(data).filter(key => key !== 'id');
    const values = columns.map(col => data[col]);
    const placeholders = columns.map(() => '?').join(', ');
    
    const query = `INSERT INTO \`${tableName}\` (${columns.map(col => `\`${col}\``).join(', ')}) VALUES (${placeholders})`;
    const result = await executeQuery(query, values);
    
    res.json({
      success: true,
      message: `Data inserted into ${tableName}`,
      id: result.insertId,
      data: data
    });
  } catch (error) {
    console.error(`Error inserting data into ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete record from table
app.delete('/api/data/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid record ID is required' });
    }
    
    console.log(`🗑️ Deleting record ${id} from table ${tableName}`);
    
    // First check if record exists
    const checkQuery = `SELECT id FROM \`${tableName}\` WHERE id = ?`;
    const existing = await executeQuery(checkQuery, [parseInt(id)]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: `Record with ID ${id} not found in ${tableName}` });
    }
    
    // Delete the record
    const deleteQuery = `DELETE FROM \`${tableName}\` WHERE id = ?`;
    const result = await executeQuery(deleteQuery, [parseInt(id)]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `No record deleted from ${tableName}` });
    }
    
    console.log(`✅ Successfully deleted record ${id} from ${tableName}`);
    
    res.json({
      success: true,
      message: `Record ${id} deleted from ${tableName}`,
      deletedId: parseInt(id),
      affectedRows: result.affectedRows
    });
  } catch (error) {
    console.error(`Error deleting record from ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Update record in table
app.put('/api/data/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const data = req.body;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Valid record ID is required' });
    }
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Valid data object is required' });
    }
    
    console.log(`📝 Updating record ${id} in table ${tableName}`);
    
    // Prepare update query
    const columns = Object.keys(data).filter(key => key !== 'id');
    const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
    const values = columns.map(col => data[col]);
    values.push(parseInt(id)); // Add ID for WHERE clause
    
    const updateQuery = `UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?`;
    const result = await executeQuery(updateQuery, values);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: `Record with ID ${id} not found in ${tableName}` });
    }
    
    console.log(`✅ Successfully updated record ${id} in ${tableName}`);
    
    res.json({
      success: true,
      message: `Record ${id} updated in ${tableName}`,
      updatedId: parseInt(id),
      affectedRows: result.affectedRows,
      data: data
    });
  } catch (error) {
    console.error(`Error updating record in ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get table structure
app.get('/api/data/tables/:tableName/structure', async (req, res) => {
  try {
    const { tableName } = req.params;
    const structure = await getTableStructure(tableName);
    
    res.json({
      columns: structure,
      tableName: tableName
    });
  } catch (error) {
    console.error(`Error getting structure for ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get child tables for a parent table
app.get('/api/data/tables/:tableName/children', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Query the table_relationships table to find child tables
    const relationships = await executeQuery(
      'SELECT secondary_table_name FROM table_relationships WHERE main_table_name = ?',
      [tableName]
    );
    
    console.log(`Found ${relationships.length} child tables for ${tableName}:`, relationships);
    
    // Get the full table information for each child table
    const childTables = [];
    for (const rel of relationships) {
      const structure = await getTableStructure(rel.secondary_table_name);
      childTables.push({
        name: rel.secondary_table_name,
        isSecondaryTable: true,
        relatedTableName: tableName,
        columns: structure
      });
    }

    res.json(childTables);
  } catch (error) {
    console.error('Error getting child tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Birthday endpoints (using real data)
app.get('/api/birthday', async (req, res) => {
  try {
    console.log('Fetching all birthdays...');
    
    // Función para extraer fecha de nacimiento del RFC
    function extractBirthdayFromRFC(rfc) {
      if (!rfc || rfc.length < 10) return null;
      
      try {
        // RFC mexicano formato: AAAA######XXX
        // Donde ###### es AAMMDD (año, mes, día)
        const dateStr = rfc.substring(4, 10); // Extraer los 6 dígitos de fecha
        
        if (dateStr.length !== 6) return null;
        
        const year = dateStr.substring(0, 2);   // AA
        const month = dateStr.substring(2, 4);  // MM  
        const day = dateStr.substring(4, 6);    // DD
        
        // Determinar el siglo (asumiendo que años 00-30 son 2000s, 31-99 son 1900s)
        const fullYear = parseInt(year) <= 30 ? 2000 + parseInt(year) : 1900 + parseInt(year);
        
        const birthDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
        
        // Validar que la fecha sea válida
        if (isNaN(birthDate.getTime())) return null;
        if (birthDate.getFullYear() < 1900 || birthDate.getFullYear() > new Date().getFullYear()) return null;
        if (parseInt(month) < 1 || parseInt(month) > 12) return null;
        if (parseInt(day) < 1 || parseInt(day) > 31) return null;
        
        return birthDate;
      } catch (error) {
        console.error('Error parsing RFC:', rfc, error);
        return null;
      }
    }
    
    // Función para calcular edad
    function calculateAge(birthDate) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    }
    
    // Obtener todas las tablas
    const tables = await executeQuery('SHOW TABLES');
    const allBirthdays = [];
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      
      try {
        // Obtener estructura de la tabla
        const columns = await executeQuery(`DESCRIBE \`${tableName}\``);
        const columnNames = columns.map(col => col.Field);
        
        // Buscar columnas relevantes
        const nameColumn = columnNames.find(col => 
          ['nombre', 'contratante', 'asegurado', 'nombre_completo'].some(pattern => 
            col.toLowerCase().includes(pattern.toLowerCase())
          )
        );
        
        const emailColumn = columnNames.find(col => 
          ['email', 'e_mail', 'correo'].some(pattern => 
            col.toLowerCase().includes(pattern.toLowerCase())
          )
        );
        
        const rfcColumn = columnNames.find(col => 
          col.toLowerCase() === 'rfc'
        );
        
        const policyColumn = columnNames.find(col => 
          ['poliza', 'numero_poliza', 'numero_de_poliza'].some(pattern => 
            col.toLowerCase().includes(pattern.toLowerCase())
          )
        );
        
        // Si no hay nombre o RFC, saltar esta tabla
        if (!nameColumn || !rfcColumn) {
          console.log(`Skipping table ${tableName} - missing required columns`);
          continue;
        }
        
        // Construir query
        const query = `
          SELECT 
            '${tableName}' as source,
            ${nameColumn} as name,
            ${emailColumn ? emailColumn + ' as email' : 'NULL as email'},
            ${rfcColumn} as rfc,
            ${policyColumn ? policyColumn + ' as policy_number' : 'NULL as policy_number'}
          FROM \`${tableName}\`
          WHERE ${rfcColumn} IS NOT NULL AND ${rfcColumn} != ''
          LIMIT 1000
        `;
        
        console.log(`Fetching birthdays from ${tableName}...`);
        const data = await executeQuery(query);
        console.log(`Retrieved ${data.length} records from ${tableName}`);
        
        // Procesar cada registro
        for (const record of data) {
          if (!record.rfc) continue;
          
          const birthDate = extractBirthdayFromRFC(record.rfc);
          if (!birthDate) continue;
          
          const birthday = {
            id: `${record.source}-${record.rfc}-${Date.now()}-${Math.random()}`,
            date: birthDate,
            name: record.name ? record.name.trim() : '',
            email: record.email ? record.email.trim().toLowerCase() : null,
            rfc: record.rfc.trim().toUpperCase(),
            source: record.source,
            policy_number: record.policy_number,
            details: `Póliza: ${record.policy_number || 'N/A'}`,
            age: calculateAge(birthDate),
            birthdaySource: 'RFC'
          };
          
          allBirthdays.push(birthday);
        }
        
      } catch (error) {
        console.error(`Error processing table ${tableName}:`, error);
      }
    }
    
    // Deduplicar por RFC
    const uniqueBirthdays = allBirthdays.reduce((acc, birthday) => {
      const key = birthday.rfc;
      if (!acc[key] || acc[key].email === null && birthday.email !== null) {
        acc[key] = birthday;
      }
      return acc;
    }, {});
    
    // Convertir a array y ordenar por mes/día
    const sortedBirthdays = Object.values(uniqueBirthdays)
      .sort((a, b) => {
        const monthA = a.date.getMonth();
        const monthB = b.date.getMonth();
        if (monthA !== monthB) return monthA - monthB;
        return a.date.getDate() - b.date.getDate();
      });
    
    console.log(`Successfully fetched ${sortedBirthdays.length} birthdays`);
    res.json(sortedBirthdays);
    
  } catch (error) {
    console.error('Error getting birthdays:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/birthdays', async (req, res) => {
  // Redirigir al mismo endpoint
  try {
    const response = await fetch(`http://localhost:${PORT}/api/birthday`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error getting birthdays:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/birthdays/today', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/birthday`);
    const allBirthdays = await response.json();
    
    const today = new Date();
    const todaysBirthdays = allBirthdays.filter(birthday => {
      const birthDate = new Date(birthday.date);
      const birthMonth = birthDate.getMonth();
      const birthDay = birthDate.getDate();
      return birthMonth === today.getMonth() && birthDay === today.getDate();
    });
    
    res.json(todaysBirthdays);
  } catch (error) {
    console.error('Error getting today birthdays:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/birthdays/upcoming', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/birthday`);
    const allBirthdays = await response.json();
    
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const upcomingBirthdays = allBirthdays.filter(birthday => {
      const birthDate = new Date(birthday.date);
      const thisYear = today.getFullYear();
      const birthdayThisYear = new Date(thisYear, birthDate.getMonth(), birthDate.getDate());
      
      return birthdayThisYear >= today && birthdayThisYear <= nextWeek;
    });
    
    res.json(upcomingBirthdays);
  } catch (error) {
    console.error('Error getting upcoming birthdays:', error);
    res.status(500).json({ error: error.message });
  }
});

// Directorio endpoints (using real data)
app.get('/api/directorio', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * parseInt(limit);
    
    const data = await executeQuery(`
      SELECT * FROM directorio_contactos 
      ORDER BY id DESC 
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);
    
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM directorio_contactos');
    const total = totalResult[0].total;
    
    res.json({
      data: data,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching directorio:', error);
    res.json({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0
    });
  }
});

app.get('/api/directorio/stats', async (req, res) => {
  try {
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM directorio_contactos');
    const withPhoneResult = await executeQuery('SELECT COUNT(*) as total FROM directorio_contactos WHERE telefono_movil IS NOT NULL AND telefono_movil != ""');
    const withEmailResult = await executeQuery('SELECT COUNT(*) as total FROM directorio_contactos WHERE email IS NOT NULL AND email != ""');
    const clientesResult = await executeQuery('SELECT COUNT(*) as total FROM directorio_contactos WHERE status = "cliente"');
    const prospectosResult = await executeQuery('SELECT COUNT(*) as total FROM directorio_contactos WHERE status = "prospecto"');
    
    res.json({
      total: totalResult[0].total,
      withPhone: withPhoneResult[0].total,
      withEmail: withEmailResult[0].total,
      withBirthday: 0, // No birthday column available
      clientes: clientesResult[0].total,
      prospectos: prospectosResult[0].total
    });
  } catch (error) {
    console.error('Error fetching directorio stats:', error);
    res.json({
      total: 0,
      withPhone: 0,
      withEmail: 0,
      withBirthday: 0,
      clientes: 0,
      prospectos: 0
    });
  }
});

// Get policies for a specific contact
app.get('/api/directorio/:id/policies', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if contact exists
    const contactResult = await executeQuery(
      'SELECT nombre_completo FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (contactResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    // Get policies from autos table (search by name) - using correct column names
    const policyResult = await executeQuery(`
      SELECT 
        id,
        numero_poliza as poliza,
        nombre_contratante as asegurado,
        descripcion_del_vehiculo as vehiculo,
        modelo,
        tipo_de_vehiculo,
        prima_neta,
        pago_total_o_prima_total as prima_total,
        vigencia_inicio as vigencia_de,
        vigencia_fin as vigencia_hasta,
        aseguradora,
        ramo,
        uso
      FROM autos 
      WHERE nombre_contratante LIKE ?
      ORDER BY id DESC
    `, [`%${contactResult[0].nombre_completo}%`]);
    
    res.json({
      success: true,
      data: {
        contact: contactResult[0],
        policies: policyResult
      },
      total: policyResult.length
    });
    
  } catch (error) {
    console.error('Error fetching contact policies:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Mock endpoints for services not yet implemented
app.get('/api/policy-status', (req, res) => {
  res.json([]);
});

app.get('/api/files', (req, res) => {
  res.json([]);
});

// Notion endpoints with environment variable support
app.get('/api/notion/databases', async (req, res) => {
  try {
    if (!isNotionEnabled) {
      return res.json({
        success: false,
        message: 'Notion API key not configured',
        databases: []
      });
    }

    const notionDatabaseId = process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID;
    
    if (!notionDatabaseId) {
      return res.json({
        success: false,
        message: 'Notion Database ID not configured',
        databases: []
      });
    }

    // Get database info
    const database = await notion.databases.retrieve({
      database_id: notionDatabaseId
    });

    res.json({
      success: true,
      message: 'Notion database found',
      databases: [{
        id: database.id,
        title: database.title?.[0]?.plain_text || 'Unnamed Database',
        properties: Object.keys(database.properties)
      }]
    });

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    res.json({
      success: false,
      message: 'Failed to fetch Notion databases',
      databases: []
    });
  }
});

app.get('/api/notion/users', async (req, res) => {
  try {
    if (!isNotionEnabled) {
      return res.status(500).json({
        success: false,
        message: 'Notion API key not configured',
        error: 'Missing API credentials'
      });
    }

    // Get users from Notion
    const response = await notion.users.list({});
    
    const users = response.results.map(user => ({
      id: user.id,
      name: user.name,
      avatar_url: user.avatar_url,
      type: user.type,
      person: user.person
    }));

    res.json(users);

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Notion users',
      error: error.message
    });
  }
});

// Helper function to extract property values from Notion
function extractPropertyValue(property) {
  if (!property) return null;
  
  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || '';
    case 'number':
      return property.number;
    case 'select':
      return property.select?.name || null;
    case 'status':
      return property.status?.name || null;
    case 'multi_select':
      return property.multi_select?.map(item => item.name) || [];
    case 'date':
      return property.date?.start || null;
    case 'checkbox':
      return property.checkbox;
    case 'url':
      return property.url;
    case 'email':
      return property.email;
    case 'phone_number':
      return property.phone_number;
    case 'people':
      return property.people?.map(person => ({
        id: person.id,
        name: person.name,
        avatar_url: person.avatar_url
      })) || [];
    case 'files':
      return property.files?.map(file => ({
        name: file.name,
        url: file.file?.url || file.external?.url
      })) || [];
    case 'relation':
      return property.relation?.map(rel => rel.id) || [];
    case 'formula':
      return extractPropertyValue({ type: property.formula?.type, [property.formula?.type]: property.formula?.[property.formula?.type] });
    case 'rollup':
      return property.rollup?.array?.map(item => extractPropertyValue(item)) || [];
    default:
      return null;
  }
}

// Comprehensive Notion API endpoints
app.get('/api/notion/raw-table', async (req, res) => {
  try {
    if (!isNotionEnabled) {
      console.log('Notion not enabled, returning empty array');
      return res.json([]);
    }

    const notionDatabaseId = process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID;
    
    if (!notionDatabaseId) {
      console.log('No Notion database ID configured');
      return res.json([]);
    }

    console.log('🔍 Fetching Notion tasks from database:', notionDatabaseId);

    // First get database schema
    const database = await notion.databases.retrieve({
      database_id: notionDatabaseId
    });

    console.log('📚 Database Schema:', Object.keys(database.properties));

    // Query the database
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    console.log(`📄 Found ${response.results.length} pages in Notion database`);

    // Transform the data
    const tasks = response.results.map(page => {
      const properties = page.properties;
      const task = {
        id: page.id,
        url: page.url,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      };

      // Extract all properties dynamically
      Object.keys(properties).forEach(key => {
        const value = extractPropertyValue(properties[key]);
        // Convert property name to camelCase for consistency
        const camelKey = key.toLowerCase().replace(/\s+(.)/g, (match, letter) => letter.toUpperCase());
        task[camelKey] = value;
        
        // Also keep original key for compatibility
        task[key] = value;
      });

      return task;
    });

    console.log(`✅ Successfully transformed ${tasks.length} Notion tasks`);
    res.json(tasks);

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    res.json([]); // Return empty array on error to prevent frontend crashes
  }
});

app.get('/api/notion/tasks', async (req, res) => {
  try {
    if (!isNotionEnabled) {
      return res.status(503).json({ 
        error: 'Notion service is disabled',
        details: 'Notion API key is not configured or invalid',
        tasks: []
      });
    }

    const notionDatabaseId = process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID;
    
    if (!notionDatabaseId) {
      return res.status(500).json({ 
        error: 'Notion Database ID not configured',
        details: 'Please set either NOTION_DATABASE_ID or VITE_NOTION_DATABASE_ID environment variable'
      });
    }

    // Query the database
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    // Transform the data
    const tasks = response.results.map(page => {
      const properties = page.properties;
      return {
        id: page.id,
        url: page.url,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
        title: extractPropertyValue(properties['title'] || properties['Title'] || properties['Name']),
        status: extractPropertyValue(properties['Status']),
        dueDate: extractPropertyValue(properties['Due date'] || properties['Due Date']),
        priority: extractPropertyValue(properties['Priority']),
        assignee: extractPropertyValue(properties['Assignee']),
        description: extractPropertyValue(properties['Description']),
        taskType: extractPropertyValue(properties['Task type'] || properties['Type']),
        tags: extractPropertyValue(properties['Tags']) || []
      };
    });

    res.json({
      success: true,
      tasks: tasks,
      total: tasks.length
    });

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    res.status(500).json({
      error: 'Failed to fetch Notion tasks',
      details: error.message
    });
  }
});

app.post('/api/notion/create-task', async (req, res) => {
  try {
    if (!isNotionEnabled) {
      return res.status(503).json({ 
        error: 'Notion service is disabled',
        details: 'Notion API key is not configured or invalid'
      });
    }

    const notionDatabaseId = process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID;
    const { properties } = req.body;

    if (!properties) {
      return res.status(400).json({
        error: 'Properties are required',
        details: 'Request body must contain properties object'
      });
    }

    console.log('🆕 Creating new Notion task with properties:', properties);

    const response = await notion.pages.create({
      parent: { database_id: notionDatabaseId },
      properties: properties
    });

    console.log('✅ Task created successfully:', response.id);

    res.json({
      success: true,
      message: 'Task created successfully',
      task: {
        id: response.id,
        url: response.url,
        createdTime: response.created_time
      }
    });

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    res.status(500).json({
      error: 'Failed to create Notion task',
      details: error.message
    });
  }
});

app.post('/api/notion/update-cell', async (req, res) => {
  try {
    if (!isNotionEnabled) {
      return res.status(503).json({ 
        error: 'Notion service is disabled',
        details: 'Notion API key is not configured or invalid'
      });
    }

    const { taskId, column, value, propertyType } = req.body;

    if (!taskId || !column) {
      return res.status(400).json({
        error: 'Task ID and column are required',
        details: 'Request body must contain taskId and column'
      });
    }

    console.log('📝 Updating Notion task cell:', { taskId, column, value, propertyType });

    // Format the property value based on type
    let formattedProperty = {};
    
    switch (propertyType) {
      case 'title':
        formattedProperty[column] = {
          title: [{ text: { content: value || '' } }]
        };
        break;
      case 'rich_text':
        formattedProperty[column] = {
          rich_text: [{ text: { content: value || '' } }]
        };
        break;
      case 'select':
        formattedProperty[column] = value ? { select: { name: value } } : { select: null };
        break;
      case 'status':
        formattedProperty[column] = value ? { status: { name: value } } : { status: null };
        break;
      case 'multi_select':
        formattedProperty[column] = {
          multi_select: Array.isArray(value) ? value.map(v => ({ name: v })) : []
        };
        break;
      case 'date':
        formattedProperty[column] = value ? { date: { start: value } } : { date: null };
        break;
      case 'checkbox':
        formattedProperty[column] = { checkbox: Boolean(value) };
        break;
      case 'number':
        formattedProperty[column] = { number: value ? Number(value) : null };
        break;
      case 'url':
        formattedProperty[column] = { url: value || null };
        break;
      case 'email':
        formattedProperty[column] = { email: value || null };
        break;
      case 'phone_number':
        formattedProperty[column] = { phone_number: value || null };
        break;
      default:
        // Default to rich_text for unknown types
        formattedProperty[column] = {
          rich_text: [{ text: { content: String(value || '') } }]
        };
    }

    const response = await notion.pages.update({
      page_id: taskId,
      properties: formattedProperty
    });

    console.log('✅ Task updated successfully');

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: {
        id: response.id,
        lastEditedTime: response.last_edited_time
      }
    });

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    res.status(500).json({
      error: 'Failed to update Notion task',
      details: error.message
    });
  }
});

app.delete('/api/notion/delete-task/:taskId', async (req, res) => {
  try {
    if (!isNotionEnabled) {
      return res.status(503).json({ 
        error: 'Notion service is disabled',
        details: 'Notion API key is not configured or invalid'
      });
    }

    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        error: 'Task ID is required',
        details: 'No taskId provided in URL parameters'
      });
    }

    console.log('🗑️ Deleting Notion task:', taskId);

    // Archive the page in Notion (this is how we "delete" in Notion)
    await notion.pages.update({
      page_id: taskId,
      archived: true
    });

    console.log('✅ Task deleted successfully');

    res.json({
      success: true,
      message: 'Task deleted successfully',
      taskId
    });

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    res.status(500).json({
      error: 'Failed to delete Notion task',
      details: error.message
    });
  }
});

// Drive endpoints with real Google Drive integration
app.get('/api/drive/files', async (req, res) => {
  if (!process.env.GOOGLE_DRIVE_CLIENT_EMAIL || !process.env.GOOGLE_DRIVE_PROJECT_ID || !process.env.GOOGLE_DRIVE_PRIVATE_KEY) {
    return res.json({
      success: false,
      message: 'Google Drive credentials not configured',
      files: []
    });
  }

  try {
    const { google } = require('googleapis');
    
    // Configurar autenticación
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Construir query para la carpeta específica
    let query = '';
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      query = `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents`;
      console.log(`Listing files from specific folder: ${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
    } else {
      console.log('No specific folder ID found, listing all files');
    }
    
    // Listar archivos
    const response = await drive.files.list({
      q: query,
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];
    
    res.json({
      success: true,
      message: `Found ${files.length} files in Google Drive folder`,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'root',
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink
      }))
    });

  } catch (error) {
    console.error('Google Drive API error:', error);
    res.json({
      success: false,
      message: `Google Drive error: ${error.message}`,
      files: []
    });
  }
});

app.get('/api/drive/test', (req, res) => {
  if (process.env.GOOGLE_DRIVE_CLIENT_EMAIL && process.env.GOOGLE_DRIVE_PROJECT_ID && process.env.GOOGLE_DRIVE_PRIVATE_KEY) {
    res.json({ 
      success: true, 
      message: 'Google Drive credentials configured and ready',
      connected: true,
      status: 'Connected'
    });
  } else {
    res.json({ 
      success: false, 
      message: 'Google Drive credentials not configured',
      connected: false,
      status: 'Not configured'
    });
  }
});

app.post('/api/prospeccion', (req, res) => {
  if (process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY) {
    res.json({ 
      success: true, 
      message: 'OpenAI API key found but service not fully implemented' 
    });
  } else {
    res.json({ 
      success: false, 
      message: 'OpenAI API key not configured' 
    });
  }
});

// GPT Analysis endpoints
app.post('/api/gpt/analyze', async (req, res) => {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    
    const { text, tables, metadata, targetColumns, tableName, tableType, instructions } = req.body;

    console.log('🔍 Detailed request analysis:');
    console.log('- tableName:', tableName);
    console.log('- targetColumns type:', typeof targetColumns);
    console.log('- targetColumns length:', targetColumns?.length);
    console.log('- targetColumns sample:', targetColumns?.slice(0, 3));

    if (!targetColumns || !tableName) {
      console.log('❌ Missing required fields validation failed');
      console.log('- targetColumns present:', !!targetColumns);
      console.log('- tableName present:', !!tableName);
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'targetColumns and tableName are required'
      });
    }

    console.log('🤖 GPT Analysis request for table:', tableName);
    console.log('📋 Target columns:', targetColumns);

    // Get real data from the table to analyze
    let tableData = [];
    let columnAnalysis = {};
    
    try {
      // First get table structure to validate columns
      console.log('🔍 Getting table structure for:', tableName);
      const structure = await getTableStructure(tableName);
      console.log('📊 Database structure columns:', structure.map(col => col.Field || col.name));
      
      const availableColumns = structure.map(col => col.Field || col.name);
      console.log('📝 Available columns in DB:', availableColumns);
      
      // Filter target columns to only include existing ones
      const validColumns = targetColumns.filter(col => availableColumns.includes(col));
      console.log('✅ Valid columns after filtering:', validColumns);
      console.log('❌ Invalid columns filtered out:', targetColumns.filter(col => !availableColumns.includes(col)));
      
      if (validColumns.length === 0) {
        console.log('❌ NO VALID COLUMNS FOUND!');
        console.log('- Target columns requested:', targetColumns);
        console.log('- Available columns in DB:', availableColumns);
        console.log('- Table structure:', structure);
        
        return res.status(400).json({
          error: 'No valid columns found',
          details: `None of the target columns [${targetColumns.join(', ')}] exist in table ${tableName}`,
          availableColumns: availableColumns,
          requestedColumns: targetColumns,
          tableStructure: structure
        });
      }

      // Get sample data from the table (limit to 100 records for analysis)
      const query = `SELECT ${validColumns.map(col => `\`${col}\``).join(', ')} FROM \`${tableName}\` LIMIT 100`;
      console.log('🔍 Executing query:', query);
      tableData = await executeQuery(query);
      
      console.log(`📊 Retrieved ${tableData.length} records from ${tableName} for analysis`);

      // Analyze each column
      validColumns.forEach(column => {
        const columnData = tableData.map(row => row[column]).filter(val => val !== null && val !== undefined && val !== '');
        
        columnAnalysis[column] = {
          totalRecords: tableData.length,
          nonNullRecords: columnData.length,
          nullRecords: tableData.length - columnData.length,
          fillRate: columnData.length / tableData.length,
          dataType: structure.find(col => (col.Field || col.name) === column)?.Type || structure.find(col => (col.Field || col.name) === column)?.type || 'unknown',
          sampleValues: columnData.slice(0, 5), // First 5 non-empty values
          uniqueValues: [...new Set(columnData)].length,
          patterns: analyzeColumnPatterns(columnData, column)
        };
      });

    } catch (dbError) {
      console.error('❌ Database analysis error:', dbError);
      return res.status(500).json({
        error: 'Failed to analyze table data',
        details: dbError.message,
        tableName: tableName
      });
    }

    // Create comprehensive analysis response
    const analysis = {
      success: true,
      tableName: tableName,
      totalRecords: tableData.length,
      analyzedColumns: Object.keys(columnAnalysis).length,
      columnAnalysis: columnAnalysis,
      summary: {
        mostPopulatedColumns: Object.entries(columnAnalysis)
          .sort(([,a], [,b]) => b.fillRate - a.fillRate)
          .slice(0, 5)
          .map(([col, data]) => ({ column: col, fillRate: data.fillRate })),
        dataQuality: {
          averageFillRate: Object.values(columnAnalysis).reduce((sum, col) => sum + col.fillRate, 0) / Object.keys(columnAnalysis).length,
          totalNullValues: Object.values(columnAnalysis).reduce((sum, col) => sum + col.nullRecords, 0),
          columnsWithData: Object.values(columnAnalysis).filter(col => col.nonNullRecords > 0).length
        }
      },
      recommendations: generateDataRecommendations(columnAnalysis, tableName),
      timestamp: new Date().toISOString()
    };

    console.log('✅ Real data analysis completed:', Object.keys(columnAnalysis).length, 'columns analyzed');
    res.json(analysis);

  } catch (error) {
    console.error('❌ GPT Analysis Error:', error);
    res.status(500).json({
      error: 'Failed to analyze content',
      details: error.message
    });
  }
});

// Helper function to analyze column patterns
function analyzeColumnPatterns(columnData, columnName) {
  const patterns = {
    emails: 0,
    phones: 0,
    dates: 0,
    rfcs: 0,
    numbers: 0,
    currencies: 0,
    empty: 0
  };

  columnData.forEach(value => {
    const str = String(value).toLowerCase();
    
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str)) {
      patterns.emails++;
    } else if (/^[\d\s\-\(\)]+$/.test(str) && str.replace(/\D/g, '').length >= 10) {
      patterns.phones++;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str) || /^\d{4}-\d{2}-\d{2}/.test(str)) {
      patterns.dates++;
    } else if (/^[A-Z]{4}\d{6}[A-Z0-9]{3}$/.test(str.toUpperCase())) {
      patterns.rfcs++;
    } else if (/^\$?\s*[\d,]+\.?\d*$/.test(str)) {
      patterns.currencies++;
    } else if (/^\d+\.?\d*$/.test(str)) {
      patterns.numbers++;
    } else if (str.trim() === '') {
      patterns.empty++;
    }
  });

  return patterns;
}

// Helper function to generate recommendations
function generateDataRecommendations(columnAnalysis, tableName) {
  const recommendations = [];
  
  Object.entries(columnAnalysis).forEach(([column, analysis]) => {
    if (analysis.fillRate < 0.5) {
      recommendations.push(`Column "${column}" has low data completeness (${Math.round(analysis.fillRate * 100)}% filled)`);
    }
    
    if (analysis.patterns.emails > 0) {
      recommendations.push(`Column "${column}" contains ${analysis.patterns.emails} email addresses`);
    }
    
    if (analysis.patterns.rfcs > 0) {
      recommendations.push(`Column "${column}" contains ${analysis.patterns.rfcs} RFC codes`);
    }
    
    if (analysis.patterns.phones > 0) {
      recommendations.push(`Column "${column}" contains ${analysis.patterns.phones} phone numbers`);
    }
    
    if (analysis.uniqueValues === 1 && analysis.nonNullRecords > 1) {
      recommendations.push(`Column "${column}" has all identical values - may not be useful for analysis`);
    }
  });
  
  return recommendations;
}

// Additional GPT endpoints
app.post('/api/gpt/analyze-list', async (req, res) => {
  try {
    console.log('🤖 GPT List Analysis request');
    res.json({
      success: true,
      message: 'List analysis endpoint (mock response)',
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze list', details: error.message });
  }
});

app.post('/api/gpt/generate', async (req, res) => {
  try {
    console.log('🤖 GPT Generate request');
    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['type', 'data'] 
      });
    }
    
    console.log('📧 Generating email content for type:', type);
    console.log('📋 Data received:', Object.keys(data));
    
    // Generate email content based on type
    let emailContent = {};
    
    if (type === 'welcome_email') {
      // Email de bienvenida con información completa
      const name = data.nombre_contratante || data.name || 'Cliente';
      const policyNumber = data.numero_poliza || data.policy_number || 'Sin especificar';
      const insurer = data.aseguradora || data.insurer || 'Su aseguradora';
      const startDate = data.vigencia_inicio || data.start_date || 'Por confirmar';
      const endDate = data.vigencia_fin || data.end_date || 'Por confirmar';
      const paymentMethod = data.forma_de_pago || data.payment_method || 'Por confirmar';
      const totalAmount = data.pago_total_o_prima_total || data.total_amount || 'Por confirmar';
      const netPremium = data.prima_neta || data.net_premium || 'Por confirmar';
      const policyFee = data.derecho_de_poliza || data.policy_fee || 'Por confirmar';
      const iva = data.i_v_a || data.iva || 'Por confirmar';
      const vehicleType = data.tipo_de_vehiculo || data.vehicle_type || 'Por confirmar';
      const vehicleDescription = data.descripcion_del_vehiculo || data.vehicle_description || 'Por confirmar';
      const plates = data.placas || data.plates || 'Por confirmar';
      const model = data.modelo || data.model || 'Por confirmar';
      const serial = data.serie || data.serial || 'Por confirmar';
      const engine = data.motor || data.engine || 'Por confirmar';
      const usage = data.uso || data.usage || 'Por confirmar';
      const address = data.domicilio_o_direccion || data.address || 'Por confirmar';
      const rfc = data.rfc || 'Por confirmar';
      const branch = data.ramo || data.branch || 'Por confirmar';

      emailContent = {
        subject: `Confirmación de Póliza - ${policyNumber}`,
        message: `Estimado/a ${name},

Por medio de la presente, confirmamos el procesamiento exitoso de su póliza de seguro.

INFORMACIÓN DE LA PÓLIZA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Número de póliza: ${policyNumber}
• Aseguradora: ${insurer}
• RFC: ${rfc}
• Ramo: ${branch}

VIGENCIA Y PAGO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Vigencia: ${startDate} al ${endDate}
• Forma de pago: ${paymentMethod}
• Prima total: $${totalAmount}
• Prima neta: $${netPremium}
• Derecho de póliza: $${policyFee}
• I.V.A.: $${iva}

INFORMACIÓN DEL VEHÍCULO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Tipo: ${vehicleType}
• Descripción: ${vehicleDescription}
• Placas: ${plates}
• Modelo: ${model}
• Serie: ${serial}
• Motor: ${engine}
• Uso: ${usage}

DATOS DEL CONTRATANTE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Nombre: ${name}
• RFC: ${rfc}
• Domicilio: ${address}

IMPORTANTE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Conserve este documento como comprobante
• Mantenga actualizada su información de contacto
• Revise periódicamente el estado de su póliza
• Contacte a su agente para cualquier aclaración

La presente comunicación tiene carácter informativo y no constituye un endoso ni modificación a los términos y condiciones establecidos en su póliza.

Atentamente,
Departamento de Administración de Pólizas`
      };
    } else if (type === 'reminder_email') {
      // Email de recordatorio
      const name = data.nombre_contratante || data.name || 'Cliente';
      const policyNumber = data.numero_poliza || data.policy_number || 'Sin especificar';
      const insurer = data.aseguradora || data.insurer || 'Su aseguradora';
      const endDate = data.vigencia_fin || data.end_date || 'Por confirmar';

      emailContent = {
        subject: `Recordatorio de Vencimiento - Póliza ${policyNumber}`,
        message: `Estimado/a ${name},

Por medio de la presente, le informamos sobre el próximo vencimiento de su póliza de seguro.

INFORMACIÓN DE LA PÓLIZA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Número de póliza: ${policyNumber}
• Aseguradora: ${insurer}
${endDate !== 'Por confirmar' ? `• Fecha de vencimiento: ${endDate}` : ''}

ACCIONES REQUERIDAS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Revise el estado actual de su póliza
• Verifique que sus datos de contacto estén actualizados
• Contacte a su agente para proceso de renovación
• Mantenga vigente su protección

IMPORTANTE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• La continuidad de su cobertura depende de la renovación oportuna
• Evite periodos sin protección manteniendo su póliza al día
• Cualquier siniestro sin cobertura vigente no será procedente

Para mayor información o aclaraciones, póngase en contacto con su agente de seguros.

Atentamente,
Departamento de Administración de Pólizas`
      };
    } else if (type === 'info_email') {
      // Email informativo general
      const name = data.nombre_contratante || data.name || 'Cliente';
      const policyNumber = data.numero_poliza || data.policy_number || 'Sin especificar';
      const insurer = data.aseguradora || data.insurer || 'Su aseguradora';
      const rfc = data.rfc || 'Por confirmar';
      const startDate = data.vigencia_inicio || data.start_date || 'Por confirmar';
      const endDate = data.vigencia_fin || data.end_date || 'Por confirmar';
      const paymentMethod = data.forma_de_pago || data.payment_method || 'Por confirmar';
      const totalAmount = data.pago_total_o_prima_total || data.total_amount || 'Por confirmar';
      const netPremium = data.prima_neta || data.net_premium || 'Por confirmar';
      const branch = data.ramo || data.branch || 'Por confirmar';

      emailContent = {
        subject: `Estado de Cuenta - Póliza ${policyNumber}`,
        message: `Estimado/a ${name},

Le proporcionamos la información actualizada de su póliza de seguro.

INFORMACIÓN GENERAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Contratante: ${name}
• Número de póliza: ${policyNumber}
• Aseguradora: ${insurer}
• RFC: ${rfc}
• Ramo: ${branch}

VIGENCIA Y CONDICIONES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Inicio de vigencia: ${startDate}
• Fin de vigencia: ${endDate}
• Forma de pago: ${paymentMethod}
• Prima total: $${totalAmount}
• Prima neta: $${netPremium}

ESTADO ACTUAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Su póliza se encuentra activa y vigente
• Sus coberturas están en pleno funcionamiento
• Mantenga actualizada su información de contacto

Para consultas adicionales o modificaciones a su póliza, contacte a su agente de seguros.

Atentamente,
Departamento de Administración de Pólizas`
      };
    } else {
      // Default generic email with available data
      const name = data.nombre_contratante || data.name || 'Cliente';
      const insurer = data.aseguradora || data.insurer || 'Nuestro equipo';
      
      emailContent = {
        subject: '📋 Información importante sobre su póliza',
        message: `Estimado/a ${name},

Esperamos que se encuentre bien. Le escribimos para proporcionarle información importante relacionada con sus servicios.

${Object.keys(data).length > 0 ? `
📋 **DATOS REGISTRADOS:**
${Object.entries(data)
  .filter(([key, value]) => value && value !== 'N/A' && key !== 'id')
  .slice(0, 8) // Límite para no hacer el email demasiado largo
  .map(([key, value]) => `• ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`)
  .join('\n')}` : ''}

Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos.

Atentamente,
**${insurer}**`
      };
    }
    
    console.log('✅ Email content generated successfully');
    res.json({
      success: true,
      emailContent: emailContent
    });
  } catch (error) {
    console.error('❌ Error generating email content:', error);
    res.status(500).json({ error: 'Failed to generate content', details: error.message });
  }
});

// Support Chat endpoint
app.post('/api/support-chat', async (req, res) => {
  try {
    console.log('💬 Support chat request');
    res.json({
      success: true,
      message: 'Support chat endpoint (mock response)',
      response: 'Hello! This is a mock support response. The chat system is not fully implemented yet.'
    });
  } catch (error) {
    res.status(500).json({ error: 'Support chat error', details: error.message });
  }
});

// Notion Debug endpoint
app.get('/api/notion/debug', async (req, res) => {
  try {
    console.log('🔍 Notion debug request');
    res.json({
      success: true,
      message: 'Notion debug endpoint',
      config: {
        api_key_configured: !!(process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY),
        database_id_configured: !!(process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID),
        status: isNotionEnabled ? 'enabled' : 'disabled'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Notion debug error', details: error.message });
  }
});

// Drive Upload endpoint
app.post('/api/drive/upload', async (req, res) => {
  try {
    console.log('📁 Drive upload request');
    res.json({
      success: false,
      message: 'Drive upload endpoint (not implemented)',
      details: 'Google Drive upload functionality needs to be implemented'
    });
  } catch (error) {
    res.status(500).json({ error: 'Drive upload error', details: error.message });
  }
});

// Email endpoints
app.post('/api/email/send-welcome', async (req, res) => {
  try {
    console.log('📧 Email send-welcome request');
    res.json({
      success: false,
      message: 'Email sending endpoint (not implemented)',
      details: 'Email sending functionality needs to be implemented'
    });
  } catch (error) {
    res.status(500).json({ error: 'Email sending error', details: error.message });
  }
});

// Prospeccion endpoints
app.get('/api/prospeccion/:userId', async (req, res) => {
  try {
    console.log('👤 Prospeccion get request for user:', req.params.userId);
    res.json({
      success: true,
      message: 'Prospeccion endpoint (mock response)',
      data: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Prospeccion error', details: error.message });
  }
});

app.post('/api/prospeccion/:userId', async (req, res) => {
  try {
    console.log('👤 Prospeccion post request for user:', req.params.userId);
    res.json({
      success: true,
      message: 'Prospeccion created (mock response)',
      id: Math.floor(Math.random() * 1000)
    });
  } catch (error) {
    res.status(500).json({ error: 'Prospeccion creation error', details: error.message });
  }
});

app.post('/api/prospeccion/:userId/:cardId/analyze', async (req, res) => {
  try {
    console.log('🔍 Prospeccion analyze request for user:', req.params.userId, 'card:', req.params.cardId);
    res.json({
      success: true,
      message: 'Prospeccion analysis (mock response)',
      analysis: 'Mock analysis result'
    });
  } catch (error) {
    res.status(500).json({ error: 'Prospeccion analysis error', details: error.message });
  }
});

app.delete('/api/prospeccion/:userId/:cardId', async (req, res) => {
  try {
    console.log('🗑️ Prospeccion delete request for user:', req.params.userId, 'card:', req.params.cardId);
    res.json({
      success: true,
      message: 'Prospeccion deleted (mock response)'
    });
  } catch (error) {
    res.status(500).json({ error: 'Prospeccion deletion error', details: error.message });
  }
});

// Catch-all for undefined API routes
app.get('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    requested_path: req.path,
    message: 'This endpoint is not implemented yet.'
  });
});

// Catch-all handler: enviar index.html para rutas SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 CASIN CRM with MySQL running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
  console.log(`🗄️  Database: MySQL (crud_db)`);
  console.log(`📊 Data: Real data from MySQL tables`);
  console.log(`🎯 Mode: Production with real database`);
}); 