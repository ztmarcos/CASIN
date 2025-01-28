import React, { useState, useCallback } from 'react';
import { read, utils } from 'xlsx';
import tableService from '../../services/data/tableService';
import './TableImport.css';

const TableImport = ({ onFileData }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tableName, setTableName] = useState('');
  const [previewData, setPreviewData] = useState(null);

  const allowedFileTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ];

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = async (selectedFile) => {
    if (allowedFileTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setError('');
      setIsProcessing(true);
      try {
        const data = await readFileData(selectedFile);
        setPreviewData(data);
        if (onFileData) {
          onFileData(data);
        }
      } catch (err) {
        setError('Error parsing file: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setFile(null);
      setError('Please select only XLS, XLSX or CSV files');
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, []);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const readFileData = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = read(data, { type: 'array', codepage: 65001 });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Get the data with proper options
          const jsonData = utils.sheet_to_json(worksheet, {
            raw: false,
            defval: '',
            header: 1 // Use array of arrays format
          });

          // Process the data to create proper objects
          const headers = jsonData[0];
          const rows = jsonData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              if (header && !header.startsWith('__EMPTY')) {
                obj[header] = row[index] || '';
              }
            });
            return obj;
          });

          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const createTable = async () => {
    if (!tableName.trim()) {
      setError('Please enter a table name');
      return;
    }

    if (!previewData || previewData.length === 0) {
      setError('No data to import');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Pass both the preview data and table name to the callback
      await onFileData(previewData, tableName.trim().toLowerCase());

      setError('');
      setTableName('');
      setPreviewData(null);
      setFile(null);
    } catch (err) {
      console.error('Error creating table:', err);
      setError('Failed to create table: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="table-import-container">
      <div 
        className={`file-upload-section ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-prompt">
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p>Drag and drop your file here or</p>
          <label className="file-input-label">
            <span>Choose File</span>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="file-input"
            />
          </label>
          <p className="file-types">Supported formats: XLS, XLSX, CSV</p>
        </div>

        {isProcessing && (
          <div className="processing-overlay">
            <div className="spinner"></div>
            <p>Processing file...</p>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
        
        {file && !isProcessing && previewData && (
          <div className="file-info">
            <div className="file-details">
              <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div>
                <p className="file-name">{file.name}</p>
                <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                <p className="row-count">{previewData.length} rows</p>
              </div>
            </div>
            <div className="table-name-input">
              <input
                type="text"
                placeholder="Enter table name"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="table-name-field"
              />
              <button 
                className="import-button"
                onClick={createTable}
                disabled={isProcessing || !tableName.trim()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Create Table
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableImport; 