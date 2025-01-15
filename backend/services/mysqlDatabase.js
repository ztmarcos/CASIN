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

  async executeQuery(query, values = []) {
    let connection;
    try {
      connection = await this.getConnection();
      const [results] = await connection.execute(query, values);
      return results;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
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

      // Create a copy of data to avoid modifying the original
      const cleanedData = { ...data };

      // Remove id if it's null or empty string
      if (cleanedData.id === null || cleanedData.id === '') {
        delete cleanedData.id;
      }

      // Clean numeric values
      const numericColumns = ['prima_neta', 'derecho_de_p__liza', 'i_v_a__16_', 
        'recargo_por_pago_fraccionado', 'importe_total_a_pagar', 'monto_parcial'];
      
      for (const column of numericColumns) {
        if (column in cleanedData) {
          let value = cleanedData[column];
          
          // Skip null values
          if (value === null) {
            cleanedData[column] = 0;
            continue;
          }

          // Convert to string if it's a number
          if (typeof value === 'number') {
            value = value.toString();
          }

          // Only try to clean if it's a string
          if (typeof value === 'string') {
            // Remove currency symbols and commas
            const cleanValue = value.replace(/[$,]/g, '');
            cleanedData[column] = parseFloat(cleanValue) || 0;
          } else {
            // For any other type, set to 0
            cleanedData[column] = 0;
          }
        }
      }

      const columns = Object.keys(cleanedData);
      const values = Object.values(cleanedData);
      const placeholders = columns.map(() => '?').join(',');
      
      const query = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;
      console.log('Insert query:', query);
      console.log('Values:', values);
      
      const [result] = await connection.execute(query, values);
      
      return {
        success: true,
        insertId: result.insertId
      };
    } catch (error) {
      console.error('Database error:', error);
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