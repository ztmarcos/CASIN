import React, { useState } from 'react';
import pdfService from '../../services/pdfService';
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
      console.error('Error processing PDF:', err);
      setError('Failed to process PDF file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pdf-parser">
      <h2>PDF Parser</h2>
      
      <div className="upload-section">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={loading}
        />
        {loading && <div className="loading">Processing PDF...</div>}
        {error && <div className="error">{error}</div>}
      </div>

      {parsedData && (
        <div className="results-section">
          <h3>PDF Information</h3>
          <div className="info">
            <p>Pages: {parsedData.pages}</p>
            <p>Metadata: {JSON.stringify(parsedData.metadata, null, 2)}</p>
          </div>

          <h3>Extracted Text</h3>
          <div className="text-content">
            <pre>{parsedData.text}</pre>
          </div>
        </div>
      )}

      {tables.length > 0 && (
        <div className="tables-section">
          <h3>Detected Tables</h3>
          {tables.map((table, tableIndex) => (
            <div key={tableIndex} className="table-container">
              <h4>Table {tableIndex + 1}</h4>
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
    </div>
  );
};

export default PDFParser; 