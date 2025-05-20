require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { fetchNotionTasks } = require('./src/api/notion');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/notion/tasks', fetchNotionTasks);
app.get('/api/notion/raw-table', fetchNotionTasks);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    details: err.message
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
