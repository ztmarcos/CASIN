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
    const tableList = [];
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      const structure = await getTableStructure(tableName);
      
      // Determine table type based on name
      let type = 'UNKNOWN';
      let isMainTable = false;
      let isSecondaryTable = false;
      
      if (tableName.includes('autos')) {
        type = 'AUTOS';
        isMainTable = true;
      } else if (tableName.includes('vida')) {
        type = 'VIDA';
        isMainTable = true;
      } else if (tableName.includes('gmm')) {
        type = 'GMM';
        isMainTable = true;
      } else if (tableName.includes('hogar')) {
        type = 'HOGAR';
        isMainTable = true;
      } else if (tableName.includes('directorio')) {
        type = 'DIRECTORIO';
        isMainTable = false;
      } else if (tableName.includes('listado')) {
        type = 'LISTADO';
        isSecondaryTable = true;
      }
      
      tableList.push({
        name: tableName,
        title: tableName.charAt(0).toUpperCase() + tableName.slice(1).replace(/_/g, ' '),
        type: type,
        isMainTable: isMainTable,
        isSecondaryTable: isSecondaryTable,
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