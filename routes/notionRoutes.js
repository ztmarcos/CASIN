const express = require('express');
const { Client } = require('@notionhq/client');
const router = express.Router();

// Debug environment variables
console.log('🔑 Notion Environment Variables:', {
  NOTION_API_KEY: process.env.NOTION_API_KEY ? '✅ Present' : '❌ Missing',
  VITE_NOTION_API_KEY: process.env.VITE_NOTION_API_KEY ? '✅ Present' : '❌ Missing',
  NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID ? '✅ Present' : '❌ Missing',
  VITE_NOTION_DATABASE_ID: process.env.VITE_NOTION_DATABASE_ID ? '✅ Present' : '❌ Missing'
});

// Initialize the Notion client
const apiKey = process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY;
if (!apiKey) {
  console.error('❌ No Notion API key found in environment variables');
  throw new Error('Notion API key is required');
}

const notion = new Client({
  auth: apiKey
});

// Test Notion client initialization
notion.users.me().then(response => {
  console.log('✅ Notion client initialized successfully:', response.name);
}).catch(error => {
  console.error('❌ Failed to initialize Notion client:', error.message);
});

// Enable CORS middleware for Notion routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    if (req.path === '/update-cells') {
      res.header('Access-Control-Allow-Methods', 'POST');
    }
    return res.status(200).end();
  }
  
  next();
});

// Helper function to extract property value based on type
const extractPropertyValue = (property) => {
  if (!property) return null;

  switch (property.type) {
    case 'title':
      return property.title[0]?.plain_text || null;
    case 'email':
      return property.email || null;
    case 'rich_text':
      return property.rich_text[0]?.plain_text || null;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select?.map(item => item.name) || [];
    case 'date':
      return property.date?.start || null;
    case 'people':
      // Return the full people array with all user information
      if (property.people && property.people.length > 0) {
        return property.people.map(person => ({
          id: person.id,
          name: person.name,
          email: person.person?.email,
          avatarUrl: person.avatar_url
        }));
      }
      return [];
    case 'status':
      return property.status?.name || null;
    case 'phone_number':
      return property.phone_number || null;
    case 'number':
      return property.number?.toString() || null;
    case 'checkbox':
      return property.checkbox ? 'Yes' : 'No';
    case 'url':
      return property.url || null;
    case 'files':
      return property.files?.map(file => file.name).join(', ') || null;
    default:
      return null;
  }
};

// Get tasks from Notion database
router.get('/tasks', async (req, res) => {
  try {
    // Validate environment variables
    const apiKey = process.env.NOTION_API_KEY || process.env.VITE_NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID;

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Notion API Key not configured',
        details: 'Please set either NOTION_API_KEY or VITE_NOTION_API_KEY environment variable'
      });
    }

    if (!databaseId) {
      return res.status(500).json({ 
        error: 'Notion Database ID not configured',
        details: 'Please set either NOTION_DATABASE_ID or VITE_NOTION_DATABASE_ID environment variable'
      });
    }

    // Query the database
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'title',
          direction: 'ascending'
        }
      ]
    });

    // Transform the results
    const transformedResults = response.results.map(page => {
      const properties = page.properties;
      
      // Get each property using the correct property name with exact case
      const title = extractPropertyValue(properties['Name']) || extractPropertyValue(properties['title']);
      const status = extractPropertyValue(properties['Status']);
      const priority = extractPropertyValue(properties['Priority']);
      const dueDate = extractPropertyValue(properties['Due date']);
      const assignee = extractPropertyValue(properties['Assignee']);
      const description = extractPropertyValue(properties['Description']);
      const taskType = extractPropertyValue(properties['Task type']);
      const email = extractPropertyValue(properties['Email']);

      // Log the extracted data for debugging
      console.log(`Processing page ${page.id}:`, {
        title,
        status,
        dueDate,
        assignee,
        email
      });

      return {
        id: page.id,
        url: page.url,
        title: title || email || 'Sin título',  // Use email as fallback for title
        status: status || 'Sin estado',
        priority: priority || 'Sin prioridad',
        dueDate: dueDate || 'Sin fecha',
        assignee: assignee || 'Sin asignar',
        description: description || 'Sin descripción',
        taskType: taskType || 'Sin tipo',
        email: email || '',
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      };
    });

    res.json(transformedResults);
  } catch (error) {
    console.error('❌ Notion Error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch tasks from Notion',
      details: error.message,
      code: error.code
    });
  }
});

