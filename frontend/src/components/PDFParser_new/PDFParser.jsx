import React, { useState, useEffect } from 'react';
import pdfService from '../../services/pdfService';
import tableService from '../../services/data/tableService';
import GPTAnalysis from './GPTAnalysis';
import ListadoAnalysis from './ListadoAnalysis';
import './PDFParser.css';

const PDFParser = ({ selectedTable, onClose }) => {
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [tableTypes, setTableTypes] = useState({});

  // Move tableName logic here for better clarity
  const getTableName = () => {
    const tableName = typeof selectedTable === 'string' ? selectedTable : selectedTable?.name;
    console.log('PDFParser - selectedTable:', selectedTable);
    console.log('PDFParser - tableName:', tableName);
    console.log('PDFParser - typeof selectedTable:', typeof selectedTable);
    return tableName;
  }

  const tableName = getTableName();

  // Fetch table types on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const types = await tableService.getTableTypes();
        
        // Validate the received table types
        if (!types || typeof types !== 'object') {
          throw new Error('Invalid table types data received');
        }
        
        // Check if we have data for the selected table
        if (tableName && !types[tableName]) {
          console.warn(`No type information found for table: ${tableName}`);
        }
        
        setTableTypes(types);
      } catch (err) {
        console.error('Error fetching table types:', err);
        setError(err.message || 'Failed to fetch table types');
        // Don't block the component if table types fail to load
        setTableTypes({});
      }
    };
    fetchData();
  }, [tableName]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setFileName(file.name);
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const result = await pdfService.parsePDF(file); // Pass file directly
      setParsedData(result);
    } catch (err) {
      console.error('Error parsing PDF:', err);
      setError('Failed to parse PDF file');
    } finally {
      setLoading(false);
    }
  };

  const getTableInfo = (name) => {
    return tableTypes[name] || null;
  };

  if (!tableName) {
    return (
      <div className="pdf-parser">
        <div className="error-message">Please select a table first</div>
      </div>
    );
  }

  return (
    <div className="pdf-parser">
      <div className="upload-section">
        <label className="file-input-label">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="file-input"
          />
          <span className="file-input-text">
            {fileName ? `Selected: ${fileName}` : 'Choose PDF File'}
          </span>
        </label>
        {loading && <div className="loading">Processing PDF...</div>}
        {error && <div className="error-message">{error}</div>}
      </div>

      {parsedData && (
        <div className="analysis-section">
          <div className="analysis-component">
            {getTableInfo(tableName)?.isGroup ? (
              <ListadoAnalysis
                parsedData={parsedData}
                selectedTable={tableName}
                tableInfo={getTableInfo(tableName)}
                autoAnalyze={true}
                onClose={onClose}
              />
            ) : (
              <GPTAnalysis
                parsedData={parsedData}
                selectedTable={tableName}
                tableInfo={getTableInfo(tableName)}
                autoAnalyze={true}
                onClose={onClose}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFParser; 