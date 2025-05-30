const mysql = require('mysql2');
const dbConfig = require('../config/database');

// Table type definitions
const TABLE_DEFINITIONS = {
  'GRUPAL': {
    main: {
      columns: [
        { name: 'name', type: 'VARCHAR(255)', nullable: false },
        { name: 'description', type: 'TEXT', nullable: true },
        { name: 'status', type: 'VARCHAR(50)', nullable: false, default: 'active' }
      ]
    },
    secondary: {
      columns: [
        { name: 'name', type: 'VARCHAR(255)', nullable: false },
        { name: 'description', type: 'TEXT', nullable: true },
        { name: 'status', type: 'VARCHAR(50)', nullable: false, default: 'active' }
      ]
    }
  },
  'INDIVIDUAL': {
    columns: [
      { name: 'name', type: 'VARCHAR(255)', nullable: false },
      { name: 'description', type: 'TEXT', nullable: true },
      { name: 'status', type: 'VARCHAR(50)', nullable: false, default: 'active' }
    ]
  }
};

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
      connection = await this.getConnection();
      
      // First get all tables
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

      // Get all relationships at once to avoid multiple queries
      const [relationships] = await connection.execute(
        'SELECT * FROM table_relationships'
      );

      // Process tables with their relationships
      const processedTables = await Promise.all(tables.map(async (table) => {
        const tableName = table.TABLE_NAME.toLowerCase();
        
        // Find relationships for this table
        const asMain = relationships.find(r => r.main_table_name.toLowerCase() === tableName);
        const asSecondary = relationships.find(r => r.secondary_table_name.toLowerCase() === tableName);

        // Get columns for the table
        const [columns] = await connection.execute(
          'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE() ORDER BY ORDINAL_POSITION',
          [table.TABLE_NAME]
        );

        return {
          name: table.TABLE_NAME,
          displayOrder: table.display_order,
          columns: columns.map(col => ({
            name: col.COLUMN_NAME,
            type: col.DATA_TYPE,
            isNullable: col.IS_NULLABLE === 'YES',
            isPrimary: col.COLUMN_KEY === 'PRI'
          })),
          isMainTable: !!asMain,
          isSecondaryTable: !!asSecondary,
          relationshipType: asMain ? 'main' : (asSecondary ? 'secondary' : null),
          relatedTableName: asMain ? asMain.secondary_table_name : (asSecondary ? asSecondary.main_table_name : null)
        };
      }));

      return processedTables;
    } catch (error) {
      console.error('Error getting tables:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  async executeQuery(query, values = []) {
    let connection;
    try {
      console.log('Executing query:', query);
      console.log('Query values:', values);
      
      connection = await this.getConnection();
      
      // Transform values before executing query
      const transformedValues = values.map(value => {
        if (value === null || value === undefined) {
          return null;
        }
        if (typeof value === 'object' && !(value instanceof Date)) {
          return JSON.stringify(value);
        }
        if (value instanceof Date) {
          return value.toISOString().split('T')[0];
        }
        return value;
      });
      
      console.log('Transformed values:', transformedValues);
      const [results] = await connection.execute(query, transformedValues);
      
      console.log('Query executed successfully. Results:', results);
      return results;
    } catch (error) {
      console.error('Error executing query:', {
        error: error.message,
        query,
        values,
        stack: error.stack
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
    let lastValues = null; // track values used in the last query for debugging
    try {
        console.log('Starting insertData with:', {
            tableName,
            data: JSON.stringify(data, null, 2)
        });
        
        connection = await this.pool.getConnection();
        
        // Verify table exists
        const [tables] = await connection.execute(
            'SHOW TABLES LIKE ?',
            [tableName]
        );
        
        if (!tables || tables.length === 0) {
            throw new Error(`Table '${tableName}' does not exist`);
        }
        
        // Get table structure
        const [columns] = await connection.execute(
            'SHOW COLUMNS FROM ' + connection.escapeId(tableName)
        );
        
        console.log('Table structure:', columns);
        
        // Normalise data: support single object or array of objects
        const dataArray = Array.isArray(data) ? data : [data];

        let affectedRows = 0;
        for (const record of dataArray) {
            const columnNames = [];
            const values = [];
            const placeholders = [];

            for (const column of columns) {
                if (column.Field === 'id') continue;

                let value = record[column.Field];
                if (value === undefined) continue;

                // Basic sanitisation for object/date types
                if (value === null) {
                    // leave as null
                } else if (typeof value === 'object' && !(value instanceof Date)) {
                    value = JSON.stringify(value);
                } else if (value instanceof Date) {
                    value = value.toISOString().split('T')[0];
                }

                // Add backticks directly to column names to avoid escaping issues
                columnNames.push(`\`${column.Field}\``);
                values.push(value);
                placeholders.push('?');
            }

            if (columnNames.length === 0) {
                console.warn('Skipping record with no valid columns:', record);
                continue;
            }

            // Use backticks directly for table name to avoid escaping issues
            const query = `INSERT INTO \`${tableName}\` (${columnNames.join(',')}) VALUES (${placeholders.join(',')})`;
                            
            console.log('Executing INSERT:', query, values);
            lastValues = values; // store for potential error reporting

            const [result] = await connection.execute(query, values);
            affectedRows += result.affectedRows;
        }
        
        return {
            success: true,
            message: `Data inserted successfully into ${tableName}`,
            affectedRows
        };
    } catch (error) {
        console.error('Error in insertData:', {
            error: error.message,
            stack: error.stack,
            queryString: typeof query !== 'undefined' ? query : undefined,
            values: lastValues
        });
        
        // Add better handling for SQL syntax errors
        if (error.message && error.message.includes('syntax')) {
            console.error('SQL SYNTAX ERROR DETAILS:');
            console.error('- Table name:', tableName);
            console.error('- Last query (if available):', typeof query !== 'undefined' ? query : 'UNKNOWN');
            console.error('- Values array length:', lastValues ? lastValues.length : 'NONE');
            console.error('- Values array content:', lastValues);
            error.sql = typeof query !== 'undefined' ? query : 'Query not available';
            error.valueCount = lastValues ? lastValues.length : 0;
        }

        // Attach additional debug info to error for upstream handling
        error.query = typeof query !== 'undefined' ? query : undefined;
        error.values = lastValues;
        throw error;
    } finally {
        if (connection) connection.release();
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
      
      // Clean and validate inputs
      const cleanTableName = tableName.trim().toLowerCase();
      const cleanColumn = column.trim();
      
      // Log the update attempt
      console.log('Attempting to update:', {
        tableName: cleanTableName,
        id,
        column: cleanColumn,
        value
      });

      // Get column type
      const [columnInfo] = await connection.execute(
        'SHOW COLUMNS FROM `' + cleanTableName + '` WHERE Field = ?',
        [cleanColumn]
      );
      
      if (!columnInfo || columnInfo.length === 0) {
        throw new Error(`Column ${cleanColumn} not found in table ${cleanTableName}`);
      }

      let processedValue = value;
      const columnType = columnInfo[0].Type.toUpperCase();
      
      // Handle different data types
      if (value !== null && value !== undefined) {
        if (columnType.includes('INT')) {
          processedValue = parseInt(value, 10);
          if (isNaN(processedValue)) {
            throw new Error(`Invalid integer value: ${value}`);
          }
        } else if (columnType.includes('DECIMAL') || columnType.includes('FLOAT')) {
          processedValue = parseFloat(value);
          if (isNaN(processedValue)) {
            throw new Error(`Invalid decimal value: ${value}`);
          }
        } else if (columnType.includes('DATE')) {
          // Handle different date formats
          const dateValue = new Date(value);
          if (isNaN(dateValue)) {
            throw new Error(`Invalid date value: ${value}`);
          }
          processedValue = dateValue.toISOString().split('T')[0];
        } else if (columnType.includes('JSON')) {
          // Handle JSON data
          try {
            if (typeof value === 'string') {
              processedValue = JSON.parse(value);
            }
            processedValue = JSON.stringify(processedValue);
          } catch (e) {
            throw new Error(`Invalid JSON value: ${value}`);
          }
        }
      } else {
        // Handle null values
        processedValue = null;
      }
      
      // Execute the update using a simpler query format
      const updateQuery = `UPDATE \`${cleanTableName}\` SET \`${cleanColumn}\` = ? WHERE id = ?`;
      console.log('Executing query:', updateQuery, [processedValue, id]);
      
      const [result] = await connection.execute(updateQuery, [processedValue, id]);
      
      if (result.affectedRows === 0) {
        throw new Error(`No record found with id ${id}`);
      }
      
      // Get the updated row to return
      const selectQuery = `SELECT * FROM \`${cleanTableName}\` WHERE id = ?`;
      const [updatedRow] = await connection.execute(selectQuery, [id]);
      
      return {
        success: true,
        message: 'Update successful',
        affectedRows: result.affectedRows,
        updatedData: updatedRow[0]
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
      
      // Start transaction
      await connection.beginTransaction();

      try {
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

        // Temporarily disable foreign key checks
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        // Rename the column
        const query = `ALTER TABLE \`${tableName}\` CHANGE COLUMN \`${oldName}\` \`${newName}\` ${column.COLUMN_TYPE} ${nullable} ${defaultValue} ${extra}`.trim();
        await connection.execute(query);

        // Check if this table has any relationships
        const [relationships] = await connection.execute(
          'SELECT * FROM table_relationships WHERE main_table_name = ? OR secondary_table_name = ?',
          [tableName, tableName]
        );

        // If this is a main table, update any foreign key references in secondary tables
        for (const rel of relationships) {
          if (rel.main_table_name === tableName) {
            // This is a main table, update foreign key in secondary table
            const [fkInfo] = await connection.execute(
              `SELECT CONSTRAINT_NAME, COLUMN_NAME 
               FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
               WHERE REFERENCED_TABLE_NAME = ? 
               AND REFERENCED_COLUMN_NAME = ? 
               AND TABLE_NAME = ?`,
              [tableName, oldName, rel.secondary_table_name]
            );

            if (fkInfo.length > 0) {
              // Drop the foreign key constraint
              await connection.execute(
                `ALTER TABLE \`${rel.secondary_table_name}\` 
                 DROP FOREIGN KEY \`${fkInfo[0].CONSTRAINT_NAME}\``
              );

              // Rename the column in the secondary table
              await connection.execute(
                `ALTER TABLE \`${rel.secondary_table_name}\` 
                 CHANGE COLUMN \`${fkInfo[0].COLUMN_NAME}\` \`${newName}\` ${column.COLUMN_TYPE}`
              );

              // Re-add the foreign key constraint
              await connection.execute(
                `ALTER TABLE \`${rel.secondary_table_name}\` 
                 ADD CONSTRAINT \`fk_${rel.secondary_table_name}_${newName}\` 
                 FOREIGN KEY (\`${newName}\`) 
                 REFERENCES \`${tableName}\`(\`${newName}\`) 
                 ON DELETE CASCADE`
              );
            }
          }
        }

        // Re-enable foreign key checks
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        // Commit transaction
        await connection.commit();
        
        return { success: true, message: `Column renamed from ${oldName} to ${newName} successfully` };
      } catch (error) {
        // If there's an error, rollback the transaction
        await connection.rollback();
        throw error;
      }
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

      // Start transaction
      await connection.beginTransaction();

      try {
        // First check if table exists
        const [tables] = await connection.execute(
          'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
          [tableName]
        );

        if (tables.length === 0) {
          throw new Error(`Table ${tableName} does not exist`);
        }

        // Temporarily disable foreign key checks
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

        // Delete any relationships where this table is involved
        await connection.execute(
          'DELETE FROM table_relationships WHERE main_table_name = ? OR secondary_table_name = ?',
          [tableName, tableName]
        );

        // Delete any entries in table_order
        await connection.execute(
          'DELETE FROM table_order WHERE table_name = ?',
          [tableName]
        );

        // Delete the table
        const query = `DROP TABLE IF EXISTS \`${tableName}\``;
        await connection.execute(query);

        // Re-enable foreign key checks
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

        // Commit transaction
        await connection.commit();
        
        return { 
          success: true, 
          message: `Table ${tableName} and its relationships deleted successfully` 
        };
      } catch (error) {
        // Rollback transaction on error
        await connection.rollback();
        // Make sure to re-enable foreign key checks even if there's an error
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        throw error;
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      throw new Error(`Failed to delete table ${tableName}: ${error.message}`);
    } finally {
      if (connection) {
        try {
          // Make absolutely sure foreign key checks are re-enabled
          await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        } catch (e) {
          console.error('Error re-enabling foreign key checks:', e);
        }
        connection.release();
      }
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

      if (groupType.toUpperCase() === 'GRUPAL') {
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

  async ensureTableHasAutoIncrementId(tableName) {
    let connection;
    try {
      connection = await this.getConnection();
      
      // Check if table has id column
      const [columns] = await connection.execute(
        'SHOW COLUMNS FROM `' + tableName + '` WHERE Field = "id"'
      );
      
      if (columns.length === 0) {
        // Add id column if it doesn't exist
        await connection.execute(
          'ALTER TABLE `' + tableName + '` ADD COLUMN id INT PRIMARY KEY AUTO_INCREMENT FIRST'
        );
      } else if (!columns[0].Extra.includes('auto_increment')) {
        // Modify id column to be auto_increment if it isn't
        await connection.execute(
          'ALTER TABLE `' + tableName + '` MODIFY id INT AUTO_INCREMENT PRIMARY KEY'
        );
      }
    } catch (error) {
      console.error('Error ensuring auto-increment id:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Simple and reliable data insertion function that minimizes SQL syntax issues
   */
  async insertDataSimple(tableName, data) {
    let connection;
    try {
      // Log what we're trying to insert
      console.log(`SIMPLE INSERT into ${tableName}:`, 
        JSON.stringify(data, null, 2).substring(0, 500) + '...');

      // Get a connection
      connection = await this.pool.getConnection();
      
      // Normalize data to array format
      const records = Array.isArray(data) ? data : [data];
      if (records.length === 0) {
        return { success: true, message: 'No records to insert', affectedRows: 0 };
      }
      
      // Process each record
      let totalAffected = 0;
      
      for (const record of records) {
        // Skip id from insertion
        const dataToInsert = { ...record };
        delete dataToInsert.id;
        
        if (Object.keys(dataToInsert).length === 0) {
          console.warn('Empty record, skipping');
          continue;
        }
        
        // Prepare column names and placeholders - with proper escaping
        const columns = Object.keys(dataToInsert)
          .map(col => `\`${col}\``) // Backtick-escape column names
          .join(', ');
          
        const placeholders = Object.keys(dataToInsert)
          .map(() => '?')
          .join(', ');
        
        // Extract values, converting objects to JSON strings
        const values = Object.values(dataToInsert).map(val => {
          if (val === null || val === undefined) return null;
          if (typeof val === 'object' && !(val instanceof Date)) return JSON.stringify(val);
          if (val instanceof Date) return val.toISOString().split('T')[0];
          return val;
        });
        
        // Construct the query - this format is guaranteed to be correct
        const query = `INSERT INTO \`${tableName}\` (${columns}) VALUES (${placeholders})`;
        
        console.log('Executing basic query:', query);
        console.log('With values:', values);
        
        // Execute the query
        const [result] = await connection.execute(query, values);
        totalAffected += result.affectedRows;
      }
      
      return {
        success: true,
        message: `Inserted ${totalAffected} rows into ${tableName}`,
        affectedRows: totalAffected
      };
    } catch (error) {
      console.error(`Error in insertDataSimple(${tableName}):`, error);
      error.simplifiedInsert = true; // Mark that we used the simplified version
      throw error; 
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new MySQLDatabaseService(); 