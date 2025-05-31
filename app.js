// Simple Node.js app to force Railway to recognize this as a Node.js project
const { exec } = require('child_process');
const path = require('path');

console.log('Starting React build and serve process...');

// Build the React app
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Build error: ${error}`);
    process.exit(1);
  }
  
  console.log('Build completed successfully');
  console.log(stdout);
  
  // Start serving the built files
  const port = process.env.PORT || 3000;
  exec(`npx serve dist -s -p ${port}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Serve error: ${error}`);
      process.exit(1);
    }
    console.log(`Server started on port ${port}`);
  });
}); 