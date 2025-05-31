const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Starting React build process...');

// Build the React app first
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Build error: ${error}`);
    process.exit(1);
  }
  
  console.log('Build completed successfully');
  console.log(stdout);
  
  // Serve static files from root directory (where dist files are copied)
  app.use(express.static(__dirname));
  
  // Handle React Router (return index.html for all routes)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
  
  // Start the server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Frontend server running on port ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
  });
}); 