const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cron = require('node-cron');
const birthdayService = require('./services/birthdayService');

// Import routes
const driveRoutes = require('./routes/driveRoutes');
const dataRoutes = require('./routes/dataRoutes');
const emailRoutes = require('./routes/emailRoutes');
const prospeccionRoutes = require('./routes/prospeccionRoutes');
const sharepointRoutes = require('./routes/sharepointRoutes');
const gptRoutes = require('./routes/gptRoutes');
const birthdayRoutes = require('./routes/birthdayRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Routes
app.use('/api/drive', driveRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/prospeccion', prospeccionRoutes);
app.use('/api/sharepoint', sharepointRoutes);
app.use('/api/gpt', gptRoutes);
app.use('/api/birthday', birthdayRoutes);
app.use('/api/auth', authRoutes);

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
console.log('- /api/drive');
console.log('- /api/data');
console.log('- /api/email');
console.log('- /api/prospeccion');
console.log('- /api/sharepoint');
console.log('- /api/gpt');
console.log('- /api/birthday');
console.log('- /api/auth');

// Start server with error handling
const startServer = (port) => {
  try {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer(PORT); 