const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from root .env file
const rootEnvPath = path.join(__dirname, '..', '.env');
const result = dotenv.config({ path: rootEnvPath });

if (result.error) {
  console.warn('⚠️  Could not load .env file from root directory:', result.error.message);
} else {
  console.log('✅ Environment variables loaded from root .env file');
  
  // Debug: Show which important variables are loaded
  const importantVars = [
    'NOTION_API_KEY',
    'VITE_NOTION_API_KEY', 
    'NOTION_DATABASE_ID',
    'VITE_NOTION_DATABASE_ID',
    'OPENAI_API_KEY',
    'VITE_OPENAI_API_KEY',
    'VITE_FIREBASE_API_KEY',
    'SMTP_HOST',
    'SMTP_USER',
    'DB_HOST',
    'DB_USER',
    'DB_NAME'
  ];
  
  console.log('🔑 Environment Variables Status:');
  importantVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`   ❌ ${varName}: Missing`);
    }
  });
}

module.exports = result; 