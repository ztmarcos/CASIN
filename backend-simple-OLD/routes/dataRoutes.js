const express = require('express');
const router = express.Router();
const mysqlDatabase = require('../services/mysqlDatabase');

// Update table order - MUST BE FIRST to avoid route conflicts
router.put('/tables/order', async (req, res) => {
  try {
    const { tableOrder } = req.body;
    
    if (!tableOrder || !Array.isArray(tableOrder)) {
      return res.status(400).json({ error: 'Table order must be an array' });
    }

    const result = await mysqlDatabase.updateTableOrder(tableOrder);
    res.json(result);
  } catch (error) {
    console.error('Error updating table order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get table types
router.get('/table-types', async (req, res) => {
  try {
    // Get all tables
    const tables = await mysqlDatabase.getTables();
    
    // Convert to the expected format
    const tableTypes = {};
    
    for (const table of tables) {
      // Extract base type for numbered tables (e.g. autos1 -> AUTOS)
      let type = table.type;
      if (type === 'UNKNOWN') {
        const baseNameMatch = table.name.match(/^([a-zA-Z]+)\d+$/);
        if (baseNameMatch) {
          const baseName = baseNameMatch[1].toUpperCase();
          type = baseName;
        }
      }

      tableTypes[table.name] = {
        type: type || 'simple',
        isGroup: table.isGroup || false,
        childTable: table.childTable || null,
        isMainTable: table.isMainTable || false,
        isSecondaryTable: table.isSecondaryTable || false,
        fields: table.columns
          .filter(col => col.name !== 'id')
          .map(col => col.name)
      };
    }

    res.json(tableTypes);
  } catch (error) {
    console.error('Error getting table types:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to get table types. Please try again.' 
    });
  }
});

// Get all tables
router.get('/tables', async (req, res) => {
  try {
    console.log('Fetching tables...');
    const tables = await mysqlDatabase.getTables();
    console.log('Tables fetched successfully:', tables);
    res.json(tables);
  } catch (error) {
    console.error('Detailed error in /tables route:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
    res.status(500).json({ 
      error: error.message,
      details: error.sqlMessage || 'Internal server error while fetching tables'
    });
  }
});

// Get combined table data (parent with child) - MUST BE BEFORE /:tableName
router.get('/combined/:parentTable/:childTable', async (req, res) => {
  try {
    const { parentTable, childTable } = req.params;
    
    console.log('Getting combined data for:', parentTable, 'with', childTable);
    
    // Get data from child table with JOIN to parent table
    const query = `
      SELECT c.*, p.* 
      FROM \`${childTable}\` c 
      LEFT JOIN \`${parentTable}\` p ON c.main_table_id = p.id
    `;
    const data = await mysqlDatabase.executeQuery(query, []);
    res.json(data);
  } catch (error) {
    console.error('Error getting combined data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new table
router.post('/tables', async (req, res) => {
  try {
    const { name, columns } = req.body;
    
    if (!name || !columns || !Array.isArray(columns)) {
      return res.status(400).json({ error: 'Name and columns array are required' });
    }
    
    await mysqlDatabase.createTable({ 
      name: name.toLowerCase().trim(),
      columns 
    });

    res.json({ 
      success: true,
      message: `Table ${name} created successfully`
    });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get table data
router.get('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = await mysqlDatabase.getData(tableName);
    res.json(data);
  } catch (error) {
    console.error('Error getting data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Insert data into table
router.post('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = req.body;
    
    console.log('Received data for insertion:', {
      tableName,
      data
    });
    
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Valid data object is required' });
    }
    
    try {
      // Use the simplified, more reliable insertion function to avoid SQL errors
      console.log('Using simplified insert for reliable data insertion');
      const result = await mysqlDatabase.insertDataSimple(tableName, data);
      res.json(result);
    } catch (error) {
      console.error('Error in data insertion:', error);
      const status = error.message.includes('does not exist') ? 404 : 500;
      res.status(status).json({
        error: error.message,
        sql: error.query || error.sql || undefined,
        values: error.values,
        sqlMessage: error.sqlMessage || undefined
      });
    }
  } catch (error) {
    console.error('Error in route handler:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update column order
router.put('/tables/:tableName/columns/order', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { columnOrder } = req.body;
    
    if (!columnOrder || !Array.isArray(columnOrder)) {
      return res.status(400).json({ error: 'Column order must be an array' });
    }

    const result = await mysqlDatabase.updateColumnOrder(tableName, columnOrder);
    res.json(result);
  } catch (error) {
    console.error('Error updating column order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Modify table structure
router.post('/tables/:tableName/structure', async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await mysqlDatabase.modifyTableStructure(tableName);
    res.json(result);
  } catch (error) {
    console.error('Error modifying table structure:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update cell data
router.patch('/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const { column, value } = req.body;
    
    console.log('Update request received:', {
      tableName,
      id,
      column,
      value,
      body: req.body
    });
    
    // Validate required fields
    if (!tableName || !id) {
      return res.status(400).json({
        success: false,
        error: 'Table name and ID are required'
      });
    }
    
    if (!column || value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Column and value are required'
      });
    }

    // Clean and validate inputs
    const cleanTableName = tableName.trim().toLowerCase();
    const cleanId = parseInt(id, 10);
    const cleanColumn = column.trim();

    if (isNaN(cleanId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format'
      });
    }

    // Attempt to update the data
    try {
      const result = await mysqlDatabase.updateData(cleanTableName, cleanId, cleanColumn, value);
      res.json(result);
    } catch (dbError) {
      // Handle specific database errors
      console.error('Database error:', dbError);
      
      // Determine appropriate status code
      let statusCode = 500;
      if (dbError.message.includes('not found')) {
        statusCode = 404;
      } else if (dbError.message.includes('Invalid')) {
        statusCode = 400;
      }
      
      res.status(statusCode).json({
        success: false,
        error: dbError.message
      });
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred'
    });
  }
});

// Add new column to table
router.post('/tables/:tableName/columns/add', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { name, type } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'Column name and type are required' });
    }
    
    const result = await mysqlDatabase.addColumn(tableName, { name, type });
    res.json(result);
  } catch (error) {
    console.error('Error adding column:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete column
router.delete('/tables/:tableName/columns/:columnName', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    
    if (!tableName || !columnName) {
      return res.status(400).json({ error: 'Table name and column name are required' });
    }
    
    const result = await mysqlDatabase.deleteColumn(tableName, columnName);
    res.json(result);
  } catch (error) {
    console.error('Error deleting column:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rename column
router.patch('/tables/:tableName/columns/:columnName/rename', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    const { newName } = req.body;
    
    if (!tableName || !columnName || !newName) {
      return res.status(400).json({ error: 'Table name, column name, and new name are required' });
    }
    
    // Get column type first
    const [columnInfo] = await mysqlDatabase.executeQuery(
      `SHOW COLUMNS FROM \`${tableName}\` WHERE Field = ?`,
      [columnName]
    );
    
    if (!columnInfo || !columnInfo.length) {
      return res.status(404).json({ error: 'Column not found' });
    }

    // Clean the new name to match MySQL naming conventions
    const cleanNewName = newName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Rename column while preserving its type
    await mysqlDatabase.executeQuery(
      `ALTER TABLE \`${tableName}\` CHANGE \`${columnName}\` \`${cleanNewName}\` ${columnInfo[0].Type}`,
      []
    );
    
    res.json({ success: true, message: `Column renamed successfully` });
  } catch (error) {
    console.error('Error renaming column:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set column tag
router.put('/tables/:tableName/columns/:columnName/tag', async (req, res) => {
  try {
    const { tableName, columnName } = req.params;
    const { tag } = req.body;
    
    if (!tableName || !columnName || !tag) {
      return res.status(400).json({ error: 'Table name, column name, and tag are required' });
    }
    
    const result = await mysqlDatabase.setColumnTag(tableName, columnName, tag);
    res.json(result);
  } catch (error) {
    console.error('Error setting column tag:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete table
router.delete('/tables/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    if (!tableName) {
      return res.status(400).json({ error: 'Table name is required' });
    }

    // Clean the table name
    const cleanTableName = tableName.trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase();
    
    // Delete the table and its relationships
    await mysqlDatabase.deleteTable(cleanTableName);
    res.json({ 
      success: true, 
      message: `Table ${tableName} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || `Failed to delete table ${tableName}` 
    });
  }
});

// Delete row
router.delete('/:tableName/:id', async (req, res) => {
  try {
    const { tableName, id } = req.params;
    
    if (!tableName || !id) {
      return res.status(400).json({ error: 'Table name and row ID are required' });
    }
    
    const result = await mysqlDatabase.deleteRow(tableName, id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting row:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import CSV and create table automatically
router.post('/import-csv', async (req, res) => {
  try {
    const { tableName, data } = req.body;
    
    if (!tableName || !data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: 'Table name and non-empty data array are required' });
    }

    // Clean table name (remove special characters and spaces)
    const cleanTableName = tableName.toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // Get column definitions from the first row
    const sampleRow = data[0];
    const columns = Object.keys(sampleRow).map(key => {
      // Clean column name
      const cleanKey = key.toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      // Infer column type from data
      let type = 'VARCHAR(255)';
      const value = sampleRow[key];
      
      if (typeof value === 'number') {
        if (Number.isInteger(value)) {
          type = 'INT';
        } else {
          type = 'DECIMAL(12,2)';
        }
      } else if (value instanceof Date) {
        type = 'DATE';
      } else if (typeof value === 'boolean') {
        type = 'BOOLEAN';
      } else if (typeof value === 'string') {
        // Check if it's a date string
        const dateValue = new Date(value);
        if (!isNaN(dateValue) && value.includes('/') || value.includes('-')) {
          type = 'DATE';
        } else if (value.length > 255) {
          type = 'TEXT';
        }
      }

      return {
        name: cleanKey,
        type,
        nullable: true
      };
    });

    // Add id column
    columns.unshift({
      name: 'id',
      type: 'INT',
      isPrimary: true,
      autoIncrement: true,
      nullable: false
    });

    // Create table
    await mysqlDatabase.createTable({
      name: cleanTableName,
      columns
    });

    // Clean and insert data
    const cleanData = data.map(row => {
      const cleanRow = {};
      Object.entries(row).forEach(([key, value]) => {
        const cleanKey = key.toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        
        // Convert dates to MySQL format if needed
        if (value && columns.find(col => col.name === cleanKey)?.type === 'DATE') {
          try {
            const date = new Date(value);
            if (!isNaN(date)) {
              value = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn(`Failed to parse date: ${value}`);
          }
        }
      });
      return cleanRow;
    });

    const result = await mysqlDatabase.insertData(cleanTableName, cleanData);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error importing CSV:', error);
    throw error;
  }
});

// Rename table
router.put('/tables/:tableName/rename', async (req, res) => {
  try {
    const { tableName } = req.params;
    const { newName } = req.body;
    
    if (!tableName || !newName) {
      return res.status(400).json({ error: 'Table name and new name are required' });
    }
    
    const result = await mysqlDatabase.renameTable(tableName, newName);
    res.json(result);
  } catch (error) {
    console.error('Error renaming table:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create table group
router.post('/tables/group', async (req, res) => {
  try {
    const { mainTableName, secondaryTableName, groupType } = req.body;
    
    if (!mainTableName || !secondaryTableName) {
      return res.status(400).json({ 
        success: false,
        error: 'Both mainTableName and secondaryTableName are required' 
      });
    }

    const result = await mysqlDatabase.createTableGroup(mainTableName, secondaryTableName, groupType);
    
    res.json({
      success: true,
      message: 'Table group created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error creating table group:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Error creating table group'
    });
  }
});

// Get child tables for a parent table
router.get('/tables/:tableName/children', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Query the table_relationships table to find child tables
    const relationships = await mysqlDatabase.executeQuery(
      'SELECT secondary_table_name FROM table_relationships WHERE main_table_name = ?',
      [tableName]
    );
    
    // Get the full table information for each child table
    const allTables = await mysqlDatabase.getTables();
    const childTables = relationships.map(rel => {
      const childTable = allTables.find(table => table.name === rel.secondary_table_name);
      return childTable || { name: rel.secondary_table_name, isSecondaryTable: true, relatedTableName: tableName };
    });

    res.json(childTables);
  } catch (error) {
    console.error('Error getting child tables:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get table structure
router.get('/tables/:tableName/structure', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Get table structure
    const columns = await mysqlDatabase.executeQuery(
      `SHOW COLUMNS FROM \`${tableName}\``,
      []
    );
    
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      throw new Error(`Table ${tableName} not found or has no columns`);
    }

    // Format columns
    const formattedColumns = columns.map(col => ({
      name: col.Field,
      type: col.Type,
      nullable: col.Null === 'YES',
      key: col.Key,
      default: col.Default,
      extra: col.Extra
    }));

    res.json({
      name: tableName,
      columns: formattedColumns
    });
  } catch (error) {
    console.error('Error getting table structure:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;