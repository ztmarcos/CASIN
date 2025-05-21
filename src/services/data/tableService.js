import axios from 'axios';

class TableService {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api';
    this.currentTableName = null;
    this.currentTableTitle = null;
  }

  // Add new methods for table title handling
  setCurrentTable(tableName) {
    this.currentTableName = tableName;
    this.currentTableTitle = this.formatTableTitle(tableName);
  }

  getCurrentTableTitle() {
    return this.currentTableTitle || this.formatTableTitle(this.currentTableName);
  }

  formatTableTitle(tableName) {
    if (!tableName) return '';
    
    // Check if it's a combined table name (contains arrow)
    if (tableName.includes('→')) {
      const [mainTable, secondaryTable] = tableName.split('→').map(t => t.trim());
      return `${this.formatSingleTableName(mainTable)} → ${this.formatSingleTableName(secondaryTable)}`;
    }
    
    return this.formatSingleTableName(tableName);
  }

  formatSingleTableName(tableName) {
    return tableName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  async getTables() {
    try {
      const response = await fetch(`${this.apiUrl}/data/tables`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tables = await response.json();
      
      // Add formatted titles to tables
      const tablesWithTitles = tables.map(table => ({
        ...table,
        title: this.formatTableTitle(table.name)
      }));
      
      // Filter status column from non-related tables
      return tablesWithTitles.map(table => {
        if (!table.isMainTable && !table.isSecondaryTable && table.columns) {
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
      // Set current table when getting data
      this.setCurrentTable(tableName);
      
      const response = await fetch(`${this.apiUrl}/data/${tableName}`);
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
      console.log('Raw data received:', data);
      console.log('Target table name:', tableName);
      
      // Get table structure first to validate data
      const tables = await this.getTables();
      const targetTable = tables.find(t => t.name === tableName);
      
      if (!targetTable) {
        throw new Error(`Table '${tableName}' does not exist`);
      }
      
      // Filter out invalid columns and prepare data
      const validColumns = targetTable.columns
        .filter(col => col.name !== 'id')
        .map(col => col.name);
      
      // Determine if we're handling a single record or an array of records
      const isArrayData = Array.isArray(data);

      // Helper to clean a single record
      const cleanRecord = (record) => {
        const cleanData = { ...record };
        delete cleanData.id;

        const filtered = {};

        for (const key in cleanData) {
          if (validColumns.includes(key)) {
            let value = cleanData[key];
            if (value === null || value === undefined) {
              value = null;
            } else if (typeof value === 'object' && !(value instanceof Date)) {
              value = JSON.stringify(value);
            } else if (value instanceof Date) {
              value = value.toISOString().split('T')[0];
            }
            filtered[key] = value;
          }
        }

        return filtered;
      };

      const payload = isArrayData ? data.map(cleanRecord) : cleanRecord(data);

      if (!isArrayData && Object.keys(payload).length === 0) {
        throw new Error('No valid data to insert');
      }

      // Send the data to the API
      const apiUrl = `http://localhost:3001/api/data/${tableName}`;
      console.log('Request payload:', payload);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Server error response:', errorData);
        throw new Error(errorData.error || 'Failed to insert data');
      }
      
      const result = await response.json();
      console.log('Insert result:', result);
      
      return result;
    } catch (error) {
      console.error('Error inserting data:', error);
      throw error;
    }
  }

  #tableStructureCache = new Map();
  #cacheTimeout = 5000; // 5 seconds

  async getTableStructure(tableName) {
    try {
      // First try to get from tables list
      const response = await fetch(`${this.apiUrl}/data/tables/${tableName}/structure`);
      if (!response.ok) {
        throw new Error(`Failed to get table structure: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Handle MySQL SHOW COLUMNS format
      if (Array.isArray(result) && result.length > 0 && 'Field' in result[0]) {
        return {
          columns: result.map(col => ({
            name: col.Field,
            type: this.mapDatabaseTypeToFrontend(col.Type)
          }))
        };
      }
      
      // Handle our standard format
      if (result && result.columns) {
        return result;
      }

      // If not found in structure endpoint, try getting from tables list
      const tables = await this.getTables();
      const table = tables.find(t => t.name === tableName);
      
      if (table && table.columns) {
        return { columns: table.columns };
      }

      throw new Error('Could not retrieve table structure');
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

  async updateData(tableName, id, column, value) {
    try {
      // Clean and validate inputs
      const cleanTableName = tableName.trim().toLowerCase();
      
      // Log the update attempt
      console.log('Attempting to update:', {
        tableName: cleanTableName,
        id,
        column,
        value
      });

      // Make the API call
      const response = await fetch(`${this.apiUrl}/data/${cleanTableName}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ column, value })
      });

      // Always try to parse response as JSON first
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Server returned invalid JSON response');
      }

      // Check if the response was successful
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to update data');
      }

      // Return the updated data
      return {
        success: true,
        message: data.message,
        updatedData: data.updatedData
      };
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
      const response = await fetch(`${this.apiUrl}/data/tables/${tableName}/columns/${cleanOldName}/rename`, {
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
      // Clean the table name to remove special characters
      const cleanTableName = tableName.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase();

      // Now proceed with table deletion
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
          errorMessage = error.message || error.error;
        } else {
          errorMessage = await response.text();
          // If we got HTML, provide a more user-friendly error
          if (errorMessage.includes('<!DOCTYPE')) {
            errorMessage = `Failed to delete table ${tableName}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      return { success: true, message: `Table ${tableName} deleted successfully` };
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

      const response = await fetch(`${this.apiUrl}/data/${cleanTableName}/${id}`, {
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
      // Clean the table names
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

      const response = await fetch(`${this.apiUrl}/tables/${cleanOldName}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ newName: cleanNewName })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage;
        
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          errorMessage = error.error || error.message;
        } else {
          errorMessage = await response.text();
          // If we got HTML, provide a more user-friendly error
          if (errorMessage.includes('<!DOCTYPE')) {
            errorMessage = 'Server error occurred while renaming table';
          }
        }
        
        throw new Error(errorMessage || 'Error renaming table');
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return { message: `Table renamed from ${oldName} to ${newName} successfully` };
    } catch (error) {
      console.error('Error renaming table:', error);
      throw error;
    }
  }

  async createTableGroup(mainTableName, secondaryTableName, groupType = 'default') {
    try {
      const response = await fetch(`${this.apiUrl}/tables/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          mainTableName,
          secondaryTableName,
          groupType
        })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server response was not JSON');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Error al crear el grupo de tablas');
      }

      return data;
    } catch (error) {
      console.error('Error creating table group:', error);
      if (error.name === 'SyntaxError') {
        throw new Error('Error en la respuesta del servidor');
      }
      throw new Error(error.message || 'Error al crear el grupo de tablas');
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
    if (!dbType) return 'TEXT';
    
    dbType = dbType.toLowerCase();
    if (dbType.includes('int')) return 'INT';
    if (dbType.includes('decimal') || dbType.includes('numeric') || dbType.includes('float') || dbType.includes('double')) return 'DECIMAL';
    if (dbType.includes('date') || dbType.includes('time')) return 'DATE';
    if (dbType === 'tinyint(1)' || dbType === 'boolean') return 'BOOLEAN';
    if (dbType.includes('varchar') || dbType.includes('text') || dbType.includes('char')) return 'TEXT';
    return 'TEXT';
  }

  async getTableTypes() {
    try {
      const response = await fetch(`${this.apiUrl}/data/table-types`);
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

  async updateTableOrder(tableOrder) {
    try {
      const response = await fetch(`${this.apiUrl}/tables/order`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableOrder })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating table order:', error);
      throw error;
    }
  }

  async getChildTables(parentTableName) {
    try {
      const response = await fetch(`${this.apiUrl}/data/tables/${parentTableName}/children`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tables = await response.json();
      return tables.map(table => table.name);
    } catch (error) {
      console.error('Error getting child tables:', error);
      throw error;
    }
  }
}

const tableService = new TableService();
export default tableService; 