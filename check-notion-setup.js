// Script to check Notion API configuration

require('dotenv').config();
const { Client } = require('@notionhq/client');

// Check environment variables
console.log('Checking Notion environment variables...');

const missingVars = [];

if (!process.env.NOTION_SECRET_KEY) {
  missingVars.push('NOTION_SECRET_KEY');
}

if (!process.env.NOTION_DATABASE_ID) {
  missingVars.push('NOTION_DATABASE_ID');
}

if (missingVars.length > 0) {
  console.error('\x1b[31m%s\x1b[0m', '❌ ERROR: Missing environment variables:');
  missingVars.forEach(variable => {
    console.error(`   - ${variable} is not set in your .env file`);
  });
  console.log('\nPlease add these variables to your .env file and try again.');
  process.exit(1);
}

console.log('\x1b[32m%s\x1b[0m', '✅ Environment variables are correctly set');

// Try to connect to Notion API
console.log('\nTesting connection to Notion API...');

const notion = new Client({
  auth: process.env.NOTION_SECRET_KEY
});

(async () => {
  try {
    console.log(`Using database ID: ${process.env.NOTION_DATABASE_ID}`);
    
    // Validate database ID format
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!/^[a-f0-9]{32}$/.test(databaseId.replace(/-/g, ''))) {
      console.error('\x1b[31m%s\x1b[0m', '❌ ERROR: Invalid Notion Database ID format');
      console.log('The database ID should be 32 characters long (with or without hyphens)');
      process.exit(1);
    }
    
    // Try to query the database
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 1
    });
    
    console.log('\x1b[32m%s\x1b[0m', '✅ Successfully connected to Notion API');
    console.log(`Found ${response.results.length} results in database`);
    
    // Check if we got any results
    if (response.results.length > 0) {
      const firstItem = response.results[0];
      console.log('\nSample item from database:');
      
      // Get title if available
      let title = 'No title property found';
      
      // Try different property names for title
      for (const name of ['Title', 'title', 'Name', 'name']) {
        if (firstItem.properties[name] && firstItem.properties[name].type === 'title') {
          title = firstItem.properties[name].title[0]?.plain_text || 'Empty title';
          break;
        }
      }
      
      console.log(`- Title: ${title}`);
      console.log(`- ID: ${firstItem.id}`);
    }
    
    console.log('\n\x1b[32m%s\x1b[0m', '✅ All checks passed! Your Notion integration is configured correctly.');
    console.log('\nYou can now start the server with:');
    console.log('  node start-server.js');
    
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ ERROR: Failed to connect to Notion API');
    console.error(`Error message: ${error.message}`);
    
    if (error.code === 'unauthorized') {
      console.log('\nThis usually means your NOTION_SECRET_KEY is incorrect or');
      console.log('your integration does not have access to the database.');
    }
    else if (error.status === 404) {
      console.log('\nThis usually means the database ID is incorrect or');
      console.log('your integration does not have access to this database.');
    }
    
    console.log('\nPlease check your settings and try again.');
    process.exit(1);
  }
})(); 