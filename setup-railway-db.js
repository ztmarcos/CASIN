const mysql = require('mysql2/promise');
const fs = require('fs');

async function setupDatabase() {
  console.log('🚀 Setting up Railway database...');
  
  // Railway MySQL connection
  const connection = await mysql.createConnection({
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    port: process.env.MYSQLPORT || process.env.DB_PORT || 3306
  });

  console.log('✅ Connected to Railway MySQL database');

  try {
    // Read and execute the database dump
    console.log('📥 Reading database dump...');
    const sqlDump = fs.readFileSync('railway_directorio_dump.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlDump.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`📊 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await connection.execute(statement);
          if (i % 100 === 0) {
            console.log(`Progress: ${i}/${statements.length} statements executed`);
          }
        } catch (error) {
          // Skip non-critical errors (like DROP TABLE IF NOT EXISTS)
          if (!error.message.includes('Unknown table') && !error.message.includes('already exists')) {
            console.warn(`Warning on statement ${i}: ${error.message}`);
          }
        }
      }
    }

    // Verify the data was imported
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM directorio_contactos');
    console.log(`✅ Database setup complete! ${rows[0].count} contacts imported.`);

  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    await connection.end();
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = setupDatabase; 