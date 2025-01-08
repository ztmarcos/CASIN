import React, { useState } from 'react';
import OpenAI from 'openai';
import './TestGPT.css';

const TestGPT = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    try {
      const completion = await openai.chat.completions.create({
        messages: [{ role: "user", content: input }],
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