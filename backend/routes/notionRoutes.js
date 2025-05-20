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
      return property.people?.[0]?.name || 
             property.people?.[0]?.person?.email || null;
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

// Get raw table data from Notion
router.get('/raw-table', async (req, res) => {
  try {
    // Validate environment variables
    if (!process.env.VITE_NOTION_API_KEY && !process.env.NOTION_SECRET_KEY) {
      return res.status(500).json({ 
        error: 'Notion API Key not configured'
      });
    }

    if (!process.env.VITE_NOTION_DATABASE_ID && !process.env.NOTION_DATABASE_ID) {
      return res.status(500).json({ 
        error: 'Notion Database ID not configured'
      });
    }

    const databaseId = process.env.VITE_NOTION_DATABASE_ID || process.env.NOTION_DATABASE_ID;

    // Get database structure first
    const database = await notion.databases.retrieve({
      database_id: databaseId
    });

    // Query the database
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'descending'
        }
      ]
    });

    // Transform the results to match Notion's table structure
    const transformedResults = response.results.map(page => {
      const result = {};
      
      // Add all properties from the database
      Object.entries(database.properties).forEach(([key, schema]) => {
        const property = page.properties[key];
        result[key] = extractPropertyValue(property);
      });

      // Add system properties
      result.PageURL = page.url;
      result.Created = new Date(page.created_time).toLocaleString();
      result.LastEdited = new Date(page.last_edited_time).toLocaleString();

      return result;
    });

    console.log('Sending Notion data:', {
      totalItems: transformedResults.length,
      firstItem: transformedResults[0],
      availableColumns: Object.keys(transformedResults[0] || {})
    });

    res.json(transformedResults);
  } catch (error) {
    console.error('Notion Error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Notion data',
      details: error.message
    });
  }
});

module.exports = router; 