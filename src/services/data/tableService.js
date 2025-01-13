class TableService {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api/data';
    this.fileApiUrl = 'http://localhost:3001/api/files';
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
    } catch (error) {
      console.error('Error inserting data:', error);
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

  async uploadFile(tableName, recordId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${this.fileApiUrl}/upload/${tableName}/${recordId}`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async getFilesForRecord(tableName, recordId) {
    try {
      const response = await fetch(`${this.fileApiUrl}/${tableName}/${recordId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting files:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      const response = await fetch(`${this.fileApiUrl}/${fileId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
}

export default new TableService(); 