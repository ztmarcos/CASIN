const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const multer = require('multer');

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
    'GMAIL_USERNAME',
    'GMAIL_APP_PASSWORD',
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
  console.log('🔥 Attempting to initialize Firebase Admin...');
  console.log('- VITE_FIREBASE_PROJECT_ID:', !!process.env.VITE_FIREBASE_PROJECT_ID);
  console.log('- FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY);
  
  if (process.env.VITE_FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('🔥 Firebase credentials found, initializing...');
    admin = require('firebase-admin');
    
    // Try to create a proper service account object
    let serviceAccount;
    
    try {
      // First, try to use the private key as-is (assuming it's properly formatted)
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      
      // Validate that the private key looks like a proper PEM key
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
        throw new Error('Private key is not in proper PEM format');
      }
      
      serviceAccount = {
        type: "service_account",
        project_id: process.env.VITE_FIREBASE_PROJECT_ID,
        private_key: privateKey,
        client_email: `firebase-adminsdk-hnwk0@${process.env.VITE_FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
      };
      
      console.log('🔥 Service account created with PEM key, project_id:', serviceAccount.project_id);
      console.log('🔥 Client email:', serviceAccount.client_email);
      console.log('🔥 Private key format looks correct');
      
    } catch (keyError) {
      console.warn('⚠️  Private key format issue:', keyError.message);
      
      // Fallback: Try using environment variables without private key (this will fail but show better error)
      serviceAccount = {
        type: "service_account",
        project_id: process.env.VITE_FIREBASE_PROJECT_ID,
        client_email: `firebase-adminsdk-hnwk0@${process.env.VITE_FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
      };
      
      console.log('🔥 Attempting fallback without private key for debugging...');
    }

    if (!admin.apps.length) {
      console.log('🔥 No existing Firebase apps, creating new one...');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${process.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
      });
      console.log('🔥 Firebase app initialized successfully');
    } else {
      console.log('🔥 Firebase app already exists');
    }
    
    console.log('🔥 Getting Firestore instance...');
    db = admin.firestore();
    console.log('🔥 Firestore instance created');
    
    isFirebaseEnabled = true;
    console.log('✅ Firebase Admin initialized successfully');
  } else {
    console.log('⚠️  Firebase credentials not found - Firebase features disabled');
    console.log('- Missing VITE_FIREBASE_PROJECT_ID:', !process.env.VITE_FIREBASE_PROJECT_ID);
    console.log('- Missing FIREBASE_PRIVATE_KEY:', !process.env.FIREBASE_PRIVATE_KEY);
  }
} catch (error) {
  console.error('❌ Could not initialize Firebase Admin:', error.message);
  console.error('❌ Error code:', error.code || 'unknown');
  console.error('❌ Error info:', error.errorInfo || 'none');
  
  // If it's a private key issue, provide specific guidance
  if (error.message.includes('private key') || error.message.includes('PEM')) {
    console.error('💡 SOLUTION: The FIREBASE_PRIVATE_KEY must be a complete PEM format key');
    console.error('💡 It should start with "-----BEGIN PRIVATE KEY-----" and end with "-----END PRIVATE KEY-----"');
    console.error('💡 All newlines should be escaped as \\n when setting in Vercel environment variables');
  }
  
  isFirebaseEnabled = false;
  db = null;
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

// Configure multer for file uploads (store in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Middleware para servir archivos estáticos - Frontend build
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Initialize Notion client if credentials are available
let notion = null;
let isNotionEnabled = false;

// Initialize OpenAI client if credentials are available
let openai = null;
let isOpenAIEnabled = false;

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

// Initialize OpenAI
try {
  const openaiApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  
  if (openaiApiKey) {
    const { OpenAI } = require('openai');
    openai = new OpenAI({
      apiKey: openaiApiKey
    });
    isOpenAIEnabled = true;
    console.log('✅ OpenAI client initialized');
  } else {
    console.log('⚠️  OpenAI credentials not found - OpenAI features disabled');
  }
} catch (error) {
  console.warn('⚠️  Could not initialize OpenAI client:', error.message);
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
    // Use Firebase if available (production), fallback to MySQL (development)
    if (isFirebaseEnabled && db) {
      console.log(`🔥 Getting Firebase structure for collection: ${tableName}`);
      
      // Firebase collections predefined structure based on table types
      const firebaseTableStructures = {
        'autos': [
          { name: 'id', type: 'varchar(50)', nullable: false, key: 'PRI', default: null },
          { name: 'nombre_contratante', type: 'varchar(56)', nullable: true, key: '', default: null },
          { name: 'numero_poliza', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'aseguradora', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'vigencia_inicio', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'vigencia_fin', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'forma_de_pago', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'pago_total_o_prima_total', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'prima_neta', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'derecho_de_poliza', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'recargo_por_pago_fraccionado', type: 'decimal(10,2)', nullable: true, key: '', default: null },
          { name: 'i_v_a', type: 'decimal(10,2)', nullable: true, key: '', default: null },
          { name: 'e_mail', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'tipo_de_vehiculo', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'duracion', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'rfc', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'domicilio_o_direccion', type: 'varchar(200)', nullable: true, key: '', default: null },
          { name: 'descripcion_del_vehiculo', type: 'varchar(150)', nullable: true, key: '', default: null },
          { name: 'serie', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'modelo', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'placas', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'motor', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'uso', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'pdf', type: 'varchar(200)', nullable: true, key: '', default: null },
          { name: 'ramo', type: 'varchar(50)', nullable: true, key: '', default: null }
        ],
        'vida': [
          { name: 'id', type: 'varchar(50)', nullable: false, key: 'PRI', default: null },
          { name: 'contratante', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'numero_poliza', type: 'int', nullable: true, key: '', default: null },
          { name: 'aseguradora', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'forma_pago', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'importe_a_pagar_mxn', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'prima_neta_mxn', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'derecho_poliza', type: 'int', nullable: true, key: '', default: null },
          { name: 'recargo_pago_fraccionado', type: 'int', nullable: true, key: '', default: null },
          { name: 'iva', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'email', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'tipo_de_poliza', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'tipo_de_plan', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'rfc', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'direccion', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'telefono', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'fecha_expedicion', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'beneficiarios', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'edad_de_contratacion', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'tipo_de_riesgo', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'fumador', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'coberturas', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'pdf', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'responsable', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'cobrar_a', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'ramo', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'fecha_inicio', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'fecha_fin', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'estado_pago', type: 'varchar(255)', nullable: true, key: '', default: null }
        ],
        'gmm': [
          { name: 'id', type: 'varchar(50)', nullable: false, key: 'PRI', default: null },
          { name: 'contratante', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'numero_poliza', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'aseguradora', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'fecha_inicio', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'fecha_fin', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'forma_pago', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'importe_total', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'prima_neta', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'derecho_poliza', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'recargo_pago_fraccionado', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'iva_16', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'email', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'nombre_del_asegurado', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'rfc', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'direccion', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'telefono', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'codigo_cliente', type: 'int', nullable: true, key: '', default: null },
          { name: 'duracion', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'fecha_expedicion', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'fecha_nacimiento_asegurado', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'version', type: 'int', nullable: true, key: '', default: null },
          { name: 'renovacion', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'pdf', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'responsable', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'ramo', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'estado_pago', type: 'varchar(255)', nullable: true, key: '', default: null }
        ],
        'hogar': [
          { name: 'id', type: 'int', nullable: false, key: 'PRI', default: null },
          { name: 'numero_poliza', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'contratante', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'aseguradora', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'fecha_inicio', type: 'date', nullable: true, key: '', default: null },
          { name: 'fecha_fin', type: 'date', nullable: true, key: '', default: null },
          { name: 'forma_pago', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'importe_total_a_pagar', type: 'decimal(10,2)', nullable: true, key: '', default: null },
          { name: 'prima_neta', type: 'decimal(10,2)', nullable: true, key: '', default: null },
          { name: 'derecho_poliza', type: 'decimal(10,2)', nullable: true, key: '', default: null },
          { name: 'recargo_pago_fraccionado', type: 'decimal(10,2)', nullable: true, key: '', default: null },
          { name: 'iva_16', type: 'decimal(10,2)', nullable: true, key: '', default: null },
          { name: 'email', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'rfc', type: 'varchar(20)', nullable: true, key: '', default: null },
          { name: 'direccion', type: 'text', nullable: true, key: '', default: null },
          { name: 'telefono', type: 'varchar(20)', nullable: true, key: '', default: null },
          { name: 'duracion', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'version', type: 'varchar(10)', nullable: true, key: '', default: null },
          { name: 'renovacion', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'fecha_expedicion', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'pdf', type: 'text', nullable: true, key: '', default: null },
          { name: 'responsable', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'cobrar_a', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'ramo', type: 'varchar(50)', nullable: true, key: '', default: null },
          { name: 'created_at', type: 'timestamp', nullable: true, key: '', default: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'timestamp', nullable: true, key: '', default: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
        ],
        'directorio_contactos': [
          { name: 'id', type: 'varchar(50)', nullable: false, key: 'PRI', default: null },
          { name: 'origen', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'comentario', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'nombre_completo', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'nombre_completo_oficial', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'nickname', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'apellido', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'display_name', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'empresa', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'telefono_oficina', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'telefono_casa', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'telefono_asistente', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'telefono_movil', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'telefonos_corregidos', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'email', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'entidad', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'genero', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'status_social', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'ocupacion', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'pais', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'status', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'created_at', type: 'varchar(255)', nullable: true, key: '', default: null },
          { name: 'updated_at', type: 'varchar(255)', nullable: true, key: '', default: null }
        ]
      };
      
      // Get base structure and apply metadata modifications
      let baseStructure = [];
      
      if (firebaseTableStructures[tableName]) {
        console.log(`✅ Firebase structure found for ${tableName}: ${firebaseTableStructures[tableName].length} columns`);
        baseStructure = [...firebaseTableStructures[tableName]];
      } else {
        // Try to get from a sample document if not in predefined structures
        try {
          const collectionRef = db.collection(tableName);
          const snapshot = await collectionRef.limit(1).get();
          
          if (!snapshot.empty) {
            const sampleDoc = snapshot.docs[0].data();
            baseStructure = [
              { name: 'id', type: 'varchar(50)', nullable: false, key: 'PRI', default: null }
            ];
            
            Object.keys(sampleDoc).forEach(field => {
              const value = sampleDoc[field];
              let fieldType = 'varchar(255)';
              
              if (typeof value === 'number') {
                fieldType = Number.isInteger(value) ? 'int' : 'decimal(10,2)';
              } else if (value instanceof Date || (typeof value === 'object' && value && value.toDate)) {
                fieldType = 'timestamp';
              } else if (typeof value === 'boolean') {
                fieldType = 'boolean';
              }
              
              baseStructure.push({
                name: field,
                type: fieldType,
                nullable: true,
                key: '',
                default: null
              });
            });
          }
        } catch (dynamicError) {
          console.warn(`⚠️ Could not get dynamic Firebase structure for ${tableName}:`, dynamicError.message);
          return [];
        }
      }
      
      // Apply Firebase metadata modifications
      try {
        const metadataRef = db.collection('table_metadata').doc(tableName);
        const metadataDoc = await metadataRef.get();
        
        if (metadataDoc.exists) {
          const metadata = metadataDoc.data();
          console.log(`🔧 Applying metadata modifications for ${tableName}:`, {
            hiddenColumns: metadata.hiddenColumns?.length || 0,
            columnMappings: Object.keys(metadata.columnMappings || {}).length,
            customColumns: metadata.customColumns?.length || 0
          });
          
          // Filter out hidden columns
          if (metadata.hiddenColumns && metadata.hiddenColumns.length > 0) {
            baseStructure = baseStructure.filter(col => !metadata.hiddenColumns.includes(col.name));
            console.log(`🔧 Filtered out ${metadata.hiddenColumns.length} hidden columns`);
          }
          
          // Apply column name mappings
          if (metadata.columnMappings) {
            baseStructure = baseStructure.map(col => {
              const mappedName = metadata.columnMappings[col.name];
              if (mappedName) {
                console.log(`🔧 Mapping column ${col.name} -> ${mappedName}`);
                return { ...col, name: mappedName };
              }
              return col;
            });
          }
          
          // Add custom columns
          if (metadata.customColumns && metadata.customColumns.length > 0) {
            metadata.customColumns.forEach(customCol => {
              baseStructure.push({
                name: customCol.name,
                type: customCol.type || 'varchar(255)',
                nullable: true,
                key: '',
                default: null,
                isCustom: true
              });
            });
            console.log(`🔧 Added ${metadata.customColumns.length} custom columns`);
          }
        }
      } catch (metadataError) {
        console.warn(`⚠️ Could not apply metadata for ${tableName}:`, metadataError.message);
      }
      
             console.log(`✅ Final Firebase structure for ${tableName}: ${baseStructure.length} columns`);
       return baseStructure;
    }
    
    // Fallback to MySQL if Firebase not available
    console.log(`📋 Using MySQL for table structure: ${tableName}`);
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
        debug: {
          isVercel: !!process.env.VERCEL,
          isFirebaseEnabled: isFirebaseEnabled,
          hasDb: !!db,
          hasAdmin: !!admin,
          firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID ? 'configured' : 'missing',
          firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ? 'configured' : 'missing'
        },
        services: {
          notion: !!(process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY),
          openai: isOpenAIEnabled,
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

// Get all tables from Firebase (replacing MySQL version)
app.get('/api/data/tables', async (req, res) => {
  try {
    if (!isFirebaseEnabled || !db) {
      // Return a mock table structure that matches what the frontend expects
      const mockTables = [
        {
          name: 'contacts',
          title: 'Contactos',
          type: 'DIRECTORIO',
          isMainTable: true,
          isSecondaryTable: false,
          relatedTableName: null,
          relationshipType: null,
          columns: [
            { name: 'id', type: 'varchar(50)', nullable: false, key: 'PRI', default: null },
            { name: 'nombre', type: 'varchar(100)', nullable: true, key: '', default: null },
            { name: 'email', type: 'varchar(100)', nullable: true, key: '', default: null },
            { name: 'telefono', type: 'varchar(20)', nullable: true, key: '', default: null },
            { name: 'rfc', type: 'varchar(13)', nullable: true, key: '', default: null },
            { name: 'fecha_nacimiento', type: 'date', nullable: true, key: '', default: null },
            { name: 'created_at', type: 'timestamp', nullable: true, key: '', default: 'CURRENT_TIMESTAMP' }
          ]
        },
        {
          name: 'policies',
          title: 'Pólizas',
          type: 'AUTOS',
          isMainTable: true,
          isSecondaryTable: false,
          relatedTableName: 'contacts',
          relationshipType: 'one-to-many',
          columns: [
            { name: 'id', type: 'varchar(50)', nullable: false, key: 'PRI', default: null },
            { name: 'numero_poliza', type: 'varchar(50)', nullable: true, key: '', default: null },
            { name: 'contact_id', type: 'varchar(50)', nullable: true, key: 'MUL', default: null },
            { name: 'tipo', type: 'varchar(20)', nullable: true, key: '', default: null },
            { name: 'vigencia_inicio', type: 'date', nullable: true, key: '', default: null },
            { name: 'vigencia_fin', type: 'date', nullable: true, key: '', default: null },
            { name: 'prima', type: 'decimal(10,2)', nullable: true, key: '', default: null },
            { name: 'status', type: 'varchar(20)', nullable: true, key: '', default: 'activa' }
          ]
        }
      ];
      
      console.log('🔥 Returning mock table structure for Firebase');
      return res.json(mockTables);
    }

    // If Firebase is enabled, try to get collections
    try {
      const collections = await db.listCollections();
      const tableList = [];
      
      for (const collection of collections) {
        const collectionName = collection.id;
        
        // Determine type based on collection name
        let type = 'UNKNOWN';
        if (collectionName.includes('contact') || collectionName.includes('directorio')) {
          type = 'DIRECTORIO';
        } else if (collectionName.includes('auto') || collectionName.includes('poliza')) {
          type = 'AUTOS';
        } else if (collectionName.includes('vida')) {
          type = 'VIDA';
        } else if (collectionName.includes('gmm')) {
          type = 'GMM';
        } else if (collectionName.includes('hogar')) {
          type = 'HOGAR';
        }
        
        // Get sample document to understand structure
        const sampleDoc = await collection.limit(1).get();
        let columns = [
          { name: 'id', type: 'varchar(50)', nullable: false, key: 'PRI', default: null }
        ];
        
        if (!sampleDoc.empty) {
          const docData = sampleDoc.docs[0].data();
          Object.keys(docData).forEach(field => {
            const value = docData[field];
            let fieldType = 'varchar(255)';
            
            if (typeof value === 'number') {
              fieldType = Number.isInteger(value) ? 'int' : 'decimal(10,2)';
            } else if (value instanceof Date || (typeof value === 'object' && value && value.toDate)) {
              fieldType = 'timestamp';
            } else if (typeof value === 'boolean') {
              fieldType = 'boolean';
            }
            
            columns.push({
              name: field,
              type: fieldType,
              nullable: true,
              key: '',
              default: null
            });
          });
        }
        
        tableList.push({
          name: collectionName,
          title: collectionName.charAt(0).toUpperCase() + collectionName.slice(1).replace(/_/g, ' '),
          type: type,
          isMainTable: true,
          isSecondaryTable: false,
          relatedTableName: null,
          relationshipType: null,
          columns: columns
        });
      }
      
      console.log(`🔥 Firebase collections found: ${tableList.length}`);
      res.json(tableList);
      
    } catch (firebaseError) {
      console.error('Firebase collections error:', firebaseError);
      // Fallback to mock data if Firebase fails
      const mockTables = [
        {
          name: 'contacts',
          title: 'Contactos',
          type: 'DIRECTORIO',
          isMainTable: true,
          isSecondaryTable: false,
          relatedTableName: null,
          relationshipType: null,
          columns: [
            { name: 'id', type: 'varchar(50)', nullable: false, key: 'PRI', default: null },
            { name: 'nombre', type: 'varchar(100)', nullable: true, key: '', default: null },
            { name: 'email', type: 'varchar(100)', nullable: true, key: '', default: null },
            { name: 'telefono', type: 'varchar(20)', nullable: true, key: '', default: null }
          ]
        }
      ];
      res.json(mockTables);
    }
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get table types
app.get('/api/data/table-types', async (req, res) => {
  try {
    console.log('📊 Getting table types...');
    
    // Use Firebase if available (production), fallback to MySQL (development)
    if (isFirebaseEnabled && db) {
      console.log('📋 Using Firebase for table types');
      
      // Firebase collections are predefined
      const firebaseTableTypes = {
        'autos': {
          type: 'AUTOS',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: ['nombre_contratante', 'numero_poliza', 'aseguradora', 'vigencia_inicio', 'vigencia_fin', 'forma_pago', 'pago_total_o_prima_total', 'prima_neta', 'derecho_de_poliza', 'recargo_por_pago_fraccionado', 'i_v_a', 'e_mail', 'tipo_de_vehiculo', 'duracion', 'rfc', 'domicilio_o_direccion', 'descripcion_del_vehiculo', 'serie', 'modelo', 'placas', 'motor', 'uso', 'pago_parcial', 'pdf', 'ramo']
        },
        'vida': {
          type: 'VIDA',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_a_pagar_mxn', 'prima_neta_mxn', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva', 'email', 'tipo_de_poliza', 'tipo_de_plan', 'rfc', 'direccion', 'telefono', 'fecha_expedicion', 'beneficiarios', 'edad_de_contratacion', 'tipo_de_riesgo', 'fumador', 'coberturas', 'pdf', 'responsable', 'cobrar_a', 'ramo']
        },
        'gmm': {
          type: 'GMM',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'nombre_del_asegurado', 'rfc', 'direccion', 'telefono', 'codigo_cliente', 'duracion', 'fecha_expedicion', 'fecha_nacimiento_asegurado', 'version', 'renovacion', 'pdf', 'responsable', 'ramo']
        },
        'rc': {
          type: 'simple',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: ['asegurado', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'derecho_poliza', 'prima_neta', 'recargo_pago_fraccionado', 'iva', 'email', 'limite_maximo_responsabilidad', 'responsable', 'ramo']
        },
        'transporte': {
          type: 'simple',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'rfc', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'descripcion_del_movimiento', 'version_renovacion', 'ubicacion', 'duracion', 'direccion', 'pagos_fraccionados', 'monto_parcial', 'no_de_pago', 'telefono', 'tipo_de_poliza', 'giro_del_negocio_asegurado', 'esquema_de_contratacion', 'medio_de_transporte', 'territorialidad', 'origen', 'destino', 'valor_del_embarque', 'mercancia', 'tipo_de_empaque', 'valor_mercancia', 'responsable', 'cobrar_a', 'ramo']
        },
        'mascotas': {
          type: 'simple',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'rfc', 'nombre_asegurado', 'nombre_de_mascota', 'direccion', 'telefono', 'codigo_cliente', 'duracion', 'fecha_expedicion', 'version', 'renovacion', 'tipo_de_mascota', 'raza', 'edad', 'categoria_de_mascota', 'sexo', 'responsable', 'cobrar_a', 'pdf', 'ramo']
        },
        'diversos': {
          type: 'simple',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'rfc', 'direccion', 'telefono', 'codigo_cliente', 'version', 'duracion', 'moneda', 'fecha_expedicion', 'renovacion', 'responsable', 'cobrar_a', 'ramo']
        },
        'negocio': {
          type: 'simple',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'rfc', 'direccion_del_contratante', 'version', 'ubicaciones', 'moneda', 'responsable', 'cobrar_a', 'ramo']
        },
        'hogar': {
          type: 'HOGAR',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total_a_pagar', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'rfc', 'direccion', 'telefono', 'duracion', 'version', 'renovacion', 'fecha_expedicion', 'pdf', 'responsable', 'cobrar_a', 'ramo', 'created_at', 'updated_at']
        },
        'gruposgmm': {
          type: 'simple',
          isGroup: false,
          childTable: null,
          isMainTable: true,
          isSecondaryTable: false,
          fields: []
        },
        'directorio_contactos': {
          type: 'DIRECTORIO',
          isGroup: false,
          childTable: null,
          isMainTable: false,
          isSecondaryTable: false,
          fields: ['origen', 'comentario', 'nombre_completo', 'nombre_completo_oficial', 'nickname', 'apellido', 'display_name', 'empresa', 'telefono_oficina', 'telefono_casa', 'telefono_asistente', 'telefono_movil', 'telefonos_corregidos', 'email', 'entidad', 'genero', 'status_social', 'ocupacion', 'pais', 'status', 'created_at', 'updated_at']
        }
      };
      
      console.log('✅ Firebase table types retrieved');
      res.json(firebaseTableTypes);
      return;
    }
    
    // Fallback to MySQL if Firebase not available
    console.log('📋 Using MySQL for table types (Firebase not available)');
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

// Add query optimization for Firebase quotas
const BATCH_SIZE = 100; // Smaller batches to reduce quota usage
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Simple in-memory cache
const dataCache = new Map();

app.get('/api/data/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { team } = req.query; // Obtener parámetro de equipo
    const limit = parseInt(req.query.limit) || 1000; // Default limit
    
    // Determinar el nombre de colección correcto basado en el equipo
    let actualCollectionName = tableName;
    if (team && team !== 'CASIN' && team !== 'ngXzjqxlBy8Bsv8ks3vc') {
      // Para equipos que no sean CASIN, usar el patrón team_{teamId}_{collectionName}
      actualCollectionName = `team_${team}_${tableName}`;
      console.log(`🏢 Using team collection: ${actualCollectionName} for team: ${team}`);
    } else {
      console.log(`🎯 Using original collection: ${tableName} for CASIN or default`);
    }
    
    // Check cache first (unless nocache parameter is set)
    const cacheKey = `${actualCollectionName}_${limit}`;
    const cached = dataCache.get(cacheKey);
    const skipCache = req.query.nocache === 'true';
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION && !skipCache) {
      console.log(`📋 Returning cached data for ${actualCollectionName}`);
      return res.json(cached.data);
    }
    
    if (skipCache) {
      console.log(`🚫 Skipping cache for ${actualCollectionName} (nocache=true)`);
    }

    console.log(`🔍 Fetching ${actualCollectionName} data from Firebase (limit: ${limit})`);
    
    if (!admin.firestore) {
      throw new Error('Firebase not initialized');
    }

    // Use smaller batches and pagination to reduce quota usage
    const batchSize = Math.min(limit, BATCH_SIZE);
    let query = admin.firestore().collection(actualCollectionName).limit(batchSize);
    
    const snapshot = await query.get();
    const data = [];
    
    snapshot.forEach((doc) => {
      const docData = doc.data();
      console.log(`🔍 Firebase doc ID: ${doc.id}, contains id field: ${docData.id || 'none'}`);
      
      // Special filtering for emant_caratula - only show CSV data and exclude status column
      if (tableName === 'emant_caratula' || actualCollectionName.includes('emant_caratula')) {
        // Only include records that match the CSV: "Emant Consultores S.c." with policy "17 559558"
        if (docData.contratante === 'Emant Consultores S.c.' && docData.numero_poliza === '17 559558') {
          console.log(`   ✅ Including CSV record: ${docData.contratante}`);
          
          // Remove status field from carátula (only listado should have it)
          const { status, ...caratulaData } = docData;
          
          data.push({
            id: doc.id,
            firebase_doc_id: doc.id,
            ...caratulaData,
            id: doc.id
          });
        } else {
          console.log(`   🚫 Filtering out non-CSV record: ${docData.contratante || docData.nombre_grupo || 'Unknown'}`);
        }
      } else {
        // Normal processing for other tables
        data.push({
          id: doc.id,  // Always use Firebase document ID
          firebase_doc_id: doc.id,  // Backup reference
          ...docData,
          // Remove any numeric id field from the document data to avoid conflicts
          id: doc.id  // Ensure Firebase doc ID is not overwritten
        });
      }
    });

    // Get estimated total from cache or use known counts
    const estimatedTotals = {
      'autos': 33,
      'vida': 2,
      'gmm': 53,
      'hogar': 51,  // Agregar conteo correcto para hogar
      'rc': 1,
      'transporte': 0,
      'mascotas': 1,
      'diversos': 1,
      'negocio': 4,
      'gruposgmm': 0,
      'directorio_contactos': 2700
    };

    // Para equipos específicos, usar los conteos reales si están disponibles
    let totalCount = estimatedTotals[tableName] || data.length;
    
    // Si es un equipo específico (team_casa), usar el conteo real de los datos obtenidos
    if (team && team !== 'CASIN' && team !== 'ngXzjqxlBy8Bsv8ks3vc') {
      totalCount = data.length; // Usar conteo real para equipos custom
      console.log(`📊 Using actual count for team ${team}: ${totalCount}`);
    }

    const result = {
      data,
      total: totalCount,
      cached: false,
      team: team || 'CASIN',
      collection: actualCollectionName
    };

    // Cache the result
    dataCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    console.log(`✅ Successfully fetched ${data.length} records from ${actualCollectionName} (total: ${result.total}) for team: ${team || 'CASIN'}`);
    res.json(result);

  } catch (error) {
    console.error(`Firebase get data error:`, error);
    
    // If quota exceeded, return minimal response
    if (error.code === 8 || error.message.includes('Quota exceeded')) {
      console.log(`⚠️ Firebase quota exceeded for ${req.params.tableName}`);
      res.json({ 
        data: [], 
        total: 0, 
        error: 'Firebase quota exceeded. Please enable billing or wait for quota reset at midnight PT.' 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to fetch data', 
        details: error.message 
      });
    }
  }
});

// Add dedicated count endpoint
app.get('/api/count/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { team } = req.query;
    
    // Determinar el nombre de colección correcto basado en el equipo
    let actualCollectionName = tableName;
    if (team && team !== 'CASIN' && team !== 'ngXzjqxlBy8Bsv8ks3vc') {
      actualCollectionName = `team_${team}_${tableName}`;
    }
    
    console.log(`🔢 Getting count for ${actualCollectionName} (team: ${team || 'CASIN'})`);
    
    // Use estimated counts to avoid Firebase quota usage for CASIN
    const estimatedTotals = {
      'autos': 33,
      'vida': 2, 
      'gmm': 53,
      'hogar': 51,  // Agregar conteo correcto para hogar
      'rc': 1,
      'transporte': 0,
      'mascotas': 1,
      'diversos': 1,
      'negocio': 4,
      'gruposgmm': 0,
      'directorio_contactos': 2700
    };
    
    let count = 0;
    
    // Para equipos custom, obtener conteo real de Firebase
    if (team && team !== 'CASIN' && team !== 'ngXzjqxlBy8Bsv8ks3vc') {
      try {
        const snapshot = await admin.firestore().collection(actualCollectionName).limit(1).get();
        if (!snapshot.empty) {
          // Si tiene datos, hacer una consulta más completa para obtener el conteo
          const fullSnapshot = await admin.firestore().collection(actualCollectionName).get();
          count = fullSnapshot.size;
        }
        console.log(`📊 Real count for team ${team}: ${count}`);
      } catch (error) {
        console.warn(`⚠️ Could not get real count for ${actualCollectionName}:`, error.message);
        count = 0;
      }
    } else {
      // Para CASIN, usar conteos estimados
      count = estimatedTotals[tableName] || 0;
    }
    
    res.json({
      table: tableName,
      actualCollection: actualCollectionName,
      count: count,
      team: team || 'CASIN'
    });
    
  } catch (error) {
    console.error(`Error getting count for ${tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Add consolidated policies count endpoint (after the existing count endpoint)
app.get('/api/policies/count', async (req, res) => {
  try {
    console.log('📊 Getting consolidated policies count');
    
    // Use estimated counts to avoid Firebase quota usage
    const policyTotals = {
      'autos': 33,
      'vida': 2,
      'gmm': 53,
      'rc': 1,
      'transporte': 0,
      'mascotas': 1,
      'diversos': 1,
      'negocio': 4,
      'gruposgmm': 0
    };
    
    const total = Object.values(policyTotals).reduce((sum, count) => sum + count, 0);
    
    res.json({
      total: total,
      breakdown: policyTotals,
      excluding: 'directorio_contactos'
    });
    
  } catch (error) {
    console.error('Error getting policies count:', error);
    res.status(500).json({ error: error.message });
  }
});

// Insert data into Firebase collection
app.post('/api/data/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = req.body;
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Valid data object is required' });
    }
    
    console.log(`➕ Adding new Firebase document to collection ${tableName}`);
    
    // Add timestamp to data
    const documentData = {
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Add document to Firebase collection
    const docRef = await admin.firestore().collection(tableName).add(documentData);
    
    console.log(`✅ Successfully created Firebase document with ID: ${docRef.id}`);
    
    // Invalidate cache for this table
    const cacheKeysToDelete = [];
    for (const key of dataCache.keys()) {
      if (key.startsWith(`${tableName}_`)) {
        cacheKeysToDelete.push(key);
      }
    }
    cacheKeysToDelete.forEach(key => dataCache.delete(key));
    console.log(`🗑️ Invalidated ${cacheKeysToDelete.length} cache entries for ${tableName} after INSERT`);
    
    res.json({
      success: true,
      message: `Firebase document inserted into ${tableName}`,
      id: docRef.id,
      data: documentData
    });
  } catch (error) {
    console.error(`Error inserting data into ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete record from Firebase collection
app.delete('/api/data/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Valid record ID is required' });
    }
    
    console.log(`🗑️ Deleting Firebase document ${id} from collection ${tableName}`);
    
    if (!admin.firestore) {
      throw new Error('Firebase not initialized');
    }

    // Delete from Firebase
    await admin.firestore().collection(tableName).doc(id).delete();
    
    console.log(`✅ Successfully deleted Firebase document ${id} from ${tableName}`);
    
    // Invalidate cache for this table
    const cacheKeysToDelete = [];
    for (const key of dataCache.keys()) {
      if (key.startsWith(`${tableName}_`)) {
        cacheKeysToDelete.push(key);
      }
    }
    cacheKeysToDelete.forEach(key => dataCache.delete(key));
    console.log(`🗑️ Invalidated ${cacheKeysToDelete.length} cache entries for ${tableName}`);
    
    res.json({
      success: true,
      message: `Firebase document ${id} deleted from ${tableName}`,
      deletedId: id
    });
  } catch (error) {
    console.error(`Error deleting Firebase document from ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Update record in table or Firebase collection
app.put('/api/data/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const data = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Valid record ID is required' });
    }
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Valid data object is required' });
    }
    
    // Use Firebase if available (production), fallback to MySQL (development)
    if (isFirebaseEnabled && db) {
      console.log(`🔥 Updating Firebase document ${id} in collection ${tableName}`);
      
      try {
        // Use the existing Firebase Admin SDK connection
        const docRef = db.collection(tableName).doc(id);
        
        // Check if document exists
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          return res.status(404).json({ error: `Document with ID ${id} not found in ${tableName}` });
        }
        
        // Update the document with timestamp using Admin SDK FieldValue
        const updateData = {
          ...data,
          updatedAt: require('firebase-admin').firestore.FieldValue.serverTimestamp()
        };
        
        await docRef.update(updateData);
        
        console.log(`✅ Successfully updated Firebase document ${id} in ${tableName}`);
        
        // Invalidate cache for this table
        const cacheKeysToDelete = [];
        for (const key of dataCache.keys()) {
          if (key.startsWith(`${tableName}_`)) {
            cacheKeysToDelete.push(key);
          }
        }
        cacheKeysToDelete.forEach(key => dataCache.delete(key));
        console.log(`🗑️ Invalidated ${cacheKeysToDelete.length} cache entries for ${tableName} after UPDATE`);
        
        res.json({
          success: true,
          message: `Firebase document ${id} updated in ${tableName}`,
          updatedId: id,
          data: updateData
        });
        return;
        
      } catch (firebaseError) {
        console.error('❌ Error updating document in Firebase:', firebaseError);
        return res.status(500).json({ 
          error: 'Failed to update document in Firebase',
          details: firebaseError.message
        });
      }
    }
    
    // Fallback: MySQL update (for development)
    console.log(`📁 MySQL update for table: ${tableName}, id: ${id}`);
    
    try {
      // Build the UPDATE SQL query dynamically
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      if (columns.length === 0) {
        return res.status(400).json({ error: 'No data provided for update' });
      }
      
      const setClause = columns.map(col => `\`${col}\` = ?`).join(', ');
      const query = `UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?`;
      
      const result = await executeQuery(query, [...values, id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: `Record with ID ${id} not found in ${tableName}` });
      }
      
      console.log(`✅ Successfully updated MySQL record ${id} in ${tableName}`);
      
      res.json({
        success: true,
        message: `MySQL record ${id} updated in ${tableName}`,
        updatedId: id,
        storage: 'mysql'
      });
      
         } catch (mysqlError) {
       console.error('❌ Error updating record in MySQL:', mysqlError);
       res.status(500).json({ 
         error: 'Failed to update record in MySQL',
         details: mysqlError.message
       });
     }
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

