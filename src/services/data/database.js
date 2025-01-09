class DatabaseService {
  constructor() {
    // Initial database structure
    this.database = {
      tables: {
        users: {
          columns: [
            { name: 'id', type: 'INTEGER', isPrimary: true },
            { name: 'name', type: 'VARCHAR(255)' },
            { name: 'role', type: 'VARCHAR(100)' },
            { name: 'status', type: 'VARCHAR(50)' }
          ],
          data: [
            { id: 1, name: 'John Doe', role: 'Developer', status: 'Active' },
            { id: 2, name: 'Jane Smith', role: 'Designer', status: 'Active' },
            { id: 3, name: 'Bob Johnson', role: 'Manager', status: 'Inactive' }
          ]
        },
        products: {
          columns: [
            { name: 'id', type: 'INTEGER', isPrimary: true },
            { name: 'name', type: 'VARCHAR(255)' },
            { name: 'price', type: 'DECIMAL(10,2)' },
            { name: 'status', type: 'VARCHAR(50)' }
          ],
          data: [
            { id: 1, name: 'Product A', price: 99.99, status: 'In Stock' },
            { id: 2, name: 'Product B', price: 149.99, status: 'Out of Stock' }
          ]
        },
        orders: {
          columns: [
            { name: 'id', type: 'INTEGER', isPrimary: true },
            { name: 'user_id', type: 'INTEGER' },
            { name: 'total', type: 'DECIMAL(10,2)' },
            { name: 'status', type: 'VARCHAR(50)' }
          ],
          data: [
            { id: 1, user_id: 1, total: 99.99, status: 'Completed' },
            { id: 2, user_id: 2, total: 149.99, status: 'Pending' }
          ]
        }
      }
    };
  }

  // Structure Management Methods
  async getTables() {
    return Object.keys(this.database.tables).map(tableName => ({
      name: tableName,
      ...this.database.tables[tableName]
    }));
  }

  async getTableStructure(tableName) {
    const table = this.database.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not found`);
    return {
      name: tableName,
      columns: table.columns
    };
  }

  async addTable(tableName, columns) {
    if (this.database.tables[tableName]) {
      throw new Error(`Table ${tableName} already exists`);
    }
    this.database.tables[tableName] = {
      columns,
      data: []
    };
    return this.getTableStructure(tableName);
  }

  // Data Operations Methods
  async getData(tableName, filters = {}) {
    const table = this.database.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not found`);
    
    let data = [...table.data];
    
    // Apply filters
    if (Object.keys(filters).length > 0) {
      data = data.filter(row => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true; // Skip empty filter values
          return row[key] === value;
        });
      });
    }
    
    return {
      table: tableName,
      columns: table.columns,
      data,
      timestamp: new Date().toISOString()
    };
  }

  async insertData(tableName, data) {
    const table = this.database.tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not found`);

    // Validate data against column definitions
    const validatedData = {};
    for (const column of table.columns) {
      if (column.isPrimary) {
        // Auto-generate ID for primary key
        validatedData[column.name] = Math.max(0, ...table.data.map(row => row[column.name])) + 1;
        continue;
      }

      const value = data[column.name];
      if (value === undefined) {
        throw new Error(`Missing value for column ${column.name}`);
      }

      // Type validation
      switch (column.type.toUpperCase().split('(')[0]) {
        case 'INTEGER':
          validatedData[column.name] = parseInt(value);
          if (isNaN(validatedData[column.name])) {
            throw new Error(`Invalid integer value for column ${column.name}`);
          }
          break;

        case 'DECIMAL':
          validatedData[column.name] = parseFloat(value);
          if (isNaN(validatedData[column.name])) {
            throw new Error(`Invalid decimal value for column ${column.name}`);
          }
          break;

        case 'BOOLEAN':
          validatedData[column.name] = value === 'true';
          break;

        case 'DATE':
        case 'TIMESTAMP':
          validatedData[column.name] = new Date(value).toISOString();
          break;

        default: // VARCHAR, TEXT
          validatedData[column.name] = String(value);
          // Check length for VARCHAR
          const lengthMatch = column.type.match(/VARCHAR\((\d+)\)/i);
          if (lengthMatch && validatedData[column.name].length > parseInt(lengthMatch[1])) {
            throw new Error(`Value too long for column ${column.name}`);
          }
      }
    }

    // Insert the validated data
    table.data.push(validatedData);

    return {
      success: true,
      data: validatedData
    };
  }

  // SQL Operations Methods
  async executeQuery(sql) {
    // Simple SQL parser (for demonstration)
    const sqlLower = sql.toLowerCase();
    
    // Handle SELECT queries
    if (sqlLower.startsWith('select')) {
      const tableName = this.extractTableName(sql);
      return await this.getData(tableName);
    }
    
    throw new Error('Only SELECT queries are supported in this version');
  }

  // Helper Methods
  extractTableName(sql) {
    // Very simple extraction - in real app would need proper SQL parser
    const fromMatch = sql.toLowerCase().match(/from\s+(\w+)/);
    if (!fromMatch) throw new Error('Invalid SQL: Cannot find table name');
    return fromMatch[1];
  }
}

export default new DatabaseService(); 