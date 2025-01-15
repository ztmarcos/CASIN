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

      // Handle non-limit filters
      const { limit, ...otherFilters } = filters;

      // Add filters if they exist
      if (Object.keys(otherFilters).length > 0) {
        Object.entries(otherFilters).forEach(([key, value]) => {
          if (value) {
            filterConditions.push(`${key} = ?`);
            values.push(value);
          }
        });
        
        if (filterConditions.length > 0) {
          query += ' WHERE ' + filterConditions.join(' AND ');
        }
      }

      // Add LIMIT clause if specified - directly in query
      if (limit) {
        query += ` LIMIT ${parseInt(limit)}`;
      }

      console.log('Executing query:', query, 'with values:', values);
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

      // Always remove id field to let AUTO_INCREMENT handle it
      delete cleanedData.id;

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

  async updateColumnOrder(tableName, columnOrder) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // Get current table structure
      const [columns] = await connection.execute(
        'SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()',
        [tableName]
      );

      // Build ALTER TABLE statement
      let alterQuery = `ALTER TABLE ${tableName}`;
      
      columnOrder.forEach((colName, index) => {
        // Find matching column
        const col = columns.find(c => c.COLUMN_NAME === colName);
        if (!col) {
          throw new Error(`Column ${colName} not found`);
        }

        // Add MODIFY COLUMN clause
        if (index === 0) {
          alterQuery += ` MODIFY COLUMN \`${colName}\` ${col.COLUMN_TYPE}${col.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''} FIRST`;
        } else {
          alterQuery += `, MODIFY COLUMN \`${colName}\` ${col.COLUMN_TYPE}${col.IS_NULLABLE === 'NO' ? ' NOT NULL' : ''} AFTER \`${columnOrder[index - 1]}\``;
        }
      });

      console.log('Executing query:', alterQuery);
      await connection.execute(alterQuery);
      
      return { success: true, message: 'Column order updated successfully' };
    } catch (error) {
      console.error('Error updating column order:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }

  async modifyTableStructure(tableName) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // First, check if id column exists and if it's already AUTO_INCREMENT
      const [columns] = await connection.execute(
        'SELECT COLUMN_NAME, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = ?',
        [tableName, 'id']
      );

      if (columns.length === 0) {
        throw new Error('id column not found');
      }

      const idColumn = columns[0];
      if (!idColumn.EXTRA.includes('auto_increment')) {
        // Drop primary key if it exists
        await connection.execute(`ALTER TABLE ${tableName} DROP PRIMARY KEY`);
        
        // Modify id column to be AUTO_INCREMENT
        await connection.execute(
          `ALTER TABLE ${tableName} MODIFY COLUMN id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY`
        );
      }
      
      return {
        success: true,
        message: `Table ${tableName} structure updated successfully`
      };
    } catch (error) {
      console.error('Error modifying table structure:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }
}

module.exports = new MySQLDatabaseService(); 