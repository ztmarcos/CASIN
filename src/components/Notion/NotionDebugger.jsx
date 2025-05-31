import React, { useEffect, useState } from 'react';
import './NotionComponent.css';

const NotionDebugger = () => {
  const [debug, setDebug] = useState({
    database: null,
    samplePages: [],
    propertyNames: [],
    sampleProperties: [],
    error: null,
    loading: true
  });

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const response = await fetch('/api/notion/debug');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        setDebug({
          database: data.database_structure,
          samplePages: data.sample_pages,
          propertyNames: data.property_names,
          sampleProperties: data.sample_properties,
          error: null,
          loading: false
        });
      } catch (error) {
        console.error('Debug fetch error:', error);
        setDebug(prev => ({
          ...prev,
          error: error.message,
          loading: false
        }));
      }
    };

    fetchDebugInfo();
  }, []);

  if (debug.loading) return <div>Loading debug information...</div>;
  if (debug.error) {
    return (
      <div className="debug-error">
        <h3>🚨 Debug Error</h3>
        <p>{debug.error}</p>
      </div>
    );
  }

  return (
    <div className="notion-debug">
      <h2>Notion Database Debug</h2>
      
      <section>
        <h3>Database Properties</h3>
        <p>Available Properties: {debug.propertyNames.join(', ')}</p>
        <details>
          <summary>Database Structure</summary>
          <pre>{JSON.stringify(debug.database, null, 2)}</pre>
        </details>
      </section>

      <section>
        <h3>Sample Page Properties</h3>
        <details>
          <summary>First Page Properties</summary>
          <pre>{JSON.stringify(debug.sampleProperties, null, 2)}</pre>
        </details>
      </section>

      <section>
        <h3>Sample Pages</h3>
        {debug.samplePages.map((page, index) => (
          <details key={page.id}>
            <summary>Page {index + 1}</summary>
            <pre>{JSON.stringify(page, null, 2)}</pre>
          </details>
        ))}
      </section>
    </div>
  );
};

export default NotionDebugger; 