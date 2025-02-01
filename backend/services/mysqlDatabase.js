const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');

class MySQLDatabaseService {
  constructor() {
    this.config = dbConfig;
  }

  async getConnection() {
    return await mysql.createConnection(this.config);
  }

  async getTables() {
    let connection;
    try {
      connection = await this.getConnection();

      // Obtener todas las tablas
      const [tables] = await connection.execute(
        'SHOW TABLES'
      );

      // Obtener todas las relaciones
      const [relationships] = await connection.execute(
        'SELECT * FROM table_relationships'
      );

      // Procesar cada tabla y agregar información de relaciones
      const processedTables = await Promise.all(tables.map(async (tableRow) => {
        const tableName = tableRow[`Tables_in_${this.config.database}`];
        
        // Buscar si la tabla está en alguna relación
        const asMain = relationships.find(r => r.main_table_name === tableName);
        const asSecondary = relationships.find(r => r.secondary_table_name === tableName);

        // Obtener columnas de la tabla
        const [columns] = await connection.execute(
          `SHOW COLUMNS FROM \`${tableName}\``
        );

        return {
          name: tableName,
          isMainTable: !!asMain,
          isSecondaryTable: !!asSecondary,
          relatedTableName: asMain ? asMain.secondary_table_name : 
                           asSecondary ? asSecondary.main_table_name : null,
          relationshipType: asMain ? asMain.relationship_type : 
                          asSecondary ? asSecondary.relationship_type : null,
          columns: columns.map(col => ({
            name: col.Field,
            type: col.Type,
            nullable: col.Null === 'YES'
          }))
        };
      }));

      return processedTables;
    } catch (error) {
      console.error('Error getting tables:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
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
      
      const results = [];
      for (const item of dataArray) {
        // Create a copy of data to avoid modifying the original
        const cleanedData = {};
        
        // Check if this is a listado table insert
        if (tableName === 'listado') {
          // Special handling for listado table
          Object.entries(item).forEach(([key, value]) => {
            if (isNaN(key)) {
              cleanedData[key] = value;
            }
          });
        } else {
          // Normal table handling - keep all fields except id
          Object.entries(item).forEach(([key, value]) => {
            cleanedData[key] = value;
          });
        }

        // Remove id if present
        delete cleanedData.id;

        // Get only the columns that exist in the data
        const columns = Object.keys(cleanedData);
        const values = Object.values(cleanedData);
        const placeholders = columns.map(() => '?').join(',');
        
        // Use backticks to properly escape column names
        const query = `INSERT INTO \`${tableName}\` (\`${columns.join('`,`')}\`) VALUES (${placeholders})`;
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
      if (connection) await connection.end();
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
        await connection.end();
      }
    }
  }

  async addColumn(tableName, columnData) {
    let connection;
    try {
      connection = await this.getConnection();
      
      const query = `ALTER TABLE ${tableName} ADD COLUMN \`${columnData.name}\` ${columnData.type}`;
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
      if (connection) await connection.end();
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
      if (connection) {
        await connection.end();
      }
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
      if (connection) {
        await connection.end();
      }
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
      if (connection) {
        await connection.end();
      }
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
      if (connection) {
        await connection.end();
      }
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
      if (connection) {
        await connection.end();
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
      if (connection) await connection.end();
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
      if (connection) await connection.end();
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
      if (connection) await connection.end();
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
      if (connection) await connection.end();
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
      if (connection) await connection.end();
    }
  }

  async createTableGroup(mainTableName, secondaryTableName, groupType = 'default') {
    let connection;
    try {
      connection = await this.getConnection();

      // Limpiar los nombres de las tablas
      const cleanMainTableName = mainTableName.replace(/[\[\]]/g, '_');
      const cleanSecondaryTableName = secondaryTableName.replace(/[\[\]]/g, '_');

      // Iniciar transacción
      await connection.beginTransaction();

      if (groupType === 'GMM') {
        // Crear la tabla principal con estructura exacta de emant
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS \`${cleanMainTableName}\` (
            id INT NOT NULL AUTO_INCREMENT,
            numero_de_poliza INT,
            contratante VARCHAR(72),
            rfc VARCHAR(64),
            domicilio VARCHAR(117),
            desde_vigencia DATE,
            hasta_vigencia DATE,
            forma_de_pago VARCHAR(55),
            fecha_de_expedicion DATE,
            planes VARCHAR(87),
            suma_asegurada VARCHAR(94),
            deducible VARCHAR(59),
            coaseguro DATE,
            prima_neta VARCHAR(61),
            derecho_de_poliza VARCHAR(59),
            recargo_por_pago_fraccionado VARCHAR(61),
            prima_total VARCHAR(61),
            iva VARCHAR(60),
            total_a_pagar VARCHAR(61),
            nombre_del_agente VARCHAR(79),
            clave_zona VARCHAR(59),
            status VARCHAR(20) DEFAULT 'Vigente 🟢',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Crear la tabla secundaria con estructura exacta de listado
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS \`${cleanSecondaryTableName}\` (
            id INT NOT NULL AUTO_INCREMENT,
            numero_de_certificado VARCHAR(58),
            nombre_completo VARCHAR(81),
            sexo VARCHAR(51),
            edad VARCHAR(59),
            cobertura VARCHAR(53),
            suma_asegurada VARCHAR(60),
            prima VARCHAR(59),
            fecha_de_antiguedad DATE,
            status ENUM('Vigente 🟢','Baja 🔴') DEFAULT 'Vigente 🟢',
            main_table_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            FOREIGN KEY (main_table_id) REFERENCES \`${cleanMainTableName}\`(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      } else if (groupType === 'default') {
        // Crear la tabla principal con estructura de emant
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS \`${cleanMainTableName}\` (
            id INT NOT NULL AUTO_INCREMENT,
            numero_de_poliza INT,
            contratante VARCHAR(72),
            rfc VARCHAR(64),
            domicilio VARCHAR(117),
            desde_vigencia DATE,
            hasta_vigencia DATE,
            forma_de_pago VARCHAR(55),
            fecha_de_expedicion DATE,
            planes VARCHAR(87),
            suma_asegurada VARCHAR(94),
            deducible VARCHAR(59),
            coaseguro DATE,
            prima_neta VARCHAR(61),
            derecho_de_poliza VARCHAR(59),
            recargo_por_pago_fraccionado VARCHAR(61),
            prima_total VARCHAR(61),
            iva VARCHAR(60),
            total_a_pagar VARCHAR(61),
            nombre_del_agente VARCHAR(79),
            clave_zona VARCHAR(59),
            status VARCHAR(20) DEFAULT 'Vigente 🟢',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Crear la tabla secundaria con estructura de listado
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS \`${cleanSecondaryTableName}\` (
            id INT NOT NULL AUTO_INCREMENT,
            numero_de_certificado VARCHAR(58),
            nombre_completo VARCHAR(81),
            sexo VARCHAR(51),
            edad VARCHAR(59),
            cobertura VARCHAR(53),
            suma_asegurada VARCHAR(60),
            prima VARCHAR(59),
            fecha_de_antiguedad DATE,
            status VARCHAR(20) DEFAULT 'Vigente 🟢',
            main_table_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            FOREIGN KEY (main_table_id) REFERENCES \`${cleanMainTableName}\`(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
      } else {
        // Crear tabla principal básica
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS \`${cleanMainTableName}\` (
            id INT PRIMARY KEY AUTO_INCREMENT,
            nombre VARCHAR(100),
            descripcion TEXT,
            fecha DATE,
            monto DECIMAL(10,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);

        // Crear tabla secundaria básica
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS \`${cleanSecondaryTableName}\` (
            id INT PRIMARY KEY AUTO_INCREMENT,
            detalle VARCHAR(100),
            cantidad INT,
            precio DECIMAL(10,2),
            subtotal DECIMAL(10,2),
            main_table_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (main_table_id) REFERENCES \`${cleanMainTableName}\`(id) ON DELETE CASCADE
          )
        `);
      }

      // Registrar la relación con el tipo específico
      const relationType = groupType === 'GMM' ? 'gmm_policy' : 
                         groupType === 'default' ? 'emant_policy' : 
                         'group_policy';

      await connection.execute(`
        INSERT INTO table_relationships 
        (main_table_name, secondary_table_name, relationship_type, created_at) 
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [mainTableName, secondaryTableName, relationType]);

      // Confirmar transacción
      await connection.commit();

      return {
        success: true,
        message: `Grupo de tablas creado: ${mainTableName} y ${secondaryTableName}`,
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
      if (connection) {
        await connection.release();
      }
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
      if (connection) await connection.end();
    }
  }
}

module.exports = new MySQLDatabaseService(); 