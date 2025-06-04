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
    'FIREBASE_PRIVATE_KEY',
    'VITE_FIREBASE_PROJECT_ID',
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

// Initialize Firebase Admin if credentials are available
let admin = null;
let db = null;
let isFirebaseEnabled = false;

try {
  if (process.env.VITE_FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    admin = require('firebase-admin');
    
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.VITE_FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: `firebase-adminsdk@${process.env.VITE_FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
    };

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
      });
    }
    
    db = admin.firestore();
    isFirebaseEnabled = true;
    console.log('✅ Firebase Admin initialized');
  } else {
    console.log('⚠️  Firebase credentials not found - Firebase features disabled');
  }
} catch (error) {
  console.warn('⚠️  Could not initialize Firebase Admin:', error.message);
}

// MySQL connection configuration (fallback)
const dbConfig = {
  host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'crud_db',
  port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
};

// Create MySQL connection pool (fallback)
let pool;
try {
  pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  console.log('✅ MySQL connection pool created (fallback)');
} catch (error) {
  console.error('❌ MySQL connection failed:', error);
  if (!isFirebaseEnabled) {
    console.error('❌ No database available - both Firebase and MySQL failed');
  }
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
app.get('/api/health', async (req, res) => {
  try {
    let databaseStatus = 'connected';
    let databaseType = 'Firebase (Frontend)';
    let error = null;

    // Check if Firebase credentials are available for frontend
    const hasFirebaseConfig = !!(
      process.env.VITE_FIREBASE_API_KEY && 
      process.env.VITE_FIREBASE_PROJECT_ID &&
      process.env.VITE_FIREBASE_AUTH_DOMAIN
    );

    if (hasFirebaseConfig) {
      databaseStatus = 'connected';
      databaseType = 'Firebase (Frontend)';
    } else {
      // Fallback to MySQL if Firebase config not available
      if (pool) {
        try {
          await pool.execute('SELECT 1');
          databaseStatus = 'connected';
          databaseType = 'MySQL';
        } catch (mysqlError) {
          console.warn('MySQL health check failed:', mysqlError.message);
          databaseStatus = 'disconnected';
          error = mysqlError.message;
        }
      } else {
        databaseStatus = 'disconnected';
        error = 'No database configuration available';
      }
    }

    if (databaseStatus === 'connected') {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        message: `CASIN CRM API with ${databaseType} is running!`,
        database: databaseStatus,
        databaseType: databaseType,
        firebaseConfigured: hasFirebaseConfig,
        services: {
          notion: !!(process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY),
          openai: !!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY),
          googleDrive: !!(process.env.GOOGLE_DRIVE_CLIENT_EMAIL),
          email: !!(process.env.SMTP_HOST)
        }
      });
    } else {
      res.status(500).json({
        status: 'unhealthy',
        database: databaseStatus,
        databaseType: databaseType,
        error: error || 'No database connection available',
        timestamp: new Date().toISOString(),
        firebaseConfigured: hasFirebaseConfig
      });
    }
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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
    const { 
      page = 1, 
      limit = 50, 
      search, 
      status, 
      origen, 
      genero 
    } = req.query;
    
    const offset = (page - 1) * parseInt(limit);
    const limitInt = parseInt(limit);
    
    // Build WHERE conditions
    const whereConditions = [];
    const queryParams = [];
    
    // Search functionality
    if (search && search.trim()) {
      whereConditions.push(`(
        nombre_completo LIKE ? OR 
        email LIKE ? OR 
        telefono_movil LIKE ? OR 
        telefono_oficina LIKE ? OR 
        telefono_casa LIKE ? OR
        empresa LIKE ? OR
        nickname LIKE ? OR
        apellido LIKE ?
      )`);
      const searchPattern = `%${search.trim()}%`;
      // Add 8 parameters for the 8 LIKE conditions
      for (let i = 0; i < 8; i++) {
        queryParams.push(searchPattern);
      }
    }
    
    // Status filter
    if (status && status.trim()) {
      whereConditions.push('status = ?');
      queryParams.push(status.trim());
    }
    
    // Origen filter
    if (origen && origen.trim()) {
      whereConditions.push('origen = ?');
      queryParams.push(origen.trim());
    }
    
    // Genero filter
    if (genero && genero.trim()) {
      whereConditions.push('genero = ?');
      queryParams.push(genero.trim());
    }
    
    // Build the WHERE clause
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Main query with filters (using string interpolation for LIMIT/OFFSET)
    const query = `
      SELECT * FROM directorio_contactos 
      ${whereClause}
      ORDER BY id DESC 
      LIMIT ${limitInt} OFFSET ${offset}
    `;
    
    const data = await executeQuery(query, queryParams);
    
    // Count query with same filters
    const countQuery = `
      SELECT COUNT(*) as total FROM directorio_contactos 
      ${whereClause}
    `;
    
    const totalResult = await executeQuery(countQuery, queryParams);
    const total = totalResult[0].total;
    
    console.log(`📋 Directorio query executed - Total: ${total}, Search: "${search || 'none'}", Status: "${status || 'none'}", Origen: "${origen || 'none'}", Genero: "${genero || 'none'}"`);
    
    res.json({
      data: data,
      total: total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching directorio:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: error.message,
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

// POST - Create new contact
app.post('/api/directorio', async (req, res) => {
  try {
    const contactData = req.body;
    
    // Get table structure to build dynamic query
    const structure = await getTableStructure('directorio_contactos');
    const columns = structure.map(col => col.name).filter(col => col !== 'id');
    
    // Build values array and placeholders
    const values = columns.map(col => {
      let value = contactData[col] || null;
      
      // Handle ENUM fields - convert empty strings to NULL
      if (col === 'genero' && (value === '' || value === null || value === undefined)) {
        value = null;
      }
      
      return value;
    });
    const placeholders = columns.map(() => '?').join(', ');
    const columnsList = columns.map(col => `\`${col}\``).join(', ');
    
    const query = `INSERT INTO directorio_contactos (${columnsList}) VALUES (${placeholders})`;
    
    const result = await executeQuery(query, values);
    
    // Get the created contact
    const newContact = await executeQuery(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: newContact[0]
    });
    
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating contact',
      error: error.message
    });
  }
});

