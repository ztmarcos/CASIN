import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔧 Loading database configuration...');

// Railway MySQL configuration
const dbConfig = {
  host: process.env.MYSQLHOST || 'localhost',
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'railway',
  charset: 'utf8mb4',
  timezone: '+00:00',
  ssl: false
};

// For Railway public connection, use the proxy if available
if (process.env.RAILWAY_TCP_PROXY_DOMAIN && process.env.RAILWAY_TCP_PROXY_PORT) {
  dbConfig.host = process.env.RAILWAY_TCP_PROXY_DOMAIN;
  dbConfig.port = parseInt(process.env.RAILWAY_TCP_PROXY_PORT);
  console.log(`📡 Using Railway public connection: ${dbConfig.host}:${dbConfig.port}`);
} else {
  console.log(`📡 Using Railway internal connection: ${dbConfig.host}:${dbConfig.port}`);
}

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
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});

// Test connection
async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    const connection = await pool.getConnection();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM directorio_contactos');
    console.log(`📊 Found ${rows[0].count} contacts in database`);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Test connection on startup
testConnection();

export { pool };
export default pool; 