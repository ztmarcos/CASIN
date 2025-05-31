import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { taskId, column, value } = req.body;

    if (!taskId || !column) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Map column names to Notion property types
    const propertyType = {
      title: 'title',
      Status: 'select',
      Priority: 'select',
      'Task type': 'multi_select',
      'Due date': 'date',
      Assignee: 'people',
      Description: 'rich_text',
    };

    // Prepare the property update based on the column type
    const properties = {};
    
    switch (propertyType[column]) {
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
          multi_select: value ? [{ name: value }] : []
        };
        break;
      case 'date':
        properties[column] = {
          date: value ? { start: value } : null
        };
        break;
      case 'people':
        properties[column] = {
          people: value ? [{ email: value }] : []
        };
        break;
      case 'rich_text':
        properties[column] = {
          rich_text: [{ text: { content: value || '' } }]
        };
        break;
      default:
        // For any other type, try as rich_text
        properties[column] = {
          rich_text: [{ text: { content: value || '' } }]
        };
    }

    // Update the Notion page
    await notion.pages.update({
      page_id: taskId,
      properties
    });

    res.status(200).json({ message: 'Cell updated successfully' });
  } catch (error) {
    console.error('Error updating cell:', error);
    res.status(500).json({ message: 'Failed to update cell', error: error.message });
  }
} 