// PUT - Update existing contact
app.put('/api/directorio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const contactData = req.body;
    
    // Check if contact exists
    const existingContact = await executeQuery(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (existingContact.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    // Get table structure for dynamic update
    const structure = await getTableStructure('directorio_contactos');
    const columns = structure.map(col => col.name).filter(col => col !== 'id');
    
    // Build SET clause and values
    const setClauses = [];
    const values = [];
    
    columns.forEach(col => {
      if (contactData.hasOwnProperty(col)) {
        setClauses.push(`\`${col}\` = ?`);
        
        // Handle ENUM fields - convert empty strings to NULL
        let value = contactData[col];
        if (col === 'genero' && (value === '' || value === null || value === undefined)) {
          value = null;
        }
        
        values.push(value);
      }
    });
    
    values.push(id); // Add ID for WHERE clause
    
    const query = `UPDATE directorio_contactos SET ${setClauses.join(', ')} WHERE id = ?`;
    
    await executeQuery(query, values);
    
    // Get the updated contact
    const updatedContact = await executeQuery(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: updatedContact[0]
    });
    
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating contact',
      error: error.message
    });
  }
});

// DELETE - Delete contact
app.delete('/api/directorio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if contact exists
    const existingContact = await executeQuery(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (existingContact.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    // Delete the contact
    await executeQuery('DELETE FROM directorio_contactos WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Contact deleted successfully',
      data: existingContact[0]
    });
    
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting contact',
      error: error.message
    });
  }
});

// GET - Get specific contact by ID
app.get('/api/directorio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await executeQuery(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (contact.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    res.json({
      success: true,
      data: contact[0]
    });
    
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact',
      error: error.message
    });
  }
});

