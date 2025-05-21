const express = require('express');
const { Client } = require('@notionhq/client');
const router = express.Router();

// Initialize the Notion client
const notion = new Client({
  auth: process.env.VITE_NOTION_API_KEY || process.env.NOTION_SECRET_KEY,
});

// Enable CORS middleware for Notion routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
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
      // Enhanced people property handling with detailed logging
      if (property.people && property.people.length > 0) {
        const person = property.people[0];
        console.log('Person object from Notion:', JSON.stringify(person, null, 2));
        
        // Try to get the email from the person object
        const email = person.person?.email;
        if (email) {
          console.log('Found email:', email);
          return email;
        }
        
        // Fallback to name if available
        const name = person.name;
        if (name) {
          console.log('Using name as fallback:', name);
          return name;
        }
        
        // Last resort, use the ID
        console.log('Using ID as last resort:', person.id);
        return person.id;
      }
      console.log('No people found in property');
      return null;
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
    if (!process.env.VITE_NOTION_API_KEY && !process.env.NOTION_SECRET_KEY) {
      return res.status(500).json({ 
        error: 'Notion Secret Key not configured',
        details: 'Please set the VITE_NOTION_API_KEY or NOTION_SECRET_KEY environment variable'
      });
    }

    if (!process.env.VITE_NOTION_DATABASE_ID && !process.env.NOTION_DATABASE_ID) {
      return res.status(500).json({ 
        error: 'Notion Database ID not configured',
        details: 'Please set the VITE_NOTION_DATABASE_ID or NOTION_DATABASE_ID environment variable'
      });
    }

    const databaseId = process.env.VITE_NOTION_DATABASE_ID || process.env.NOTION_DATABASE_ID;

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
          const value = extractPropertyValue(page.properties[propName]);
          console.log(`Property ${propName}:`, value);
          result[propName] = value;
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
    
    // Use provided propertyType or get it from database
    const actualPropertyType = propertyType || database.properties[column]?.type || 'rich_text';

    // Prepare the property update based on the column type
    const properties = {};
    
    switch (actualPropertyType) {
      case 'status':
        properties[column] = {
          status: {
            name: value
          }
        };
        break;

      case 'people':
        if (!value) {
          properties[column] = { people: [] };
        } else {
          try {
            // First try to find the user by email
            const users = await notion.users.list();
            const user = users.results.find(u => 
              u.person?.email?.toLowerCase() === value.toLowerCase()
            );

            if (user) {
              properties[column] = {
                people: [{
                  object: 'user',
                  id: user.id
                }]
              };
            } else {
              return res.status(400).json({
                success: false,
                message: 'No Notion user found',
                error: `No Notion user found with email: ${value}`
              });
            }
          } catch (error) {
            console.error('Error finding Notion user:', error);
            return res.status(500).json({
              success: false,
              message: 'Error finding Notion user',
              error: error.message
            });
          }
        }
        break;

      case 'title':
        properties[column] = {
          title: [{ text: { content: value || '' } }]
        };
        break;

      case 'select':
        properties[column] = {
          select: value ? { name: value } : null
        };
        break;

      case 'multi_select':
        properties[column] = {
          multi_select: Array.isArray(value) ? value.map(name => ({ name })) : []
        };
        break;

      case 'date':
        properties[column] = {
          date: value ? { start: value } : null
        };
        break;

      default:
        properties[column] = {
          rich_text: [{ text: { content: value || '' } }]
        };
    }

    // Update the Notion page
    try {
      await notion.pages.update({
        page_id: taskId,
        properties
      });

      res.status(200).json({
        success: true,
        message: 'Cell updated successfully'
      });
    } catch (error) {
      console.error('Error updating Notion page:', error);
      return res.status(error.status || 500).json({
        success: false,
        message: 'Failed to update Notion page',
        error: error.message || 'Unknown error occurred'
      });
    }
  } catch (error) {
    console.error('Error in update-cell route:', error);
    return res.status(error.status || 500).json({
      success: false,
      message: 'Failed to process update request',
      error: error.message || 'Unknown error occurred'
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

module.exports = router; 