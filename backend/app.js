const express = require('express');
const cors = require('cors');
const emailRoutes = require('./routes/email');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/email', emailRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; 