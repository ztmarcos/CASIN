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

// Enhanced property extraction function
const extractPropertyValue = (property) => {
  if (!property) return null;

  try {
    switch (property.type) {
      case 'title':
        return (property.title || []).map(t => t.plain_text).join('') || null;
      case 'rich_text':
        return (property.rich_text || []).map(t => t.plain_text).join('') || null;
      case 'select':
        return property.select?.name || null;
      case 'multi_select':
        return property.multi_select?.map(item => item.name).join(', ') || null;
      case 'date':
        return property.date?.start || null;
      case 'status':
        return property.status?.name || null;
      case 'people':
        return property.people?.map(person => person.name).join(', ') || null;
      default:
        logNotionDebug('Unhandled property type:', { type: property.type, property });
        return null;
    }
  } catch (error) {
    logNotionDebug('Error extracting property value:', { error, property });
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

    console.log('📚 Database Structure:', {
      properties: Object.entries(database.properties).map(([key, value]) => ({
        name: key,
        type: value.type
      }))
    });
    
    // Query the Notion database
    console.log('🔑 Querying database with ID:', databaseId);
    
    let response;
    try {
      response = await notion.databases.query({
        database_id: databaseId,
        page_size: 10 // Let's get a few pages
      });

      // Log the raw response to see what we're getting
      console.log('📦 Raw database query response:', {
        resultCount: response.results.length,
        results: response.results.map(page => ({
          id: page.id,
          // Log the raw properties object
          rawProperties: page.properties, 
          hasProperties: !!page.properties,
          propertyCount: page.properties ? Object.keys(page.properties).length : 0,
          propertyNames: page.properties ? Object.keys(page.properties) : []
        }))
      });

    } catch (error) {
      if (error.code === 'object_not_found') {
        console.error('❌ Database not found. Check your database ID:', databaseId);
        throw new Error('Database not found. Please verify your database ID.');
      }
      
      if (error.code === 'unauthorized') {
        console.error('❌ Integration lacks permission. Please check:');
        console.error('1. The integration token is correct');
        console.error('2. The integration has been added to the database');
        console.error('3. The integration has read permissions');
        throw new Error('Unauthorized access to database. Please check integration permissions.');
      }
      
      throw error;
    }
    
    // Log the full response for debugging
    // console.log('Full Notion Response:', JSON.stringify(response.results[0], null, 2));

    console.log('📊 Raw Response from query:', {
      resultCount: response.results.length,
      firstPage: response.results[0] ? {
        id: response.results[0].id,
        // Log raw properties of the first page
        rawProperties: response.results[0].properties 
      } : null
    });

    // Transform the data into a more usable format
    const transformedResults = response.results.map(page => {
      // Log the raw page data for debugging
      console.log('📄 Raw Page for transformation:', {
        id: page.id,
        url: page.url,
        // Log raw properties before transformation
        rawProperties: page.properties, 
        hasProperties: !!page.properties,
        propertiesForTransformation: page.properties ? Object.entries(page.properties).map(([key, prop]) => ({
          key,
          type: prop.type,
          value: extractPropertyValue(prop)
        })) : []
      });

      if (!page.properties) {
        console.error('❌ Page is missing properties during transformation:', {
          id: page.id,
          rawPage: JSON.stringify(page, null, 2)
        });
        return null;
      }
      
      const properties = page.properties; // Define properties here

      // Simplified title extraction for now - just find the first text-based property
      let titleValue = '';
      let titlePropertyKey = '';

      for (const [key, prop] of Object.entries(properties)) {
        const value = extractPropertyValue(prop);
        if (typeof value === 'string' && value.trim() !== '') {
          titlePropertyKey = key;
          titleValue = value;
          break; 
        }
      }
      
      console.log('📝 Title Extraction Attempt:', {
        pageId: page.id,
        titlePropertyKey,
        titleValue,
        allPropertyKeys: Object.keys(properties),
        propertyTypes: Object.entries(properties).map(([key, prop]) => `${key}: ${prop.type}`)
      });

      if (!titleValue) {
        console.warn('⚠️ No usable title found for page:', page.id);
        // return null; // Let's still process it to see other fields
      }

      const task = {
        id: page.id,
        url: page.url,
        title: titleValue || 'No Title Found', // Default if no title
        status: extractPropertyValue(properties.Status) || 'No Status',
        dueDate: extractPropertyValue(properties['Due Date']) || '',
        priority: extractPropertyValue(properties.Priority) || 'No Priority',
        assignee: extractPropertyValue(properties.Assignee) || '',
        description: extractPropertyValue(properties.Description) || '',
        taskType: extractPropertyValue(properties['Task Type']) || ''
      };

      console.log('✨ Transformed Task:', task);

      return task;
    }).filter(task => task !== null); // Filter out nulls from pages missing properties earlier

    console.log('🎯 Final Result:', {
      count: transformedResults.length,
      tasks: transformedResults
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