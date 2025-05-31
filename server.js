const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir archivos estáticos
app.use(express.static('.'));

// Ruta para el API backend
app.use('/api', (req, res, next) => {
  // Proxy al backend en desarrollo o servir desde backend/ en producción
  if (process.env.NODE_ENV === 'development') {
    // En desarrollo, redirigir al backend local
    res.redirect(`http://localhost:5000${req.originalUrl}`);
  } else {
    // En producción, servir desde backend integrado
    require('./backend/server.js');
  }
});

// Catch-all handler: enviar index.html para rutas SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 CASIN CRM running on port ${PORT}`);
  console.log(`📱 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api`);
}); 