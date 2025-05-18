import axios from 'axios';

class TableService {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api/data';
  }

  async getTables() {
    try {
      const response = await fetch(`${this.apiUrl}/tables`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tables = await response.json();
      
      // Filtrar la columna status de las tablas no relacionadas
      return tables.map(table => {
        if (!table.isMainTable && !table.isSecondaryTable && table.columns) {
          // Si es una tabla individual, filtrar la columna status
          table.columns = table.columns.filter(col => col.name !== 'status');
        }
        return table;
      });
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }
  }

  async getData(tableName, options = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/${tableName}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting data:', error);
      throw error;
    }
  }

  async createTable(tableName, data) {
    try {
      if (!tableName || !data || !data.length) {
        throw new Error('Table name and data are required');
      }

      // Get the first row of data
      let sampleRow = data[0];
      // If the row is an object with nested data, flatten it
      if (typeof sampleRow === 'object' && Object.keys(sampleRow).length === 1 && typeof Object.values(sampleRow)[0] === 'object') {
        sampleRow = Object.values(sampleRow)[0];
      }

      // Process column definitions
      const columns = Object.entries(sampleRow)
        .filter(([key]) => !key.startsWith('__EMPTY')) // Skip empty columns
        .map(([key, value]) => {
          // Clean the column name for MySQL
          const cleanName = key.trim()
            .replace(/^["']|["']$/g, '') // Remove quotes
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters
            .toLowerCase(); // Convert to lowercase for consistency
          
          return {
            name: cleanName,
            type: this.inferColumnType(value)
          };
        });

      // Create table definition
      const tableDefinition = {
        name: tableName.toLowerCase().trim(),
        columns: columns
      };

      console.log('Creating table with definition:', tableDefinition);

      const response = await fetch(`${this.apiUrl}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableDefinition)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error creating table');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  inferColumnType(value) {
    if (typeof value === 'number') {
      return value % 1 === 0 ? 'INT' : 'DECIMAL(10,2)';
    } else if (value instanceof Date) {
      return 'DATETIME';
    } else {
      return 'VARCHAR(255)';
    }
  }

  async insertData(tableName, data) {
    try {
      // Get table structure first to validate data
      const tables = await this.getTables();
      const targetTable = tables.find(t => t.name === tableName);
      
      if (!targetTable) {
        throw new Error('Table not found');
      }

      // Create a copy of data and clean it
      const cleanData = { ...data };
      delete cleanData.id;  // Ensure id is not included

      // Clean and validate data based on column types
      targetTable.columns.forEach(column => {
        const value = cleanData[column.name];
        
        if (value === undefined || value === null || value === '') {
          cleanData[column.name] = null;
          return;
        }

        // Handle different column types
        if (column.type.includes('int')) {
          cleanData[column.name] = parseInt(value) || null;
        } else if (column.type.includes('decimal')) {
          const numStr = value.toString().replace(/[$,]/g, '');
          cleanData[column.name] = parseFloat(numStr) || null;
        } else if (column.type.includes('varchar')) {
          const maxLength = parseInt(column.type.match(/\((\d+)\)/)?.[1]) || 255;
          cleanData[column.name] = String(value).substring(0, maxLength);
        } else if (column.type.includes('date')) {
          try {
            if (typeof value === 'string') {
              if (value.includes('/')) {
                const [day, month, year] = value.split('/');
                cleanData[column.name] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              } else if (value.includes('-')) {
                cleanData[column.name] = value;
              }
            } else if (value instanceof Date) {
              cleanData[column.name] = value.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn(`Failed to parse date: ${value}`, e);
            cleanData[column.name] = null;
          }
        }
      });

      // Remove created_at and updated_at as they are handled by MySQL
      delete cleanData.created_at;
      delete cleanData.updated_at;

      console.log('Clean data before insertion:', cleanData);

      // Check if this is a policy-related table and has a policy number
      if (tableName.toLowerCase().includes('gmm') && cleanData.numero_de_poliza) {
        // Try to find existing policy
        const existingPolicy = await this.getData(tableName, {
          where: { numero_de_poliza: cleanData.numero_de_poliza }
        });

        if (existingPolicy && existingPolicy.length > 0) {
          // Update existing policy
          await this.updateData(tableName, cleanData, {
            where: { numero_de_poliza: cleanData.numero_de_poliza }
          });
          return { success: true, message: 'Policy updated successfully' };
        }
      }

      // If no existing policy found or not a policy table, proceed with insert
      const response = await axios.post(`${this.apiUrl}/${tableName}`, cleanData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to insert data');
      }

      return response.data;
    } catch (error) {
      console.error('Error inserting data:', error);
      throw new Error(error.response?.data?.error || error.message || 'Error inserting data');
    }
  }

  #tableStructureCache = new Map();
  #cacheTimeout = 5000; // 5 seconds

  async getTableStructure(tableName) {
    try {
      // First try to get from tables list
      const response = await fetch(`${this.apiUrl}/tables`);
      if (!response.ok) {
        throw new Error(`Failed to get tables: ${response.statusText}`);
      }
      
      const tables = await response.json();
      const table = tables.find(t => t.name === tableName);
      
      if (table && table.columns) {
        return { columns: table.columns };
      }

      // If not found in tables list, try getting schema from database
      const schemaQuery = `
        SELECT 
          COLUMN_NAME as name,
          DATA_TYPE as type
        FROM 
          INFORMATION_SCHEMA.COLUMNS 
        WHERE 
          TABLE_NAME = '${tableName}'
        ORDER BY 
          ORDINAL_POSITION
      `;

      const schemaResult = await this.executeQuery(schemaQuery);
      if (schemaResult && schemaResult.length > 0) {
        return {
          columns: schemaResult.map(col => ({
            name: col.name,
            type: this.mapDatabaseTypeToFrontend(col.type)
          }))
        };
      }

      // If still no columns found, get from sample data
      const dataResponse = await this.getData(tableName);
      if (dataResponse.data && dataResponse.data.length > 0) {
        const sampleRow = dataResponse.data[0];
        return {
          columns: Object.keys(sampleRow).map(name => ({
            name,
            type: this.inferColumnTypeFromValue(sampleRow[name])
          }))
        };
      }
      
      return { columns: [] };
    } catch (error) {
      console.error('Error fetching table structure:', error);
      throw error;
    }
  }

  inferColumnTypeFromValue(value) {
    if (value === null || value === undefined) return 'TEXT';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'INT' : 'DECIMAL';
    }
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      return 'DATE';
    }
    if (typeof value === 'boolean') {
      return 'BOOLEAN';
    }
    return 'TEXT';
  }

  async updateColumnOrder(tableName, columnOrder) {
    try {
      const response = await fetch(`${this.apiUrl}/tables/${tableName}/columns/order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ columnOrder })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating column order:', error);
      throw error;
    }
  }

  async updateData(tableName, data, options = {}) {
    try {
      if (!options.where) {
        throw new Error('Update operation requires where clause');
      }

      const setValues = [];
      const values = [];
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'id' && !Object.keys(options.where).includes(key)) {
          setValues.push(`${key} = ?`);
          values.push(value);
        }
      });

      const whereConditions = [];
      Object.entries(options.where).forEach(([key, value]) => {
        whereConditions.push(`${key} = ?`);
        values.push(value);
      });

      const query = `
        UPDATE ${tableName}
        SET ${setValues.join(', ')}
        WHERE ${whereConditions.join(' AND ')}
      `;

      await this.executeQuery(query, values);
      return true;
    } catch (error) {
      console.error('Error updating data:', error);
      throw error;
    }
  }

  async addColumn(tableName, columnData) {
    try {
      // Clean the table name
      const cleanTableName = tableName.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase()
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const response = await fetch(`${this.apiUrl}/tables/${cleanTableName}/columns/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: columnData.name.trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .toLowerCase()
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, ''),
          type: columnData.type
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to add column ${columnData.name} to ${tableName}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding column:', error);
      throw error;
    }
  }

  async deleteColumn(tableName, columnName) {
    try {
      const response = await fetch(`${this.apiUrl}/tables/${tableName}/columns/${columnName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete column');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting column:', error);
      throw error;
    }
  }

  async renameColumn(tableName, oldName, newName) {
    try {
      // Clean the column names
      const cleanOldName = oldName.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase();

      const cleanNewName = newName.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase();

      // Use the correct endpoint for renaming columns
      const response = await fetch(`${this.apiUrl}/tables/${tableName}/columns/${cleanOldName}/rename`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newName: cleanNewName
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `Failed to rename column: ${response.statusText}`
        }));
        throw new Error(error.message || 'Failed to rename column');
      }

      // Dispatch an event to notify other components
      const event = new CustomEvent('tableStructureUpdated', {
        detail: { tableName, oldName: cleanOldName, newName: cleanNewName }
      });
      window.dispatchEvent(event);

      return await response.json();
    } catch (error) {
      console.error('Error renaming column:', error);
      throw error;
    }
  }

  async setColumnTag(tableName, columnName, tag) {
    try {
      const response = await fetch(`${this.apiUrl}/tables/${tableName}/columns/${columnName}/tag`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tag })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set column tag');
      }

      return await response.json();
    } catch (error) {
      console.error('Error setting column tag:', error);
      throw error;
    }
  }

  async deleteTable(tableName) {
    try {
      // Clean the table name but preserve brackets
      const cleanTableName = tableName.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-zA-Z0-9_\[\]]/g, '_') // Allow brackets in addition to alphanumeric and underscore
        .toLowerCase()
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const response = await fetch(`${this.apiUrl}/tables/${cleanTableName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage;
        
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.message;
        } else {
          errorMessage = await response.text();
        }
        
        throw new Error(errorMessage || `Failed to delete table ${tableName}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return { message: `Table ${tableName} deleted successfully` };
    } catch (error) {
      console.error('Error deleting table:', error);
      throw error;
    }
  }

  async deleteRow(tableName, id) {
    try {
      // Clean the table name using the same pattern as other methods
      const cleanTableName = tableName.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase()
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const response = await fetch(`${this.apiUrl}/${cleanTableName}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage;
        
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.message;
        } else {
          errorMessage = await response.text();
        }
        
        throw new Error(errorMessage || `Failed to delete row ${id} from ${tableName}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return { message: `Row ${id} deleted successfully from ${tableName}` };
    } catch (error) {
      console.error('Error deleting row:', error);
      throw error;
    }
  }

  async searchAllTables(searchTerm) {
    try {
      const response = await axios.get(`${this.apiUrl}/search`, {
        params: { query: searchTerm }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching tables:', error);
      throw error;
    }
  }

  async importCSV(tableName, data) {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to import');
      }

      // Get sample row for column types
      const sampleRow = data[0];
      
      // Create column definitions
      const columnDefs = Object.keys(sampleRow)
        .filter(key => key.toLowerCase() !== 'id') // Exclude any id column from source data
        .map(key => {
          // Initialize type checking arrays
          const values = data
            .map(row => row[key])
            .filter(val => val !== null && val !== undefined && val !== '');

          // Infer type based on values
          let type = 'VARCHAR(255)'; // default type
          
          if (values.length > 0) {
            const allNumbers = values.every(val => !isNaN(val) && !isNaN(parseFloat(val)));
            const allIntegers = allNumbers && values.every(val => Number.isInteger(parseFloat(val)));
            const allDates = values.every(val => !isNaN(Date.parse(val)));
            const maxLength = Math.max(...values.map(val => String(val).length));

            if (allIntegers) {
              type = 'INT';
            } else if (allNumbers) {
              type = 'DECIMAL(12,2)';
            } else if (allDates) {
              type = 'DATE';
            } else if (maxLength > 255) {
              type = 'TEXT';
            } else {
              type = `VARCHAR(${Math.min(maxLength + 50, 255)})`;
            }
          }

          // Clean column name
          const cleanName = key.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

          return {
            name: cleanName,
            type,
            nullable: true
          };
        });

      // Create table definition with clean table name
      const cleanTableName = tableName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      // Approach 1: Try creating table without explicit id column (let MySQL handle it)
      try {
        const createResponse = await axios.post(`${this.apiUrl}/tables`, {
          name: cleanTableName,
          columns: columnDefs,
          options: {
            addIdColumn: true // Signal backend to add id column
          }
        });

        if (!createResponse.data.success) {
          throw new Error(createResponse.data.error || 'Failed to create table');
        }
      } catch (error) {
        // If first approach fails, try second approach
        console.log('First approach failed, trying alternative...');
        
        // Approach 2: Try creating table with manual SQL
        const createTableSQL = {
          name: cleanTableName,
          sql: `CREATE TABLE IF NOT EXISTS \`${cleanTableName}\` (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            ${columnDefs.map(col => `\`${col.name}\` ${col.type}${col.nullable ? '' : ' NOT NULL'}`).join(',\n')}
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
        };

        const createResponse = await axios.post(`${this.apiUrl}/tables/raw`, createTableSQL);
        
        if (!createResponse.data.success) {
          throw new Error(createResponse.data.error || 'Failed to create table');
        }
      }

      // Insert data in batches
      const batchSize = 50;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await Promise.all(batch.map(row => {
          const processedRow = {};
          columnDefs.forEach(({ name, type }) => {
            let value = row[Object.keys(row).find(key => 
              key.toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9_]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '') === name
            )];

            // Convert values based on column type
            if (value !== null && value !== undefined && value !== '') {
              if (type === 'INT') {
                value = parseInt(value, 10);
                if (isNaN(value)) value = null;
              } else if (type === 'DECIMAL(12,2)') {
                value = parseFloat(value);
                if (isNaN(value)) value = null;
              } else if (type === 'DATE') {
                const date = new Date(value);
                if (!isNaN(date)) {
                  value = date.toISOString().split('T')[0];
                } else {
                  value = null;
                }
              }
            } else {
              value = null;
            }
            
            processedRow[name] = value;
          });
          return axios.post(`${this.apiUrl}/${cleanTableName}`, processedRow);
        }));
      }

      return {
        success: true,
        message: `Table ${cleanTableName} created and ${data.length} rows imported successfully`,
        tableName: cleanTableName,
        rowCount: data.length,
        columns: columnDefs
      };
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw new Error(error.response?.data?.error || error.message || 'Error importing CSV data');
    }
  }

  async renameTable(oldName, newName) {
    try {
      const response = await fetch(`${this.apiUrl}/tables/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldName, newName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error renaming table');
      }

      return await response.json();
    } catch (error) {
      console.error('Error renaming table:', error);
      throw error;
    }
  }

  async createTableGroup(mainTableName, secondaryTableName, groupType = 'default') {
    try {
      const response = await axios.post(`${this.apiUrl}/tables/group`, {
        mainTableName,
        secondaryTableName,
        groupType
      });
      return response.data;
    } catch (error) {
      console.error('Error creating table group:', error);
      throw new Error(error.response?.data?.message || 'Error al crear el grupo de tablas');
    }
  }

  // Modified getAllTables method to use API instead of direct DB connection
  async getAllTables() {
    try {
      const response = await fetch(`${this.apiUrl}/tables`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tables = await response.json();
      return tables
        .filter(table => 
          table.name.toLowerCase().includes('gmm') || 
          table.name.toLowerCase().includes('auto')
        )
        .map(table => table.name);
    } catch (error) {
      console.error('Error getting tables:', error);
      throw error;
    }
  }

  // Helper method to execute table operations
  async executeTableOperation(tableName, operation) {
    try {
      const response = await fetch(`${this.apiUrl}/tables/${tableName}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `Operation failed: ${response.statusText}`
        }));
        throw new Error(error.message || 'Operation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing table operation:', error);
      throw error;
    }
  }

  // Helper method to execute SQL query
  async executeQuery(query, values = []) {
    try {
      const response = await fetch(`${this.apiUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, values })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `Query failed: ${response.statusText}`
        }));
        throw new Error(error.message || 'Query failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  // Helper method to map database types to frontend types
  mapDatabaseTypeToFrontend(dbType) {
    dbType = dbType.toUpperCase();
    if (dbType.includes('INT')) return 'INT';
    if (dbType.includes('DECIMAL') || dbType.includes('NUMERIC')) return 'DECIMAL';
    if (dbType.includes('DATE') || dbType.includes('TIME')) return 'DATE';
    if (dbType === 'BOOLEAN' || dbType === 'TINYINT(1)') return 'BOOLEAN';
    return 'TEXT';
  }

  async getTableTypes() {
    try {
      const response = await fetch(`${this.apiUrl}/table-types`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Validate the response data
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid table types data received');
      }
      
      return data;
    } catch (error) {
      console.error('Error getting table types:', error);
      throw error;
    }
  }
}

const tableService = new TableService();
export default tableService; 