import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration using Railway's new variable names
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
  port: process.env.MYSQLPORT || process.env.DB_PORT || '3306',
  charset: 'utf8mb4'
};

console.log('🔧 Setting up database...');
console.log('Configuration:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port,
  hasPassword: !!dbConfig.password
});

async function setupDatabase() {
  let connection;
  
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!');
    
    // Create table
    console.log('🔨 Creating directorio_contactos table...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS directorio_contactos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        origen VARCHAR(255),
        comentario TEXT,
        nombre_completo VARCHAR(255) NOT NULL,
        nombre_completo_oficial VARCHAR(255),
        nickname VARCHAR(255),
        apellido VARCHAR(255),
        display_name VARCHAR(255),
        empresa VARCHAR(255),
        telefono_oficina VARCHAR(50),
        telefono_casa VARCHAR(50),
        telefono_asistente VARCHAR(50),
        telefono_movil VARCHAR(50),
        telefonos_corregidos VARCHAR(255),
        email VARCHAR(255),
        entidad VARCHAR(255),
        genero ENUM('Masculino', 'Femenino', 'Otro'),
        status_social VARCHAR(255),
        ocupacion VARCHAR(255),
        pais VARCHAR(255) DEFAULT 'MÉXICO',
        status ENUM('prospecto', 'cliente', 'inactivo') DEFAULT 'prospecto',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ Table created successfully!');
    
    // Check if table has data
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM directorio_contactos');
    const count = rows[0].count;
    
    if (count === 0) {
      console.log('📝 Inserting sample data...');
      const insertDataSQL = `
        INSERT INTO directorio_contactos (nombre_completo, email, telefono_movil, empresa, ocupacion, origen, comentario) VALUES
        ('Juan Pérez García', 'juan.perez@email.com', '555-1234', 'Empresa ABC', 'Gerente General', 'Referido', 'Cliente potencial interesado en seguros de vida'),
        ('María López Rodríguez', 'maria.lopez@email.com', '555-5678', 'Consultoría XYZ', 'Consultora', 'Web', 'Contacto desde página web'),
        ('Carlos Mendoza Torres', 'carlos.mendoza@email.com', '555-9012', 'Industrias DEF', 'Director Financiero', 'Evento', 'Conocido en evento de networking'),
        ('Ana García Martínez', 'ana.garcia@email.com', '555-3456', 'Tecnología Global', 'CTO', 'LinkedIn', 'Interesada en seguros para empresa'),
        ('Roberto Silva Hernández', 'roberto.silva@email.com', '555-7890', 'Construcciones RSH', 'CEO', 'Referido', 'Empresa constructora en crecimiento')
      `;
      
      await connection.execute(insertDataSQL);
      console.log('✅ Sample data inserted successfully!');
    } else {
      console.log(`ℹ️  Table already has ${count} records, skipping sample data insertion.`);
    }
    
    // Verify setup
    console.log('🔍 Verifying setup...');
    const [finalRows] = await connection.execute('SELECT * FROM directorio_contactos LIMIT 3');
    console.log('📊 Sample records:');
    finalRows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.nombre_completo} - ${row.email}`);
    });
    
    console.log('🎉 Database setup completed successfully!');
    console.log('🌐 Your app should now work at: https://directorio-contactos-production.up.railway.app');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    console.error('Details:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Run the setup
setupDatabase(); 