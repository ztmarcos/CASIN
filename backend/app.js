const express = require('express');
const cors = require('cors');
const mysqlDatabase = require('./services/mysqlDatabase');
const prospeccionRoutes = require('./routes/prospeccionRoutes');
const fileRoutes = require('./routes/fileRoutes');
const dataRoutes = require('./routes/dataRoutes');
const policyStatusRoutes = require('./routes/policyStatusRoutes');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/prospeccion', prospeccionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/policy-status', policyStatusRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  console.log('Received shutdown signal');
  
  // Close the HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // If server hasn't finished in 10s, force shutdown
  setTimeout(() => {
    console.log('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

module.exports = app; 