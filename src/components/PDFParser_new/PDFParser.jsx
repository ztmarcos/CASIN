import React, { useState, useEffect } from 'react';
import pdfService from '../../services/pdfService';
import tableService from '../../services/data/tableService';
import GPTAnalysis from './GPTAnalysis';
import ListadoAnalysis from './ListadoAnalysis';
import './PDFParser.css';

const PDFParser = () => {
  const [parsedData, setParsedData] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dbTables, setDbTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');

  // Fetch available tables on component mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const tables = await tableService.getTables();
        setDbTables(tables);
      } catch (err) {
        console.error('Error fetching tables:', err);
        setError('Failed to fetch database tables');
      }
    };
    fetchTables();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (!selectedTable) {
      setError('Please select a target table first');
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
      <h2>Capturador de Pólizas</h2>
      
      <div className="upload-section">
        <div className="table-select">
          <select 
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="table-dropdown"
          >
            <option value="">Select Target Table</option>
            {dbTables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.name}
              </option>
            ))}
          </select>
        </div>

        <label className="file-input-label">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={loading || !selectedTable}
            className="file-input"
          />
          <span className="file-input-text">
            {loading ? 'Processing...' : 'Subir Póliza'}
          </span>
        </label>
      </div>

      {loading && <div className="loading">Procesando póliza...</div>}
      
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {parsedData && selectedTable && (
        selectedTable === 'listado' ? (
          <ListadoAnalysis
            parsedData={parsedData}
            tables={tables}
            selectedTable={selectedTable}
            autoAnalyze={true}
          />
        ) : (
          <GPTAnalysis
            parsedData={parsedData}
            tables={tables}
            selectedTable={selectedTable}
            autoAnalyze={true}
          />
        )
      )}
    </div>
  );
};

export default PDFParser; 