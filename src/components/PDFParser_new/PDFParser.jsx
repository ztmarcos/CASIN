import React, { useState } from 'react';
import pdfService from '../../services/pdfService';
import GPTAnalysis from './GPTAnalysis';
import './PDFParser.css';

const PDFParser = () => {
  const [parsedData, setParsedData] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse PDF content
      const data = await pdfService.parsePDF(file);
      setParsedData(data);

      // Extract tables
      const extractedTables = await pdfService.extractTables(file);
      setTables(extractedTables);
    } catch (err) {
      setError('Error parsing PDF: ' + err.message);
      console.error('Error parsing PDF:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-parser">
      <h2>PDF Parser</h2>
      
      <div className="upload-section">
        <label className="file-input-label">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={loading}
            className="file-input"
          />
          <span className="file-input-text">
            {loading ? 'Processing...' : 'Choose PDF File'}
          </span>
        </label>
      </div>

      {loading && <div className="loading">Processing PDF...</div>}
      
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {parsedData && (
        <div className="parsed-content">
          <h3>Parsed Content:</h3>
          <div className="text-content">
            <pre>{parsedData.text}</pre>
          </div>

          {tables.length > 0 && (
            <div className="tables-section">
              <h3>Extracted Tables:</h3>
              {tables.map((table, index) => (
                <div key={index} className="table-container">
                  <h4>Table {index + 1}</h4>
                  <table>
                    <tbody>
                      {table.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          <GPTAnalysis parsedData={parsedData} tables={tables} />
        </div>
      )}
    </div>
  );
};

export default PDFParser; 