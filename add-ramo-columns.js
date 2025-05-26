const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crud_db',
  port: process.env.DB_PORT || '3306'
};

async function addRamoColumns() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Adding ramo columns to tables that need them...');
    
    const tableRamoMappings = [
      { table: 'vida', ramo: 'Vida' },
      { table: 'diversos', ramo: 'Diversos' },
      { table: 'rc', ramo: 'Responsabilidad Civil' },
      { table: 'transporte', ramo: 'Transporte' },
      { table: 'gruposgmm', ramo: 'GMM' }
    ];
    
    for (const { table, ramo } of tableRamoMappings) {
      try {
        console.log(`\nProcessing table: ${table}`);
        
        // Check if ramo column exists
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = '${table}' 
          AND COLUMN_NAME = 'ramo'
        `);
        
        if (columns.length === 0) {
          // Add ramo column
          console.log(`  Adding ramo column to ${table}`);
          await connection.execute(`
            ALTER TABLE ${table} 
            ADD COLUMN ramo VARCHAR(50) DEFAULT '${ramo}'
          `);
          
          // Update existing records
          await connection.execute(`
            UPDATE ${table} 
            SET ramo = '${ramo}' 
            WHERE ramo IS NULL
          `);
          
          console.log(`  Added and populated ramo column for ${table}`);
        } else {
          console.log(`  Ramo column already exists in ${table}`);
          // Just update NULL values
          const [result] = await connection.execute(`
            UPDATE ${table} 
            SET ramo = '${ramo}' 
            WHERE ramo IS NULL
          `);
          console.log(`  Updated ${result.affectedRows} NULL values in ${table}`);
        }
        
      } catch (error) {
        console.error(`  Error processing ${table}:`, error.message);
      }
    }
    
    console.log('\nDone! All tables now have proper ramo values.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addRamoColumns(); 