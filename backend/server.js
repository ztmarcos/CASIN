const express = require('express');
const { Client } = require('@notionhq/client');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Validate environment variables
if (!process.env.NOTION_API_KEY) {
  console.error('NOTION_API_KEY is not set in environment variables');
  process.exit(1);
}

if (!process.env.NOTION_DATABASE_ID) {
  console.error('NOTION_DATABASE_ID is not set in environment variables');
  process.exit(1);
}

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Get database structure
let databaseStructure = null;

async function initializeDatabase() {
  try {
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    
    databaseStructure = database;
    console.log('Database structure loaded:', {
      name: database.title[0]?.plain_text || 'Unnamed Database',
      propertyCount: Object.keys(database.properties).length,
      properties: Object.keys(database.properties)
    });
  } catch (error) {
    console.error('Failed to load database structure:', error);
    process.exit(1);
  }
}

// Initialize database structure
initializeDatabase().then(() => {
  console.log('Database initialized successfully');
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

app.use(cors());
app.use(express.json());

// Get database structure
app.get('/api/notion/database-info', async (req, res) => {
  try {
    // Refresh database structure
    await initializeDatabase();
    res.json(databaseStructure);
  } catch (error) {
    console.error('Error fetching database info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Notion table data
app.get('/api/notion/raw-table', async (req, res) => {
  try {
    // Ensure we have the latest database structure
    if (!databaseStructure) {
      await initializeDatabase();
    }

    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
    });

    const tasks = response.results.map(page => {
      // Start with basic properties
      const task = {
        id: page.id,
        PageURL: page.url,
        Created: page.created_time,
        LastEdited: page.last_edited_time,
      };

      // Add all properties from the page based on database structure
      Object.entries(page.properties).forEach(([key, prop]) => {
        switch (prop.type) {
          case 'title':
            task[key] = prop.title[0]?.text?.content || '';
            break;
          case 'rich_text':
            task[key] = prop.rich_text[0]?.text?.content || '';
            break;
          case 'select':
            task[key] = prop.select?.name || '';
            break;
          case 'multi_select':
            task[key] = prop.multi_select?.map(item => item.name) || [];
            break;
          case 'date':
            task[key] = prop.date?.start || null;
            break;
          case 'people':
            task[key] = prop.people[0]?.email || prop.people[0]?.name || '';
            break;
          case 'files':
            task[key] = prop.files?.map(file => file.name).join(', ') || '';
            break;
          case 'checkbox':
            task[key] = prop.checkbox || false;
            break;
          case 'number':
            task[key] = prop.number || null;
            break;
          case 'email':
            task[key] = prop.email || '';
            break;
          case 'phone_number':
            task[key] = prop.phone_number || '';
            break;
          case 'url':
            task[key] = prop.url || '';
            break;
          case 'formula':
            task[key] = prop.formula?.string || prop.formula?.number || prop.formula?.boolean || null;
            break;
          case 'rollup':
            task[key] = prop.rollup?.array?.[0]?.title?.text?.content || '';
            break;
          case 'created_time':
            task[key] = prop.created_time;
            break;
          case 'last_edited_time':
            task[key] = prop.last_edited_time;
            break;
          case 'relation':
            task[key] = prop.relation?.map(rel => rel.id) || [];
            break;
          default:
            task[key] = ''; // Handle any unknown types as empty string
        }
      });

      return task;
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching Notion data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Notion page
app.post('/api/notion/update-cell', async (req, res) => {
  try {
    console.log('Received update request:', {
      body: req.body,
      headers: req.headers
    });
    
    // Ensure database structure is initialized
    if (!databaseStructure) {
      console.log('Database structure not initialized, initializing now...');
      try {
        await initializeDatabase();
      } catch (error) {
        console.error('Failed to initialize database:', error);
        return res.status(500).json({
          message: 'Failed to initialize database',
          error: error.message
        });
      }
    }

    console.log('Current database structure:', {
      properties: Object.keys(databaseStructure.properties),
      databaseId: process.env.NOTION_DATABASE_ID
    });
    
    const { taskId, column, value } = req.body;

    // Log the exact values we're working with
    console.log('Processing update for:', {
      taskId,
      column,
      value,
      valueType: typeof value
    });

    // Enhanced validation
    if (!taskId) {
      return res.status(400).json({ message: 'Missing taskId' });
    }
    if (!column) {
      return res.status(400).json({ message: 'Missing column' });
    }

    // Verify the page exists and get its current properties
    let pageCheck;
    try {
      pageCheck = await notion.pages.retrieve({ page_id: taskId });
      console.log('Page exists:', {
        id: pageCheck.id,
        properties: Object.keys(pageCheck.properties)
      });
    } catch (error) {
      console.error('Page does not exist or no access:', {
        error: error.message,
        body: error.body,
        code: error.code
      });
      return res.status(404).json({ 
        message: 'Page not found or no access', 
        error: error.message,
        details: error.body
      });
    }

    // Get the property type from the database structure
    const propertyConfig = databaseStructure.properties[column];
    if (!propertyConfig) {
      console.error('Column not found in database structure:', {
        requestedColumn: column,
        availableColumns: Object.keys(databaseStructure.properties),
        databaseStructure: databaseStructure
      });
      return res.status(400).json({ 
        message: `Column "${column}" not found in Notion database`,
        availableColumns: Object.keys(databaseStructure.properties)
      });
    }

    console.log('Property config for column:', {
      column,
      type: propertyConfig.type,
      config: propertyConfig,
      value
    });

    // Special handling for read-only properties
    if (['Created', 'LastEdited', 'PageURL'].includes(column)) {
      return res.status(400).json({ 
        message: `Cannot update read-only column: ${column}`
      });
    }

    // Prepare the property update based on the actual property type
    const properties = {};
    
    try {
      // Normalize the value
      const normalizedValue = value === null || value === undefined ? '' : value;
      
      console.log('Preparing property update:', {
        column,
        type: propertyConfig.type,
        normalizedValue,
        originalValue: value
      });

      switch (propertyConfig.type) {
        case 'select':
          properties[column] = {
            select: normalizedValue ? { name: normalizedValue } : null
          };
          break;
        case 'status':  // Separate case for status type
          properties[column] = {
            status: {
              name: normalizedValue
            }
          };
          break;
        case 'title':
          properties[column] = {
            title: [{ text: { content: normalizedValue } }]
          };
          break;
        case 'rich_text':
          properties[column] = {
            rich_text: [{ text: { content: normalizedValue } }]
          };
          break;
        case 'multi_select':
          const multiSelectValues = Array.isArray(normalizedValue) ? normalizedValue : [normalizedValue];
          properties[column] = {
            multi_select: multiSelectValues.filter(Boolean).map(name => ({ name }))
          };
          break;
        case 'date':
          properties[column] = {
            date: normalizedValue ? { start: normalizedValue } : null
          };
          break;
        case 'people':
          // Special handling for people properties
          console.log('Handling people property:', {
            column,
            value: normalizedValue,
            type: propertyConfig.type
          });
          
          if (!normalizedValue) {
            properties[column] = { people: [] };
          } else {
            // Handle both email and user ID formats
            properties[column] = {
              people: [{
                // If it's an email, use it directly
                ...(normalizedValue.includes('@') ? { email: normalizedValue } : { id: normalizedValue })
              }]
            };
          }
          break;
        case 'files':
          return res.status(400).json({ 
            message: `Cannot update files through this interface`
          });
        case 'checkbox':
          properties[column] = {
            checkbox: Boolean(normalizedValue)
          };
          break;
        case 'number':
          const numValue = normalizedValue === '' ? null : Number(normalizedValue);
          if (normalizedValue !== '' && isNaN(numValue)) {
            return res.status(400).json({ 
              message: `Invalid number value for column ${column}: ${normalizedValue}`
            });
          }
          properties[column] = {
            number: numValue
          };
          break;
        case 'email':
          properties[column] = {
            email: normalizedValue
          };
          break;
        case 'phone_number':
          properties[column] = {
            phone_number: normalizedValue
          };
          break;
        case 'url':
          properties[column] = {
            url: normalizedValue
          };
          break;
        case 'formula':
        case 'rollup':
        case 'created_time':
        case 'last_edited_time':
        case 'relation':
          return res.status(400).json({ 
            message: `Cannot update computed/relation column: ${column}`
          });
        default:
          console.log(`Attempting default text handling for type: ${propertyConfig.type}`);
          properties[column] = {
            rich_text: [{ text: { content: normalizedValue } }]
          };
      }

      // Log the final properties object
      console.log('Final properties object:', properties);

      // Update the Notion page
      try {
        const response = await notion.pages.update({
          page_id: taskId,
          properties
        });

        console.log('Notion update response:', response);
        res.status(200).json({ message: 'Cell updated successfully', response });
      } catch (updateError) {
        console.error('Error updating Notion page:', {
          error: updateError.message,
          code: updateError.code,
          status: updateError.status,
          body: updateError.body,
          properties: properties
        });
        
        return res.status(updateError.status || 500).json({ 
          message: 'Failed to update Notion page',
          error: updateError.message,
          details: updateError.body,
          properties: properties
        });
      }
    } catch (error) {
      console.error('Error preparing property value:', {
        error: error.message,
        stack: error.stack,
        column,
        value,
        propertyType: propertyConfig.type
      });
      return res.status(400).json({ 
        message: 'Error preparing property value',
        error: error.message,
        column,
        value,
        propertyType: propertyConfig.type
      });
    }
  } catch (error) {
    console.error('Unexpected error in update-cell:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
      body: error.body
    });
    
    res.status(500).json({ 
      message: 'Unexpected error updating cell',
      error: error.message,
      details: error.body || error.response?.data
    });
  }
});

// Delete Notion pages (archive them)
app.post('/api/notion/delete-tasks', async (req, res) => {
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 