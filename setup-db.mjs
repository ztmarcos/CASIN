import mysql from 'mysql2/promise';

// 🔧 CONFIGURACIÓN DE MYSQL DE RAILWAY
// Ve a tu dashboard de Railway → MySQL service → Variables
// Y reemplaza estos valores:

const config = {
  host: 'viaduct.proxy.rlwy.net',  // Tu MYSQLHOST
  user: 'root',                    // Tu MYSQLUSER  
  password: 'TU_PASSWORD_AQUI',    // Tu MYSQLPASSWORD
  database: 'railway',             // Tu MYSQLDATABASE
  port: 3306,                      // Tu MYSQLPORT
  charset: 'utf8mb4'
};

console.log('🔧 Configurando base de datos...');

async function setup() {
  let connection;
  try {
    console.log('📡 Conectando a MySQL...');
    connection = await mysql.createConnection(config);
    console.log('✅ ¡Conectado exitosamente!');
    
    // Crear tabla
    const createTable = `
      CREATE TABLE IF NOT EXISTS directorio_contactos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        origen VARCHAR(255),
        comentario TEXT,
        nombre_completo VARCHAR(255) NOT NULL,
        empresa VARCHAR(255),
        telefono_movil VARCHAR(50),
        email VARCHAR(255),
        ocupacion VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await connection.execute(createTable);
    console.log('✅ Tabla creada!');
    
    // Insertar datos de prueba
    const insertData = `
      INSERT IGNORE INTO directorio_contactos (nombre_completo, email, telefono_movil, empresa, ocupacion, origen, comentario) VALUES
      ('Juan Pérez García', 'juan.perez@email.com', '555-1234', 'Empresa ABC', 'Gerente', 'Referido', 'Cliente potencial'),
      ('María López', 'maria.lopez@email.com', '555-5678', 'Consultoría XYZ', 'Consultora', 'Web', 'Contacto web'),
      ('Carlos Mendoza', 'carlos.mendoza@email.com', '555-9012', 'Industrias DEF', 'Director', 'Evento', 'Networking')
    `;
    
    await connection.execute(insertData);
    console.log('✅ Datos insertados!');
    
    console.log('🎉 ¡Base de datos lista!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

setup(); 