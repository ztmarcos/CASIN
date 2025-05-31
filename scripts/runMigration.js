const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const dbConfig = require('../config/database');

async function runMigration() {
    let connection;
    try {
        // Read the migration file
        const migrationPath = path.join(__dirname, '../migrations/002_create_sharepoint_tables.sql');
        const sqlContent = await fs.readFile(migrationPath, 'utf8');

        // Connect to database
        connection = await mysql.createConnection(dbConfig);
        
        // Split the SQL content into individual statements
        const statements = sqlContent.split(';').filter(stmt => stmt.trim());
        
        // Execute each statement
        for (let statement of statements) {
            if (statement.trim()) {
                console.log('Executing:', statement);
                await connection.execute(statement);
                console.log('Statement executed successfully');
            }
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the migration
runMigration(); 