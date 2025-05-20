require('dotenv').config();
console.log('Loading environment from:', require('path').resolve('.env'));
console.log('Environment variables loaded:', Object.keys(process.env));

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cron = require('node-cron');
const mysqlDatabase = require('./services/mysqlDatabase');
const birthdayService = require('./services/birthdayService');

// Import routes
const prospeccionRoutes = require('./routes/prospeccionRoutes');
const fileRoutes = require('./routes/fileRoutes');
const dataRoutes = require('./routes/dataRoutes');
const policyStatusRoutes = require('./routes/policyStatusRoutes');
const driveRoutes = require('./routes/driveRoutes'); // Re-enabled
const emailRoutes = require('./routes/emailRoutes');
// const sharepointRoutes = require('./routes/sharepointRoutes'); // Temporarily disabled
const gptRoutes = require('./routes/gptRoutes');
const birthdayRoutes = require('./routes/birthdayRoutes');
const authRoutes = require('./routes/authRoutes');
const notionRoutes = require('./routes/notionRoutes'); // Added Notion routes

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
app.use('/api/prospeccion', prospeccionRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/policy-status', policyStatusRoutes);
app.use('/api/drive', driveRoutes); // Re-enabled
app.use('/api/email', emailRoutes);
// app.use('/api/sharepoint', sharepointRoutes); // Temporarily disabled
app.use('/api/gpt', gptRoutes);
app.use('/api/birthday', birthdayRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notion', notionRoutes); // Added Notion routes

// Schedule birthday check every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
    console.log('Running scheduled birthday check...');
    try {
        await birthdayService.checkAndSendBirthdayEmails();
    } catch (error) {
        console.error('Error in scheduled birthday check:', error);
    }
});

// Print available routes
console.log('Available routes:');
console.log('- /api/prospeccion');
console.log('- /api/data');
console.log('- /api/policy-status');
console.log('- /api/drive');
console.log('- /api/email');
console.log('- /api/gpt');
console.log('- /api/birthday');
console.log('- /api/auth');
console.log('- /api/notion');

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