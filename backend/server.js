const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const driveRoutes = require('./routes/driveRoutes');
const dataRoutes = require('./routes/dataRoutes');
const emailRoutes = require('./routes/emailRoutes');
const prospeccionRoutes = require('./routes/prospeccionRoutes');
const sharepointRoutes = require('./routes/sharepointRoutes');
const gptRoutes = require('./routes/gptRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/drive', driveRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/prospeccion', prospeccionRoutes);
app.use('/api/sharepoint', sharepointRoutes);
app.use('/api/gpt', gptRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available routes:');
    console.log('- /api/drive');
    console.log('- /api/data');
    console.log('- /api/email');
    console.log('- /api/prospeccion');
    console.log('- /api/sharepoint');
    console.log('- /api/gpt');
}); 