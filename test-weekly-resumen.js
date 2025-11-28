#!/usr/bin/env node

/**
 * Test script to trigger weekly resumen email immediately
 * This will test the /api/cron/weekly-resumen endpoint
 */

const https = require('https');
const http = require('http');

// Get the app URL from environment variables or use localhost
const APP_URL = process.env.API_URL || process.env.HEROKU_APP_URL || 'http://localhost:3000';

console.log('🧪 Testing weekly resumen endpoint...');
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
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(120000, () => { // 2 minutes timeout
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Main function
async function testWeeklyResumen() {
  try {
    const endpoint = `${APP_URL}/api/cron/weekly-resumen`;
    console.log('🚀 Calling endpoint:', endpoint);
    console.log('⏰ This will generate and send the weekly resumen email...\n');
    
    const result = await makeRequest(endpoint);
    
    console.log('\n✅ Test completed!');
    console.log('📊 Status:', result.status);
    console.log('📊 Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('\n✅ SUCCESS: Weekly resumen email should have been sent!');
      console.log('📧 Check your inbox at: ztmarcos@gmail.com and marcoszavala09@gmail.com');
    } else {
      console.log('\n⚠️  WARNING: Status code is not 200');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('🔍 Error:', error.message);
    
    process.exit(1);
  }
}

// Run the test
testWeeklyResumen();

