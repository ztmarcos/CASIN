import React, { useEffect, useState } from 'react';
import { Client } from '@notionhq/client';

const NotionDebugger = () => {
  const [debug, setDebug] = useState({
    config: {},
    tasks: [],
    error: null,
    loading: true
  });

  useEffect(() => {
    const checkNotionSetup = async () => {
      try {
        console.group('🔍 Notion API Debug');
        
        // Check environment variables
        const token = process.env.REACT_APP_NOTION_TOKEN;
        const dbId = process.env.REACT_APP_NOTION_DATABASE_ID;
        
        console.log('Environment Check:', {
          hasToken: !!token,
          tokenLength: token?.length,
          hasDbId: !!dbId,
          dbIdLength: dbId?.length
        });

        const notion = new Client({
          auth: token
        });

        // First, verify database access
        const database = await notion.databases.retrieve({
          database_id: dbId
        });

        console.log('Database Properties:', database.properties);

        // Query pages with expanded properties
        const response = await notion.databases.query({
          database_id: dbId,
          page_size: 10,
          filter: {
            and: [
              {
                property: 'title',
                title: {
                  is_not_empty: true
                }
              }
            ]
          }
        });

        console.log('Raw API Response:', {
          results: response.results,
          hasResults: response.results.length > 0,
          firstResult: response.results[0]
        });

        // Process and validate tasks with detailed logging
        const processedTasks = await Promise.all(response.results.map(async (page) => {
          try {
            // Fetch full page content
            const fullPage = await notion.pages.retrieve({ page_id: page.id });
            
            const taskInfo = {
              id: page.id,
              properties: fullPage.properties,
              hasProperties: Object.keys(fullPage.properties).length > 0,
              propertyNames: Object.keys(fullPage.properties),
              title: getPageTitle(fullPage),
              rawPage: fullPage
            };

            console.log(`Task Processing [${page.id}]:`, taskInfo);
            
            return taskInfo;
          } catch (pageError) {
            console.error(`Failed to process page ${page.id}:`, pageError);
            return {
              id: page.id,
              error: pageError.message,
              hasError: true
            };
          }
        }));

        setDebug({
          config: {
            databaseName: database.title?.[0]?.plain_text || 'Unnamed Database',
            propertySchema: database.properties,
            hasValidConfig: true,
            totalProperties: Object.keys(database.properties).length
          },
          tasks: processedTasks,
          error: null,
          loading: false
        });

        console.groupEnd();

      } catch (err) {
        console.error('🚨 Notion Setup Error:', {
          message: err.message,
          code: err.code,
          status: err.status,
          stack: err.stack
        });
        
        setDebug(prev => ({
          ...prev,
          error: {
            message: err.message,
            code: err.code,
            status: err.status,
            details: err.stack
          },
          loading: false
        }));
      }
    };

    checkNotionSetup();
  }, []);

  // Helper function to extract page title with logging
  const getPageTitle = (page) => {
    const properties = page.properties || {};
    const titleProperty = Object.values(properties).find(
      prop => prop.type === 'title'
    );

    const titleInfo = {
      hasTitleProperty: !!titleProperty,
      propertyType: titleProperty?.type,
      titleContent: titleProperty?.title?.[0]?.plain_text
    };

    console.log(`Title Extraction [${page.id}]:`, titleInfo);

    return titleProperty?.title?.[0]?.plain_text || null;
  };

  if (debug.loading) return <div>Loading Notion configuration...</div>;
  if (debug.error) {
    return (
      <div className="notion-debug error">
        <h3>🚨 Notion Configuration Error</h3>
        <pre>{JSON.stringify(debug.error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="notion-debug">
      <h2>Notion Debug Information</h2>
      
      <section>
        <h3>Configuration</h3>
        <pre>{JSON.stringify(debug.config, null, 2)}</pre>
      </section>

      <section>
        <h3>Tasks ({debug.tasks.length})</h3>
        {debug.tasks.map(task => (
          <div key={task.id} className="task-debug">
            <h4>Task ID: {task.id}</h4>
            <p>Title: {task.title || 'No Title'}</p>
            <p>Has Properties: {task.hasProperties ? '✅' : '❌'}</p>
            <p>Property Names: {task.propertyNames?.join(', ') || 'None'}</p>
            {task.hasError && (
              <p className="error">Error: {task.error}</p>
            )}
            <details>
              <summary>Raw Properties</summary>
              <pre>{JSON.stringify(task.properties, null, 2)}</pre>
            </details>
          </div>
        ))}
      </section>

      <style jsx>{`
        .notion-debug {
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
          margin: 20px 0;
        }
        .error {
          background: #fee;
          color: #c00;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        }
        .task-debug {
          margin: 10px 0;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          background: white;
        }
        pre {
          background: #f8f8f8;
          padding: 10px;
          border-radius: 4px;
          overflow-x: auto;
          font-size: 12px;
        }
        details {
          margin-top: 10px;
        }
        summary {
          cursor: pointer;
          color: #0066cc;
        }
      `}</style>
    </div>
  );
};

export default NotionDebugger; 