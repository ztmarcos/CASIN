// Simple Node.js app to force Railway to recognize this as a Node.js project
const { spawn } = require('child_process');
const path = require('path');

console.log('Starting React build and serve process...');

// Build the React app
console.log('Building React app...');
const buildProcess = spawn('npm', ['run', 'build'], { stdio: 'inherit' });

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`Build process exited with code ${code}`);
    process.exit(1);
  }
  
  console.log('Build completed successfully');
  
  // Start serving the built files
  const port = process.env.PORT || 3000;
  console.log(`Starting server on port ${port}...`);
  
  const serveProcess = spawn('npx', ['serve', 'dist', '-s', '-p', port], { 
    stdio: 'inherit',
    detached: false
  });
  
  serveProcess.on('error', (error) => {
    console.error(`Serve error: ${error}`);
    process.exit(1);
  });
  
  serveProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    serveProcess.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    serveProcess.kill('SIGINT');
  });
}); 