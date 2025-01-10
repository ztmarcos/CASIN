const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');

class MySQLDatabaseService {
  constructor() {
    this.config = dbConfig;
  }

  async getConnection() {
    try {
      return await mysql.createConnection(this.config);
    } catch (error) {
      console.error('Database connection error:', error);
      throw new Error('Failed to connect to database');
    }
  }

  async getTables() {
    let connection;
    try {
      connection = await this.getConnection();
      const [rows] = await connection.execute('SHOW TABLES');
      const tables = rows.map(row => ({
        name: Object.values(row)[0]
      }));

      // Get columns for each table
      for (let table of tables) {
        const [columns] = await connection.execute(`SHOW COLUMNS FROM ${table.name}`);
        table.columns = columns.map(col => ({
          name: col.Field,
          type: col.Type,
          isPrimary: col.Key === 'PRI'
        }));
      }

      return tables;
    } catch (error) {
      console.error('Error getting tables:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  async getData(tableName, filters = {}) {
    let connection;
    try {
      connection = await this.getConnection();
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
        data: rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting data:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  async insertData(tableName, data) {
    let connection;
    try {
      connection = await this.getConnection();
      const columns = Object.keys(data).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);

      const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
      const [result] = await connection.execute(query, values);

      return {
        success: true,
        data: { ...data, id: result.insertId }
      };
    } catch (error) {
      console.error('Error inserting data:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  async createTable(tableDefinition) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // Always add id as primary key
      let query = `CREATE TABLE \`${tableDefinition.name}\` (
        \`id\` INTEGER NOT NULL AUTO_INCREMENT,`;
      
      // Convert user's simple column names into proper MySQL columns
      const columnDefinitions = tableDefinition.columns.map(column => {
        // Default all fields to VARCHAR(255) for simplicity
        return `\`${column.name}\` VARCHAR(255)`;
      });
      
      // Add all columns and primary key
      query += columnDefinitions.join(', ');
      query += ', PRIMARY KEY (`id`))';

      console.log('Creating table with query:', query);

      // Execute the query
      await connection.execute(query);
      
      return {
        success: true,
        message: `Table ${tableDefinition.name} created successfully`
      };
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }
}

module.exports = new MySQLDatabaseService(); 