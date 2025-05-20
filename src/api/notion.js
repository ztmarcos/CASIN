const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_SECRET_KEY
});

async function fetchNotionTasks(req, res) {
  try {
    console.log('🔍 Fetching Notion tasks...');
    
    // Validate environment variables
    if (!process.env.NOTION_SECRET_KEY || !process.env.NOTION_DATABASE_ID) {
      console.error('❌ Missing environment variables');
      return res.status(500).json({
        error: 'Missing configuration',
        details: {
          hasToken: !!process.env.NOTION_SECRET_KEY,
          hasDbId: !!process.env.NOTION_DATABASE_ID
        }
      });
    }

    // First get database schema
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });

    console.log('📚 Database Schema:', database.properties);

    // Query the database with proper filtering
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      filter: {
        and: [
          {
            property: 'title',
            title: {
              is_not_empty: true
            }
          }
        ]
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    // Process and validate each page
    const tasks = await Promise.all(response.results.map(async (page) => {
      try {
        // Get full page details
        const fullPage = await notion.pages.retrieve({
          page_id: page.id
        });

        // Extract title
        const titleProp = Object.values(fullPage.properties).find(
          prop => prop.type === 'title'
        );

        const title = titleProp?.title[0]?.plain_text || null;

        return {
          id: page.id,
          title,
          properties: fullPage.properties,
          url: fullPage.url,
          createdTime: fullPage.created_time,
          lastEditedTime: fullPage.last_edited_time
        };
      } catch (error) {
        console.error(`❌ Error processing page ${page.id}:`, error);
        return null;
      }
    }));

    // Filter out failed tasks and format response
    const validTasks = tasks.filter(task => task !== null);

    console.log(`✅ Successfully fetched ${validTasks.length} tasks`);

    return res.status(200).json({
      success: true,
      tasks: validTasks,
      metadata: {
        total: validTasks.length,
        databaseName: database.title[0]?.plain_text || 'Unnamed Database',
        lastSync: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch Notion tasks',
      details: error.message
    });
  }
}

module.exports = {
  fetchNotionTasks
}; 