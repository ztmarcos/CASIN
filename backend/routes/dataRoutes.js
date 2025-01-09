const express = require('express');
const router = express.Router();
const mysqlDatabase = require('../services/mysqlDatabase');

// Get all tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await mysqlDatabase.getTables();
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get table data
router.get('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const filters = req.query;
    const data = await mysqlDatabase.getData(tableName, filters);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Insert data
router.post('/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const result = await mysqlDatabase.insertData(tableName, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 