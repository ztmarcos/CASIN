require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_SECRET_KEY || process.env.VITE_NOTION_API_KEY
});

const databaseId = process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID;

async function inspectNotionDatabase() {
  try {
    console.log('==== NOTION DATABASE INSPECTION ====');
    console.log('Using database ID:', databaseId);
    
    // First get database structure
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });

    console.log('\n=== DATABASE SCHEMA ===');
    console.log('Database Title:', database.title?.[0]?.plain_text || 'Unnamed');
    console.log('Properties:');
    
    Object.entries(database.properties).forEach(([name, property]) => {
      console.log(`- ${name} (${property.type})`);
    });

    // Query the database
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 2
    });

    console.log('\n=== SAMPLE PAGES ===');
    console.log('Found', response.results.length, 'pages');

    response.results.forEach((page, index) => {
      console.log(`\n--- PAGE ${index + 1} ---`);
      console.log('ID:', page.id);
      console.log('URL:', page.url);
      console.log('Created:', new Date(page.created_time).toLocaleString());
      
      console.log('\nProperties:');
      Object.entries(page.properties).forEach(([name, prop]) => {
        const valueStr = formatPropertyValue(prop);
        console.log(`- ${name} (${prop.type}): ${valueStr}`);
      });
    });

  } catch (error) {
    console.error('ERROR:', error);
  }
}

function formatPropertyValue(property) {
  if (!property) return 'null';

  try {
    switch (property.type) {
      case 'title':
        return property.title?.[0]?.plain_text || 'Empty title';
      case 'rich_text':
        return property.rich_text?.[0]?.plain_text || 'Empty text';
      case 'select':
        return property.select?.name || 'No selection';
      case 'multi_select':
        return property.multi_select?.map(item => item.name).join(', ') || 'No selections';
      case 'date':
        return property.date?.start || 'No date';
      case 'people':
        return property.people?.map(person => person.name || person.person?.email).join(', ') || 'No people';
      case 'status':
        return property.status?.name || 'No status';
      default:
        return `Unsupported type (${property.type})`;
    }
  } catch (e) {
    return `Error formatting value: ${e.message}`;
  }
}

inspectNotionDatabase(); 