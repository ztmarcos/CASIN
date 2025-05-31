import { Client } from '@notionhq/client';
import { useState, useEffect } from 'react';

const NotionClient = ({ children }) => {
  const [notionClient, setNotionClient] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Validate required environment variables
      if (!import.meta.env.VITE_NOTION_API_KEY) {
        throw new Error('Notion API Key not configured. Please add VITE_NOTION_API_KEY to your environment variables.');
      }

      if (!import.meta.env.VITE_NOTION_DATABASE_ID) {
        throw new Error('Notion Database ID not configured. Please add VITE_NOTION_DATABASE_ID to your environment variables.');
      }

      // Validate database ID format
      const databaseId = import.meta.env.VITE_NOTION_DATABASE_ID;
      if (!/^[a-f0-9]{32}$/.test(databaseId.replace(/-/g, ''))) {
        throw new Error('Invalid Notion Database ID format. Please check your VITE_NOTION_DATABASE_ID.');
      }

      // Initialize the Notion client with the secret key from environment variables
      const notion = new Client({
        auth: import.meta.env.VITE_NOTION_API_KEY,
        fetch: window.fetch.bind(window)
      });

      setNotionClient(notion);
    } catch (err) {
      setError(err.message || 'Failed to initialize Notion client');
      console.error('Notion client initialization error:', err);
    }
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">
              Please check your environment variables and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!notionClient) {
    return (
      <div className="flex items-center justify-center p-4">
        <svg className="animate-spin h-5 w-5 text-gray-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span className="text-gray-600 dark:text-gray-300">Inicializando Notion...</span>
      </div>
    );
  }

  return children({ notionClient });
};

export default NotionClient; 