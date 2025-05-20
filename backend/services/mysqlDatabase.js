const mysql = require('mysql2');
const dbConfig = require('../config/database');
const TABLE_DEFINITIONS = require('./tableDefinitions');

class MySQLDatabaseService {
  constructor() {
    this.config = dbConfig;
    console.log('Initializing MySQL Database Service with config:', {
      host: this.config.host,
      user: this.config.user,
      database: this.config.database,
      port: this.config.port
    });
    this.pool = mysql.createPool(this.config).promise();
  }

  async getConnection() {
    try {
      console.log('Getting database connection from pool...');
      const connection = await this.pool.getConnection();
      console.log('Successfully obtained database connection');
      return connection;
    } catch (error) {
      console.error('Failed to get database connection:', error);
      throw error;
    }
  }

  async getTables() {
    let connection;
    try {
      console.log('Getting connection for getTables...');
      connection = await this.getConnection();
      console.log('Connection obtained successfully');
      
      // Create table_order table if it doesn't exist
      console.log('Creating table_order table if not exists...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS table_order (
          id INT AUTO_INCREMENT PRIMARY KEY,
          table_name VARCHAR(255) NOT NULL,
          display_order INT NOT NULL,
          UNIQUE KEY unique_table_name (table_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('table_order table created/verified');

      // Create table_relationships table if it doesn't exist
      console.log('Creating table_relationships table if not exists...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS table_relationships (
          id INT AUTO_INCREMENT PRIMARY KEY,
          main_table_name VARCHAR(255) NOT NULL,
          secondary_table_name VARCHAR(255) NOT NULL,
          relationship_type VARCHAR(50) DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_relationship (main_table_name, secondary_table_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('table_relationships table created/verified');
      
      // Get tables with their order
      console.log('Fetching tables from information_schema...');
      const [tables] = await connection.execute(`
        SELECT DISTINCT 
          t.TABLE_NAME,
          t.TABLE_TYPE,
          tord.display_order
        FROM information_schema.TABLES t
        LEFT JOIN table_order tord ON LOWER(t.table_name) = LOWER(tord.table_name)
        WHERE t.TABLE_SCHEMA = DATABASE()
          AND t.TABLE_NAME NOT IN ('table_order', 'table_relationships', 'policy_status')
          AND t.TABLE_TYPE = 'BASE TABLE'
        ORDER BY tord.display_order IS NULL, tord.display_order, t.TABLE_NAME
      `);
      console.log('Found tables:', tables.map(t => t.TABLE_NAME));

      // Get columns for each table
      console.log('Getting columns for each table...');
      const tablesWithColumns = await Promise.all(tables.map(async (table) => {
        try {
          console.log(`Getting columns for table ${table.TABLE_NAME}...`);
          const [columns] = await connection.execute(
            'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE() ORDER BY ORDINAL_POSITION',
            [table.TABLE_NAME]
          );
          console.log(`Got ${columns.length} columns for table ${table.TABLE_NAME}`);

          // Get relationships for this table
          console.log(`Getting relationships for table ${table.TABLE_NAME}...`);
          const [relationships] = await connection.execute(
            'SELECT * FROM table_relationships WHERE LOWER(main_table_name) = LOWER(?) OR LOWER(secondary_table_name) = LOWER(?)',
            [table.TABLE_NAME, table.TABLE_NAME]
          );
          console.log(`Found ${relationships.length} relationships for table ${table.TABLE_NAME}`);

          const isMainTable = relationships.some(rel => rel.main_table_name.toLowerCase() === table.TABLE_NAME.toLowerCase());
          const isSecondaryTable = relationships.some(rel => rel.secondary_table_name.toLowerCase() === table.TABLE_NAME.toLowerCase());

          return {
            name: table.TABLE_NAME,
            columns: columns.map(col => ({
              name: col.COLUMN_NAME,
              type: col.DATA_TYPE.toUpperCase(),
              nullable: col.IS_NULLABLE === 'YES',
              key: col.COLUMN_KEY
            })),
            isMainTable,
            isSecondaryTable
          };
        } catch (error) {
          console.error(`Error processing table ${table.TABLE_NAME}:`, {
            message: error.message,
            stack: error.stack,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
          });
          throw error;
        }
      }));

      console.log('Successfully processed all tables');
      return tablesWithColumns;
    } catch (error) {
      console.error('Detailed error in getTables:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState
      });
      throw error;
    } finally {
      if (connection) {
        console.log('Releasing connection...');
        connection.release();
        console.log('Connection released');
      }
    }
  }

  async executeQuery(query, values = []) {
    let connection;
    try {
      console.log('Executing query:', query);
      console.log('Query values:', values);
      
      connection = await this.getConnection();
      const [results] = await connection.execute(query, values);
      
      console.log('Query executed successfully. Results count:', results.length);
      return results;
    } catch (error) {
      console.error('Error executing query:', {
        error: error.message,
        query,
        values
      });
      throw error;
    } finally {
      if (connection) {
        console.log('Releasing database connection');
        connection.release();
      }
    }
  }

  async getData(tableName) {
    let connection;
    try {
      connection = await this.getConnection();
      const query = `SELECT * FROM \`${tableName}\``;
      const [rows] = await connection.execute(query);
      
      return {
        table: tableName,
        data: rows,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting data:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async insertData(tableName, data) {
    let connection;
    try {
      connection = await this.getConnection();

      // Handle both single object and array of objects
      const dataArray = Array.isArray(data) ? data : [data];
      
      const results = [];
      for (const item of dataArray) {
        // Create a copy of data to avoid modifying the original
        const cleanedData = {};
        
        // Get table structure
        const [tableColumns] = await connection.execute(
          'SHOW COLUMNS FROM `' + tableName + '`',
          []
        );

        // Clean and validate data based on column types
        tableColumns.forEach(column => {
          const value = item[column.Field];
          
          if (value === undefined || value === null || value === '') {
            cleanedData[column.Field] = null;
            return;
          }

          // Handle different column types
          if (column.Type.includes('int')) {
            cleanedData[column.Field] = parseInt(value) || null;
          } else if (column.Type.includes('decimal')) {
            const numStr = value.toString().replace(/[$,]/g, '');
            cleanedData[column.Field] = parseFloat(numStr) || null;
          } else if (column.Type.includes('varchar')) {
            const maxLength = parseInt(column.Type.match(/\((\d+)\)/)?.[1]) || 255;
            cleanedData[column.Field] = String(value).substring(0, maxLength);
          } else if (column.Type.includes('date')) {
            try {
              if (typeof value === 'string') {
                if (value.includes('/')) {
                  const [day, month, year] = value.split('/');
                  cleanedData[column.Field] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                } else if (value.includes('-')) {
                  cleanedData[column.Field] = value;
                }
              } else if (value instanceof Date) {
                cleanedData[column.Field] = value.toISOString().split('T')[0];
              }
            } catch (e) {
              console.warn(`Failed to parse date: ${value}`, e);
              cleanedData[column.Field] = null;
            }
          } else {
            cleanedData[column.Field] = value;
          }
        });

        // Remove id if present
        delete cleanedData.id;

        // Get only the columns that exist in the data
        const insertColumns = Object.keys(cleanedData);
        const values = Object.values(cleanedData);
        const placeholders = insertColumns.map(() => '?').join(',');
        
        // Build the query with proper escaping
        const query = `INSERT INTO \`${tableName}\` (\`${insertColumns.join('`,`')}\`) VALUES (${placeholders})`;
        console.log('Insert query:', query);
        console.log('Values:', values);
        
        const [result] = await connection.execute(query, values);
        results.push({
          ...result,
          insertId: result.insertId
        });

        // If this table has relationships, handle them
        const [relationships] = await connection.execute(
          'SELECT * FROM table_relationships WHERE main_table_name = ? OR secondary_table_name = ?',
          [tableName, tableName]
        );

        if (relationships.length > 0) {
          console.log(`Table ${tableName} has relationships:`, relationships);
        }
      }
      
      return {
        success: true,
        message: `Data inserted successfully into ${tableName}`,
        results,
        insertedIds: results.map(r => r.insertId)
      };
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  async createTable(tableDefinition) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // Build the CREATE TABLE query
      let query = `CREATE TABLE IF NOT EXISTS \`${tableDefinition.name}\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,`;
      
      // Add column definitions
      const columnDefinitions = tableDefinition.columns.map(column => {
        // Skip status column for individual tables
        if (column.name === 'status') return null;
        return `\`${column.name}\` ${column.type}`;
      }).filter(Boolean); // Remove null entries
      
      query += columnDefinitions.join(',\n');
      query += ',\nPRIMARY KEY (`id`)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;';
      
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
      if (connection) connection.release();
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
      if (connection) connection.release();
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
        // If id column doesn't exist, add it
        await connection.execute(
          `ALTER TABLE \`${tableName}\` 
           ADD COLUMN \`id\` INT NOT NULL AUTO_INCREMENT FIRST,
           ADD PRIMARY KEY (\`id\`)`
        );
        console.log(`Added id column to table ${tableName}`);
      } else {
        const idColumn = columns[0];
        if (!idColumn.EXTRA.includes('auto_increment')) {
          // Drop primary key if it exists
          try {
            await connection.execute(`ALTER TABLE \`${tableName}\` DROP PRIMARY KEY`);
          } catch (e) {
            // Primary key might not exist, continue
            console.log('No primary key to drop');
          }
          
          // Modify id column to be AUTO_INCREMENT
          await connection.execute(
            `ALTER TABLE \`${tableName}\` 
             MODIFY COLUMN \`id\` INT NOT NULL AUTO_INCREMENT FIRST,
             ADD PRIMARY KEY (\`id\`)`
          );
          console.log(`Modified id column in table ${tableName} to be AUTO_INCREMENT`);
        }
      }
      
      return {
        success: true,
        message: `Table ${tableName} structure updated successfully`
      };
    } catch (error) {
      console.error('Error modifying table structure:', error);
      throw error;
    } finally {
      if (connection) connection.release();
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
      
      // Get column type
      const [columnInfo] = await connection.execute(
        `SHOW COLUMNS FROM \`${tableName}\` WHERE Field = ?`,
        [column]
      );
      
      let processedValue = value;
      
      // Handle different data types
      if (columnInfo && columnInfo[0]) {
        const columnType = columnInfo[0].Type.toUpperCase();
        
        // Handle numeric values
        if (typeof value === 'string' && !isNaN(value) && 
            (columnType.includes('INT') || columnType.includes('DECIMAL') || columnType.includes('FLOAT'))) {
          processedValue = parseFloat(value);
        }
        
        // Handle date values
        if (columnType.includes('DATE') && typeof value === 'string') {
          // Check if the value is in DD/MM/YYYY format
          const dateMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (dateMatch) {
            // Convert to YYYY-MM-DD format for MySQL
            const [_, day, month, year] = dateMatch;
            processedValue = `${year}-${month}-${day}`;
          }
        }
      }
      
      const query = `UPDATE \`${tableName}\` SET \`${column}\` = ? WHERE id = ?`;
      const [result] = await connection.execute(query, [processedValue, id]);
      
      if (result.affectedRows === 0) {
        throw new Error(`No record found with id ${id}`);
      }
      
      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('Error updating data:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async addColumn(tableName, columnData) {
    let connection;
    try {
      connection = await this.getConnection();
      
      const query = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnData.name}\` ${columnData.type}`;
      console.log('Executing query:', query);
      
      await connection.execute(query);
      
      return {
        success: true,
        message: `Column ${columnData.name} added successfully to ${tableName}`
      };
    } catch (error) {
      console.error('Error adding column:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async deleteColumn(tableName, columnName) {
    let connection;
    try {
      connection = await this.getConnection();
      const query = `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`;
      await connection.execute(query);
      return { success: true, message: `Column ${columnName} deleted successfully` };
    } catch (error) {
      console.error('Error deleting column:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async renameColumn(tableName, oldName, newName) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // First get the column type and other properties
      const [columns] = await connection.execute(
        'SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?',
        [tableName, oldName]
      );
      
      if (columns.length === 0) {
        throw new Error(`Column ${oldName} not found in table ${tableName}`);
      }
      
      const column = columns[0];
      const nullable = column.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultValue = column.COLUMN_DEFAULT ? `DEFAULT ${column.COLUMN_DEFAULT}` : '';
      const extra = column.EXTRA ? column.EXTRA : '';
      
      const query = `ALTER TABLE ${tableName} CHANGE COLUMN ${oldName} ${newName} ${column.COLUMN_TYPE} ${nullable} ${defaultValue} ${extra}`.trim();
      await connection.execute(query);
      
      return { success: true, message: `Column renamed from ${oldName} to ${newName} successfully` };
    } catch (error) {
      console.error('Error renaming column:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async setColumnTag(tableName, columnName, tag) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // First check if the column exists
      const [columns] = await connection.execute(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND COLUMN_NAME = ?',
        [tableName, columnName]
      );
      
      if (columns.length === 0) {
        throw new Error(`Column ${columnName} not found in table ${tableName}`);
      }
      
      // Store the tag in a metadata table
      await connection.execute(
        `INSERT INTO column_metadata (table_name, column_name, tag) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE tag = ?`,
        [tableName, columnName, tag, tag]
      );
      
      return { success: true, message: `Tag set for column ${columnName} successfully` };
    } catch (error) {
      console.error('Error setting column tag:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async deleteRow(tableName, id) {
    let connection;
    try {
      connection = await this.getConnection();
      const query = `DELETE FROM ${tableName} WHERE id = ?`;
      const [result] = await connection.execute(query, [id]);
      
      return {
        success: true,
        affectedRows: result.affectedRows
      };
    } catch (error) {
      console.error('Error deleting row:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async deleteTable(tableName) {
    let connection;
    try {
      connection = await this.getConnection();

      // Primero eliminar las relaciones donde la tabla es principal o secundaria
      await connection.execute(
        'DELETE FROM table_relationships WHERE main_table_name = ? OR secondary_table_name = ?',
        [tableName, tableName]
      );

      // Luego eliminar la tabla
      const query = `DROP TABLE IF EXISTS \`${tableName}\``;
      await connection.execute(query);
      
      return { 
        success: true, 
        message: `Table ${tableName} deleted successfully` 
      };
    } catch (error) {
      console.error('Error deleting table:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async getTableRelationships() {
    let connection;
    try {
      connection = await this.getConnection();
      const [relationships] = await connection.execute(
        'SELECT * FROM table_relationships ORDER BY created_at DESC'
      );
      return relationships;
    } catch (error) {
      console.error('Error getting table relationships:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async createTableRelationship(mainTableName, secondaryTableName) {
    let connection;
    try {
      connection = await this.getConnection();
      const [result] = await connection.execute(
        'INSERT INTO table_relationships (main_table_name, secondary_table_name) VALUES (?, ?)',
        [mainTableName, secondaryTableName]
      );
      return {
        success: true,
        message: 'Table relationship created successfully',
        id: result.insertId
      };
    } catch (error) {
      console.error('Error creating table relationship:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async deleteTableRelationship(mainTableName, secondaryTableName) {
    let connection;
    try {
      connection = await this.getConnection();
      await connection.execute(
        'DELETE FROM table_relationships WHERE main_table_name = ? AND secondary_table_name = ?',
        [mainTableName, secondaryTableName]
      );
      return {
        success: true,
        message: 'Table relationship deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting table relationship:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async updateTableRelationshipName(oldName, newName) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // Actualizar si es tabla principal
      await connection.execute(
        'UPDATE table_relationships SET main_table_name = ? WHERE main_table_name = ?',
        [newName, oldName]
      );
      
      // Actualizar si es tabla secundaria
      await connection.execute(
        'UPDATE table_relationships SET secondary_table_name = ? WHERE secondary_table_name = ?',
        [newName, oldName]
      );

      return {
        success: true,
        message: 'Table relationships updated successfully'
      };
    } catch (error) {
      console.error('Error updating table relationships:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async renameTable(oldName, newName) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // Primero verificar si la tabla está en alguna relación
      const [relationships] = await connection.execute(
        'SELECT * FROM table_relationships WHERE main_table_name = ? OR secondary_table_name = ?',
        [oldName, oldName]
      );

      // Renombrar la tabla
      const query = `RENAME TABLE \`${oldName}\` TO \`${newName}\``;
      await connection.execute(query);
      
      // Si la tabla está en alguna relación, actualizar el nombre
      if (relationships.length > 0) {
        // Actualizar nombre en relaciones como tabla principal
        await connection.execute(
          'UPDATE table_relationships SET main_table_name = ? WHERE main_table_name = ?',
          [newName, oldName]
        );
        
        // Actualizar nombre en relaciones como tabla secundaria
        await connection.execute(
          'UPDATE table_relationships SET secondary_table_name = ? WHERE secondary_table_name = ?',
          [newName, oldName]
        );

        console.log(`Updated relationships for renamed table ${oldName} to ${newName}`);
      }

      return {
        success: true,
        message: `Table renamed from ${oldName} to ${newName} successfully`
      };
    } catch (error) {
      console.error('Error renaming table:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async createTableGroup(mainTableName, secondaryTableName, groupType = 'default') {
    let connection;
    try {
      connection = await this.getConnection();

      // Clean table names
      const cleanMainTableName = mainTableName.replace(/[\[\]]/g, '_');
      const cleanSecondaryTableName = secondaryTableName.replace(/[\[\]]/g, '_');

      // Start transaction
      await connection.beginTransaction();

      // Get table definition based on group type
      const tableDefinition = TABLE_DEFINITIONS[groupType.toUpperCase()];
      if (!tableDefinition) {
        throw new Error(`Invalid group type: ${groupType}`);
      }

      if (tableDefinition.main && tableDefinition.secondary) {
        // Create main table
        const mainTableColumns = [
          'id INT NOT NULL AUTO_INCREMENT',
          ...tableDefinition.main.columns.map(col => {
            let colDef = `\`${col.name}\` ${col.type}`;
            if (col.nullable === false) colDef += ' NOT NULL';
            if (col.default) colDef += ` DEFAULT '${col.default}'`;
            return colDef;
          }),
          'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
          'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
          'PRIMARY KEY (id)'
        ];

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS \`${cleanMainTableName}\` (
            ${mainTableColumns.join(',\n')}
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Create secondary table
        const secondaryTableColumns = [
          'id INT NOT NULL AUTO_INCREMENT',
          ...tableDefinition.secondary.columns.map(col => {
            let colDef = `\`${col.name}\` ${col.type}`;
            if (col.nullable === false) colDef += ' NOT NULL';
            if (col.default) colDef += ` DEFAULT '${col.default}'`;
            return colDef;
          }),
          'main_table_id INT',
          'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
          'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
          'PRIMARY KEY (id)',
          `FOREIGN KEY (main_table_id) REFERENCES \`${cleanMainTableName}\`(id) ON DELETE CASCADE`
        ];

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS \`${cleanSecondaryTableName}\` (
            ${secondaryTableColumns.join(',\n')}
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Register the relationship
        await connection.execute(`
          INSERT INTO table_relationships 
          (main_table_name, secondary_table_name, relationship_type, created_at) 
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `, [mainTableName, secondaryTableName, `${groupType.toLowerCase()}_policy`]);

      } else {
        // Create single table
        const tableColumns = [
          'id INT NOT NULL AUTO_INCREMENT',
          ...tableDefinition.columns.map(col => {
            let colDef = `\`${col.name}\` ${col.type}`;
            if (col.nullable === false) colDef += ' NOT NULL';
            if (col.default) colDef += ` DEFAULT '${col.default}'`;
            return colDef;
          }),
          'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
          'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
          'PRIMARY KEY (id)'
        ];

        await connection.execute(`
          CREATE TABLE IF NOT EXISTS \`${cleanMainTableName}\` (
            ${tableColumns.join(',\n')}
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      }

      // Commit transaction
      await connection.commit();

      return {
        success: true,
        message: `Table group created: ${mainTableName}${secondaryTableName ? ` and ${secondaryTableName}` : ''}`,
        tables: {
          main: mainTableName,
          secondary: secondaryTableName,
          type: groupType
        }
      };
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error creating table group:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async removeStatusFromIndividualTables() {
    let connection;
    try {
      connection = await this.getConnection();

      // Obtener todas las tablas que no están en relaciones
      const [tables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME NOT IN (
          SELECT main_table_name FROM table_relationships
          UNION
          SELECT secondary_table_name FROM table_relationships
        )
        AND TABLE_NAME != 'table_relationships'
      `);

      // Para cada tabla, verificar si tiene columna status y eliminarla
      for (const table of tables) {
        const tableName = table[`Tables_in_${this.config.database}`];
        
        // Verificar si la tabla tiene columna status
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ? 
          AND COLUMN_NAME = 'status'
        `, [tableName]);

        if (columns.length > 0) {
          // La tabla tiene columna status, eliminarla
          await connection.execute(`ALTER TABLE \`${tableName}\` DROP COLUMN status`);
          console.log(`Removed status column from table ${tableName}`);
        }
      }

      return {
        success: true,
        message: 'Status column removed from individual tables'
      };
    } catch (error) {
      console.error('Error removing status column:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async updateTableOrder(tableOrder) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // Create or update the table_order table if it doesn't exist
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS table_order (
          id INT AUTO_INCREMENT PRIMARY KEY,
          table_name VARCHAR(255) NOT NULL,
          display_order INT NOT NULL,
          UNIQUE KEY unique_table_name (table_name)
        )
      `);

      // Start a transaction
      await connection.beginTransaction();

      try {
        // Clear existing order
        await connection.execute('DELETE FROM table_order');

        // Insert new order
        for (let i = 0; i < tableOrder.length; i++) {
          await connection.execute(
            'INSERT INTO table_order (table_name, display_order) VALUES (?, ?)',
            [tableOrder[i], i]
          );
        }

        // Commit the transaction
        await connection.commit();
      } catch (error) {
        // If there's an error, rollback the transaction
        await connection.rollback();
        throw error;
      }
      
      return { success: true, message: 'Table order updated successfully' };
    } catch (error) {
      console.error('Error updating table order:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new MySQLDatabaseService(); 