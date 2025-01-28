import React, { useState, useCallback, useRef } from 'react';
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

  const fileInputRef = useRef(null);

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
          
          // Get raw data from Excel/CSV
          const rawData = utils.sheet_to_json(worksheet, {
            raw: false,
            defval: null,
            blankrows: false,
            header: 1
          });

          if (rawData.length < 2) {
            throw new Error('File must contain headers and at least one data row');
          }

          // Get and clean headers
          const headers = rawData[0].map(header => {
            if (!header) return '';
            return String(header)
              .toLowerCase()
              .trim()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove accents
              .replace(/[^a-z0-9_\s]/g, '') // Remove special chars
              .replace(/\s+/g, '_') // Replace spaces with underscore
              .replace(/_+/g, '_') // Replace multiple underscores
              .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
          });

          // Validate headers
          if (headers.some(h => !h)) {
            throw new Error('Invalid or empty column headers found');
          }

          // Check for duplicate headers
          const uniqueHeaders = new Set(headers);
          if (uniqueHeaders.size !== headers.length) {
            throw new Error('Duplicate column names found');
          }

          // Convert rows to objects with cleaned headers
          const rows = rawData.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              // Clean and normalize the value
              let value = row[index];
              if (value === undefined || value === '') {
                value = null;
              } else {
                value = String(value).trim();
              }
              obj[header] = value;
            });
            return obj;
          });

          resolve(rows);
        } catch (error) {
          reject(new Error(`Error processing file: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!tableName.trim()) {
      setError('Please enter a table name');
      return;
    }

    if (!previewData || previewData.length === 0) {
      setError('No data to import');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Clean table name
      const cleanTableName = tableName.trim()
        .toLowerCase()
        .replace(/[^a-z0-9_\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const response = await tableService.importCSV(cleanTableName, previewData);
      
      if (response.success) {
        setError('');
        setPreviewData(null);
        setTableName('');
        setFile(null);
        if (onFileData) {
          onFileData({ success: true, message: response.message });
        }
      } else {
        setError(response.error || 'Error importing data');
      }
    } catch (error) {
      setError(error.message || 'Error importing data');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="table-import">
      <div 
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={handleZoneClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".xls,.xlsx,.csv"
          className="file-input"
        />
        <div className="drop-zone-content">
          {isProcessing ? (
            <p>Processing file...</p>
          ) : file ? (
            <>
              <p>File selected: {file.name}</p>
              <div className="table-name-input" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Enter table name"
                  disabled={isProcessing}
                />
                <button 
                  onClick={handleImport}
                  disabled={!tableName.trim() || isProcessing}
                >
                  Import
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7-7 7 7"/>
                </svg>
              </div>
              <p>Click here or drag & drop your file to import</p>
              <p className="file-types">Supported formats: XLS, XLSX, CSV</p>
            </>
          )}
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {previewData && (
        <div className="preview-section" onClick={e => e.stopPropagation()}>
          <h3>Preview</h3>
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  {Object.keys(previewData[0]).map((header, index) => (
                    <th key={index}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((cell, cellIndex) => (
                      <td key={cellIndex}>
                        {cell === null ? '' : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 5 && (
              <p className="preview-note">
                Showing first 5 rows of {previewData.length} total rows
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableImport; 