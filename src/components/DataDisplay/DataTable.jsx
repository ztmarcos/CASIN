import React, { useState, useEffect, useCallback } from 'react';
import pdfService from '../../services/pdfService';
import tableService from '../../services/data/tableService';
import CellPDFParser from '../PDFParser/CellPDFParser';
import TableMail from './TableMail';
import './DataTable.css';

const DataTable = ({ data, onRowClick, onCellUpdate, onRefresh, tableName }) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [sortedData, setSortedData] = useState([]);
  const [showPdfUpload, setShowPdfUpload] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCells, setSelectedCells] = useState([]);
  const [selectionStart, setSelectionStart] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [mailModal, setMailModal] = useState({ isOpen: false, rowData: null });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [statusModal, setStatusModal] = useState({ isOpen: false, rowId: null, currentStatus: null });

  useEffect(() => {
    setSortedData(data);
    setFilteredData(data);
  }, [data]);

  // Search handler
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredData(sortedData);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = sortedData.filter(row => 
      Object.values(row).some(value => 
        value !== null && 
        String(value).toLowerCase().includes(searchTermLower)
      )
    );
    setFilteredData(filtered);
  }, [searchTerm, sortedData]);

  const handleSort = (column) => {
    let direction = 'asc';
    if (sortConfig.key === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === column && sortConfig.direction === 'desc') {
      direction = null;
    }

    setSortConfig({ key: direction ? column : null, direction });

    if (!direction) {
      setSortedData([...data]);
      return;
    }

    const sorted = [...filteredData].sort((a, b) => {
      if (a[column] === null) return 1;
      if (b[column] === null) return -1;
      
      let comparison = 0;
      if (typeof a[column] === 'number') {
        comparison = a[column] - b[column];
      } else {
        comparison = String(a[column]).localeCompare(String(b[column]));
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });

    setSortedData(sorted);
  };

  const getSortIcon = (column) => {
    if (sortConfig.key !== column) {
      return <span className="sort-icon">↕</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="sort-icon active">↑</span> : 
      <span className="sort-icon active">↓</span>;
  };

  const refreshData = useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Failed to refresh data:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh]);

  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>;
  }

  const columns = Object.keys(data[0]);

  const handleCellClick = (rowIndex, column, value) => {
    // Remove single click handler functionality
  };

  const handleCellDoubleClick = (rowIndex, column, value) => {
    if (column === 'status') {
      const row = data[rowIndex];
      setStatusModal({
        isOpen: true,
        rowId: row.id,
        currentStatus: value || 'Vigente 🟢'
      });
      return;
    }
    setEditingCell({ rowIndex, column, value });
    setEditValue(value !== null ? String(value) : '');
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleConfirmEdit = async () => {
    if (!editingCell) return;

    const { rowIndex, column } = editingCell;
    const row = data[rowIndex];
    
    try {
      await onCellUpdate(row.id, column, editValue);
      handleCancelEdit();
      await refreshData();
    } catch (error) {
      console.error('Failed to update cell:', error);
    }
  };

  // Input field keyboard handler
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handlePdfUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !editingCell) return;

    if (file.type !== 'application/pdf') {
      console.error('Please upload a PDF file');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Parse PDF content
      const data = await pdfService.parsePDF(file);
      
      // Create prompt for GPT
      const prompt = {
        text: data.text,
        metadata: data.metadata,
        targetColumns: [editingCell.column],
        tableName: 'current_table',
        instructions: customPrompt || `
          Please analyze the document and extract the following information:
          - ${editingCell.column}: Find the exact value in the text
          
          Important rules:
          1. Extract EXACT values from the document
          2. Return null if a value cannot be found
          3. For dates, maintain the format as shown in the document
          4. For currency values, include the full amount with decimals
          5. For text fields, extract the complete text as shown
        `
      };

      // Call GPT analysis endpoint
      const response = await fetch('http://localhost:3001/api/gpt/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze PDF');
      }

      const result = await response.json();
      
      if (result.mappedData && result.mappedData[editingCell.column] !== undefined) {
        setEditValue(result.mappedData[editingCell.column] || '');
      }
      
      setShowPdfUpload(false);
    } catch (err) {
      console.error('Error analyzing PDF:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add selection handlers
  const handleCellSelection = (event, rowIndex, column, value) => {
    event.preventDefault();
    
    // Handle double click for editing
    if (event.detail === 2) {
      handleCellDoubleClick(rowIndex, column, value);
      return;
    }

    const cellKey = `${rowIndex}-${column}`;
    
    if (event.shiftKey && selectionStart) {
      // Calculate range selection
      const startRow = Math.min(selectionStart.rowIndex, rowIndex);
      const endRow = Math.max(selectionStart.rowIndex, rowIndex);
      const startColIndex = columns.indexOf(selectionStart.column);
      const endColIndex = columns.indexOf(column);
      const startCol = Math.min(startColIndex, endColIndex);
      const endCol = Math.max(startColIndex, endColIndex);
      
      const newSelection = [];
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          newSelection.push(`${r}-${columns[c]}`);
        }
      }
      setSelectedCells(newSelection);
    } else if ((event.metaKey || event.ctrlKey)) {
      // Toggle individual cell selection
      setSelectedCells(prev => 
        prev.includes(cellKey) 
          ? prev.filter(key => key !== cellKey)
          : [...prev, cellKey]
      );
    } else {
      // Single cell selection
      setSelectedCells([cellKey]);
      setSelectionStart({ rowIndex, column });
    }
  };

  // Add copy handler
  useEffect(() => {
    const handleCopy = (event) => {
      if (selectedCells.length === 0) return;
      
      // Create a matrix of selected cells
      const cellMatrix = {};
      let minRow = Infinity, maxRow = -Infinity;
      let minCol = Infinity, maxCol = -Infinity;
      
      selectedCells.forEach(cellKey => {
        const [rowIndex, column] = cellKey.split('-');
        const row = parseInt(rowIndex);
        const col = columns.indexOf(column);
        
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
        
        if (!cellMatrix[row]) cellMatrix[row] = {};
        cellMatrix[row][col] = data[row][column];
      });
      
      // Convert matrix to TSV format
      let copyText = '';
      for (let row = minRow; row <= maxRow; row++) {
        const rowData = [];
        for (let col = minCol; col <= maxCol; col++) {
          rowData.push(cellMatrix[row]?.[col] ?? '');
        }
        copyText += rowData.join('\t') + '\n';
      }
      
      event.clipboardData.setData('text/plain', copyText.trim());
      event.preventDefault();
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [selectedCells, data, columns]);

  const handleEmailClick = (rowData) => {
    setMailModal({ isOpen: true, rowData });
  };

  const handleCloseMailModal = () => {
    setMailModal({ isOpen: false, rowData: null });
  };

  const handleDeleteClick = (row) => {
    setDeleteConfirm(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm || !deleteConfirm.id) return;

    try {
      await tableService.deleteRow(tableName, deleteConfirm.id);
      setDeleteConfirm(null);
      if (onRefresh) {
        await refreshData();
      }
    } catch (error) {
      console.error('Error deleting row:', error);
    }
  };

  const handleStatusChange = async (rowId, newValue) => {
    try {
      console.log('Status change initiated:', { rowId, newValue });
      
      // Validate the new value
      if (!['Vigente 🟢', 'Baja 🔴'].includes(newValue)) {
        throw new Error(`Invalid status value: ${newValue}`);
      }
      
      // Update the UI optimistically
      setFilteredData(prevData => 
        prevData.map(row => 
          row.id === rowId ? { ...row, status: newValue } : row
        )
      );
      
      // Call the update function
      await onCellUpdate(rowId, 'status', newValue);
      console.log('Status update successful');
      
      // Refresh the data to ensure consistency
      await refreshData();
    } catch (error) {
      console.error('Failed to update status:', {
        error,
        rowId,
        newValue,
        details: error.response?.data
      });
      
      // Revert the optimistic update on error
      await refreshData();
      
      // Show error to user (you can implement a better error UI)
      alert('Error updating status. Please try again.');
    }
  };

  const handleStatusModalClose = () => {
    setStatusModal({ isOpen: false, rowId: null, currentStatus: null });
  };

  const handleStatusConfirm = async (newStatus) => {
    try {
      await handleStatusChange(statusModal.rowId, newStatus);
      handleStatusModalClose();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const renderCell = (row, rowIndex, column) => {
    // Check if this cell is being edited
    if (editingCell && editingCell.rowIndex === rowIndex && editingCell.column === column) {
      if (column === 'status') {
        return (
          <select
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            autoFocus
            className="edit-cell-input"
          >
            <option value="Vigente 🟢">Vigente 🟢</option>
            <option value="Baja 🔴">Baja 🔴</option>
          </select>
        );
      }
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          autoFocus
          className="edit-cell-input"
        />
      );
    }

    // Regular cell display
    if (column === 'status') {
      const status = row[column] || 'Vigente 🟢';
      return (
        <div className={`status-indicator ${status.includes('Baja') ? 'status-inactive' : 'status-active'}`}>
          {status}
        </div>
      );
    }
    return row[column] !== null ? String(row[column]) : '-';
  };

  // Reorder columns to put status after ID
  const reorderedColumns = columns.filter(col => col !== 'status');
  const idIndex = reorderedColumns.indexOf('id');
  if (idIndex !== -1) {
    reorderedColumns.splice(idIndex + 1, 0, 'status');
  }

  return (
    <div className="data-table-container">
      <div className="table-controls">
        <input
          type="text"
          placeholder="Buscar en tabla..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      <div className={`table-wrapper ${isRefreshing ? 'refreshing' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="email-column">
                <div className="header-content">
                  <span>Email</span>
                </div>
              </th>
              {reorderedColumns.map(column => (
                <th 
                  key={column}
                  onClick={() => handleSort(column)}
                  className={`sortable-header ${sortConfig.key === column ? 'active' : ''}`}
                >
                  <div className="th-content">
                    <span>{column}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
              <th className="delete-column">
                <div className="header-content">
                  <span>Delete</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="email-cell">
                  <button 
                    className="email-icon-btn" 
                    title="Send Email"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEmailClick(row);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="email-icon">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <path d="M22 6l-10 7L2 6" />
                    </svg>
                  </button>
                </td>
                {reorderedColumns.map(column => (
                  <td
                    key={`${rowIndex}-${column}`}
                    onMouseDown={(e) => handleCellSelection(e, rowIndex, column, row[column])}
                    onDoubleClick={() => handleCellDoubleClick(rowIndex, column, row[column])}
                    className={`editable-cell ${column === 'id' ? 'id-cell' : ''} ${
                      column === 'status' ? 'status-cell' : ''
                    } ${selectedCells.includes(`${rowIndex}-${column}`) ? 'selected-cell' : ''}`}
                  >
                    {renderCell(row, rowIndex, column)}
                  </td>
                ))}
                <td className="delete-cell">
                  <button 
                    className="delete-btn" 
                    title="Delete Row"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(row);
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="delete-icon">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mail Modal */}
      <TableMail 
        isOpen={mailModal.isOpen}
        onClose={handleCloseMailModal}
        rowData={mailModal.rowData}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="delete-overlay">
          <div className="delete-confirmation-dialog">
            <h4>Delete Row</h4>
            <p>Are you sure you want to delete this row? This action cannot be undone.</p>
            <div className="delete-confirmation-actions">
              <button onClick={() => setDeleteConfirm(null)} className="delete-cancel-btn">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="delete-confirm-btn">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Cell Popup */}
      {editingCell && (
        <div className="edit-cell-popup">
          <div className="edit-cell-content" onClick={e => e.stopPropagation()}>
            <h4>Edit Cell</h4>
            <div className="edit-cell-info">
              <p>Column: {editingCell.column}</p>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                autoFocus
                rows={3}
                className="edit-cell-textarea"
              />
              
              {/* PDF Upload Section */}
              <div className="pdf-upload-section">
                <button 
                  onClick={() => setShowPdfUpload(!showPdfUpload)}
                  className="pdf-toggle-btn"
                  title="Extract from PDF"
                >
                  <svg className="pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                    <path d="M10 9H8" />
                  </svg>
                </button>
              </div>

              {showPdfUpload && (
                <CellPDFParser
                  columnName={editingCell.column}
                  onValueExtracted={setEditValue}
                />
              )}
            </div>
            <div className="edit-cell-actions">
              <button onClick={handleCancelEdit} className="cancel-btn">
                Cancel
              </button>
              <button onClick={handleConfirmEdit} className="confirm-btn">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {statusModal.isOpen && (
        <div className="status-modal-overlay">
          <div className="status-modal">
            <h4>Cambiar Estado</h4>
            <div className="status-options">
              <button
                className={`status-option ${statusModal.currentStatus === 'Vigente 🟢' ? 'active' : ''}`}
                onClick={() => handleStatusConfirm('Vigente 🟢')}
              >
                Vigente 🟢
              </button>
              <button
                className={`status-option ${statusModal.currentStatus === 'Baja 🔴' ? 'active' : ''}`}
                onClick={() => handleStatusConfirm('Baja 🔴')}
              >
                Baja 🔴
              </button>
            </div>
            <div className="status-modal-actions">
              <button onClick={handleStatusModalClose} className="cancel-btn">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable; 