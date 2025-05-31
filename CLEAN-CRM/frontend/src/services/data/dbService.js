import { API_URL } from '../../config/api.js';

const API_BASE_URL = API_URL;

const mysql = require('mysql2/promise');

class DatabaseService {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'crud_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    this.testConnection();
  }

  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      console.log('✅ Database connected successfully');
      connection.release();
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      // Don't throw error, just log it
    }
  }

  async createTable(tableDefinition) {
    const { name, columns } = tableDefinition;
    
    try {
      // Create column definitions
      const columnDefs = columns.map(col => {
        let def = `${col.name} ${col.type}`;
        
        if (col.primaryKey) {
          def += ' PRIMARY KEY';
        }
        if (col.autoIncrement) {
          def += ' AUTO_INCREMENT';
        }
        if (col.defaultValue) {
          def += ` DEFAULT ${col.defaultValue}`;
        }
        if (col.onUpdate) {
          def += ` ON UPDATE ${col.onUpdate}`;
        }
        if (col.references) {
          def += ` REFERENCES ${col.references.table}(${col.references.column})`;
        }
        
        return def;
      }).join(', ');

      // Create table query
      const query = `CREATE TABLE IF NOT EXISTS ${name} (${columnDefs})`;
      
      // Execute query
      await this.pool.execute(query);
      
      return { success: true, message: `Table ${name} created successfully` };
    } catch (error) {
      console.error('Error creating table:', error);
      throw new Error(`Failed to create table ${name}: ${error.message}`);
    }
  }

  async createTableGroup(mainTableName, secondaryTableName) {
    try {
      // Create main table
      const mainTable = {
        name: mainTableName,
        columns: [
          { name: 'id', type: 'INT', primaryKey: true, autoIncrement: true },
          { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }
        ]
      };

      // Create secondary table
      const secondaryTable = {
        name: secondaryTableName,
        columns: [
          { name: 'id', type: 'INT', primaryKey: true, autoIncrement: true },
          { name: 'main_table_id', type: 'INT', references: { table: mainTableName, column: 'id' } },
          { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP' },
          { name: 'updated_at', type: 'TIMESTAMP', defaultValue: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }
        ]
      };

      // Create both tables
      await this.createTable(mainTable);
      await this.createTable(secondaryTable);

      return {
        success: true,
        message: 'Table group created successfully',
        tables: { main: mainTable, secondary: secondaryTable }
      };
    } catch (error) {
      console.error('Error creating table group:', error);
      throw new Error(`Failed to create table group: ${error.message}`);
    }
  }

  async getAllTables() {
    try {
      // Get all tables from the database
      const [rows] = await this.pool.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = ?
      `, [process.env.DB_NAME || 'x4_db']);

      return rows.map(row => ({
        name: row.table_name,
        isMainTable: false,
        isSecondaryTable: false
      }));
    } catch (error) {
      console.error('Error getting all tables:', error);
      throw new Error(`Failed to get tables: ${error.message}`);
    }
  }
}

const dbService = new DatabaseService();
module.exports = dbService; 