// Update column order for a table
app.put('/api/tables/:tableName/columns/order', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { columnOrder } = req.body;
    
    console.log(`🔄 Updating column order for table ${tableName}:`, columnOrder);
    
    if (!columnOrder || !Array.isArray(columnOrder)) {
      return res.status(400).json({ 
        error: 'Missing or invalid columnOrder array' 
      });
    }
    
    // Use Firebase if available (production), fallback to file system (development)
    if (isFirebaseEnabled && db) {
      console.log(`🔥 Saving column order to Firebase for table: ${tableName}`);
      
      try {
        // Save to Firebase in a special metadata collection using Admin SDK
        const metadataRef = db.collection('table_metadata').doc(tableName);
        await metadataRef.set({
          columnOrder: columnOrder,
          tableName: tableName,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log(`✅ Column order saved to Firebase for table ${tableName}`);
        
        res.json({
          success: true,
          message: `Column order updated for table ${tableName}`,
          columnOrder: columnOrder,
          storage: 'firebase'
        });
        return;
        
      } catch (firebaseError) {
        console.error('❌ Error saving to Firebase, falling back to file system:', firebaseError);
        // Fall through to file system backup
      }
    }
    
    // Fallback: Store in a JSON file (for development/local)
    console.log(`📁 Saving column order to file system for table: ${tableName}`);
    const fs = require('fs');
    const path = require('path');
    const ordersFile = path.join(__dirname, 'column-orders.json');
    
    let orders = {};
    try {
      if (fs.existsSync(ordersFile)) {
        orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not read existing column orders:', error.message);
    }
    
    orders[tableName] = columnOrder;
    
    try {
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
      console.log(`✅ Column order saved to file system for table ${tableName}`);
    } catch (error) {
      console.error('Error saving column order to file:', error);
      return res.status(500).json({ 
        error: 'Failed to save column order' 
      });
    }
    
    res.json({
      success: true,
      message: `Column order updated for table ${tableName}`,
      columnOrder: columnOrder,
      storage: 'filesystem'
    });
    
  } catch (error) {
    console.error(`Error updating column order for ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get column order for a table
app.get('/api/tables/:tableName/columns/order', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Use Firebase if available (production), fallback to file system (development)
    if (isFirebaseEnabled && db) {
      console.log(`🔥 Loading column order from Firebase for table: ${tableName}`);
      
      try {
        // Load from Firebase metadata collection using Admin SDK
        const metadataRef = db.collection('table_metadata').doc(tableName);
        const metadataDoc = await metadataRef.get();
        
        if (metadataDoc.exists) {
          const data = metadataDoc.data();
          const columnOrder = data.columnOrder || null;
          
          console.log(`✅ Column order loaded from Firebase for table ${tableName}:`, columnOrder);
          
          res.json({
            success: true,
            tableName: tableName,
            columnOrder: columnOrder,
            storage: 'firebase'
          });
          return;
        } else {
          console.log(`ℹ️ No column order found in Firebase for table ${tableName}`);
          res.json({
            success: true,
            tableName: tableName,
            columnOrder: null,
            storage: 'firebase'
          });
          return;
        }
        
      } catch (firebaseError) {
        console.error('❌ Error loading from Firebase, falling back to file system:', firebaseError);
        // Fall through to file system backup
      }
    }
    
    // Fallback: Load from JSON file (for development/local)
    console.log(`📁 Loading column order from file system for table: ${tableName}`);
    const fs = require('fs');
    const path = require('path');
    const ordersFile = path.join(__dirname, 'column-orders.json');
    
    let orders = {};
    try {
      if (fs.existsSync(ordersFile)) {
        orders = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not read column orders from file:', error.message);
    }
    
    const columnOrder = orders[tableName] || null;
    
    console.log(`✅ Column order loaded from file system for table ${tableName}:`, columnOrder);
    
    res.json({
      success: true,
      tableName: tableName,
      columnOrder: columnOrder,
      storage: 'filesystem'
    });
    
  } catch (error) {
    console.error(`Error getting column order for ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete column from a table
app.delete('/api/tables/:tableName/columns/:columnName', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    
    console.log(`🗑️ Deleting column ${columnName} from table ${tableName}`);
    
    // Use Firebase if available (production), fallback to MySQL (development)
    if (isFirebaseEnabled && db) {
      console.log(`🔥 Firebase column deletion for table: ${tableName}, column: ${columnName}`);
      
      try {
        // For Firebase, we can't actually delete columns from documents
        // Instead, we'll store metadata about hidden columns
        const metadataRef = db.collection('table_metadata').doc(tableName);
        const metadataDoc = await metadataRef.get();
        
        let metadata = {};
        if (metadataDoc.exists) {
          metadata = metadataDoc.data();
        }
        
        // Add column to hidden list
        const hiddenColumns = metadata.hiddenColumns || [];
        if (!hiddenColumns.includes(columnName)) {
          hiddenColumns.push(columnName);
        }
        
        await metadataRef.set({
          ...metadata,
          hiddenColumns: hiddenColumns,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log(`✅ Column ${columnName} marked as hidden in Firebase metadata`);
        
        res.json({
          success: true,
          message: `Column ${columnName} deleted from table ${tableName}`,
          storage: 'firebase'
        });
        return;
        
      } catch (firebaseError) {
        console.error('❌ Error deleting column in Firebase:', firebaseError);
        return res.status(500).json({ 
          error: 'Failed to delete column in Firebase',
          details: firebaseError.message
        });
      }
    }
    
    // Fallback: MySQL column deletion (for development)
    console.log(`📁 MySQL column deletion for table: ${tableName}, column: ${columnName}`);
    
    try {
      await executeQuery(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
      console.log(`✅ Column ${columnName} deleted from MySQL table ${tableName}`);
      
      res.json({
        success: true,
        message: `Column ${columnName} deleted from table ${tableName}`,
        storage: 'mysql'
      });
      
    } catch (mysqlError) {
      console.error('❌ Error deleting column in MySQL:', mysqlError);
      res.status(500).json({ 
        error: 'Failed to delete column in MySQL',
        details: mysqlError.message
      });
    }
    
  } catch (error) {
    console.error(`Error deleting column ${req.params.columnName} from ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Rename column in a table
app.patch('/api/data/tables/:tableName/columns/:columnName/rename', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    const { newName } = req.body;
    
    if (!newName || !newName.trim()) {
      return res.status(400).json({ 
        error: 'Missing or invalid newName' 
      });
    }
    
    console.log(`✏️ Renaming column ${columnName} to ${newName} in table ${tableName}`);
    
    // Use Firebase if available (production), fallback to MySQL (development)
    if (isFirebaseEnabled && db) {
      console.log(`🔥 Firebase column rename for table: ${tableName}`);
      
      try {
        // For Firebase, store column mappings in metadata
        const metadataRef = db.collection('table_metadata').doc(tableName);
        const metadataDoc = await metadataRef.get();
        
        let metadata = {};
        if (metadataDoc.exists) {
          metadata = metadataDoc.data();
        }
        
        // Add to column mappings
        const columnMappings = metadata.columnMappings || {};
        columnMappings[columnName] = newName.trim();
        
        await metadataRef.set({
          ...metadata,
          columnMappings: columnMappings,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log(`✅ Column mapping ${columnName} -> ${newName} saved in Firebase metadata`);
        
        res.json({
          success: true,
          message: `Column ${columnName} renamed to ${newName} in table ${tableName}`,
          storage: 'firebase'
        });
        return;
        
      } catch (firebaseError) {
        console.error('❌ Error renaming column in Firebase:', firebaseError);
        return res.status(500).json({ 
          error: 'Failed to rename column in Firebase',
          details: firebaseError.message
        });
      }
    }
    
    // Fallback: MySQL column rename (for development)
    console.log(`📁 MySQL column rename for table: ${tableName}`);
    
    try {
      // Get current column definition
      const columns = await executeQuery(`DESCRIBE \`${tableName}\``);
      const currentColumn = columns.find(col => col.Field === columnName);
      
      if (!currentColumn) {
        return res.status(404).json({ 
          error: `Column ${columnName} not found in table ${tableName}` 
        });
      }
      
      // Rename column in MySQL
      await executeQuery(
        `ALTER TABLE \`${tableName}\` CHANGE \`${columnName}\` \`${newName.trim()}\` ${currentColumn.Type}`
      );
      
      console.log(`✅ Column ${columnName} renamed to ${newName} in MySQL table ${tableName}`);
      
      res.json({
        success: true,
        message: `Column ${columnName} renamed to ${newName} in table ${tableName}`,
        storage: 'mysql'
      });
      
    } catch (mysqlError) {
      console.error('❌ Error renaming column in MySQL:', mysqlError);
      res.status(500).json({ 
        error: 'Failed to rename column in MySQL',
        details: mysqlError.message
      });
    }
    
  } catch (error) {
    console.error(`Error renaming column ${req.params.columnName} in ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Add column to a table
app.post('/api/tables/:tableName/columns/add', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { name, type } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Missing or invalid column name' 
      });
    }
    
    const columnType = type || 'TEXT';
    console.log(`➕ Adding column ${name} (${columnType}) to table ${tableName}`);
    
    // Use Firebase if available (production), fallback to MySQL (development)
    if (isFirebaseEnabled && db) {
      console.log(`🔥 Firebase column addition for table: ${tableName}`);
      
      try {
        // For Firebase, store new column definition in metadata
        const metadataRef = db.collection('table_metadata').doc(tableName);
        const metadataDoc = await metadataRef.get();
        
        let metadata = {};
        if (metadataDoc.exists) {
          metadata = metadataDoc.data();
        }
        
        // Add to custom columns
        const customColumns = metadata.customColumns || [];
        const newColumn = {
          name: name.trim(),
          type: columnType,
          addedAt: new Date().toISOString()
        };
        
        // Check if column already exists
        if (customColumns.some(col => col.name === name.trim())) {
          return res.status(400).json({ 
            error: `Column ${name} already exists in table ${tableName}` 
          });
        }
        
        customColumns.push(newColumn);
        
        await metadataRef.set({
          ...metadata,
          customColumns: customColumns,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log(`✅ Column ${name} added to Firebase metadata`);
        
        res.json({
          success: true,
          message: `Column ${name} added to table ${tableName}`,
          column: newColumn,
          storage: 'firebase'
        });
        return;
        
      } catch (firebaseError) {
        console.error('❌ Error adding column in Firebase:', firebaseError);
        return res.status(500).json({ 
          error: 'Failed to add column in Firebase',
          details: firebaseError.message
        });
      }
    }
    
    // Fallback: MySQL column addition (for development)
    console.log(`📁 MySQL column addition for table: ${tableName}`);
    
    try {
      // Map frontend types to MySQL types
      const mysqlType = {
        'TEXT': 'VARCHAR(255)',
        'INT': 'INT',
        'INTEGER': 'INT',
        'DECIMAL': 'DECIMAL(10,2)',
        'DATE': 'DATE',
        'BOOLEAN': 'BOOLEAN'
      }[columnType.toUpperCase()] || 'VARCHAR(255)';
      
      await executeQuery(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${name.trim()}\` ${mysqlType}`);
      console.log(`✅ Column ${name} added to MySQL table ${tableName}`);
      
      res.json({
        success: true,
        message: `Column ${name} added to table ${tableName}`,
        storage: 'mysql'
      });
      
    } catch (mysqlError) {
      console.error('❌ Error adding column in MySQL:', mysqlError);
      res.status(500).json({ 
        error: 'Failed to add column in MySQL',
        details: mysqlError.message
      });
    }
    
  } catch (error) {
    console.error(`Error adding column to ${req.params.tableName}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Set column tag
app.put('/api/tables/:tableName/columns/:columnName/tag', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    const { tag } = req.body;
    
    console.log(`🏷️ Setting tag for column ${columnName} in table ${tableName}: ${tag}`);
    
    // Use Firebase if available (production), fallback to file system (development)
    if (isFirebaseEnabled && db) {
      console.log(`🔥 Firebase column tag for table: ${tableName}`);
      
      try {
        const metadataRef = db.collection('table_metadata').doc(tableName);
        const metadataDoc = await metadataRef.get();
        
        let metadata = {};
        if (metadataDoc.exists) {
          metadata = metadataDoc.data();
        }
        
        // Add to column tags
        const columnTags = metadata.columnTags || {};
        columnTags[columnName] = tag;
        
        await metadataRef.set({
          ...metadata,
          columnTags: columnTags,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log(`✅ Column tag saved in Firebase metadata`);
        
        res.json({
          success: true,
          message: `Tag set for column ${columnName} in table ${tableName}`,
          storage: 'firebase'
        });
        return;
        
      } catch (firebaseError) {
        console.error('❌ Error setting column tag in Firebase:', firebaseError);
        return res.status(500).json({ 
          error: 'Failed to set column tag in Firebase',
          details: firebaseError.message
        });
      }
    }
    
    // Fallback: Store in JSON file (for development)
    console.log(`📁 File system column tag for table: ${tableName}`);
    
    try {
      const fs = require('fs');
      const path = require('path');
      const tagsFile = path.join(__dirname, 'column-tags.json');
      
      let tags = {};
      try {
        if (fs.existsSync(tagsFile)) {
          tags = JSON.parse(fs.readFileSync(tagsFile, 'utf8'));
        }
      } catch (error) {
        console.warn('Could not read existing column tags:', error.message);
      }
      
      if (!tags[tableName]) {
        tags[tableName] = {};
      }
      tags[tableName][columnName] = tag;
      
      fs.writeFileSync(tagsFile, JSON.stringify(tags, null, 2));
      console.log(`✅ Column tag saved to file system`);
      
      res.json({
        success: true,
        message: `Tag set for column ${columnName} in table ${tableName}`,
        storage: 'filesystem'
      });
      
    } catch (fileError) {
      console.error('❌ Error setting column tag in file system:', fileError);
      res.status(500).json({ 
        error: 'Failed to set column tag',
        details: fileError.message
      });
    }
    
  } catch (error) {
    console.error(`Error setting tag for column ${req.params.columnName} in ${req.params.tableName}:`, error);
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

// Directorio endpoints (Firebase in production, MySQL fallback)
app.get('/api/directorio', async (req, res) => {
  try {
    console.log('🔍 Directorio endpoint called');
    console.log('- process.env.VERCEL:', !!process.env.VERCEL);
    console.log('- isFirebaseEnabled:', isFirebaseEnabled);
    console.log('- db available:', !!db);
    console.log('- admin available:', !!admin);
    
    // Use Firebase for directorio if available (both production and development)
    if (isFirebaseEnabled && db) {
      console.log('📋 Using Firebase for directorio (Firebase enabled)');
      
      const { 
        page = 1, 
        limit = 50, 
        search, 
        status, 
        origen, 
        genero 
      } = req.query;
      
      // Validate and sanitize pagination parameters
      const pageInt = Math.max(1, parseInt(page) || 1);
      const limitInt = Math.min(100, Math.max(1, parseInt(limit) || 50));
      
      console.log(`📋 Firebase pagination: page=${pageInt}, limit=${limitInt}`);
      
      // Get all documents from Firebase
      const snapshot = await db.collection('directorio_contactos').get();
      let allContactos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📋 Firebase: Retrieved ${allContactos.length} total contactos from database`);
      
      // Apply search filter
      if (search && search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        allContactos = allContactos.filter(contacto => {
          const searchableFields = [
            contacto.nombre_completo,
            contacto.email,
            contacto.telefono_movil,
            contacto.telefono_oficina,
            contacto.telefono_casa,
            contacto.empresa,
            contacto.nickname,
            contacto.apellido
          ];
          
          return searchableFields.some(field => 
            field && field.toString().toLowerCase().includes(searchTerm)
          );
        });
      }
      
      // Apply status filter
      if (status && status.trim()) {
        allContactos = allContactos.filter(c => c.status === status.trim());
      }
      
      // Apply origen filter
      if (origen && origen.trim()) {
        allContactos = allContactos.filter(c => c.origen === origen.trim());
      }
      
      // Apply genero filter
      if (genero && genero.trim()) {
        allContactos = allContactos.filter(c => c.genero === genero.trim());
      }
      
      // Sort alphabetically by nombre_completo
      allContactos.sort((a, b) => {
        const nameA = (a.nombre_completo || '').toLowerCase();
        const nameB = (b.nombre_completo || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      // Apply pagination
      const startIndex = (pageInt - 1) * limitInt;
      const endIndex = startIndex + limitInt;
      const paginatedData = allContactos.slice(startIndex, endIndex);
      
      console.log(`✅ Firebase: Found ${allContactos.length} total contactos, returning ${paginatedData.length} for page ${pageInt}`);
      console.log(`📋 Firebase pagination details: startIndex=${startIndex}, endIndex=${endIndex}, totalPages=${Math.ceil(allContactos.length / limitInt)}`);
      
      return res.json({
        data: paginatedData,
        total: allContactos.length,
        page: pageInt,
        limit: limitInt,
        totalPages: Math.ceil(allContactos.length / limitInt),
        source: 'Firebase'
      });
    }
    
    // Fallback to MySQL if Firebase is not available
    console.log('📋 Using MySQL for directorio (Firebase not available)');
    console.log('- Reason: Firebase=' + isFirebaseEnabled + ', DB=' + !!db);
    
    const { 
      page = 1, 
      limit = 50, 
      search, 
      status, 
      origen, 
      genero 
    } = req.query;
    
    // Validate and sanitize pagination parameters
    const pageInt = Math.max(1, parseInt(page) || 1);
    const limitInt = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageInt - 1) * limitInt;
    
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
    
    console.log(`📋 MySQL: Directorio query executed - Total: ${total}, Search: "${search || 'none'}", Status: "${status || 'none'}", Origen: "${origen || 'none'}", Genero: "${genero || 'none'}"`);
    
    res.json({
      data: data,
      total: total,
      page: pageInt,
      limit: limitInt,
      totalPages: Math.ceil(total / limitInt),
      source: 'MySQL'
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
    // Use Firebase for directorio stats if available (both production and development)
    if (isFirebaseEnabled && db) {
      console.log('📊 Using Firebase for directorio stats (Firebase enabled)');
      
      // Get all documents from Firebase
      const snapshot = await db.collection('directorio_contactos').get();
      const allContactos = snapshot.docs.map(doc => doc.data());
      
      const total = allContactos.length;
      const withPhone = allContactos.filter(c => c.telefono_movil && c.telefono_movil.trim() !== '').length;
      const withEmail = allContactos.filter(c => c.email && c.email.trim() !== '').length;
      const clientes = allContactos.filter(c => c.status === 'cliente').length;
      const prospectos = allContactos.filter(c => c.status === 'prospecto').length;
      
      console.log(`✅ Firebase stats: Total: ${total}, Phone: ${withPhone}, Email: ${withEmail}, Clientes: ${clientes}, Prospectos: ${prospectos}`);
      
      return res.json({
        total,
        withPhone,
        withEmail,
        withBirthday: 0, // Firebase doesn't have birthday data yet
        clientes,
        prospectos,
        source: 'Firebase'
      });
    }
    
    // Fallback to MySQL if Firebase is not available
    console.log('📊 Using MySQL for directorio stats (Firebase not available)');
    
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
      prospectos: prospectosResult[0].total,
      source: 'MySQL'
    });
  } catch (error) {
    console.error('Error fetching directorio stats:', error);
    res.json({
      total: 0,
      withPhone: 0,
      withEmail: 0,
      withBirthday: 0,
      clientes: 0,
      prospectos: 0,
      error: error.message
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
    
    console.log(`🔄 Updating contact ${id} with data:`, contactData);
    
    // Use Firebase for directorio updates if available (both production and development)
    if (isFirebaseEnabled && db) {
      console.log('📋 Using Firebase for directorio update (Firebase enabled)');
      
      try {
        // Get current document to check if it exists
        console.log(`🔍 Firebase - Checking if contact ${id} exists in Firebase...`);
        console.log(`🔍 Firebase - Contact ID type: ${typeof id}, value: "${id}"`);
        
        // Try both string and number versions of the ID
        const stringId = id.toString();
        const docRef = db.collection('directorio_contactos').doc(stringId);
        const doc = await docRef.get();
        
        console.log(`🔍 Firebase - doc.exists: ${doc.exists}`);
        if (doc.exists) {
          console.log(`✅ Firebase - Contact ${id} found in Firebase, updating...`);
          // Update document with new data
          const updateData = {
            ...contactData,
            updated_at: new Date().toISOString()
          };
          
          await docRef.update(updateData);
          
          // Get updated document
          const updatedDoc = await docRef.get();
          const updatedContact = {
            id: updatedDoc.id,
            ...updatedDoc.data()
          };
          
          console.log('✅ Contact updated successfully in Firebase:', updatedContact);
          
          return res.json({
            success: true,
            message: 'Contact updated successfully',
            data: updatedContact
          });
        } else {
          console.log(`❌ Firebase - Contact ${id} not found in Firebase`);
          return res.status(404).json({
            success: false,
            message: `Contact ${id} not found in Firebase. All contacts should be in Firebase now.`
          });
        }
        
      } catch (firebaseError) {
        console.error('❌ Firebase update failed:', firebaseError);
        return res.status(500).json({
          success: false,
          message: 'Firebase update failed',
          error: firebaseError.message
        });
      }
    } else {
      // Firebase not available
      return res.status(500).json({
        success: false,
        message: 'Firebase is required but not available'
      });
    }
    
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
      case 'people':
        // Para campos people, Notion espera solo IDs de usuario
        if (Array.isArray(value)) {
          // Si ya es un array, extraer los IDs
          formattedProperty[column] = {
            people: value.map(person => 
              typeof person === 'string' ? { id: person } : { id: person.id }
            )
          };
        } else if (value) {
          // Si es un string (ID), formatear correctamente
          formattedProperty[column] = {
            people: [{ id: value }]
          };
        } else {
          // Si está vacío
          formattedProperty[column] = {
            people: []
          };
        }
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
      default:
        // Si no se especifica el tipo, intentar como rich_text
        formattedProperty[column] = {
          rich_text: [{ text: { content: String(value || '') } }]
        };
    }

    // Actualizar la página en Notion
    const response = await notion.pages.update({
      page_id: taskId,
      properties: formattedProperty
    });

    console.log('✅ Task updated successfully');
    res.json({ success: true, data: response });
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
    
    // Debug credentials
    console.log('🔍 Google Drive Debug Info:');
    console.log('- Client Email:', process.env.GOOGLE_DRIVE_CLIENT_EMAIL);
    console.log('- Project ID:', process.env.GOOGLE_DRIVE_PROJECT_ID);
    console.log('- Private Key Length:', process.env.GOOGLE_DRIVE_PRIVATE_KEY?.length);
    console.log('- Private Key Starts:', process.env.GOOGLE_DRIVE_PRIVATE_KEY?.substring(0, 50));
    console.log('- Private Key Ends:', process.env.GOOGLE_DRIVE_PRIVATE_KEY?.substring(-50));
    
    // Configurar autenticación
    const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n');
    console.log('- Processed Private Key Length:', privateKey.length);
    console.log('- Processed Private Key Starts:', privateKey.substring(0, 50));
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: privateKey,
        project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    console.log('🔑 Attempting to get access token...');
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Construir query para la carpeta específica
    const { folderId } = req.query;
    const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    console.log('🔍 Drive request parameters:');
    console.log('- req.query.folderId:', req.query.folderId);
    console.log('- process.env.GOOGLE_DRIVE_FOLDER_ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);
    console.log('- targetFolderId (final):', targetFolderId);
    
    let query = '';
    if (targetFolderId) {
      query = `'${targetFolderId}' in parents`;
      console.log(`📂 Listing files from folder: ${targetFolderId}`);
      console.log(`📂 Query string: ${query}`);
    } else {
      console.log('📂 No specific folder ID found, listing all files');
    }
    
    console.log('📂 Making Drive API request...');
    
    // Listar archivos
    const response = await drive.files.list({
      q: query,
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];
    
    console.log(`✅ Successfully retrieved ${files.length} files`);
    console.log('📁 First 3 files:', files.slice(0, 3).map(f => ({ name: f.name, type: f.mimeType, id: f.id })));
    
    const responseData = {
      success: true,
      message: `Found ${files.length} files in Google Drive folder`,
      folderId: targetFolderId || 'root',
      requestedFolderId: req.query.folderId,
      actualQuery: query,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink
      }))
    };
    
    console.log('📤 Response folderId:', responseData.folderId);
    console.log('📤 Response requestedFolderId:', responseData.requestedFolderId);
    
    res.json(responseData);

  } catch (error) {
    console.error('❌ Google Drive API error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      errors: error.errors,
      stack: error.stack?.substring(0, 500)
    });
    
    res.json({
      success: false,
      message: `Google Drive error: ${error.message}`,
      files: [],
      debug: {
        errorCode: error.code,
        errorStatus: error.status,
        hasClientEmail: !!process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        hasProjectId: !!process.env.GOOGLE_DRIVE_PROJECT_ID,
        hasPrivateKey: !!process.env.GOOGLE_DRIVE_PRIVATE_KEY,
        privateKeyLength: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.length
      }
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

// Download file from Google Drive
app.get('/api/drive/download/:fileId', async (req, res) => {
  if (!process.env.GOOGLE_DRIVE_CLIENT_EMAIL || !process.env.GOOGLE_DRIVE_PROJECT_ID || !process.env.GOOGLE_DRIVE_PRIVATE_KEY) {
    return res.status(503).json({
      success: false,
      error: 'Google Drive credentials not configured'
    });
  }

  try {
    const { fileId } = req.params;
    console.log(`⬇️ Downloading file from Google Drive: ${fileId}`);
    
    const { google } = require('googleapis');
    
    // Configure authentication
    const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: privateKey,
        project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // First, get file metadata to check if it's a Google Apps file
    console.log(`📋 Getting metadata for file: ${fileId}`);
    const metadataResponse = await drive.files.get({
      fileId: fileId,
      fields: 'id,name,mimeType,size'
    });
    
    const fileMetadata = metadataResponse.data;
    console.log(`📄 File metadata:`, {
      name: fileMetadata.name,
      mimeType: fileMetadata.mimeType,
      size: fileMetadata.size
    });
    
    let downloadResponse;
    let filename = fileMetadata.name;
    let mimeType = fileMetadata.mimeType;
    
    // Check if it's a Google Apps file that needs export
    if (fileMetadata.mimeType.startsWith('application/vnd.google-apps.')) {
      console.log(`📱 Google Apps file detected, exporting...`);
      
      // Map Google Apps types to export formats
      const exportMimeTypes = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.google-apps.drawing': 'image/png'
      };
      
      const exportMimeType = exportMimeTypes[fileMetadata.mimeType];
      if (!exportMimeType) {
        return res.status(400).json({
          success: false,
          error: `Cannot export Google Apps file of type: ${fileMetadata.mimeType}`
        });
      }
      
      console.log(`📤 Exporting as: ${exportMimeType}`);
      
      // Export the file
      downloadResponse = await drive.files.export({
        fileId: fileId,
        mimeType: exportMimeType
      }, {
        responseType: 'stream'
      });
      
      mimeType = exportMimeType;
      
      // Update filename extension
      const extensionMap = {
        'application/pdf': '.pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
        'image/png': '.png'
      };
      
      const extension = extensionMap[exportMimeType];
      if (extension && !filename.endsWith(extension)) {
        // Remove existing extension if any and add new one
        filename = filename.replace(/\.[^/.]+$/, '') + extension;
      }
      
    } else {
      console.log(`📁 Regular file, downloading directly...`);
      
      // Regular file, download directly
      downloadResponse = await drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });
    }
    
    console.log(`✅ File download initiated: ${filename}`);
    
    // Set appropriate headers
    res.setHeader('Content-Type', mimeType);
    
    // Properly encode filename for Content-Disposition header to handle special characters
    const encodedFilename = encodeURIComponent(filename);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    
    if (fileMetadata.size) {
      res.setHeader('Content-Length', fileMetadata.size);
    }
    
    // Pipe the stream to response
    downloadResponse.data.pipe(res);
    
    downloadResponse.data.on('end', () => {
      console.log(`✅ File download completed: ${filename}`);
    });
    
    downloadResponse.data.on('error', (error) => {
      console.error(`❌ Error during file download:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Download stream error',
          details: error.message
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Google Drive download error:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: `Failed to download file: ${error.message}`,
        details: {
          code: error.code,
          status: error.status
        }
      });
    }
  }
});

// Upload file to Google Drive
app.post('/drive/upload', upload.any(), async (req, res) => {
  try {
    console.log('📤 Google Drive upload request');
    
    if (!process.env.GOOGLE_DRIVE_CLIENT_EMAIL || !process.env.GOOGLE_DRIVE_PROJECT_ID || !process.env.GOOGLE_DRIVE_PRIVATE_KEY) {
      console.error('❌ Google Drive credentials not configured');
      return res.status(503).json({
        success: false,
        error: 'Google Drive not configured'
      });
    }

    const { google } = require('googleapis');
    
    // Configurar autenticación (similar al endpoint de files)
    const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: privateKey,
        project_id: process.env.GOOGLE_DRIVE_PROJECT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Get folder ID from request
    const folderId = req.body.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
    
    const files = req.files?.files || req.files || [];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided'
      });
    }

    console.log(`📤 Uploading ${files.length} files to folder: ${folderId}`);
    
    const uploadedFiles = [];
    
    for (const file of files) {
      console.log(`📤 Uploading file: ${file.originalname}`);
      
      const fileMetadata = {
        name: file.originalname,
        parents: folderId ? [folderId] : []
      };

      const media = {
        mimeType: file.mimetype,
        body: require('stream').Readable.from(file.buffer)
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
      });

      uploadedFiles.push({
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink
      });
      
      console.log(`✅ File uploaded: ${response.data.name} (ID: ${response.data.id})`);
    }
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('❌ Error in Drive upload:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Client Folder Preferences Endpoints
// Get folder preference for a client
app.get('/api/drive/client-folder/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    console.log('📁 Getting folder preference for client:', clientId);
    
    if (isFirebaseEnabled && db) {
      // Use Firebase to store client folder preferences
      const docRef = db.collection('client_drive_preferences').doc(clientId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        const data = doc.data();
        console.log('✅ Found folder preference:', data);
        res.json({
          success: true,
          folderId: data.folderId,
          folderName: data.folderName,
          lastUpdated: data.lastUpdated
        });
      } else {
        console.log('📁 No folder preference found for client');
        res.json({
          success: true,
          folderId: null,
          folderName: null
        });
      }
    } else {
      // Fallback to MySQL
      const query = `
        SELECT folder_id, folder_name, updated_at 
        FROM client_drive_preferences 
        WHERE client_id = ?
      `;
      const results = await executeQuery(query, [clientId]);
      
      if (results.length > 0) {
        res.json({
          success: true,
          folderId: results[0].folder_id,
          folderName: results[0].folder_name,
          lastUpdated: results[0].updated_at
        });
      } else {
        res.json({
          success: true,
          folderId: null,
          folderName: null
        });
      }
    }
  } catch (error) {
    console.error('❌ Error getting client folder preference:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Set folder preference for a client
app.post('/api/drive/client-folder', async (req, res) => {
  try {
    const { clientId, folderId, folderName } = req.body;
    console.log('📁 Setting folder preference for client:', clientId, 'to folder:', folderName);
    
    if (!clientId || !folderId) {
      return res.status(400).json({
        success: false,
        error: 'Client ID and folder ID are required'
      });
    }
    
    if (isFirebaseEnabled && db) {
      // Use Firebase to store client folder preferences
      const docRef = db.collection('client_drive_preferences').doc(clientId);
      await docRef.set({
        folderId: folderId,
        folderName: folderName || 'Unknown Folder',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }, { merge: true });
      
      console.log('✅ Folder preference saved to Firebase');
      res.json({
        success: true,
        message: 'Folder preference saved successfully'
      });
    } else {
      // Fallback to MySQL - create table if not exists
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS client_drive_preferences (
          client_id VARCHAR(255) PRIMARY KEY,
          folder_id VARCHAR(255) NOT NULL,
          folder_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      await executeQuery(createTableQuery);
      
      // Insert or update folder preference
      const upsertQuery = `
        INSERT INTO client_drive_preferences (client_id, folder_id, folder_name) 
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        folder_id = VALUES(folder_id),
        folder_name = VALUES(folder_name),
        updated_at = CURRENT_TIMESTAMP
      `;
      await executeQuery(upsertQuery, [clientId, folderId, folderName || 'Unknown Folder']);
      
      console.log('✅ Folder preference saved to MySQL');
      res.json({
        success: true,
        message: 'Folder preference saved successfully'
      });
    }
  } catch (error) {
    console.error('❌ Error setting client folder preference:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
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
    
    if (!openaiApiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        details: 'Please set OPENAI_API_KEY in environment variables'
      });
    }

    const { text, tables, metadata, targetColumns, tableName, tableType, instructions } = req.body;

    console.log('🔍 Detailed request analysis:');
    console.log('- tableName:', tableName);
    console.log('- targetColumns type:', typeof targetColumns);
    console.log('- targetColumns length:', targetColumns?.length);
    console.log('- targetColumns sample:', targetColumns?.slice(0, 3));
    console.log('- PDF text length:', text?.length);
    console.log('- PDF text preview:', text?.substring(0, 200) + '...');

    if (!targetColumns || !tableName || !text) {
      console.log('❌ Missing required fields validation failed');
      console.log('- targetColumns present:', !!targetColumns);
      console.log('- tableName present:', !!tableName);
      console.log('- text present:', !!text);
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'targetColumns, tableName, and text are required'
      });
    }

    console.log('🤖 GPT Analysis request for table:', tableName);
    console.log('📋 Target columns:', targetColumns);

    // Get table structure to validate columns (Firebase-compatible)
    let validColumns = [];
    let availableColumns = [];
    
    try {
      console.log('🔍 Getting table structure for:', tableName);
      
      // Use Firebase table types if available (production), fallback to MySQL (development)
      if (isFirebaseEnabled && db) {
        console.log('📋 Using Firebase table types for column validation');
        
        // Firebase collections are predefined in table types
        const firebaseTableTypes = {
          'autos': ['nombre_contratante', 'numero_poliza', 'aseguradora', 'vigencia_inicio', 'vigencia_fin', 'forma_pago', 'pago_total_o_prima_total', 'prima_neta', 'derecho_de_poliza', 'recargo_por_pago_fraccionado', 'i_v_a', 'e_mail', 'tipo_de_vehiculo', 'duracion', 'rfc', 'domicilio_o_direccion', 'descripcion_del_vehiculo', 'serie', 'modelo', 'placas', 'motor', 'uso', 'pago_parcial', 'pdf', 'ramo'],
          'vida': ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_a_pagar_mxn', 'prima_neta_mxn', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva', 'email', 'tipo_de_poliza', 'tipo_de_plan', 'rfc', 'direccion', 'telefono', 'fecha_expedicion', 'beneficiarios', 'edad_de_contratacion', 'tipo_de_riesgo', 'fumador', 'coberturas', 'pdf', 'responsable', 'cobrar_a', 'ramo'],
          'gmm': ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'nombre_del_asegurado', 'rfc', 'direccion', 'telefono', 'codigo_cliente', 'duracion', 'fecha_expedicion', 'fecha_nacimiento_asegurado', 'version', 'renovacion', 'pdf', 'responsable', 'ramo'],
          'rc': ['asegurado', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'derecho_poliza', 'prima_neta', 'recargo_pago_fraccionado', 'iva', 'email', 'limite_maximo_responsabilidad', 'responsable', 'ramo'],
          'transporte': ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'rfc', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'descripcion_del_movimiento', 'version_renovacion', 'ubicacion', 'duracion', 'direccion', 'pagos_fraccionados', 'monto_parcial', 'no_de_pago', 'telefono', 'tipo_de_poliza', 'giro_del_negocio_asegurado', 'esquema_de_contratacion', 'medio_de_transporte', 'territorialidad', 'origen', 'destino', 'valor_del_embarque', 'mercancia', 'tipo_de_empaque', 'valor_mercancia', 'responsable', 'cobrar_a', 'ramo'],
          'mascotas': ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'rfc', 'nombre_asegurado', 'nombre_de_mascota', 'direccion', 'telefono', 'codigo_cliente', 'duracion', 'fecha_expedicion', 'version', 'renovacion', 'tipo_de_mascota', 'raza', 'edad', 'categoria_de_mascota', 'sexo', 'responsable', 'cobrar_a', 'pdf', 'ramo'],
          'diversos': ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'rfc', 'direccion', 'telefono', 'codigo_cliente', 'version', 'duracion', 'moneda', 'fecha_expedicion', 'renovacion', 'responsable', 'cobrar_a', 'ramo'],
          'negocio': ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'rfc', 'direccion_del_contratante', 'version', 'ubicaciones', 'moneda', 'responsable', 'cobrar_a', 'ramo'],
          'hogar': ['contratante', 'numero_poliza', 'aseguradora', 'fecha_inicio', 'fecha_fin', 'forma_pago', 'importe_total_a_pagar', 'prima_neta', 'derecho_poliza', 'recargo_pago_fraccionado', 'iva_16', 'email', 'rfc', 'direccion', 'telefono', 'duracion', 'version', 'renovacion', 'fecha_expedicion', 'pdf', 'responsable', 'cobrar_a', 'ramo'],
          'gruposgmm': [],
          'directorio_contactos': ['origen', 'comentario', 'nombre_completo', 'nombre_completo_oficial', 'nickname', 'apellido', 'display_name', 'empresa', 'telefono_oficina', 'telefono_casa', 'telefono_asistente', 'telefono_movil', 'telefonos_corregidos', 'email', 'entidad', 'genero', 'status_social', 'ocupacion', 'pais', 'status', 'created_at', 'updated_at']
        };
        
        availableColumns = firebaseTableTypes[tableName] || [];
        console.log('📊 Firebase table columns:', availableColumns);
      } else {
        // Fallback to MySQL if Firebase not available
        console.log('📋 Using MySQL for column validation (Firebase not available)');
        const structure = await getTableStructure(tableName);
        console.log('📊 Database structure columns:', structure.map(col => col.Field || col.name));
        availableColumns = structure.map(col => col.Field || col.name);
      }
      
      console.log('📝 Available columns:', availableColumns);
      
      // Filter target columns to only include existing ones
      validColumns = targetColumns.filter(col => availableColumns.includes(col));
      console.log('✅ Valid columns after filtering:', validColumns);
      console.log('❌ Invalid columns filtered out:', targetColumns.filter(col => !availableColumns.includes(col)));
      
      if (validColumns.length === 0) {
        console.log('❌ NO VALID COLUMNS FOUND!');
        return res.status(400).json({
          error: 'No valid columns found',
          details: `None of the target columns [${targetColumns.join(', ')}] exist in table ${tableName}`,
          availableColumns: availableColumns,
          requestedColumns: targetColumns
        });
      }
    } catch (dbError) {
      console.error('❌ Database structure error:', dbError);
      return res.status(500).json({
        error: 'Failed to get table structure',
        details: dbError.message
      });
    }

    // Create OpenAI prompt for PDF analysis
    const prompt = `
Analiza el siguiente documento PDF y extrae la información específica para los campos solicitados.

DOCUMENTO PDF:
${text}

CAMPOS A EXTRAER:
${validColumns.map(col => `- ${col}: Encuentra el valor exacto en el documento`).join('\n')}

INSTRUCCIONES:
1. Extrae valores EXACTOS del documento PDF
2. No inventes información que no esté en el documento
3. Devuelve null si no puedes encontrar un valor específico
4. Para fechas, mantén el formato como aparece en el documento
5. Para valores monetarios, incluye la cantidad completa con decimales si están presentes
6. Para campos de texto, extrae el texto completo como se muestra
7. Para nombres de aseguradoras, normaliza variaciones de "Grupo Nacional Provincial" a "GNP"
8. Para nombres de personas, usa formato de título apropiado
9. Para direcciones, estandariza abreviaciones comunes

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
{
  ${validColumns.map(col => `"${col}": "valor_extraído_o_null"`).join(',\n  ')}
}

No incluyas explicaciones adicionales, solo el objeto JSON.`;

    console.log('🔍 Sending request to OpenAI...');
    console.log('📝 Prompt length:', prompt.length);

    try {
      // Make request to OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Eres un experto en análisis de documentos PDF de seguros. Extrae información específica de manera precisa y devuelve solo JSON válido.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorData);
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      const openaiResult = await response.json();
      console.log('✅ OpenAI response received');
      console.log('📊 Usage:', openaiResult.usage);

      if (!openaiResult.choices || !openaiResult.choices[0] || !openaiResult.choices[0].message) {
        throw new Error('Invalid OpenAI response structure');
      }

      const extractedContent = openaiResult.choices[0].message.content.trim();
      console.log('📝 Extracted content:', extractedContent);

      // Parse the JSON response from OpenAI
      let extractedData;
      try {
        // Clean the response to ensure it's valid JSON
        const cleanContent = extractedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        extractedData = JSON.parse(cleanContent);
        console.log('✅ Successfully parsed extracted data:', Object.keys(extractedData));
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI JSON response:', parseError);
        console.error('Raw content:', extractedContent);
        throw new Error('Failed to parse OpenAI response as JSON');
      }

      // Create column analysis from extracted data
      const columnAnalysis = {};
      validColumns.forEach(column => {
        const value = extractedData[column];
        columnAnalysis[column] = {
          extractedValue: value,
          hasValue: value !== null && value !== undefined && value !== '',
          dataType: typeof value,
          sampleValues: value ? [value] : [],
          confidence: value ? 'high' : 'not_found'
        };
      });

      // Create comprehensive analysis response
      const analysis = {
        success: true,
        tableName: tableName,
        source: 'openai_pdf_analysis',
        analyzedColumns: validColumns.length,
        columnAnalysis: columnAnalysis,
        extractedData: extractedData,
        summary: {
          fieldsFound: Object.values(extractedData).filter(v => v !== null && v !== undefined && v !== '').length,
          fieldsTotal: validColumns.length,
          extractionRate: Object.values(extractedData).filter(v => v !== null && v !== undefined && v !== '').length / validColumns.length
        },
        openaiUsage: openaiResult.usage,
        timestamp: new Date().toISOString()
      };

      console.log('✅ PDF analysis completed successfully');
      console.log('📊 Fields found:', analysis.summary.fieldsFound, 'of', analysis.summary.fieldsTotal);
      res.json(analysis);

    } catch (openaiError) {
      console.error('❌ OpenAI processing error:', openaiError);
      return res.status(500).json({
        error: 'Failed to analyze PDF with OpenAI',
        details: openaiError.message
      });
    }

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

// Notion Database Schema endpoint
app.get('/api/notion/database-schema', async (req, res) => {
  try {
    if (!isNotionEnabled) {
      return res.status(503).json({ 
        error: 'Notion service is disabled',
        details: 'Notion API key is not configured or invalid'
      });
    }

    console.log('🔍 Getting detailed database schema');
    
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });

    console.log('📚 Detailed Database Properties:');
    Object.entries(database.properties).forEach(([key, prop]) => {
      console.log(`- ${key}: ${prop.type}`, JSON.stringify(prop, null, 2));
    });

    res.json({
      success: true,
      properties: database.properties,
      title: database.title
    });
  } catch (error) {
    console.error('❌ Error getting database schema:', error);
    res.status(500).json({ 
      error: 'Failed to get database schema',
      details: error.message
    });
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
app.post('/api/email/send-welcome', upload.any(), async (req, res) => {
  try {
    console.log('📧 Email send-welcome request');
    console.log('📧 Content-Type:', req.get('Content-Type'));
    console.log('📧 Has files:', !!req.files);
    
    // Handle both FormData and JSON requests
    let to, subject, htmlContent, clientData, cotizaciones, driveLinks, from, fromName, fromPass;
    
    if (req.get('Content-Type')?.includes('multipart/form-data')) {
      // FormData request (with potential file attachments)
      console.log('📦 Processing FormData request');
      to = req.body.to;
      subject = req.body.subject;
      htmlContent = req.body.htmlContent;
      from = req.body.from;
      fromName = req.body.fromName;
      fromPass = req.body.fromPass;
      driveLinks = req.body.driveLinks ? JSON.parse(req.body.driveLinks) : [];
      
      // Extract other fields from FormData
      clientData = {};
      Object.keys(req.body).forEach(key => {
        if (!['to', 'subject', 'htmlContent', 'driveLinks', 'from', 'fromName', 'fromPass'].includes(key)) {
          clientData[key] = req.body[key];
        }
      });
    } else {
      // JSON request (no file attachments)
      console.log('📄 Processing JSON request');
      ({ to, subject, htmlContent, clientData, cotizaciones, driveLinks, from, fromName, fromPass } = req.body);
    }
    
    if (!to || !subject || !htmlContent) {
      console.log('❌ Missing fields:', { to: !!to, subject: !!subject, htmlContent: !!htmlContent });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, htmlContent'
      });
    }

    // Configurar transporter de nodemailer con remitente dinámico
    console.log('📧 Configurando transporter...');
    console.log('📧 SMTP_HOST:', process.env.SMTP_HOST);
    
    // Usar remitente dinámico o fallback a variables por defecto
    const smtpUser = from || process.env.SMTP_USER_CASIN || process.env.GMAIL_USERNAME || process.env.SMTP_USER;
    const smtpPass = fromPass || process.env.SMTP_PASS_CASIN || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
    const senderName = fromName || 'CASIN Seguros';
    
    console.log('📧 SMTP_USER (dinámico):', smtpUser);
    console.log('📧 SMTP_PASS configurado:', !!smtpPass);
    console.log('📧 Sender Name:', senderName);
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    console.log('📧 Transporter configurado exitosamente');

    // Configurar el correo
    let emailBody = htmlContent;
    
    // Add Drive links to email body if available
    if (driveLinks && driveLinks.length > 0) {
      console.log('📎 Adding Drive links to email:', driveLinks.length);
      emailBody += `<br><br><h3>📁 Archivos adjuntos en Google Drive:</h3><ul>`;
      driveLinks.forEach(link => {
        emailBody += `<li><a href="${link.link}" target="_blank">${link.name}</a></li>`;
      });
      emailBody += `</ul>`;
    }
    
    const mailOptions = {
      from: `"${senderName}" <${smtpUser}>`,
      to: to,
      subject: subject,
      html: emailBody,
      text: emailBody.replace(/<[^>]*>/g, '') // Versión texto plano
    };
    
    // Add file attachments if available
    if (req.files && req.files.length > 0) {
      console.log('📎 Adding file attachments:', req.files.length);
      mailOptions.attachments = req.files.map(file => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype
      }));
    }

    console.log('📤 Enviando correo a:', to);
    console.log('📋 Asunto:', subject);

    // Enviar el correo
    let info;
    try {
      info = await transporter.sendMail(mailOptions);
      console.log('✅ Correo enviado exitosamente:', info.messageId);
    } catch (mailError) {
      console.error('❌ Error específico de nodemailer:', mailError);
      console.error('❌ Código de error:', mailError.code);
      console.error('❌ Mensaje de error:', mailError.message);
      throw new Error(`Error de nodemailer: ${mailError.message}`);
    }
    
    res.json({
      success: true,
      message: 'Correo enviado exitosamente',
      messageId: info.messageId,
      recipient: to,
      subject: subject
    });

  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al enviar correo', 
      details: error.message 
    });
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

// REMOVED: Duplicate catch-all handler - kept the one at the end of file

// COMMENTED OUT - DUPLICATE app.listen() causing port conflicts
// app.listen(PORT, () => {
//   console.log(`🚀 CASIN CRM with MySQL running on port ${PORT}`);
//   console.log(`📱 Frontend: http://localhost:${PORT}`);
//   console.log(`🔧 API: http://localhost:${PORT}/api`);
//   console.log(`🗄️  Database: MySQL (crud_db)`);
//   console.log(`📊 Data: Real data from MySQL tables`);
//   console.log(`🎯 Mode: Production with real database`);
// }); 

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

// Debug endpoint for Firebase status
app.get('/api/debug/firebase', (req, res) => {
  res.json({
    isVercel: !!process.env.VERCEL,
    isFirebaseEnabled: isFirebaseEnabled,
    hasDb: !!db,
    hasAdmin: !!admin,
    firebaseProjectId: process.env.VITE_FIREBASE_PROJECT_ID ? 'configured' : 'missing',
    firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY ? 'configured' : 'missing',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// COTIZA MODULE ENDPOINTS
// =============================================================================

// Enable file uploads (using existing multer configuration)
const uploadToFile = multer({ dest: 'uploads/' });

// Parse PDF endpoint
app.post('/api/parse-pdf', uploadToFile.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📄 Parsing PDF file:', req.file.originalname);

    // Import pdf-parse
    const pdfParse = require('pdf-parse');
    const fs = require('fs');

    try {
      // Read the uploaded file
      const dataBuffer = fs.readFileSync(req.file.path);
      
      // Parse the PDF
      console.log('🔍 Extracting text from PDF...');
      const pdfData = await pdfParse(dataBuffer);
      
      // Extract text content
      const extractedText = pdfData.text.trim();
      
      console.log('✅ PDF parsed successfully');
      console.log('📊 Pages:', pdfData.numpages);
      console.log('📝 Text length:', extractedText.length);
      console.log('🔤 First 200 chars:', extractedText.substring(0, 200));

      if (!extractedText || extractedText.length === 0) {
        throw new Error('No text content found in PDF');
      }

      res.json({
        success: true,
        text: extractedText,
        filename: req.file.originalname,
        pages: pdfData.numpages,
        info: pdfData.info
      });

    } catch (pdfError) {
      console.error('❌ PDF parsing failed:', pdfError);
      
      // Fallback: return a mock response with filename info
      const fallbackText = `Documento de seguro: ${req.file.originalname}
      
Error al extraer texto del PDF. Contenido de muestra:
Archivo: ${req.file.originalname}
Tipo: Documento de seguros
Estado: Requiere revisión manual
Nota: El parser no pudo extraer el texto automáticamente.`;

      res.json({
        success: true,
        text: fallbackText,
        filename: req.file.originalname,
        warning: 'PDF parsing failed, using fallback content'
      });
    }

  } catch (error) {
    console.error('❌ General error:', error);
    res.status(500).json({ 
      error: 'Failed to parse PDF',
      message: error.message 
    });
  } finally {
    // Clean up uploaded file
    if (req.file) {
      const fs = require('fs');
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting temp file:', err);
      });
    }
  }
});

// Analyze image with OpenAI Vision
app.post('/api/analyze-image', async (req, res) => {
  try {
    if (!isOpenAIEnabled || !openai) {
      return res.status(503).json({ 
        error: 'OpenAI service not available',
        message: 'OpenAI is not configured' 
      });
    }

    const { image, prompt } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    console.log('🖼️ Analyzing image with OpenAI Vision...');

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt || "Extrae todo el texto visible en esta imagen." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });

    const extractedText = response.choices[0].message.content;

    res.json({
      success: true,
      text: extractedText
    });

  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze image',
      message: error.message 
    });
  }
});

// Generate quote with OpenAI
// PDF Generation endpoint
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const { clientData, cotizaciones, generatedMail, vehiculo, tabla, recomendaciones } = req.body;

    if (!clientData || !cotizaciones) {
      return res.status(400).json({ error: 'Datos incompletos para generar PDF' });
    }

    // Crear nuevo documento PDF
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4'
    });

    // Headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Propuesta_Seguros_${clientData.nombre.replace(/\s+/g, '_')}.pdf"`);

    // Pipe del documento al response
    doc.pipe(res);

    // === ENCABEZADO ===
    doc.fontSize(20)
       .fillColor('#007bff')
       .text('CASIN SEGUROS', 50, 50, { align: 'center' })
       .fontSize(16)
       .fillColor('#333333')
       .text('Propuesta de Cotización de Seguros', 50, 80, { align: 'center' });

    // Línea separadora
    doc.moveTo(50, 110)
       .lineTo(545, 110)
       .strokeColor('#007bff')
       .lineWidth(2)
       .stroke();

    let currentY = 130;

    // === DATOS DEL CLIENTE ===
    doc.fontSize(14)
       .fillColor('#333333')
       .text('DATOS DEL CLIENTE', 50, currentY);
    
    currentY += 25;
    
    doc.fontSize(12)
       .text(`Nombre: ${clientData.nombre}`, 70, currentY);
    currentY += 20;
    
    doc.text(`Email: ${clientData.email}`, 70, currentY);
    currentY += 20;
    
    if (clientData.telefono) {
      doc.text(`Teléfono: ${clientData.telefono}`, 70, currentY);
      currentY += 20;
    }
    
    if (clientData.empresa) {
      doc.text(`Empresa: ${clientData.empresa}`, 70, currentY);
      currentY += 20;
    }

    currentY += 10;

    // === INFORMACIÓN DEL VEHÍCULO ===
    if (vehiculo) {
      doc.fontSize(14)
         .fillColor('#333333')
         .text('INFORMACIÓN DEL VEHÍCULO', 50, currentY);
      
      currentY += 25;
      
      doc.fontSize(12)
         .text(`Vehículo: ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`, 70, currentY);
      currentY += 20;
      
      if (vehiculo.cp) {
        doc.text(`Código Postal: ${vehiculo.cp}`, 70, currentY);
        currentY += 20;
      }
      
      currentY += 10;
    }

    // === TABLA COMPARATIVA ===
    if (tabla && tabla.coberturas) {
      doc.fontSize(14)
         .fillColor('#333333')
         .text('TABLA COMPARATIVA DE COTIZACIONES', 50, currentY);
      
      currentY += 30;

      // Obtener aseguradoras
      const aseguradoras = [];
      if (tabla.coberturas.length > 0) {
        Object.keys(tabla.coberturas[0]).forEach(key => {
          if (key !== 'cobertura') {
            aseguradoras.push(key);
          }
        });
      }

      // Configurar tabla
      const tableTop = currentY;
      const colWidth = Math.min(120, (500 - 50) / (aseguradoras.length + 1));
      const rowHeight = 25;

      // Headers
      doc.fontSize(10)
         .fillColor('#ffffff')
         .rect(50, tableTop, colWidth, rowHeight)
         .fill('#007bff')
         .fillColor('#ffffff')
         .text('COBERTURA', 55, tableTop + 8);

      let xPos = 50 + colWidth;
      aseguradoras.forEach((aseg, index) => {
        const colors = ['#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6f42c1'];
        const color = colors[index % colors.length];
        
        doc.rect(xPos, tableTop, colWidth, rowHeight)
           .fill(color)
           .fillColor('#ffffff')
           .text(aseg.replace(/_/g, ' ').toUpperCase(), xPos + 5, tableTop + 8, {
             width: colWidth - 10,
             align: 'center'
           });
        xPos += colWidth;
      });

      currentY += rowHeight;

      // Filas de datos
      tabla.coberturas.forEach((fila, index) => {
        const isEvenRow = index % 2 === 0;
        const bgColor = isEvenRow ? '#f8f9fa' : '#ffffff';
        
        // Fila de cobertura
        doc.rect(50, currentY, colWidth, rowHeight)
           .fill(bgColor)
           .fillColor('#333333')
           .fontSize(9)
           .text(fila.cobertura || '', 55, currentY + 8, {
             width: colWidth - 10
           });

        xPos = 50 + colWidth;
        aseguradoras.forEach(aseg => {
          doc.rect(xPos, currentY, colWidth, rowHeight)
             .fill(bgColor)
             .fillColor('#333333')
             .text(fila[aseg] || 'N/A', xPos + 5, currentY + 8, {
               width: colWidth - 10,
               align: 'center'
             });
          xPos += colWidth;
        });

        currentY += rowHeight;
      });

      currentY += 20;
    }

    // === RECOMENDACIONES ===
    if (recomendaciones && recomendaciones.length > 0) {
      // Verificar si necesitamos nueva página
      if (currentY > 650) {
        doc.addPage();
        currentY = 50;
      }

      doc.fontSize(14)
         .fillColor('#333333')
         .text('RECOMENDACIONES', 50, currentY);
      
      currentY += 25;

      recomendaciones.forEach((rec, index) => {
        doc.fontSize(12)
           .fillColor('#007bff')
           .text(`${index + 1}. ${rec.aseguradora}`, 70, currentY);
        currentY += 18;
        
        doc.fontSize(10)
           .fillColor('#333333')
           .text(rec.razon, 90, currentY, { width: 400 });
        currentY += 30;
        
        if (rec.precio) {
          doc.fontSize(11)
             .fillColor('#28a745')
             .text(`Precio: ${rec.precio}`, 90, currentY);
          currentY += 25;
        }
      });
    }

    // === PIE DE PÁGINA ===
    const pageHeight = doc.page.height;
    doc.fontSize(10)
       .fillColor('#666666')
       .text('CASIN Seguros - Corredores de Seguros', 50, pageHeight - 80, { align: 'center' })
       .text('Tel: +52 55 1234-5678 | Email: contacto@casin.com.mx', 50, pageHeight - 65, { align: 'center' })
       .text(`Propuesta generada el ${new Date().toLocaleDateString('es-MX')}`, 50, pageHeight - 50, { align: 'center' });

    // Finalizar documento
    doc.end();

  } catch (error) {
    console.error('Error generando PDF:', error);
    res.status(500).json({ error: 'Error interno del servidor al generar PDF' });
  }
});

app.post('/api/generate-quote', async (req, res) => {
  try {
    if (!isOpenAIEnabled || !openai) {
      return res.status(503).json({ 
        error: 'OpenAI service not available',
        message: 'OpenAI is not configured' 
      });
    }

    const { documentText, prompt } = req.body;
    
    if (!documentText) {
      return res.status(400).json({ error: 'No document text provided' });
    }

    console.log('🤖 Generating quote with OpenAI...');

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un experto en seguros mexicano. Responde ÚNICAMENTE con JSON válido, sin texto adicional, sin markdown, sin explicaciones. Solo el objeto JSON puro."
        },
        {
          role: "user",
          content: `${prompt}\n\nDocumentos a analizar:\n${documentText}`
        }
      ],
      max_tokens: 3000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const analysis = response.choices[0].message.content;

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('Quote generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate quote',
      message: error.message 
    });
  }
});

// Catch-all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Start server for Heroku (only if not in Vercel environment)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔥 Firebase enabled: ${isFirebaseEnabled}`);
    console.log(`📧 Notion enabled: ${isNotionEnabled}`);
  });
}

  // Export for Vercel serverless deployment
  module.exports = app;