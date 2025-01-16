const express = require('express');
const router = express.Router();
const mysqlDatabase = require('../services/mysqlDatabase');

// Get all tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await mysqlDatabase.getTables();
    res.json(tables);
  } catch (error) {
    console.error('Error getting tables:', error);
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
    
    // Create the table directly in MySQL
    await mysqlDatabase.createTable({ 
      name: name.toLowerCase().trim(),
      columns 
    });

    // Return success response
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
    const data = await mysqlDatabase.getData(req.params.tableName, req.query);
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
    
    // Remove id field for auto-increment
    if ('id' in data) {
      delete data.id;
    }
    
    const result = await mysqlDatabase.insertData(tableName, data);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error inserting data:', error);
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
    
    if (!column || value === undefined) {
      return res.status(400).json({ error: 'Column and value are required' });
    }

    const result = await mysqlDatabase.updateData(tableName, id, column, value);
    res.json(result);
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 