// POST - Link contact to existing client
app.post('/api/directorio/:id/link-cliente', async (req, res) => {
  try {
    const { id } = req.params;
    const clienteData = req.body;
    
    // Check if contact exists
    const existingContact = await executeQuery(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    if (existingContact.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    
    // Update contact to mark as client and link relevant data
    const updateFields = {};
    if (clienteData.table) updateFields.tabla_relacionada = clienteData.table;
    if (clienteData.clientId) updateFields.cliente_id_relacionado = clienteData.clientId;
    updateFields.status = 'cliente';
    updateFields.fecha_conversion = new Date().toISOString().split('T')[0];
    
    const setClauses = Object.keys(updateFields).map(key => `\`${key}\` = ?`);
    const values = Object.values(updateFields);
    values.push(id);
    
    const query = `UPDATE directorio_contactos SET ${setClauses.join(', ')} WHERE id = ?`;
    
    await executeQuery(query, values);
    
    // Get updated contact
    const updatedContact = await executeQuery(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Contact linked to client successfully',
      data: updatedContact[0]
    });
    
  } catch (error) {
    console.error('Error linking contact to client:', error);
    res.status(500).json({
      success: false,
      message: 'Error linking contact to client',
      error: error.message
    });
  }
});

// GET - Get relationships between directorio and policy tables with intelligent name matching
app.get('/api/directorio-relationships', async (req, res) => {
  try {
    console.log('🔍 Starting intelligent relationship analysis...');
    
    // Get all tables to show potential relationships
    const tables = await executeQuery("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]).filter(name => name !== 'directorio_contactos');
    
    // Get all directorio contacts with their official names
    const directorioContacts = await executeQuery(
      "SELECT id, nombre_completo, nombre_completo_oficial, email, telefono_movil FROM directorio_contactos WHERE nombre_completo_oficial IS NOT NULL AND nombre_completo_oficial != ''"
    );
    
    console.log(`📋 Found ${directorioContacts.length} directorio contacts with official names`);
    
    const relationships = [];
    let totalMatches = 0;
    
    // Define name fields mapping for each table
    const nameFieldsMapping = {
      'autos': ['nombre_contratante'],
      'gmm': ['contratante', 'nombre_del_asegurado'], 
      'hogar': ['contratante'],
      'negocio': ['contratante'],
      'vida': ['contratante', 'nombre_del_asegurado'],
      'diversos': ['contratante'],
      'mascotas': ['contratante'],
      'transporte': ['contratante']
    };
    
    for (const tableName of tableNames) {
      try {
        const nameFields = nameFieldsMapping[tableName];
        if (!nameFields) {
          console.log(`⏭️  Skipping ${tableName} - no name fields mapped`);
          continue;
        }
        
        console.log(`🔍 Analyzing table: ${tableName} with fields: ${nameFields.join(', ')}`);
        
        // Get table structure to verify fields exist
        const structure = await getTableStructure(tableName);
        const availableFields = structure.map(col => col.name);
        const validFields = nameFields.filter(field => availableFields.includes(field));
        
        if (validFields.length === 0) {
          console.log(`⏭️  Skipping ${tableName} - no valid name fields found`);
          continue;
        }
        
        // Get all records from this table with name fields
        const selectFields = ['id', ...validFields].join(', ');
        const policyRecords = await executeQuery(`SELECT ${selectFields} FROM \`${tableName}\``);
        
        console.log(`📊 Found ${policyRecords.length} records in ${tableName}`);
        
        const tableMatches = [];
        let tableMatchCount = 0;
        
        // Compare each directorio contact with each policy record
        for (const contact of directorioContacts) {
          const officialName = contact.nombre_completo_oficial.trim().toLowerCase();
          
          for (const record of policyRecords) {
            for (const field of validFields) {
              const policyName = record[field];
              if (!policyName) continue;
              
              const cleanPolicyName = policyName.trim().toLowerCase();
              
              // Exact match
              if (officialName === cleanPolicyName) {
                tableMatches.push({
                  directorio_id: contact.id,
                  directorio_name: contact.nombre_completo_oficial,
                  directorio_email: contact.email,
                  directorio_phone: contact.telefono_movil,
                  policy_table: tableName,
                  policy_id: record.id,
                  policy_name: policyName,
                  policy_field: field,
                  match_type: 'exact',
                  confidence: 100
                });
                tableMatchCount++;
                continue;
              }
              
              // Fuzzy match - contains or similar
              if (officialName.length > 10 && cleanPolicyName.includes(officialName)) {
                tableMatches.push({
                  directorio_id: contact.id,
                  directorio_name: contact.nombre_completo_oficial,
                  directorio_email: contact.email,
                  directorio_phone: contact.telefono_movil,
                  policy_table: tableName,
                  policy_id: record.id,
                  policy_name: policyName,
                  policy_field: field,
                  match_type: 'fuzzy_contains',
                  confidence: 85
                });
                tableMatchCount++;
                continue;
              }
              
              // Reverse contains - policy name contains directorio name
              if (cleanPolicyName.length > 10 && officialName.includes(cleanPolicyName)) {
                tableMatches.push({
                  directorio_id: contact.id,
                  directorio_name: contact.nombre_completo_oficial,
                  directorio_email: contact.email,
                  directorio_phone: contact.telefono_movil,
                  policy_table: tableName,
                  policy_id: record.id,
                  policy_name: policyName,
                  policy_field: field,
                  match_type: 'fuzzy_reverse',
                  confidence: 80
                });
                tableMatchCount++;
                continue;
              }
              
              // Similar words match (at least 2 words in common)
              const officialWords = officialName.split(' ').filter(w => w.length > 2);
              const policyWords = cleanPolicyName.split(' ').filter(w => w.length > 2);
              const commonWords = officialWords.filter(word => policyWords.includes(word));
              
              if (commonWords.length >= 2 && officialWords.length >= 2) {
                tableMatches.push({
                  directorio_id: contact.id,
                  directorio_name: contact.nombre_completo_oficial,
                  directorio_email: contact.email,
                  directorio_phone: contact.telefono_movil,
                  policy_table: tableName,
                  policy_id: record.id,
                  policy_name: policyName,
                  policy_field: field,
                  match_type: 'word_similarity',
                  confidence: Math.round((commonWords.length / Math.max(officialWords.length, policyWords.length)) * 70),
                  common_words: commonWords
                });
                tableMatchCount++;
              }
            }
          }
        }
        
        console.log(`✅ Found ${tableMatchCount} matches in ${tableName}`);
        totalMatches += tableMatchCount;
        
        relationships.push({
          table: tableName,
          name_fields: validFields,
          total_records: policyRecords.length,
          matches_found: tableMatchCount,
          matches: tableMatches.slice(0, 50) // Limit to first 50 matches per table
        });
        
      } catch (error) {
        console.error(`❌ Error analyzing table ${tableName}:`, error.message);
        relationships.push({
          table: tableName,
          error: error.message,
          matches_found: 0,
          matches: []
        });
      }
    }
    
    console.log(`🎯 Relationship analysis completed - Total matches: ${totalMatches}`);
    
    const summary = {
      total_directorio_contacts: directorioContacts.length,
      tables_analyzed: relationships.length,
      total_matches_found: totalMatches,
      match_distribution: relationships.map(r => ({
        table: r.table,
        matches: r.matches_found || 0
      })).sort((a, b) => b.matches - a.matches)
    };
    
    res.json({
      success: true,
      summary,
      relationships,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error getting relationships:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting relationships',
      error: error.message
    });
  }
});

// PUT - Update client status automatically
app.put('/api/directorio/update-client-status', async (req, res) => {
  try {
    let updatedCount = 0;
    
    // Get all contacts that are not already marked as clients
    const contacts = await executeQuery(
      "SELECT id, nombre_completo FROM directorio_contactos WHERE status != 'cliente' OR status IS NULL"
    );
    
    // Check each contact against policy tables
    for (const contact of contacts) {
      const tables = ['autos', 'hogar', 'vida', 'gmm', 'negocio', 'mascotas', 'diversos'];
      let foundPolicy = false;
      
      for (const tableName of tables) {
        try {
          const policyCheck = await executeQuery(
            `SELECT id FROM \`${tableName}\` WHERE nombre_contratante LIKE ? LIMIT 1`,
            [`%${contact.nombre_completo}%`]
          );
          
          if (policyCheck.length > 0) {
            foundPolicy = true;
            break;
          }
        } catch (err) {
          // Skip if table doesn't exist or has issues
          continue;
        }
      }
      
      // Update status if policy found
      if (foundPolicy) {
        await executeQuery(
          "UPDATE directorio_contactos SET status = 'cliente', fecha_conversion = ? WHERE id = ?",
          [new Date().toISOString().split('T')[0], contact.id]
        );
        updatedCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Updated ${updatedCount} contacts to client status`,
      updatedCount: updatedCount
    });
    
  } catch (error) {
    console.error('Error updating client status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating client status',
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

// POST - Link directorio contact to specific policy
app.post('/api/directorio/:contactId/link-policy', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { policyTable, policyId, matchType, confidence } = req.body;
    
    console.log(`🔗 Linking directorio contact ${contactId} to ${policyTable}:${policyId}`);
    
    // Verify contact exists
    const contact = await executeQuery(
      'SELECT * FROM directorio_contactos WHERE id = ?',
      [contactId]
    );
    
    if (contact.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Directorio contact not found'
      });
    }
    
    // Verify policy record exists
    const policyRecord = await executeQuery(
      `SELECT * FROM \`${policyTable}\` WHERE id = ?`,
      [policyId]
    );
    
    if (policyRecord.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Policy record not found'
      });
    }
    
    // Create or update the relationship in a relationships table
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS directorio_policy_links (
          id INT AUTO_INCREMENT PRIMARY KEY,
          directorio_id INT NOT NULL,
          policy_table VARCHAR(100) NOT NULL,
          policy_id INT NOT NULL,
          match_type VARCHAR(50),
          confidence INT,
          linked_by VARCHAR(100),
          linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verified BOOLEAN DEFAULT FALSE,
          notes TEXT,
          UNIQUE KEY unique_link (directorio_id, policy_table, policy_id),
          INDEX idx_directorio (directorio_id),
          INDEX idx_policy (policy_table, policy_id)
        )
      `);
      
      // Insert or update the link
      await executeQuery(`
        INSERT INTO directorio_policy_links 
        (directorio_id, policy_table, policy_id, match_type, confidence, linked_by) 
        VALUES (?, ?, ?, ?, ?, 'system')
        ON DUPLICATE KEY UPDATE 
        match_type = VALUES(match_type),
        confidence = VALUES(confidence),
        linked_at = CURRENT_TIMESTAMP
      `, [contactId, policyTable, policyId, matchType || 'manual', confidence || 95]);
      
      res.json({
        success: true,
        message: 'Policy linked successfully',
        data: {
          directorio_id: contactId,
          policy_table: policyTable,
          policy_id: policyId,
          match_type: matchType || 'manual'
        }
      });
      
    } catch (linkError) {
      console.error('Error creating link:', linkError);
      res.status(500).json({
        success: false,
        message: 'Error creating policy link',
        error: linkError.message
      });
    }
    
  } catch (error) {
    console.error('Error linking policy:', error);
    res.status(500).json({
      success: false,
      message: 'Error linking policy',
      error: error.message
    });
  }
});

// GET - Get all linked policies for a directorio contact
app.get('/api/directorio/:contactId/linked-policies', async (req, res) => {
  try {
    const { contactId } = req.params;
    
    console.log(`📋 Getting linked policies for contact ${contactId}`);
    
    // Get all links for this contact
    const links = await executeQuery(`
      SELECT l.*, d.nombre_completo, d.nombre_completo_oficial, d.email
      FROM directorio_policy_links l
      JOIN directorio_contactos d ON l.directorio_id = d.id
      WHERE l.directorio_id = ?
      ORDER BY l.linked_at DESC
    `, [contactId]);
    
    if (links.length === 0) {
      return res.json({
        success: true,
        message: 'No linked policies found',
        data: {
          contact_id: contactId,
          total_links: 0,
          linked_policies: []
        }
      });
    }
    
    // Get detailed policy information for each link
    const linkedPolicies = [];
    
    for (const link of links) {
      try {
        const policyData = await executeQuery(
          `SELECT * FROM \`${link.policy_table}\` WHERE id = ?`,
          [link.policy_id]
        );
        
        if (policyData.length > 0) {
          linkedPolicies.push({
            link_id: link.id,
            policy_table: link.policy_table,
            policy_id: link.policy_id,
            policy_data: policyData[0],
            match_type: link.match_type,
            confidence: link.confidence,
            linked_at: link.linked_at,
            verified: link.verified,
            notes: link.notes
          });
        }
      } catch (policyError) {
        console.error(`Error getting policy data for ${link.policy_table}:${link.policy_id}`, policyError);
      }
    }
    
    res.json({
      success: true,
      data: {
        contact_id: contactId,
        contact_name: links[0].nombre_completo,
        official_name: links[0].nombre_completo_oficial,
        email: links[0].email,
        total_links: linkedPolicies.length,
        linked_policies: linkedPolicies
      }
    });
    
  } catch (error) {
    console.error('Error getting linked policies:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting linked policies',
      error: error.message
    });
  }
});

