#!/usr/bin/env node

/**
 * DEPRECATED: Use Firebase scheduledWeeklyResumen instead.
 * Cron job script for Heroku Scheduler (legacy).
 * Weekly resumen is now sent by Firebase Cloud Function scheduledWeeklyResumen (Fridays 5:00 PM CST).
 * See HEROKU_SCHEDULER_DISABLE.md to remove this job from Heroku and avoid duplicate sends.
 */

const https = require('https');
const http = require('http');

// Get the app URL from environment variables
const APP_URL = process.env.HEROKU_APP_URL || 'https://sis-casin-216c74c28e12.herokuapp.com';

console.log('📊 Starting weekly resumen cron job...');
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
    
    req.setTimeout(120000, () => { // 2 minutes timeout for resumen generation
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Main function
async function runWeeklyResumenCron() {
  try {
    // Check if today is Friday (day 5)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
    
    console.log('📅 Current day:', dayOfWeek, '(0=Sunday, 5=Friday)');
    
    if (dayOfWeek !== 5) {
      console.log('⏭️  Not Friday, skipping weekly resumen');
      console.log('✅ Cron job completed (skipped - not Friday)');
      process.exit(0);
      return;
    }
    
    console.log('🎯 It\'s Friday! Running weekly resumen...');
    
    const endpoint = `${APP_URL}/api/cron/weekly-resumen`;
    console.log('🚀 Calling endpoint:', endpoint);
    
    const result = await makeRequest(endpoint);
    
    console.log('✅ Weekly resumen cron job completed successfully:');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Weekly resumen cron job failed:');
    console.error('🔍 Error:', error.message);
    
    process.exit(1);
  }
}

// Run the cron job
runWeeklyResumenCron();

