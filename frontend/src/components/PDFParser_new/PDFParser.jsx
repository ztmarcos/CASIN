import React, { useState, useEffect } from 'react';
import pdfService from '../../services/pdfService';
import tableService from '../../services/data/tableService';
import GPTAnalysis from './GPTAnalysis';
import ListadoAnalysis from './ListadoAnalysis';
import DriveDocumentSelector from '../Drive/DriveDocumentSelector';
import './PDFParser.css';

const PDFParser = ({ selectedTable, onClose, onOpenEmailModal }) => {
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');
  const [tableTypes, setTableTypes] = useState({});
  const [showDriveSelector, setShowDriveSelector] = useState(false);
  const [selectedDriveDocument, setSelectedDriveDocument] = useState(null);

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

  const handleDriveDocumentSelect = async (documentData) => {
    const { file, parsedData: driveParsedData, driveDocument } = documentData;
    
    setFileName(file.name);
    setSelectedDriveDocument(driveDocument);
    setLoading(true);
    setError(null);

    try {
      // Parse the downloaded file
      const result = await pdfService.parsePDF(file);
      
      // Merge with Drive metadata
      const enhancedResult = {
        ...result,
        metadata: {
          ...result.metadata,
          fileName: file.name,
          fileSize: file.size,
          driveId: driveDocument.id,
          driveLink: driveDocument.webViewLink,
          lastModified: driveDocument.modifiedTime,
          source: 'drive'
        },
        driveDocument: driveDocument
      };
      
      setParsedData(enhancedResult);
    } catch (err) {
      console.error('Error parsing PDF from Drive:', err);
      setError('Failed to parse PDF file from Drive');
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
        <div className="upload-options">
          <label className="file-input-label">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="file-input"
            />
            <span className="file-input-text">
              📁 Subir PDF Local
            </span>
          </label>
          
          <button 
            className="drive-selector-button"
            onClick={() => setShowDriveSelector(true)}
            type="button"
          >
            📁 Seleccionar de Drive
          </button>
        </div>
        
        {fileName && (
          <div className="selected-file-info">
            <span className="file-name">📄 {fileName}</span>
            {selectedDriveDocument && (
              <a 
                href={selectedDriveDocument.webViewLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="drive-link"
              >
                🔗 Ver en Drive
              </a>
            )}
          </div>
        )}
        
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
                onOpenEmailModal={onOpenEmailModal}
              />
            )}
          </div>
        </div>
      )}

      {/* Drive Document Selector Modal */}
      <DriveDocumentSelector
        isOpen={showDriveSelector}
        onClose={() => setShowDriveSelector(false)}
        onDocumentSelect={handleDriveDocumentSelect}
        selectedDocumentId={selectedDriveDocument?.id}
      />
    </div>
  );
};

export default PDFParser; 