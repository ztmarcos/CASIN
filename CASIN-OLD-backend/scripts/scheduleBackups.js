const cron = require('node-cron');
const { spawn } = require('child_process');
const path = require('path');

// Schedule backup every day at midnight
cron.schedule('0 0 * * *', () => {
  console.log('Starting scheduled backup...');
  
  const backupScript = path.join(__dirname, 'autoBackup.js');
  const backup = spawn('node', [backupScript]);

  backup.stdout.on('data', (data) => {
    console.log(`Backup output: ${data}`);
  });

  backup.stderr.on('data', (data) => {
    console.error(`Backup error: ${data}`);
  });

  backup.on('close', (code) => {
    if (code === 0) {
      console.log('Backup completed successfully');
    } else {
      console.error(`Backup process exited with code ${code}`);
    }
  });
}); 