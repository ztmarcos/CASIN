class DatabaseService {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api/data';
    // Keep the in-memory database for demo tables
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
        }
      }
    };
  }

  async getTables() {
    try {
      // Get MySQL tables first
      const response = await fetch(`${this.apiUrl}/tables`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const mysqlTables = await response.json();
      
      // Add in-memory tables
      const inMemoryTables = Object.keys(this.database.tables).map(tableName => ({
        name: tableName,
        columns: this.database.tables[tableName].columns
      }));
      
      return [...mysqlTables, ...inMemoryTables];
    } catch (error) {
      console.error('Error fetching tables:', error);
      // If MySQL fails, return just in-memory tables
      return Object.keys(this.database.tables).map(tableName => ({
        name: tableName,
        columns: this.database.tables[tableName].columns
      }));
    }
  }

  async getData(tableName, filters = {}) {
    try {
      // Check if it's a MySQL table
      if (tableName === 'users' || tableName === 'prospeccion_cards') {
        const queryParams = new URLSearchParams(filters).toString();
        const response = await fetch(`${this.apiUrl}/${tableName}?${queryParams}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      }
      
      // Use in-memory for other tables
      const table = this.database.tables[tableName];
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }
      
      let data = [...table.data];
      
      // Apply filters
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
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  }

  async insertData(tableName, data) {
    try {
      // Check if it's a MySQL table
      if (tableName === 'users' || tableName === 'prospeccion_cards') {
        const response = await fetch(`${this.apiUrl}/${tableName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      }
      
      // Use in-memory for other tables
      const table = this.database.tables[tableName];
      if (!table) {
        throw new Error(`Table ${tableName} not found`);
      }

      const newId = Math.max(0, ...table.data.map(row => row.id)) + 1;
      const newRow = { id: newId, ...data };
      table.data.push(newRow);
      
      return {
        success: true,
        data: newRow
      };
    } catch (error) {
      console.error('Error inserting data:', error);
      throw error;
    }
  }
}

export default new DatabaseService(); 