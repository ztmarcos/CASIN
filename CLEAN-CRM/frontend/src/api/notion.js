const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

async function fetchNotionTasks(req, res) {
  try {
    console.log('🔍 Fetching Notion tasks...');
    
    // Validate environment variables
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
      console.error('❌ Missing environment variables');
      return res.status(500).json({
        error: 'Missing configuration',
        details: {
          hasToken: !!process.env.NOTION_API_KEY,
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

async function createNotionTask(req, res) {
  try {
    console.log('📝 Creating new Notion task with body:', req.body);
    
    // Validate environment variables
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DATABASE_ID) {
      console.error('❌ Missing environment variables');
      return res.status(500).json({
        error: 'Missing configuration',
        details: {
          hasToken: !!process.env.NOTION_API_KEY,
          hasDbId: !!process.env.NOTION_DATABASE_ID
        }
      });
    }

    const { title, Encargado, Status, 'Fecha límite': dueDate, Descripción } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({
        error: 'Title is required'
      });
    }

    // Get database schema first to validate property types
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });

    console.log('📚 Database Schema for new task:', database.properties);

    // Create the page in Notion
    const response = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DATABASE_ID
      },
      properties: {
        Name: {  // Make sure this matches your actual title field name in Notion
          title: [
            {
              text: {
                content: title
              }
            }
          ]
        },
        Encargado: {
          rich_text: [
            {
              text: {
                content: Encargado || ''
              }
            }
          ]
        },
        Status: {
          select: {
            name: Status || 'Not Started'
          }
        },
        'Fecha límite': {
          date: dueDate ? {
            start: dueDate
          } : null
        },
        Descripción: {
          rich_text: [
            {
              text: {
                content: Descripción || ''
              }
            }
          ]
        }
      }
    });

    console.log('✅ Task created successfully:', response);

    return res.status(201).json({
      success: true,
      task: response
    });

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    return res.status(500).json({
      error: 'Failed to create Notion task',
      details: error.message,
      stack: error.stack
    });
  }
}

async function deleteNotionTask(req, res) {
  try {
    console.log('🗑️ Deleting Notion task:', req.params.taskId);
    
    // Validate environment variables
    if (!process.env.NOTION_API_KEY) {
      console.error('❌ Missing NOTION_API_KEY');
      return res.status(500).json({
        error: 'Missing configuration',
        details: 'NOTION_API_KEY is required'
      });
    }

    const { taskId } = req.params;

    if (!taskId) {
      console.error('❌ No taskId provided');
      return res.status(400).json({
        error: 'Task ID is required',
        details: 'No taskId provided in URL parameters'
      });
    }

    try {
      // First verify the page exists
      await notion.pages.retrieve({
        page_id: taskId
      });
    } catch (error) {
      console.error('❌ Failed to find task:', error.message);
      return res.status(404).json({
        error: 'Task not found',
        details: `No task found with ID: ${taskId}`
      });
    }

    // Delete (archive) the page in Notion
    await notion.pages.update({
      page_id: taskId,
      archived: true
    });

    console.log('✅ Task deleted successfully');

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      taskId
    });

  } catch (error) {
    console.error('❌ Notion API Error:', error);
    // Check if it's a Notion API error
    if (error.code) {
      return res.status(500).json({
        error: 'Notion API Error',
        code: error.code,
        details: error.message
      });
    }
    return res.status(500).json({
      error: 'Failed to delete Notion task',
      details: error.message
    });
  }
}

module.exports = {
  fetchNotionTasks,
  createNotionTask,
  deleteNotionTask
}; 