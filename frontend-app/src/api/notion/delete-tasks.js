import { Client } from '@notionhq/client';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'Invalid task IDs provided' });
    }

    // Delete tasks in parallel
    const deletePromises = taskIds.map(taskId =>
      notion.pages.update({
        page_id: taskId,
        archived: true, // This is how we "delete" in Notion
      })
    );

    await Promise.all(deletePromises);

    res.status(200).json({ message: 'Tasks deleted successfully' });
  } catch (error) {
    console.error('Error deleting tasks:', error);
    res.status(500).json({ message: 'Failed to delete tasks', error: error.message });
  }
} 