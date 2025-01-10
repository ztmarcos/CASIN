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
    const result = await mysqlDatabase.createTable(req.body);
    res.json(result);
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
    const result = await mysqlDatabase.insertData(req.params.tableName, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 