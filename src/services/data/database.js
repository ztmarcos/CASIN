class DatabaseService {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api/data';
    // Keep the in-memory database for other tables
    this.database = {
      tables: {
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

  async getTables() {
    try {
      // Get MySQL tables
      const response = await fetch(`${this.apiUrl}/tables`);
      const mysqlTables = await response.json();
      console.log('MySQL Tables Response:', mysqlTables);
      
      // Combine with in-memory tables
      const inMemoryTables = Object.keys(this.database.tables).map(tableName => ({
        name: tableName,
        ...this.database.tables[tableName]
      }));
      
      const allTables = [...mysqlTables, ...inMemoryTables];
      console.log('All Tables:', allTables);
      return allTables;
    } catch (error) {
      console.error('Error fetching tables:', error);
      throw error;
    }
  }

  async getData(tableName, filters = {}) {
    try {
      if (tableName === 'users') {
        // Use MySQL for users table
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${this.apiUrl}/${tableName}?${queryParams}`);
        const data = await response.json();
        console.log('MySQL Data Response:', data);
        return data;
      } else {
        // Use in-memory for other tables
        const table = this.database.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} not found`);
        
        let data = [...table.data];
        
        if (Object.keys(filters).length > 0) {
          data = data.filter(row => {
            return Object.entries(filters).every(([key, value]) => {
              if (!value) return true;
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
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  async insertData(tableName, data) {
    try {
      if (tableName === 'users') {
        // Use MySQL for users table
        const response = await fetch(`${this.apiUrl}/${tableName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        return await response.json();
      } else {
        // Use in-memory for other tables
        const table = this.database.tables[tableName];
        if (!table) throw new Error(`Table ${tableName} not found`);

        const validatedData = {};
        for (const column of table.columns) {
          if (column.isPrimary) {
            validatedData[column.name] = Math.max(0, ...table.data.map(row => row[column.name])) + 1;
            continue;
          }

          const value = data[column.name];
          if (value === undefined) {
            throw new Error(`Missing value for column ${column.name}`);
          }

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

            default:
              validatedData[column.name] = String(value);
          }
        }

        table.data.push(validatedData);
        return {
          success: true,
          data: validatedData
        };
      }
    } catch (error) {
      console.error('Error inserting data:', error);
      throw error;
    }
  }
}

export default new DatabaseService(); 