const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const driveRoutes = require('./routes/driveRoutes');
const dataRoutes = require('./routes/dataRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/drive', driveRoutes);
app.use('/api/data', dataRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 