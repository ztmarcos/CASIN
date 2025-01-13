import React, { useState } from 'react';
import './GPTAnalysis.css';

const GPTAnalysis = ({ parsedData, tables }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const analyzeContent = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('http://localhost:3001/api/gpt/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: parsedData.text,
                    tables: tables,
                    metadata: parsedData.metadata
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to analyze content');
            }

            const result = await response.json();
            setAnalysis(result);
        } catch (err) {
            setError(err.message);
            console.error('Error analyzing content:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="gpt-analysis">
            <h3>GPT Analysis</h3>
            
            <button 
                onClick={analyzeContent}
                disabled={loading || !parsedData}
                className="analyze-button"
            >
                {loading ? 'Analyzing...' : 'Analyze Content'}
            </button>

            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}

            {analysis && (
                <div className="analysis-results">
                    <h4>Analysis Results:</h4>
                    <div className="result-section">
                        <h5>Document Type:</h5>
                        <p>{analysis.documentType}</p>
                    </div>
                    <div className="result-section">
                        <h5>Key Information:</h5>
                        <ul>
                            {analysis.keyInfo.map((info, index) => (
                                <li key={index}>{info}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="result-section">
                        <h5>Suggestions:</h5>
                        <ul>
                            {analysis.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GPTAnalysis; 