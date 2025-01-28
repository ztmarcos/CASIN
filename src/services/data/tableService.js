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
      return await response.json();
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }
  }

  async getData(tableName, filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`${this.apiUrl}/${tableName}?${queryParams}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching data:', error);
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
      // Ensure data is an array
      const dataArray = Array.isArray(data) ? data : [data];
      
      // Clean and prepare the data
      const cleanedData = dataArray.map(row => {
        const cleanRow = {};
        Object.entries(row).forEach(([key, value]) => {
          // Skip empty keys
          if (!key || key.startsWith('__EMPTY')) return;
          
          // Clean the key name
          const cleanKey = key.trim()
            .replace(/^["']|["']$/g, '') // Remove quotes
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters
            .toLowerCase(); // Convert to lowercase for consistency
          
          // Clean the value
          const cleanValue = typeof value === 'string' ? 
            value.trim().replace(/^["']|["']$/g, '') : // Remove quotes from strings
            value;
          
          cleanRow[cleanKey] = cleanValue;
        });
        return cleanRow;
      });

      // Log the cleaned data for debugging
      console.log('Inserting data:', cleanedData);

      const response = await fetch(`${this.apiUrl}/${tableName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData[0]) // Send the first object directly
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error inserting data');
      }

      return await response.json();
    } catch (error) {
      console.error('Error inserting data:', error);
      throw error;
    }
  }

  async getTableStructure(tableName) {
    try {
      const response = await fetch(`${this.apiUrl}/${tableName}/structure`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Table structure response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching table structure:', error);
      throw error;
    }
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
      const response = await fetch(`${this.apiUrl}/${tableName}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          column,
          value
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to update ${column} in ${tableName}`);
      }

      return await response.json();
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
      const response = await fetch(`${this.apiUrl}/tables/${tableName}/columns/${oldName}/rename`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newName })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to rename column');
      }

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
      // Clean the table name using the same pattern as other methods
      const cleanTableName = tableName.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
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
}

const tableService = new TableService();
export default tableService; 