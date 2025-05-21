require('dotenv').config();
const express = require('express');
const cors = require('cors');
const dbService = require('./src/services/data/dbService');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Data routes
const dataRouter = express.Router();

// Get all tables
dataRouter.get('/tables', async (req, res) => {
  try {
    const tables = await dbService.getAllTables();
    res.json(tables);
  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({ error: 'Error getting tables', details: error.message });
  }
});

// Mount data routes
app.use('/api/data', dataRouter);

// Optional Notion routes
try {
  const { fetchNotionTasks } = require('./src/api/notion');
  app.get('/api/notion/tasks', fetchNotionTasks);
  app.get('/api/notion/raw-table', fetchNotionTasks);
  console.log('✅ Notion routes loaded successfully');
} catch (error) {
  console.log('ℹ️ Notion routes not loaded:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  // Ensure we always send JSON response
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    details: err.message
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    details: `Route ${req.method} ${req.url} not found`
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment variables loaded:', {
    hasNotionKey: !!process.env.NOTION_SECRET_KEY,
    hasNotionDB: !!process.env.NOTION_DATABASE_ID
  });
});
