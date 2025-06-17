import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import pdfService from '../../services/pdfService';
import firebaseTableService from '../../services/firebaseTableService';
import CellPDFParser from '../PDFParser/CellPDFParser';
import TableMail from './TableMail';
import PDFParser from '../PDFParser_new/PDFParser';
import Modal from '../common/Modal';
import DriveManager from '../Drive/DriveManager';
import './DataTable.css';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../config/api.js';
import { notifyDataUpdate, notifyDataInsert, notifyDataEdit, notifyDataDelete } from '../../utils/dataUpdateNotifier';
// import TestInsert from '../TestInsert/TestInsert'; // Temporarily disabled

const DataTable = ({ data, onRowClick, onCellUpdate, onRefresh, tableName }) => {
  // Add console logs for debugging
  console.log('🔥 DataTable received data:', data);
  console.log('🔥 DataTable received tableName:', tableName);

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
  const [showPDFParser, setShowPDFParser] = useState(false);
  const [tableTitle, setTableTitle] = useState('');
  const [driveModal, setDriveModal] = useState({ isOpen: false, clientData: null });
  const [availableChildTables, setAvailableChildTables] = useState([]);
  const [selectedChildTable, setSelectedChildTable] = useState('');
  const [parentData, setParentData] = useState(null);
  const [parentTableName, setParentTableName] = useState(null);
  const [newlyInsertedRows, setNewlyInsertedRows] = useState(new Set());
  const [flashingRows, setFlashingRows] = useState(new Set());
  const [forceHighlightNext, setForceHighlightNext] = useState(false);

  // Reference to track previous data
  const previousDataRef = useRef([]);

  // Simple effect just to set the data - NO SORTING HERE
  useEffect(() => {
    console.log('🔥 Setting data:', data);
    if (!Array.isArray(data)) {
      console.error('❌ Data is not an array:', data);
      setSortedData([]);
      setFilteredData([]);
      return;
    }

    setSortedData(data);
    setFilteredData(data);
    
    // Detect new insertions
    if (forceHighlightNext || (data.length > previousDataRef.current.length && previousDataRef.current.length > 0)) {
      setForceHighlightNext(false);
      
      // We'll highlight after sorting in render
      setTimeout(() => {
                 const sorted = [...data].sort((a, b) => {
           const getTimestamp = (record) => {
             const createdAt = record.createdAt;
             if (!createdAt) return 0;
             
             if (createdAt._seconds) {
               return createdAt._seconds * 1000;
             } else if (createdAt.seconds) {
               return createdAt.seconds * 1000;
             } else if (createdAt.toDate) {
               return createdAt.toDate().getTime();
             } else if (typeof createdAt === 'string') {
               return new Date(createdAt).getTime();
             } else if (createdAt instanceof Date) {
               return createdAt.getTime();
             }
             return 0;
           };
           
           return getTimestamp(b) - getTimestamp(a);
         });

        if (sorted.length > 0) {
          const firstRecord = sorted[0];
          const highlightId = firstRecord.id || firstRecord.docId || firstRecord.firebase_doc_id || `highlight_${Date.now()}`;
          
          console.log('✨ Highlighting newest:', firstRecord.numero_poliza);
          
          const highlightSet = new Set([highlightId]);
          setNewlyInsertedRows(highlightSet);
          setFlashingRows(highlightSet);
          
          setTimeout(() => setFlashingRows(new Set()), 3000);
          setTimeout(() => setNewlyInsertedRows(new Set()), 10000);
        }
      }, 100);
    }
    
    previousDataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (tableName) {
      // Get formatted title from firebaseTableService
      const title = firebaseTableService.formatTableTitle(tableName);
      setTableTitle(title);
      
      // Log for debugging
      console.log('🔥 Table name:', tableName);
      console.log('🔥 Formatted title:', title);
    }
  }, [tableName]);

  // Add effect to fetch available child tables (Firebase version)
  useEffect(() => {
    const fetchChildTables = async () => {
      // Determine the parent table name
      let parentTableName;
      
      if (tableName?.includes('→')) {
        // If it's a combined table name, get the parent part
        parentTableName = tableName.split('→')[0].trim();
      } else if (firebaseTableService.isChildTable(tableName)) {
        // If it's a child table, get its parent
        parentTableName = firebaseTableService.getParentTable(tableName);
      } else if (firebaseTableService.isParentTable(tableName)) {
        // If it's a parent table, use it directly
        parentTableName = tableName;
      } else {
        // Not a parent-child table
        setAvailableChildTables([]);
        setSelectedChildTable('');
        return;
      }
      
      if (!parentTableName) {
        setAvailableChildTables([]);
        setSelectedChildTable('');
        return;
      }
      
      try {
        console.log('🔥 Fetching child tables for parent:', parentTableName);
        
        // Use the firebaseTableService methods to get child tables
        const childTables = await firebaseTableService.getChildTables(parentTableName);
        console.log('🔥 Available child tables:', childTables);
        setAvailableChildTables(childTables);
        
        // Set selected child table based on current view
        if (tableName?.includes('→')) {
          const currentChildTable = tableName.split('→')[1].trim();
          console.log('🔥 Setting selected child table to:', currentChildTable);
          setSelectedChildTable(currentChildTable);
        } else if (firebaseTableService.isChildTable(tableName)) {
          console.log('🔥 Current table is child, setting selected child to:', tableName);
          setSelectedChildTable(tableName);
        } else {
          console.log('🔥 Resetting selected child table (parent table)');
          setSelectedChildTable(''); // Reset selection when viewing parent
        }
      } catch (error) {
        console.error('❌ Error fetching child tables:', error);
        setAvailableChildTables([]);
      }
    };

    fetchChildTables();
  }, [tableName]);

  // Add effect to handle parent table data (Firebase version)
  useEffect(() => {
    const loadParentData = async () => {
      if (!tableName || tableName.includes('→')) return;
      
      try {
        // Store the parent table name
        setParentTableName(tableName);
        
        // Check if this is a parent table that has child tables
        const isParent = firebaseTableService.isParentTable(tableName);
        if (isParent) {
          // Load parent table data from Firebase
          const parentResult = await firebaseTableService.getData(tableName);
          // Ensure parentResult.data is an array
          setParentData(Array.isArray(parentResult.data) ? parentResult.data : []);
        } else {
          setParentData([]);
        }
      } catch (error) {
        console.error('❌ Error loading parent data from Firebase:', error);
        setParentData([]);
      }
    };

    loadParentData();
  }, [tableName]);

  useEffect(() => {
    console.log('🔍 SEARCH TERM:', `"${searchTerm}"`, 'LENGTH:', searchTerm.length);
    console.log('🔍 SORTED DATA LENGTH:', sortedData.length);
    
    const hasJoseInSorted = sortedData.some(r => 
      r.nombre_contratante?.toLowerCase().includes('jose') && 
      r.nombre_contratante?.toLowerCase().includes('pacheco')
    );
    console.log('🔍 HAS JOSE IN SORTED DATA:', hasJoseInSorted);

    if (!searchTerm.trim()) {
      setFilteredData(sortedData);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = sortedData.filter(row => {
      return Object.values(row).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      });
    });
    
    console.log('🔍 FILTERED RESULTS:', {
      originalLength: sortedData.length,
      filteredLength: filtered.length,
      hasJosePachecoAfterFilter: filtered.some(r => 
        r.nombre_contratante?.toLowerCase().includes('jose') && 
        r.nombre_contratante?.toLowerCase().includes('pacheco')
      )
    });
    
    setFilteredData(filtered);
  }, [searchTerm, sortedData]);

  // Enhanced handler for when data is captured/modified
  const handleDataCaptured = useCallback(async (updatedTableName = null, shouldCloseModal = false) => {
    console.log('📊 Data captured/modified, triggering refresh:', { 
      updatedTableName, 
      currentTableName: tableName,
      shouldCloseModal
    });
    
    try {
      // Show loading state
      setIsRefreshing(true);
      
      // Only close PDF parser if explicitly requested (e.g., after successful data insertion)
      if (shouldCloseModal) {
        setShowPDFParser(false);
      }
      
      // Refresh the current table data
      if (onRefresh) {
        await onRefresh(updatedTableName || tableName);
      }
      
      // Show success message only if modal is being closed (successful operation)
      if (shouldCloseModal) {
        toast.success('Datos agregados correctamente');
      }
      
    } catch (error) {
      console.error('❌ Error refreshing data after capture:', error);
      toast.error('Error al actualizar los datos');
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, tableName]);

  // Enhanced refresh function with loading state
  const refreshData = async () => {
    console.log('🔄 Manual refresh triggered');
    setIsRefreshing(true);
    
    try {
      if (onRefresh) {
        await onRefresh();
      }
      toast.success('Datos actualizados');
    } catch (error) {
      console.error('❌ Error during manual refresh:', error);
      toast.error('Error al actualizar datos');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Note: Auto-refresh polling removed to prevent modal from closing prematurely
  // The modal should only close manually or after successful data insertion

  // Listen for custom data update events
  useEffect(() => {
    const handleDataUpdate = (event) => {
      console.log('📡 Received data update event:', event.detail);
      
      // Check if the update is for our current table
      if (event.detail?.tableName === tableName || event.detail?.tableName === 'all') {
        console.log('🔄 Triggering refresh due to data update event');
        
        // If it's a data insert event, mark for highlighting
        if (event.detail?.type === 'insert') {
          console.log('✨ New data insert detected, will highlight new rows');
          setForceHighlightNext(true);
        }
        
        // Pass shouldCloseModal flag to handleDataCaptured
        const shouldCloseModal = event.detail?.shouldCloseModal === true;
        handleDataCaptured(event.detail?.tableName, shouldCloseModal);
      }
    };

    // Handle policyDataUpdated event (legacy event from PDF parser)
    const handlePolicyDataUpdate = (event) => {
      console.log('📡 Received policyDataUpdated event:', event.detail);
      
      // Check if the update is for our current table
      if (event.detail?.table === tableName || !event.detail?.table) {
        console.log('🔄 Triggering refresh due to policyDataUpdated event');
        
        // Set flag to force highlight of next data refresh
        setForceHighlightNext(true);
        
        // Pass shouldCloseModal flag to handleDataCaptured
        const shouldCloseModal = event.detail?.shouldCloseModal === true;
        handleDataCaptured(event.detail?.table || tableName, shouldCloseModal);
      }
    };

    // Listen for storage changes (if using localStorage for coordination)
    const handleStorageChange = (event) => {
      if (event.key === 'dataTableUpdate' && event.newValue) {
        try {
          const updateInfo = JSON.parse(event.newValue);
          console.log('💾 Storage update detected:', updateInfo);
          
          if (updateInfo.tableName === tableName || updateInfo.tableName === 'all') {
            console.log('🔄 Triggering refresh due to storage update');
            const shouldCloseModal = updateInfo.shouldCloseModal === true;
            handleDataCaptured(updateInfo.tableName, shouldCloseModal);
            
            // Clear the storage flag
            localStorage.removeItem('dataTableUpdate');
          }
        } catch (error) {
          console.error('❌ Error parsing storage update:', error);
        }
      }
    };

    // Add event listeners
    window.addEventListener('dataTableUpdate', handleDataUpdate);
    window.addEventListener('policyDataUpdated', handlePolicyDataUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('dataTableUpdate', handleDataUpdate);
      window.removeEventListener('policyDataUpdated', handlePolicyDataUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [tableName]);

  // Enhanced dropdown rendering with better parent-child navigation
  const renderTableSelector = () => {
    // For EMANT specifically, we know the structure
    const isEmantCaratula = tableName === 'emant_caratula';
    const isEmantListado = tableName === 'emant_listado';
    
    // Only show dropdown for EMANT tables
    if (!isEmantCaratula && !isEmantListado) {
      return null;
    }

    console.log('🔍 EMANT Dropdown state:', {
      tableName,
      isEmantCaratula,
      isEmantListado
    });

    // Simple dropdown for EMANT navigation
    const currentValue = tableName;

    return (
      <div className="child-table-selector">
        <select
          value={currentValue}
          onChange={(e) => {
            const selectedValue = e.target.value;
            console.log('🔄 EMANT Table selector onChange:', selectedValue);
            
            // Call handleChildTableSelect with the selected table name
            handleChildTableSelect(selectedValue);
          }}
          className="child-table-dropdown"
        >
          <option value="emant_caratula">
            Emant Caratula
          </option>
          <option value="emant_listado">
            Emant Listado
          </option>
        </select>
        
        {/* Show relationship indicator */}
        <div className="relationship-indicator">
          {isEmantListado ? (
            <span className="relationship-badge child-badge">
              Tabla Secundaria de: Emant Caratula
            </span>
          ) : (
            <span className="relationship-badge parent-badge">
              Tabla Principal con: Emant Listado
            </span>
          )}
        </div>
      </div>
    );
  };

  // If no data but we have a tableName, show empty state with capture button
  if ((!data || !Array.isArray(data) || data.length === 0) && tableName) {
    return (
      <div className="data-table-container">
        {tableName && (
          <div className="table-title">
            <h2>{tableTitle}</h2>
                      {renderTableSelector()}
          </div>
        )}
        <div className="table-controls">
          <div className="search-section">
            <button
              className="refresh-btn"
              onClick={refreshData}
              disabled={isRefreshing}
              title="Actualizar datos"
            >
              <svg className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6" />
                <path d="M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
              {isRefreshing ? 'Actualizando...' : 'Actualizar'}
            </button>
            <button
              className="capturador-btn"
              onClick={() => setShowPDFParser(true)}
              title="Abrir Capturador"
            >
              <svg className="pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              Capturador
            </button>
          </div>
        </div>

        {/* Show parent table if available */}
        {parentData && parentData.length > 0 && (
          <div className="parent-table-section">
            <h3>{firebaseTableService.formatSingleTableName(parentTableName)}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(parentData[0] || {}).map(column => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parentData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((value, colIndex) => (
                      <td key={colIndex}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="empty-table-state">
          <p>No hay datos en esta tabla.</p>
          <p>Utilice el botón "Capturador" para comenzar a agregar registros.</p>
        </div>

        {/* PDF Parser Modal */}
        <Modal 
          isOpen={showPDFParser} 
          onClose={() => setShowPDFParser(false)}
          size="full"
        >
          <div style={{ height: '100%', width: '100%' }}>
            <PDFParser 
              selectedTable={tableName} 
              onDataCaptured={handleDataCaptured}
              onClose={() => setShowPDFParser(false)}
            />
          </div>
        </Modal>
      </div>
    );
  }

  // If no data and no tableName, show no data message
  if (!data || !Array.isArray(data) || data.length === 0) {
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
      // Validate the data before updating
      if (editValue === undefined || editValue === null) {
        throw new Error('Invalid value: Value cannot be empty');
      }

      // Validate that we have the necessary data
      if (!row || !row.id) {
        throw new Error('Invalid row data');
      }

      console.log('Updating cell with:', {
        id: row.id,
        column,
        value: editValue
      });

      // Make the API call first
      const result = await onCellUpdate(row.id, column, editValue);
      
      // Log the result for debugging
      console.log('Update result:', result);

      // Check if result exists and has success property
      if (!result || result.success === false) {
        throw new Error(result?.message || 'Failed to update cell');
      }

      // Update the UI with the returned data
      if (result.updatedData) {
        const updatedData = filteredData.map((r) => 
          r.id === row.id ? { ...r, ...result.updatedData } : r
        );
        setFilteredData(updatedData);
      }
      
      // Close the edit popup
      handleCancelEdit();
      
      // Show success message
      toast.success('Cell updated successfully');
      
      // Auto-refresh data to ensure consistency
      console.log('🔄 Auto-refreshing after cell edit');
      
      // Notify other components about the edit
      notifyDataEdit(tableName);
      
      setTimeout(async () => {
        if (onRefresh) {
          await onRefresh();
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to update cell:', error);
      
      // Show error message with more specific information
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update cell';
      toast.error(`Update failed: ${errorMessage}`);
      
      // Keep the edit popup open so user can try again or cancel
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
      const response = await fetch(`${API_URL}/gpt/analyze`, {
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

  const handleDriveClick = (rowData) => {
    console.log('DRIVE clicked for row:', rowData);
    setDriveModal({ isOpen: true, clientData: rowData });
  };

  const handleCloseDriveModal = () => {
    setDriveModal({ isOpen: false, clientData: null });
  };

  const handleDeleteClick = (row) => {
    setDeleteConfirm(row);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm || !deleteConfirm.id) return;

    try {
      await firebaseTableService.deleteRow(tableName, deleteConfirm.id);
      setDeleteConfirm(null);
      
      // Remove the deleted row from the current data
      const updatedData = filteredData.filter(row => row.id !== deleteConfirm.id);
      setFilteredData(updatedData);
      
      // Show success message
      toast.success('Row deleted successfully');
      
      // Notify other components about the deletion
      notifyDataDelete(tableName);
      
      // Refresh the data
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Error deleting row:', error);
      toast.error('Failed to delete row');
    }
  };

  const handlePaymentStatusToggle = async (record) => {
    try {
      const currentStatus = record.estado_pago || 'No Pagado';
      const newStatus = currentStatus === 'Pagado' ? 'No Pagado' : 'Pagado';
      
      console.log(`🔄 Updating payment status for record ${record.id} from ${currentStatus} to ${newStatus}`);
      
      await firebaseTableService.updateData(tableName, record.id, 'estado_pago', newStatus);
      
      toast.success(`Estado de pago actualizado a: ${newStatus}`);
      
      // Notify other components about the edit
      notifyDataEdit(tableName);
      
      // Refresh the data
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Error al actualizar el estado de pago');
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
    
    const cellValue = row[column] !== null ? String(row[column]) : '-';
    return <span>{cellValue}</span>;
  };

  // Reorder columns to put status after ID only for related tables
  // Also filter out estado_pago since we show it as action button
  // Hide ID and firebase_doc_id columns
  let reorderedColumns = columns.filter(col => 
    col !== 'estado_pago' && 
    col !== 'id' && 
    col !== 'firebase_doc_id'
  );
  if (tableName && (data[0]?.status !== undefined)) {
    reorderedColumns = reorderedColumns.filter(col => col !== 'status');
    // Since we filtered out 'id', we don't need to find its index
    // Just add status at the beginning
    reorderedColumns.unshift('status');
  }

  // Add the getSortIcon function
  const getSortIcon = (column) => {
    if (!sortConfig || sortConfig.key !== column) {
      return (
        <span className="sort-icon">
          ⇅
        </span>
      );
    }

    return (
      <span className={`sort-icon active`}>
        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
      </span>
    );
  };

  // Add handleSort function
  const handleSort = (column) => {
    let direction = 'ascending';
    if (sortConfig.key === column && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }

    setSortConfig({ key: column, direction });

    const sorted = [...filteredData].sort((a, b) => {
      if (a[column] === null) return 1;
      if (b[column] === null) return -1;
      if (a[column] === b[column]) return 0;

      const compareResult = a[column] < b[column] ? -1 : 1;
      return direction === 'ascending' ? compareResult : -compareResult;
    });

    setFilteredData(sorted);
  };

  // Improved child table selection with better parent-child relationship handling
  const handleChildTableSelect = async (selectedTableName) => {
    console.log('🚀 handleChildTableSelect called with:', selectedTableName);
    
    if (!selectedTableName) {
      console.log('❌ No selectedTableName provided');
      return;
    }
    
    // Get the base parent table name (could be from combined table or direct table)
    let baseParentTable;
    
    if (tableName.includes('→')) {
      // We're in a combined view
      baseParentTable = tableName.split('→')[0].trim();
    } else if (firebaseTableService.isChildTable(tableName)) {
      // We're viewing a child table directly, get its parent
      baseParentTable = firebaseTableService.getParentTable(tableName);
    } else {
      // We're viewing a parent table directly
      baseParentTable = tableName;
    }
    
    console.log('📊 Current state:', { 
      selectedTableName, 
      baseParentTable, 
      currentTableName: tableName,
      currentSelectedChild: selectedChildTable,
      isChildTable: firebaseTableService.isChildTable(tableName),
      isParentTable: firebaseTableService.isParentTable(tableName)
    });
    
    // If selecting the parent table
    if (selectedTableName === baseParentTable) {
      console.log('🔄 Loading parent table data only:', baseParentTable);
      setSelectedChildTable(''); // Clear child selection
      
      // Update table title to show parent only
      setTableTitle(firebaseTableService.formatSingleTableName(baseParentTable));
      
      if (onRefresh) {
        // Load just the parent table data
        await onRefresh(baseParentTable);
      }
      return;
    }
    
    // If selecting a child table, verify it's valid for this parent
    const availableChildTablesForParent = await firebaseTableService.getChildTables(baseParentTable);
    console.log('📋 Available child tables for parent:', availableChildTablesForParent);
    
    if (availableChildTablesForParent.includes(selectedTableName)) {
      console.log('🔄 Selecting child table:', selectedTableName, 'for parent:', baseParentTable);
      setSelectedChildTable(selectedTableName);
      
      // Update table title to show parent → child format
      const combinedTitle = `${firebaseTableService.formatSingleTableName(baseParentTable)} → ${firebaseTableService.formatSingleTableName(selectedTableName)}`;
      setTableTitle(combinedTitle);
      
      // Load the child table data directly (not combined)
      console.log('🔄 Loading child table data:', selectedTableName);
      
      // Trigger refresh with just the child table name (not combined)
      if (onRefresh) {
        await onRefresh(selectedTableName);
      }
    } else {
      console.warn('⚠️ Selected table is not a valid child of:', baseParentTable);
      
      // If it's not a child of the current parent, treat it as a direct table selection
      console.log('🔄 Loading table directly:', selectedTableName);
      
      // Update title and load the selected table directly
      setTableTitle(firebaseTableService.formatSingleTableName(selectedTableName));
      setSelectedChildTable('');
      
      if (onRefresh) {
        await onRefresh(selectedTableName);
      }
    }
  };



      return (
      <div className="data-table-container">
        {/* Test Component - Temporarily disabled */}
        {/* <TestInsert tableName={tableName} /> */}
        
        {tableTitle && (
        <div className="table-title">
          <h2>{tableTitle}</h2>
          {renderTableSelector()}
        </div>
      )}
      <div className="table-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Buscar en tabla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="clear-search-btn"
              title="Limpiar búsqueda"
              style={{
                marginLeft: '5px',
                padding: '5px 10px',
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ✕ Limpiar ({searchTerm.length})
            </button>
          )}
          <button
            className="refresh-btn"
            onClick={refreshData}
            disabled={isRefreshing}
            title="Actualizar datos"
          >
            <svg className={`refresh-icon ${isRefreshing ? 'spinning' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6" />
              <path d="M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            className="capturador-btn"
            onClick={() => setShowPDFParser(true)}
            title="Abrir Capturador"
          >
            <svg className="pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
            Capturador
          </button>
        </div>
      </div>

      {/* PDF Parser Modal */}
      <Modal 
        isOpen={showPDFParser} 
        onClose={() => setShowPDFParser(false)}
        size="full"
      >
        <div style={{ height: '100%', width: '100%' }}>
          <PDFParser 
            selectedTable={tableName} 
            onClose={() => setShowPDFParser(false)}
          />
        </div>
      </Modal>

      <div className={`table-wrapper ${isRefreshing ? 'refreshing' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              {/* COLUMNA BORRAR - PRIMERA Y MÁS PEQUEÑA */}
              <th className="action-header delete-header" style={{
                width: '50px !important',
                minWidth: '50px !important',
                maxWidth: '50px !important'
              }}>
                ×
              </th>
              {/* COLUMNA DRIVE - SEGUNDA Y PEQUEÑA */}
              <th className="action-header drive-header" style={{
                width: '50px !important',
                minWidth: '50px !important',
                maxWidth: '50px !important'
              }}>
                📁
              </th>
              {/* COLUMNA ESTADO PAGO */}
              <th className="action-header payment-header" style={{
                width: '120px !important',
                minWidth: '120px !important',
                maxWidth: '120px !important'
              }}>
                ESTADO PAGO
              </th>
              {/* COLUMNA ENVIAR MAIL */}
              <th className="action-header email-header" style={{
                width: '100px !important',
                minWidth: '100px !important',
                maxWidth: '100px !important'
              }}>
                ENVIAR MAIL
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
            </tr>
          </thead>
          <tbody>
            {(() => {
              // SORT DATA HERE - NEWEST FIRST ALWAYS
              const dataToSort = [...filteredData];
              const sortedForRender = dataToSort.sort((a, b) => {
                const getTimestamp = (record) => {
                  const createdAt = record.createdAt;
                  if (!createdAt) return 0;
                  
                  // Handle Firebase Timestamp with underscore (NEW FORMAT)
                  if (createdAt._seconds) {
                    return createdAt._seconds * 1000;
                  }
                  // Handle Firebase Timestamp without underscore (OLD FORMAT)  
                  else if (createdAt.seconds) {
                    return createdAt.seconds * 1000;
                  } 
                  // Handle Firestore Timestamp object
                  else if (createdAt.toDate) {
                    return createdAt.toDate().getTime();
                  } 
                  // Handle string dates
                  else if (typeof createdAt === 'string') {
                    return new Date(createdAt).getTime();
                  } 
                  // Handle Date objects
                  else if (createdAt instanceof Date) {
                    return createdAt.getTime();
                  }
                  return 0;
                };
                
                return getTimestamp(b) - getTimestamp(a); // Newest first
              });
              
              // DEBUGGING: Simple logs that show clearly
              console.log('🎯 TOTAL RECORDS:', sortedForRender.length);
              console.log('🎯 FIRST 3 NAMES:', sortedForRender.slice(0, 3).map(r => r.nombre_contratante));
              console.log('🎯 FIRST 3 TIMESTAMPS:', sortedForRender.slice(0, 3).map(r => r.createdAt?.seconds));
              
              const joseRecord = sortedForRender.find(r => 
                r.nombre_contratante?.toLowerCase().includes('jose') && 
                r.nombre_contratante?.toLowerCase().includes('pacheco')
              );
              
              if (joseRecord) {
                const joseIndex = sortedForRender.findIndex(r => r === joseRecord);
                console.log('🎯 JOSE FOUND AT POSITION:', joseIndex + 1, 'of', sortedForRender.length);
                console.log('🎯 JOSE TIMESTAMP:', joseRecord.createdAt?.seconds);
                console.log('🎯 JOSE DATE:', joseRecord.createdAt?.seconds ? new Date(joseRecord.createdAt.seconds * 1000).toLocaleString() : 'NO_DATE');
                console.log('🎯 JOSE FULL RECORD KEYS:', Object.keys(joseRecord));
                console.log('🎯 JOSE CREATED AT FIELD:', joseRecord.createdAt);
                console.log('🎯 JOSE ALL DATE FIELDS:', {
                  createdAt: joseRecord.createdAt,
                  created_at: joseRecord.created_at,
                  timestamp: joseRecord.timestamp,
                  date: joseRecord.date,
                  fechaCreacion: joseRecord.fechaCreacion,
                  fecha_creacion: joseRecord.fecha_creacion
                });
              } else {
                console.log('🎯 JOSE NOT FOUND in sorted data');
              }
              
              return sortedForRender;
            })().map((row, rowIndex) => {
              const rowId = row.id || row.docId || row.firebase_doc_id || `row_${rowIndex}`;
              const isNewRow = newlyInsertedRows.has(rowId);
              const isFlashing = flashingRows.has(rowId);
              
              // console.log('🔍 ROW RENDER:', { rowIndex, rowId, isNewRow, isFlashing, rowKeys: Object.keys(row) });
              
              return (
              <tr 
                key={rowIndex} 
                className={`table-row ${isNewRow ? 'newly-inserted' : ''} ${isFlashing ? 'flashing' : ''}`}
              >
                {/* COLUMNA BORRAR - PRIMERA Y MÁS PEQUEÑA */}
                <td className="action-cell delete-cell" style={{
                  width: '50px !important',
                  minWidth: '50px !important', 
                  maxWidth: '50px !important'
                }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('DELETE clicked for row:', row);
                      handleDeleteClick(row);
                    }}
                    className="action-btn delete-btn"
                    title="Eliminar registro"
                  >
                    ×
                  </button>
                </td>
                {/* COLUMNA DRIVE - SEGUNDA Y PEQUEÑA */}
                <td className="action-cell drive-cell" style={{
                  width: '50px !important',
                  minWidth: '50px !important', 
                  maxWidth: '50px !important'
                }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('DRIVE clicked for row:', row);
                      handleDriveClick(row);
                    }}
                    className="action-btn drive-btn"
                    title="Gestionar archivos en Drive"
                  >
                    📁
                  </button>
                </td>
                {/* COLUMNA ESTADO PAGO */}
                <td className="action-cell payment-cell" style={{
                  width: '120px !important',
                  minWidth: '120px !important', 
                  maxWidth: '120px !important'
                }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('PAYMENT STATUS clicked for row:', row);
                      handlePaymentStatusToggle(row);
                    }}
                    className={`action-btn payment-btn ${
                      (row.estado_pago === 'Pagado') ? 'payment-paid' : 'payment-unpaid'
                    }`}
                    title="Cambiar estado de pago"
                  >
                    {(row.estado_pago === 'Pagado') ? 'Pagado' : 'No Pagado'}
                  </button>
                </td>
                {/* COLUMNA ENVIAR MAIL */}
                <td className="action-cell email-cell" style={{
                  width: '100px !important',
                  minWidth: '100px !important', 
                  maxWidth: '100px !important'
                }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('EMAIL clicked for row:', row);
                      handleEmailClick(row);
                    }}
                    className="action-btn email-btn"
                    title="Enviar email"
                  >
                    ✉ MAIL
                  </button>
                </td>
                {reorderedColumns.map(column => (
                  <td
                    key={`${rowIndex}-${column}`}
                    onClick={(e) => handleCellSelection(e, rowIndex, column, row[column])}
                    className={`editable-cell ${column === 'id' ? 'id-cell' : ''} ${
                      column === 'status' ? 'status-cell' : ''
                    } ${selectedCells.includes(`${rowIndex}-${column}`) ? 'selected-cell' : ''}`}
                  >
                    {renderCell(row, rowIndex, column)}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mail Modal */}
      <TableMail 
        isOpen={mailModal.isOpen}
        onClose={handleCloseMailModal}
        rowData={mailModal.rowData}
      />

      {/* Drive Manager Modal */}
      <DriveManager 
        isOpen={driveModal.isOpen}
        onClose={handleCloseDriveModal}
        clientData={driveModal.clientData}
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