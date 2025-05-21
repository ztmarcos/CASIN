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

// Notion routes
try {
  const { fetchNotionTasks, createNotionTask, deleteNotionTask } = require('./src/api/notion');

  // Define routes directly on app
  app.get('/api/notion/tasks', (req, res) => {
    console.log('Handling GET /api/notion/tasks');
    return fetchNotionTasks(req, res);
  });

  app.get('/api/notion/raw-table', (req, res) => {
    console.log('Handling GET /api/notion/raw-table');
    return fetchNotionTasks(req, res);
  });

  app.post('/api/notion/create-task', (req, res) => {
    console.log('Handling POST /api/notion/create-task', req.body);
    return createNotionTask(req, res);
  });

  app.delete('/api/notion/delete-task/:taskId', (req, res) => {
    console.log('Handling DELETE /api/notion/delete-task', req.params);
    return deleteNotionTask(req, res);
  });

  console.log('✅ Notion routes loaded successfully');
  console.log('Available routes:', {
    tasks: 'GET /api/notion/tasks',
    rawTable: 'GET /api/notion/raw-table',
    createTask: 'POST /api/notion/create-task',
    deleteTask: 'DELETE /api/notion/delete-task/:taskId'
  });
} catch (error) {
  console.log('ℹ️ Notion routes not loaded:', error.message);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    details: err.message
  });
});

// Handle 404 errors - make sure this is the last middleware
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.url);
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
