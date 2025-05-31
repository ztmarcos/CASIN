require('dotenv').config();
const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crud_db',
  port: process.env.DB_PORT || '3306',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a test connection to verify configuration
const testConnection = mysql.createConnection(dbConfig);
testConnection.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Database connection test successful');
    testConnection.query('SHOW TABLES', (error, results) => {
        if (error) {
            console.error('Error querying tables:', error);
        } else {
            console.log('Available tables:', results.map(row => Object.values(row)[0]));
        }
        testConnection.end();
    });
});

module.exports = dbConfig; 