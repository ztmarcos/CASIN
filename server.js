require('dotenv').config();

// Log environment variables for debugging
console.log('🔑 Notion Environment Variables:', {
  NOTION_API_KEY: process.env.NOTION_API_KEY ? '✅ Present' : '❌ Missing',
  VITE_NOTION_API_KEY: process.env.VITE_NOTION_API_KEY ? '✅ Present' : '❌ Missing',
  NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID ? '✅ Present' : '❌ Missing',
  VITE_NOTION_DATABASE_ID: process.env.VITE_NOTION_DATABASE_ID ? '✅ Present' : '❌ Missing'
});

// Set environment variables if not present
if (!process.env.NOTION_API_KEY) {
  process.env.NOTION_API_KEY = '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';
}

if (!process.env.NOTION_DATABASE_ID) {
  process.env.NOTION_DATABASE_ID = '1f7385297f9a80a3bc5bcec8a3c2debb';
}

// Start the server
require('./backend/app.js'); 