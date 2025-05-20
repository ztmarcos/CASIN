require('dotenv').config();
const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_SECRET_KEY
});

async function testNotionConnection() {
  try {
    console.log('Testing Notion connection...');
    
    // Query the database
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 1
    });

    if (response.results.length > 0) {
      const page = response.results[0];
      
      console.log('\n=== Raw Page Properties ===');
      Object.entries(page.properties).forEach(([key, value]) => {
        console.log(`\n${key}:`);
        console.log(JSON.stringify(value, null, 2));
      });

      console.log('\n=== Title Property Specific ===');
      const titleProp = page.properties.Title;
      console.log('Title property:', {
        type: titleProp.type,
        hasTitle: Array.isArray(titleProp.title),
        titleLength: titleProp.title?.length,
        firstTitle: titleProp.title?.[0],
        plainText: titleProp.title?.[0]?.plain_text
      });

      // Test extracting values
      const title = titleProp.title?.[0]?.plain_text || 'Sin título';
      const status = page.properties.Status?.status?.name || 'Sin estado';
      const priority = page.properties.Priority?.select?.name || 'Sin prioridad';
      const dueDate = page.properties['Due date']?.date?.start || 'Sin fecha';
      const assignee = page.properties.Assignee?.people?.[0]?.name || 'Sin asignar';
      const description = page.properties.Description?.rich_text?.[0]?.plain_text || 'Sin descripción';
      const taskType = page.properties['Task type']?.multi_select?.[0]?.name || 'Sin tipo';

      console.log('\n=== Extracted Values ===');
      console.log({
        title,
        status,
        priority,
        dueDate,
        assignee,
        description,
        taskType
      });
    } else {
      console.log('No pages found in database');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testNotionConnection(); 