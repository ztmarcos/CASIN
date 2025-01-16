class TableService {
  constructor() {
    this.apiUrl = 'http://192.168.1.125:3001/api/data';
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
      if (!tableName) {
        throw new Error('Table name is required');
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Data must be a non-empty array');
      }

      // Clean and normalize the data first
      const normalizedData = data.map(row => {
        const normalizedRow = {};
        Object.entries(row).forEach(([key, value]) => {
          // Remove special characters and spaces, convert to lowercase
          const cleanKey = key
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .toLowerCase()
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
          normalizedRow[cleanKey] = value;
        });
        return normalizedRow;
      });

      // Infer column types from normalized data
      const columnTypes = this.inferColumnTypes(normalizedData);
      
      if (Object.keys(columnTypes).length === 0) {
        throw new Error('No valid columns could be inferred from data');
      }

      // Format the table definition
      const cleanTableName = tableName.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase()
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      // Create MySQL-style column definitions
      const columnDefinitions = Object.entries(columnTypes).map(([name, type]) => ({
        name,
        type
      }));

      // Format the SQL-safe table definition
      const tableDefinition = {
        name: cleanTableName,
        columns: columnDefinitions
      };

      console.log('Creating table with definition:', tableDefinition);

      // Create the table structure
      const createResponse = await fetch(`${this.apiUrl}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableDefinition)
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(errorText || `Failed to create table ${cleanTableName}`);
      }

      // Then insert the data with normalized column names
      const insertResponse = await this.insertData(cleanTableName, normalizedData);

      return {
        table: await createResponse.json(),
        data: insertResponse
      };
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  async insertData(tableName, data) {
    try {
      // Clean the table name
      const cleanTableName = tableName.trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .toLowerCase()
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      // Clean the data before sending
      const cleanedData = Array.isArray(data) ? data.map(row => {
        const cleanedRow = {};
        Object.entries(row).forEach(([key, value]) => {
          // Normalize the key to match database column names
          const cleanKey = key
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .toLowerCase()
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
          cleanedRow[cleanKey] = value;
        });
        return cleanedRow;
      }) : data;

      const response = await fetch(`${this.apiUrl}/${cleanTableName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to insert data into ${cleanTableName}`);
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

  // Helper method to infer column types from data
  inferColumnTypes(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('Invalid data provided to inferColumnTypes:', data);
      return {};
    }

    const columnTypes = {};
    const sampleRow = data[0];
    
    if (!sampleRow || typeof sampleRow !== 'object') {
      console.error('Invalid first row:', sampleRow);
      return {};
    }

    Object.entries(sampleRow).forEach(([column, value]) => {
      // Skip empty or null values
      if (value === null || value === undefined || value === '') {
        columnTypes[column] = 'VARCHAR(255)';
        return;
      }

      if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          columnTypes[column] = 'INT';
        } else {
          columnTypes[column] = 'DECIMAL(15,2)';
        }
      } else if (value instanceof Date) {
        columnTypes[column] = 'DATE';
      } else if (typeof value === 'boolean') {
        columnTypes[column] = 'TINYINT(1)';
      } else {
        const dateValue = new Date(value);
        if (!isNaN(dateValue) && typeof value === 'string' && 
            (value.match(/^\d{4}-\d{2}-\d{2}/) || value.match(/^\d{2}\/\d{2}\/\d{4}/))) {
          columnTypes[column] = 'DATE';
        } else {
          const length = value.length > 255 ? 'TEXT' : `VARCHAR(${Math.max(value.length * 2, 255)})`;
          columnTypes[column] = length;
        }
      }
    });

    console.log('Inferred column types:', columnTypes);
    return columnTypes;
  }
}

const tableService = new TableService();
export default tableService; 