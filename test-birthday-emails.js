#!/usr/bin/env node

/**
 * Test script to trigger birthday emails immediately
 */

const https = require('https');
const http = require('http');

const APP_URL = process.env.HEROKU_APP_URL || 'https://sis-casin-216c74c28e12.herokuapp.com';

console.log('🧪 Testing birthday emails endpoint...');
console.log('📡 App URL:', APP_URL);

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
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testBirthdayEmails() {
  try {
    const endpoint = `${APP_URL}/api/cron/birthday-emails`;
    console.log('🚀 Calling endpoint:', endpoint);
    console.log('⏰ Checking for today\'s birthdays...\n');
    
    const result = await makeRequest(endpoint);
    
    console.log('\n✅ Test completed!');
    console.log('📊 Status:', result.status);
    console.log('📊 Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('\n✅ SUCCESS: Birthday emails system is working!');
      if (result.data.result && result.data.result.emailsSent > 0) {
        console.log(`📧 ${result.data.result.emailsSent} birthday email(s) would be sent`);
      } else {
        console.log('📧 No birthdays today');
      }
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

testBirthdayEmails();

