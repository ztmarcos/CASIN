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

  async insertData(tableName, data) {
    try {
      console.log(`Inserting data into table: ${tableName}`);
      console.log('Data to insert:', data);

      const response = await fetch(`${this.apiUrl}/${tableName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(errorText || `Failed to insert data into ${tableName}`);
      }

      const result = await response.json();
      console.log('Insert response:', result);
      return result;
    } catch (error) {
      console.error('Error in insertData:', error);
      throw error;
    }
  }

  async createTable(tableDefinition) {
    try {
      const response = await fetch(`${this.apiUrl}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableDefinition)
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }
}

export default new TableService(); 