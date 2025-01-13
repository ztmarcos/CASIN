import React, { useState, useEffect } from 'react';
import tableService from '../../services/data/tableService';
import './TableManager.css';

const TableManager = ({ onTableSelect }) => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [columnNames, setColumnNames] = useState(['']);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const tablesData = await tableService.getTables();
      setTables(tablesData);
      setError(null);
    } catch (err) {
      console.error('Error loading tables:', err);
      setError('Failed to load tables');
    }
  };

  const handleTableSelect = async (tableName) => {
    const table = tables.find(t => t.name === tableName);
    setSelectedTable(table);
    if (onTableSelect) {
      onTableSelect(table);
    }
  };

  const handleAddColumn = () => {
    setColumnNames([...columnNames, '']);
  };

  const handleRemoveColumn = (index) => {
    const newColumns = columnNames.filter((_, i) => i !== index);
    setColumnNames(newColumns);
  };

  const handleColumnNameChange = (index, value) => {
    const newColumns = [...columnNames];
    newColumns[index] = value;
    setColumnNames(newColumns);
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    if (!newTableName.trim()) {
      setError('Please enter a table name');
      return;
    }

    // Filter out empty column names
    const validColumns = columnNames.filter(name => name.trim());
    if (validColumns.length === 0) {
      setError('Please add at least one column');
      return;
    }

    try {
      // Convert column names to table definition
      const tableDefinition = {
        name: newTableName.trim(),
        columns: validColumns.map(name => ({
          name: name.trim()
        }))
      };

      await tableService.createTable(tableDefinition);
      setNewTableName('');
      setColumnNames(['']);
      setShowCreateForm(false);
      setError(null);
      loadTables();
    } catch (err) {
      console.error('Error creating table:', err);
      setError('Failed to create table');
    }
  };

  const handleFileUpload = async (event, recordId) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await tableService.uploadFile(selectedTable.name, recordId, file);
      loadFilesForRecord(recordId);
      setError(null);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const loadFilesForRecord = async (recordId) => {
    try {
      const filesData = await tableService.getFilesForRecord(selectedTable.name, recordId);
      setFiles(filesData);
      setError(null);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load files');
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await tableService.deleteFile(fileId);
      setFiles(files.filter(f => f.id !== fileId));
      setError(null);
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    }
  };

  const renderFileSection = () => {
    if (!selectedRecord) return null;

    return (
      <div className="files-section">
        <h3>Files</h3>
        <div className="file-upload">
          <input
            type="file"
            onChange={(e) => handleFileUpload(e, selectedRecord.id)}
            disabled={isUploading}
          />
          {isUploading && <span>Uploading...</span>}
        </div>
        
        <div className="files-list">
          {files.map(file => (
            <div key={file.id} className="file-item">
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                {file.original_name}
              </a>
              <button
                onClick={() => handleDeleteFile(file.id)}
                className="btn-icon"
                title="Delete file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="table-manager">
      <div className="tables-section">
        <div className="section-header">
          <h3>Tables</h3>
          <button 
            className="btn-primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? 'Cancel' : 'Create Table'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {showCreateForm && (
          <form onSubmit={handleCreateTable} className="create-table-form">
            <div className="form-group">
              <label>Table Name:</label>
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Enter table name"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Columns:</label>
              {columnNames.map((name, index) => (
                <div key={index} className="column-input">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleColumnNameChange(index, e.target.value)}
                    placeholder="Column name"
                    className="input-field"
                  />
                  {columnNames.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(index)}
                      className="btn-icon"
                      title="Remove column"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddColumn}
                className="btn-secondary"
              >
                Add Column
              </button>
            </div>

            <button type="submit" className="btn-primary">
              Create Table
            </button>
          </form>
        )}

        <div className="tables-list">
          {tables.map(table => (
            <div
              key={table.name}
              className={`table-item ${selectedTable?.name === table.name ? 'selected' : ''}`}
              onClick={() => handleTableSelect(table.name)}
            >
              {table.name}
            </div>
          ))}
        </div>
      </div>

      {selectedTable && (
        <div className="table-structure">
          <h3>{selectedTable.name} Structure</h3>
          <div className="columns-list">
            {selectedTable.columns.map(column => (
              <div key={column.name} className="column-item">
                <span className="column-name">{column.name}</span>
                <span className="column-type">{column.type}</span>
                {column.isPrimary && <span className="primary-key">PK</span>}
              </div>
            ))}
          </div>
          {renderFileSection()}
        </div>
      )}
    </div>
  );
};

export default TableManager; 