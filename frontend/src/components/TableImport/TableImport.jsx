import React, { useState, useCallback, useRef } from 'react';
import { read, utils } from 'xlsx';
import firebaseTableService from '../../services/firebaseTableService';
import './TableImport.css';
import { toast } from 'react-hot-toast';

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

          console.log('📊 Raw data from file:', rawData.length, 'rows');
          console.log('📊 First row (headers):', rawData[0]);
          
          if (rawData.length < 1) {
            throw new Error('File appears to be empty');
          }
          
          // Check if first row looks like it might be data instead of headers
          const firstRow = rawData[0];
          if (firstRow.length === 1 && firstRow[0] && firstRow[0].includes(',')) {
            throw new Error('CSV file might not be properly parsed. Please check the file format and encoding.');
          }
          
          if (rawData.length < 2) {
            throw new Error('File must contain headers and at least one data row');
          }

          // Get and clean headers
          const headers = rawData[0].map((header, index) => {
            if (!header || header.toString().trim() === '') {
              return `column_${index + 1}`; // Generate default column name
            }
            
            const cleaned = String(header)
              .toLowerCase()
              .trim()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove accents
              .replace(/[^a-z0-9_\s]/g, '') // Remove special chars
              .replace(/\s+/g, '_') // Replace spaces with underscore
              .replace(/_+/g, '_') // Replace multiple underscores
              .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
            
            // If cleaning results in empty string, use default name
            return cleaned || `column_${index + 1}`;
          });

          // Validate headers (should not be empty after our cleanup)
          if (headers.some(h => !h)) {
            throw new Error('Unable to process column headers');
          }

          // Handle duplicate headers by adding suffixes
          const finalHeaders = [];
          const headerCount = {};
          
          headers.forEach(header => {
            let finalHeader = header;
            if (headerCount[header]) {
              headerCount[header] += 1;
              finalHeader = `${header}_${headerCount[header]}`;
            } else {
              headerCount[header] = 1;
            }
            finalHeaders.push(finalHeader);
          });

          console.log('📊 Original headers:', rawData[0]);
          console.log('📊 Cleaned headers:', headers);
          console.log('📊 Final headers (with duplicates resolved):', finalHeaders);

          // Convert rows to objects with cleaned headers
          const rows = rawData.slice(1).map(row => {
            const obj = {};
            finalHeaders.forEach((header, index) => {
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

      console.log(`📤 Importing ${previewData.length} records to Firebase collection: ${cleanTableName}`);

      // Import data to Firebase collection using insertData
      // For bulk import, we'll insert each record individually
      let successCount = 0;
      let failCount = 0;
      const batchSize = 10; // Process in batches to avoid overwhelming the API
      
      for (let i = 0; i < previewData.length; i += batchSize) {
        const batch = previewData.slice(i, i + batchSize);
        const batchPromises = batch.map(async (row) => {
          try {
            await firebaseTableService.insertData(cleanTableName, row);
            return { success: true };
          } catch (error) {
            console.error('Error inserting row:', error);
            return { success: false, error };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        successCount += batchResults.filter(r => r.success).length;
        failCount += batchResults.filter(r => !r.success).length;
        
        // Update progress
        const progress = Math.round(((i + batch.length) / previewData.length) * 100);
        console.log(`📊 Import progress: ${progress}% (${successCount + failCount}/${previewData.length})`);
      }

      if (successCount > 0) {
        const message = failCount > 0 
          ? `Successfully imported ${successCount} records (${failCount} failed)`
          : `Successfully imported ${successCount} records`;
        
        toast.success(message);
        console.log(`✅ Import completed: ${successCount} success, ${failCount} failed`);
        
        setError('');
        setPreviewData(null);
        setTableName('');
        setFile(null);
        
        onFileData?.({
          success: true,
          tableName: cleanTableName,
          shouldReload: true,
          importStats: { successCount, failCount }
        });
      } else {
        throw new Error('Failed to import any records');
      }
      
    } catch (error) {
      console.error('Error importing data:', error);
      const errorMessage = error.message || 'Error importing data';
      setError(errorMessage);
      toast.error(errorMessage);
      onFileData?.({ success: false, error: errorMessage });
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