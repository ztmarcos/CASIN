const express = require('express');
const { Client } = require('@notionhq/client');
const router = express.Router();

// Initialize the Notion client
const notion = new Client({
  auth: process.env.VITE_NOTION_API_KEY || process.env.NOTION_SECRET_KEY,
});

// Detailed logging function
const logNotionDebug = (message, data) => {
  console.group('Notion Route Debug');
  console.log(message);
  if (data) {
    try {
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Could not stringify data:', data);
    }
  }
  console.groupEnd();
};

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
    case 'rich_text':
      return property.rich_text[0]?.plain_text || null;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select?.map(item => item.name) || [];
    case 'date':
      return property.date?.start || null;
    case 'people':
      return property.people?.map(person => person.name).join(', ') || null;
    case 'status':
      return property.status?.name || null;
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

    // First, retrieve the database to understand its structure
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });

    // Query the database with sorting
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'Due Date',
          direction: 'ascending'
        }
      ]
    });

    // Transform the results
    const transformedResults = response.results.map(page => {
      const properties = page.properties;

      // Find the title property (it might be named differently)
      const titleProperty = Object.values(properties).find(
        prop => prop.type === 'title'
      );

      const title = titleProperty ? extractPropertyValue(titleProperty) : null;

      // Extract all other properties
      const task = {
        id: page.id,
        url: page.url,
        title: title || 'Sin título',
        status: extractPropertyValue(properties.Status) || extractPropertyValue(properties.status) || 'Sin estado',
        priority: extractPropertyValue(properties.Priority) || extractPropertyValue(properties.priority) || 'Sin prioridad',
        dueDate: extractPropertyValue(properties['Due Date']) || extractPropertyValue(properties['due_date']) || null,
        assignee: extractPropertyValue(properties.Assignee) || extractPropertyValue(properties.assignee) || 'Sin asignar',
        description: extractPropertyValue(properties.Description) || extractPropertyValue(properties.description) || '',
        taskType: extractPropertyValue(properties['Task Type']) || extractPropertyValue(properties['task_type']) || 'Sin tipo',
        tags: extractPropertyValue(properties.Tags) || extractPropertyValue(properties.tags) || [],
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
      };

      return task;
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
      title: extractPropertyValue(properties['Task type']) || extractPropertyValue(properties['Name']) || 'Sin título',
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

module.exports = router; 