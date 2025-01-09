const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const driveRoutes = require('./routes/driveRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Drive routes
app.use('/drive', driveRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 