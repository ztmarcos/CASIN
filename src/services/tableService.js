class TableService {
  constructor() {
    this.apiUrl = 'http://192.168.1.125:3001/api/data';
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

      // Create MySQL-style column definitions with normalized names
      const columnDefinitions = Object.entries(columnTypes).map(([name, type]) => ({
        name: name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .toLowerCase()
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, ''),
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