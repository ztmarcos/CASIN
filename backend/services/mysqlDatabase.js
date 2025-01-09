const mysql = require('mysql2/promise');
require('dotenv').config();

class MySQLDatabaseService {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crud_db'
    };
  }

  async getConnection() {
    return await mysql.createConnection(this.config);
  }

  async getTables() {
    // For now, we'll return just the users table
    return [{
      name: 'users',
      columns: [
        { name: 'id', type: 'INTEGER', isPrimary: true },
        { name: 'name', type: 'VARCHAR(255)' },
        { name: 'role', type: 'VARCHAR(100)' },
        { name: 'status', type: 'VARCHAR(50)' }
      ]
    }];
  }

  async getData(tableName, filters = {}) {
    const connection = await this.getConnection();
    try {
      let query = `SELECT * FROM ${tableName}`;
      const filterConditions = [];
      const values = [];

      // Add filters if they exist
      if (Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            filterConditions.push(`${key} = ?`);
            values.push(value);
          }
        });
        
        if (filterConditions.length > 0) {
          query += ' WHERE ' + filterConditions.join(' AND ');
        }
      }

      const [rows] = await connection.execute(query, values);
      
      return {
        table: tableName,
        columns: (await this.getTables())[0].columns,
        data: rows,
        timestamp: new Date().toISOString()
      };
    } finally {
      await connection.end();
    }
  }

  async insertData(tableName, data) {
    const connection = await this.getConnection();
    try {
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
      const [result] = await connection.execute(query, values);

      return {
        success: true,
        data: { ...data, id: result.insertId }
      };
    } finally {
      await connection.end();
    }
  }
}

module.exports = new MySQLDatabaseService(); 