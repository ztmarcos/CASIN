const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const driveRoutes = require('./routes/driveRoutes');
const dataRoutes = require('./routes/dataRoutes');
const emailRoutes = require('./routes/emailRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/drive', driveRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/email', emailRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Available routes:');
    console.log('- /drive');
    console.log('- /api/data');
    console.log('- /api/email');
}); 