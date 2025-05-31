const express = require('express');
const router = express.Router();
const mysqlDatabase = require('../services/mysqlDatabase');

// Create policy_status table if it doesn't exist
const createTableIfNotExists = async () => {
  try {
    await mysqlDatabase.executeQuery(`
      CREATE TABLE IF NOT EXISTS policy_status (
        policy_key VARCHAR(100) PRIMARY KEY,
        status VARCHAR(20) NOT NULL DEFAULT 'No Pagado',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Policy status table created or verified successfully');
  } catch (error) {
    console.error('Error creating policy_status table:', error);
    throw error;
  }
};

// Ensure table exists when routes are loaded
createTableIfNotExists().catch(console.error);

// Get all policy statuses
router.get('/', async (req, res) => {
  try {
    const rows = await mysqlDatabase.executeQuery(
      'SELECT policy_key, status FROM policy_status'
    );
    
    // Convert array of rows to object format
    const statusObject = rows.reduce((acc, row) => {
      acc[row.policy_key] = row.status;
      return acc;
    }, {});
    
    res.json(statusObject);
  } catch (error) {
    console.error('Error fetching policy statuses:', error);
    res.status(500).json({ error: 'Error fetching policy statuses' });
  }
});

// Update or create policy status
router.post('/', async (req, res) => {
  const { policyKey, status } = req.body;
  
  if (!policyKey || !status) {
    return res.status(400).json({ error: 'Policy key and status are required' });
  }

  try {
    await mysqlDatabase.executeQuery(
      'REPLACE INTO policy_status (policy_key, status) VALUES (?, ?)',
      [policyKey, status]
    );
    
    res.json({ success: true, policyKey, status });
  } catch (error) {
    console.error('Error updating policy status:', error);
    res.status(500).json({ error: 'Error updating policy status' });
  }
});

module.exports = router; 
