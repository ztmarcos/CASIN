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

      // Handle both single object and array of objects
      const dataArray = Array.isArray(data) ? data : [data];
      
      for (const item of dataArray) {
        // Create a copy of data to avoid modifying the original
        const cleanedData = { ...item };

        // Always remove id field to let AUTO_INCREMENT handle it
        delete cleanedData.id;

        const columns = Object.keys(cleanedData);
        const values = Object.values(cleanedData);
        const placeholders = columns.map(() => '?').join(',');
        
        const query = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;
        console.log('Insert query:', query);
        console.log('Values:', values);
        
        await connection.execute(query, values);
      }
      
      return {
        success: true,
        message: `Data inserted successfully into ${tableName}`
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
      
      // Build the CREATE TABLE query
      let query = `CREATE TABLE IF NOT EXISTS \`${tableDefinition.name}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,`;
      
      // Add column definitions
      const columnDefinitions = tableDefinition.columns.map(column => {
        return `\`${column.name}\` ${column.type}`;
      });
      
      query += columnDefinitions.join(',\n');
      query += '\n)';
      
      console.log('Creating table with query:', query);

      // Create the table
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

  /**
   * Updates a single cell value in a table
   * @param {string} tableName - The name of the table
   * @param {number} id - The ID of the record to update
   * @param {string} column - The column to update
   * @param {any} value - The new value
   * @returns {Promise<Object>} Result of the update operation
   */
  async updateData(tableName, id, column, value) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // Clean numeric values
      if (typeof value === 'string' && !isNaN(value)) {
        value = parseFloat(value);
      }
      
      const query = `UPDATE ${tableName} SET ${column} = ? WHERE id = ?`;
      const [result] = await connection.execute(query, [value, id]);
      
      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('Error updating data:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

module.exports = new MySQLDatabaseService(); 