#!/usr/bin/env node

/**
 * Script to enable auto-generate for weekly resumen
 */

const https = require('https');
const http = require('http');

const APP_URL = process.env.HEROKU_APP_URL || 'https://sis-casin-216c74c28e12.herokuapp.com';

console.log('⚙️  Enabling auto-generate for weekly resumen...');
console.log('📡 App URL:', APP_URL);

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
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
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function enableAutoGenerate() {
  try {
    const endpoint = `${APP_URL}/api/app-config/resumen-auto-generate`;
    console.log('🚀 Calling endpoint:', endpoint);
    
    const result = await makeRequest(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ enabled: true })
    });
    
    console.log('\n✅ Configuration updated!');
    console.log('📊 Status:', result.status);
    console.log('📊 Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('\n✅ SUCCESS: Auto-generate is now ENABLED!');
      console.log('📧 Weekly resumen emails will be sent every Friday at 5pm CST');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to enable auto-generate:');
    console.error('🔍 Error:', error.message);
    
    process.exit(1);
  }
}

enableAutoGenerate();