// Get a single database page by ID
router.get('/tasks/:id', async (req, res) => {
  try {
    const pageId = req.params.id;
    const response = await notion.pages.retrieve({ page_id: pageId });
    
    // Transform the page data
    const properties = response.properties;
    const transformedPage = {
      id: response.id,
      url: response.url,
      createdTime: response.created_time,
      lastEditedTime: response.last_edited_time,
      title: extractPropertyValue(properties['title']),
      status: extractPropertyValue(properties['Status']),
      dueDate: extractPropertyValue(properties['Due date']),
      priority: extractPropertyValue(properties['Priority']),
      assignee: extractPropertyValue(properties['Assignee']),
      description: extractPropertyValue(properties['Description']),
      taskType: extractPropertyValue(properties['Task type']),
      tags: extractPropertyValue(properties['Tags']) || []
    };

    res.json(transformedPage);
  } catch (error) {
    console.error(`Error fetching Notion page ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch page from Notion',
      details: error.message,
      code: error.code,
      status: error.status
    });
  }
});

// Debug endpoint to get raw Notion data
router.get('/debug', async (req, res) => {
  try {
    const databaseId = process.env.VITE_NOTION_DATABASE_ID || process.env.NOTION_DATABASE_ID;
    
    // Get database structure
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });

    // Get first few pages
    const pages = await notion.databases.query({
      database_id: databaseId,
      page_size: 3
    });

    res.json({
      database_structure: database,
      sample_pages: pages.results,
      property_names: Object.keys(database.properties),
      sample_properties: pages.results[0]?.properties
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get database structure and columns
router.get('/raw-table', async (req, res) => {
  try {
    const databaseId = process.env.VITE_NOTION_DATABASE_ID || process.env.NOTION_DATABASE_ID;
    
    // Get database structure first
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });

    console.log('Database properties:', JSON.stringify(database.properties, null, 2));

    // Get the pages
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100 // Ensure we get all pages
    });

    // Get current properties from database
    const validProperties = Object.keys(database.properties);
    console.log('Valid properties:', validProperties);

    // Transform the results using only valid properties
    const transformedResults = response.results.map(page => {
      // Log the raw page data for debugging
      console.log('Processing page:', page.id);
      console.log('Raw properties:', JSON.stringify(page.properties, null, 2));

      const result = {
        id: page.id,
        PageURL: page.url,
        Created: page.created_time,
        LastEdited: page.last_edited_time
      };

      // Only include properties that exist in the database
      validProperties.forEach(propName => {
        if (page.properties[propName]) {
          if (propName === 'Encargado') {
            // For Encargado (people) property, keep the full user object
            result[propName] = page.properties[propName].people;
          } else {
            const value = extractPropertyValue(page.properties[propName]);
            console.log(`Property ${propName}:`, value);
            result[propName] = value;
          }
        }
      });

      return result;
    });

    console.log('Transformed results:', JSON.stringify(transformedResults, null, 2));
    res.json(transformedResults);
  } catch (error) {
    console.error('Error fetching Notion data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data from Notion',
      details: error.message 
    });
  }
});

// Update Notion page
router.post('/update-cell', async (req, res) => {
  try {
    const { taskId, column, value, propertyType } = req.body;

    if (!taskId || !column) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        error: null
      });
    }

    // Get the database structure to check property types
    const databaseId = process.env.VITE_NOTION_DATABASE_ID || process.env.NOTION_DATABASE_ID;
    const database = await notion.databases.retrieve({ database_id: databaseId });
    
    // Get the actual property type from the database
    const dbPropertyType = database.properties[column]?.type;
    const actualPropertyType = propertyType || dbPropertyType || 'rich_text';

    console.log('Property info:', {
      column,
      value,
      propertyType,
      dbPropertyType,
      actualPropertyType
    });

    // Prepare the property update based on the column type
    const properties = {};
    
    try {
      switch (actualPropertyType) {
        case 'title':
          properties[column] = {
            title: [{ text: { content: String(value || '') } }]
          };
          break;

        case 'rich_text':
          properties[column] = {
            rich_text: [{ text: { content: String(value || '') } }]
          };
          break;

        case 'select':
          properties[column] = {
            select: value ? { name: String(value) } : null
          };
          break;

        case 'status':
          // Get the status ID from the database options
          const statusOptions = database.properties[column]?.status?.options || [];
          const statusOption = statusOptions.find(option => option.name === value);
          
          if (!statusOption) {
            throw new Error(`Invalid status value: ${value}. Valid options are: ${statusOptions.map(opt => opt.name).join(', ')}`);
          }

          properties[column] = {
            status: {
              id: statusOption.id
            }
          };
          break;

        case 'multi_select':
          const multiSelectValues = Array.isArray(value) ? value : [value];
          properties[column] = {
            multi_select: multiSelectValues.map(v => ({ name: String(v) }))
          };
          break;

        case 'date':
          properties[column] = {
            date: value ? { start: value, end: null } : null
          };
          break;

        case 'people':
          // Handle people property - value should be a user ID
          properties[column] = {
            people: value ? [{ object: 'user', id: value }] : []
          };
          break;

        case 'checkbox':
          properties[column] = {
            checkbox: Boolean(value)
          };
          break;

        case 'number':
          properties[column] = {
            number: value !== null && value !== undefined ? Number(value) : null
          };
          break;

        case 'url':
          properties[column] = {
            url: value || null
          };
          break;

        case 'email':
          properties[column] = {
            email: value || null
          };
          break;

        case 'phone_number':
          properties[column] = {
            phone_number: value || null
          };
          break;

        default:
          // For any unknown type, try as rich_text
          properties[column] = {
            rich_text: [{ text: { content: String(value || '') } }]
          };
      }

      console.log('Updating Notion page with properties:', properties);

      // Update the Notion page
      await notion.pages.update({
        page_id: taskId,
        properties
      });

      res.status(200).json({
        success: true,
        message: 'Cell updated successfully'
      });
    } catch (updateError) {
      console.error('Error updating Notion page:', updateError);
      return res.status(400).json({
        success: false,
        message: 'Failed to update Notion page',
        error: updateError.message
      });
    }
  } catch (error) {
    console.error('Error in update-cell route:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process update request',
      error: error.message
    });
  }
});

// Delete Notion pages (archive them)
router.post('/delete-tasks', async (req, res) => {
  try {
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'Invalid task IDs provided' });
    }

    // Delete tasks in parallel
    const deletePromises = taskIds.map(taskId =>
      notion.pages.update({
        page_id: taskId,
        archived: true,
      })
    );

    await Promise.all(deletePromises);
    res.status(200).json({ message: 'Tasks deleted successfully' });
  } catch (error) {
    console.error('Error deleting tasks:', error);
    res.status(500).json({ message: 'Failed to delete tasks', error: error.message });
  }
});

// Get all Notion users
router.get('/users', async (req, res) => {
  try {
    const users = await notion.users.list();
    
    // Transform users to only include necessary information
    const transformedUsers = users.results
      .filter(user => user.type === 'person' && user.person?.email) // Only include users with emails
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.person.email,
        avatarUrl: user.avatar_url
      }));

    res.json(transformedUsers);
  } catch (error) {
    console.error('Error fetching Notion users:', error);
    res.status(500).json({ 
      message: 'Failed to fetch Notion users', 
      error: error.message 
    });
  }
});

// Delete (archive) a task
router.delete('/delete-task/:taskId', async (req, res) => {
  try {
    console.log('🗑️ Deleting Notion task:', req.params.taskId);
    
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
});

// Create a new task
router.post('/create-task', async (req, res) => {
  try {
    console.log('📝 Creating new Notion task with body:', req.body);
    
    const { properties } = req.body;

    // Get database ID from environment variables
    const databaseId = process.env.NOTION_DATABASE_ID || process.env.VITE_NOTION_DATABASE_ID;
    if (!databaseId) {
      console.error('❌ No database ID configured');
      return res.status(500).json({
        error: 'Configuration error',
        details: 'Notion database ID is not configured'
      });
    }

    // Validate required fields
    if (!properties.title) {
      return res.status(400).json({
        error: 'Title is required'
      });
    }

    console.log('Creating Notion page with properties:', {
      databaseId,
      properties
    });

    // Create the page in Notion
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: properties.title
              }
            }
          ]
        },
        ...properties
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
});

// Batch update multiple cells
router.post('/update-cells', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required',
        error: null
      });
    }

    // Get the database structure to check property types
    const databaseId = process.env.VITE_NOTION_DATABASE_ID || process.env.NOTION_DATABASE_ID;
    const database = await notion.databases.retrieve({ database_id: databaseId });

    // Process all updates in parallel
    const updatePromises = updates.map(async ({ taskId, column, value, propertyType }) => {
      try {
        // Get the actual property type from the database
        const dbPropertyType = database.properties[column]?.type;
        const actualPropertyType = propertyType || dbPropertyType || 'rich_text';

        // Prepare the property update based on the column type
        const properties = {};
        
        switch (actualPropertyType) {
          case 'title':
            properties[column] = {
              title: [{ text: { content: String(value || '') } }]
            };
            break;

          case 'rich_text':
            properties[column] = {
              rich_text: [{ text: { content: String(value || '') } }]
            };
            break;

          case 'select':
            properties[column] = {
              select: value ? { name: String(value) } : null
            };
            break;

          case 'multi_select':
            const multiSelectValues = Array.isArray(value) ? value : [value];
            properties[column] = {
              multi_select: multiSelectValues.map(v => ({ name: String(v) }))
            };
            break;

          case 'date':
            properties[column] = {
              date: value ? { start: value, end: null } : null
            };
            break;

          case 'people':
            properties[column] = {
              people: value ? [{ id: value }] : []
            };
            break;

          case 'checkbox':
            properties[column] = {
              checkbox: Boolean(value)
            };
            break;

          case 'number':
            properties[column] = {
              number: value !== null && value !== undefined ? Number(value) : null
            };
            break;

          case 'url':
            properties[column] = {
              url: value || null
            };
            break;

          case 'email':
            properties[column] = {
              email: value || null
            };
            break;

          case 'phone_number':
            properties[column] = {
              phone_number: value || null
            };
            break;

          default:
            properties[column] = {
              rich_text: [{ text: { content: String(value || '') } }]
            };
        }

        // Update the Notion page
        await notion.pages.update({
          page_id: taskId,
          properties
        });

        return { taskId, success: true };
      } catch (error) {
        console.error(`Error updating task ${taskId}:`, error);
        return { taskId, success: false, error: error.message };
      }
    });

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);

    // Check if any updates failed
    const failedUpdates = results.filter(result => !result.success);
    if (failedUpdates.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some updates failed',
        errors: failedUpdates
      });
    }

    res.status(200).json({
      success: true,
      message: 'All cells updated successfully'
    });
  } catch (error) {
    console.error('Error in batch update:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process batch update',
      error: error.message
    });
  }
});

module.exports = router; 