// Firebase-based CRUD_DB endpoint (with MySQL fallback)
app.get('/api/data/crud_db', async (req, res) => {
  try {
    const { table, action, id } = req.query;
    
    // Import Firebase service dynamically to avoid issues
    let firebaseService;
    let useFirebase = false;
    
    try {
      // Try to import Firebase service from frontend
      const path = require('path');
      const frontendPath = path.join(__dirname, 'frontend', 'src', 'services', 'firebaseService.js');
      
      // Check if Firebase is available (this is a simplified check)
      // In production, you'd want to check Firebase credentials
      if (process.env.VITE_FIREBASE_API_KEY) {
        console.log('Firebase credentials found, attempting to use Firebase...');
        // For now, we'll use MySQL as fallback since Firebase service needs ES modules
        useFirebase = false;
      }
    } catch (error) {
      console.warn('Firebase not available, using MySQL fallback');
      useFirebase = false;
    }

    if (!useFirebase) {
      // MySQL fallback - use existing MySQL data
      if (!table) {
        // Return all tables info from MySQL
        const tables = await executeQuery('SHOW TABLES');
        const tablesWithStats = [];
        
        for (const tableRow of tables) {
          const tableName = Object.values(tableRow)[0];
          const countResult = await executeQuery(`SELECT COUNT(*) as count FROM \`${tableName}\``);
          const rowCount = countResult[0].count;
          
          tablesWithStats.push({
            name: tableName,
            row_count: rowCount,
            description: getTableDescription(tableName)
          });
        }

        return res.status(200).json({
          success: true,
          tables: tablesWithStats,
          total_tables: tablesWithStats.length,
          total_records: tablesWithStats.reduce((sum, t) => sum + t.row_count, 0),
          database: 'crud_db',
          source: 'MySQL',
          timestamp: new Date().toISOString()
        });
      }

      // Handle specific table operations with MySQL
      switch (action) {
        case 'structure':
          const structure = await getTableStructure(table);
          res.status(200).json({ success: true, structure });
          break;
        
        case 'search':
          const { q: searchTerm } = req.query;
          if (!searchTerm) {
            return res.status(400).json({ error: 'Search term required' });
          }
          
          // Get table structure to find searchable columns
          const columns = await executeQuery(`DESCRIBE \`${table}\``);
          const textColumns = columns
            .filter(col => col.Type.includes('varchar') || col.Type.includes('text'))
            .map(col => col.Field);
          
          if (textColumns.length === 0) {
            return res.status(400).json({ error: 'No searchable columns found' });
          }
          
          // Build search query
          const searchConditions = textColumns
            .map(col => `\`${col}\` LIKE ?`)
            .join(' OR ');
          const searchValues = textColumns.map(() => `%${searchTerm}%`);
          
          const searchQuery = `SELECT * FROM \`${table}\` WHERE ${searchConditions} LIMIT 100`;
          const searchResults = await executeQuery(searchQuery, searchValues);
          
          res.status(200).json({ success: true, data: searchResults });
          break;
        
        default:
          // Get all documents or specific document
          if (id) {
            const document = await executeQuery(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
            if (document.length === 0) {
              return res.status(404).json({ error: 'Document not found' });
            }
            res.status(200).json({ success: true, data: document[0] });
          } else {
            const { limit = 1000, page = 1 } = req.query;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const documents = await executeQuery(
              `SELECT * FROM \`${table}\` LIMIT ? OFFSET ?`, 
              [parseInt(limit), offset]
            );
            res.status(200).json({ 
              success: true, 
              data: documents,
              total: documents.length,
              page: parseInt(page),
              table: table,
              source: 'MySQL'
            });
          }
      }
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.post('/api/data/crud_db', async (req, res) => {
  try {
    const { table } = req.query;
    const body = req.body;
    
    if (!table) {
      return res.status(400).json({ error: 'Table name required' });
    }
    
    // Build INSERT query
    const columns = Object.keys(body);
    const values = Object.values(body);
    const placeholders = columns.map(() => '?').join(', ');
    const columnNames = columns.map(col => `\`${col}\``).join(', ');
    
    const query = `INSERT INTO \`${table}\` (${columnNames}) VALUES (${placeholders})`;
    const result = await executeQuery(query, values);
    
    res.status(201).json({ 
      success: true, 
      id: result.insertId,
      message: 'Document created successfully'
    });
  } catch (error) {
    console.error('POST Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/data/crud_db', async (req, res) => {
  try {
    const { table, id } = req.query;
    const body = req.body;
    
    if (!table || !id) {
      return res.status(400).json({ error: 'Table name and document ID required' });
    }
    
    // Build UPDATE query
    const columns = Object.keys(body);
    const values = Object.values(body);
    const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
    
    const query = `UPDATE \`${table}\` SET ${setClause} WHERE id = ?`;
    const result = await executeQuery(query, [...values, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Document updated successfully'
    });
  } catch (error) {
    console.error('PUT Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/data/crud_db', async (req, res) => {
  try {
    const { table, id } = req.query;
    
    if (!table || !id) {
      return res.status(400).json({ error: 'Table name and document ID required' });
    }
    
    const query = `DELETE FROM \`${table}\` WHERE id = ?`;
    const result = await executeQuery(query, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('DELETE Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function for table descriptions
function getTableDescription(tableName) {
  const descriptions = {
    'directorio_contactos': 'Directorio de contactos/clientes',
    'autos': 'Seguros de autos',
    'vida': 'Seguros de vida', 
    'rc': 'Responsabilidad civil',
    'gmm': 'Gastos médicos mayores',
    'transporte': 'Seguros de transporte',
    'mascotas': 'Seguros de mascotas',
    'diversos': 'Seguros diversos',
    'negocio': 'Seguros de negocio',
    'gruposgmm': 'Grupos GMM'
  };
  return descriptions[tableName] || tableName;
}

// Simple CRUD_DB test endpoint
app.get('/api/data/crud_db', async (req, res) => {
  try {
    console.log('📋 CRUD_DB endpoint called');
    const { table } = req.query;
    
    if (!table) {
      // Return simple table list
      console.log('📋 Getting table list...');
      const tables = await executeQuery('SHOW TABLES');
      const tableNames = tables.map(t => Object.values(t)[0]);
      
      res.json({
        success: true,
        message: 'CRUD DB endpoint working!',
        database: 'crud_db',
        tables: tableNames,
        source: 'MySQL',
        timestamp: new Date().toISOString()
      });
    } else {
      // Return data from specific table
      console.log(`📋 Getting data from table: ${table}`);
      const data = await executeQuery(`SELECT * FROM \`${table}\` LIMIT 10`);
      
      res.json({
        success: true,
        table: table,
        data: data,
        count: data.length,
        source: 'MySQL'
      });
    }
  } catch (error) {
    console.error('❌ CRUD_DB Error:', error);
    res.status(500).json({ 
      error: 'Database error',
      message: error.message,
      success: false
    });
  }
});

// Export for Vercel serverless deployment
module.exports = app;