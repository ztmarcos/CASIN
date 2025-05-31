const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend independiente funcionando',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// API endpoints
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend independiente API funcionando!',
    server: 'independent',
    port: PORT
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    backend: 'independent',
    port: PORT,
    database: 'not connected (simple mode)',
    services: 'basic only'
  });
});

app.listen(PORT, () => {
  console.log(`🔧 Backend Independiente running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
}); 