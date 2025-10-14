#!/usr/bin/env node

/**
 * Cron job script for Heroku Scheduler
 * This script will be executed daily to trigger birthday emails
 */

const https = require('https');
const http = require('http');

// Get the app URL from environment variables
const APP_URL = process.env.HEROKU_APP_URL || 'https://sis-casin-216c74c28e12.herokuapp.com';

console.log('🎂 Starting birthday email cron job...');
console.log('📡 App URL:', APP_URL);

// Function to make HTTP request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Main function
async function runBirthdayCron() {
  try {
    const endpoint = `${APP_URL}/api/cron/birthday-emails`;
    console.log('🚀 Calling endpoint:', endpoint);
    
    const result = await makeRequest(endpoint);
    
    console.log('✅ Birthday cron job completed successfully:');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Birthday cron job failed:');
    console.error('🔍 Error:', error.message);
    
    process.exit(1);
  }
}

// Run the cron job
runBirthdayCron();
