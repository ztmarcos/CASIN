import React, { useState, useEffect } from 'react';
import OpenAI from 'openai';
import databaseService from '../../services/data/database';
import './TestGPT.css';

const TestGPT = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState(null);

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const tablesData = await databaseService.getTables();
      setTables(tablesData);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const handleTableSelect = async (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    if (tableName) {
      try {
        const data = await databaseService.getData(tableName);
        setTableData(data);
      } catch (error) {
        console.error('Error loading table data:', error);
        setTableData(null);
      }
    } else {
      setTableData(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    try {
      let prompt = input;
      
      // If table data is selected, include it in the prompt
      if (tableData && tableData.data.length > 0) {
        const dataContext = `Database table '${selectedTable}' contains the following data:\n${JSON.stringify(tableData.data, null, 2)}\n\nBased on this data, please answer: `;
        prompt = dataContext + input;
      }

      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4o-mini",
      });

      setResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: Unable to get response from GPT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="testgpt-container">
      <div className="testgpt-header">
        <h2>Test GPT</h2>
      </div>
      <div className="testgpt-content">
        <div className="table-selector">
          <label htmlFor="table-select">Include data from table:</label>
          <select
            id="table-select"
            value={selectedTable}
            onChange={handleTableSelect}
            className="table-select"
          >
            <option value="">None</option>
            {tables.map(table => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
        </div>
        
        {tableData && (
          <div className="data-preview">
            <h3>Selected Table Data:</h3>
            <pre className="data-content">
              {JSON.stringify(tableData.data, null, 2)}
            </pre>
          </div>
        )}

        <form onSubmit={handleSubmit} className="testgpt-form">
          <div className="input-group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your prompt here..."
              rows={4}
              className="testgpt-input"
            />
          </div>
          <button 
            type="submit" 
            className="testgpt-submit"
            disabled={loading || !input.trim()}
          >
            {loading ? 'Processing...' : 'Send'}
          </button>
        </form>
        {response && (
          <div className="testgpt-response">
            <h3>Response:</h3>
            <div className="response-content">
              {response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestGPT; 