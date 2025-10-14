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
import { toDDMMMYYYY, parseDDMMMYYYY } from '../../utils/dateUtils';
// import TestInsert from '../TestInsert/TestInsert'; // Temporarily disabled

const DataTable = ({ data, onRowClick, onCellUpdate, onRefresh, tableName, columnOrder }) => {
  // Add console logs for debugging
  // Component received props
  console.log('🔥 DataTable received data length:', data?.length, 'tableName:', tableName);

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
  const [tableColumns, setTableColumns] = useState([]);
  const [isEditingFlag, setIsEditingFlag] = useState(false);
  const [forceRender, setForceRender] = useState(0); // State to force re-render on column order change
  const [actionsColumnsCollapsed, setActionsColumnsCollapsed] = useState(true); // State to control actions columns visibility - default collapsed
  const [showActionsModal, setShowActionsModal] = useState(false); // State to control actions modal
  const [selectedRowForActions, setSelectedRowForActions] = useState(null); // Row selected for actions
  const [showPaymentModal, setShowPaymentModal] = useState(false); // State for payment modal
  const [selectedPolicyForPayment, setSelectedPolicyForPayment] = useState(null); // Policy for payment management

  // Helper function to get client name based on table type
  const getClientName = (rowData) => {
    if (!rowData) return 'Registro';
    
    // For ALL tables, use 'contratante'
    return rowData.contratante || 'Registro';
  };

  // Helper function to calculate total payments based on forma_pago
  const calculateTotalPayments = (formaPago) => {
    const paymentMap = {
      'MENSUAL': 12,
      'BIMESTRAL': 6,
      'TRIMESTRAL': 4,
      'CUATRIMESTRAL': 3,
      'SEMESTRAL': 2,
      'ANUAL': 1
    };
    return paymentMap[formaPago?.toUpperCase()] || 12;
  };

  // Check if policy has partial payments (not annual)
  const hasPartialPayments = (formaPago) => {
    const upperFormaPago = formaPago?.toUpperCase();
    return upperFormaPago !== 'ANUAL';
  };

  // Get partial payment status for a policy
  const getPartialPaymentStatus = (policy) => {
    // Check if fecha_proximo_pago has passed and auto-reset to 'No Pagado'
    if (policy.fecha_proximo_pago) {
      const nextPaymentDate = parseDDMMMYYYY(policy.fecha_proximo_pago);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (nextPaymentDate && nextPaymentDate < today) {
        // Auto-reset to 'No Pagado' if payment date has passed
        return 'No Pagado';
      }
    }
    
    return policy.estado_pago_parcial || 'No Pagado';
  };

  // Open payment modal for partial payments
  const handleOpenPaymentModal = (policy) => {
    console.log('🔍 Opening payment modal for policy:', policy.numero_poliza);
    setSelectedPolicyForPayment(policy);
    setShowPaymentModal(true);
  };

  // Handle partial payment status toggle
  const handleTogglePartialPaymentStatus = async (policy) => {
    try {
      // Validate policy data
      if (!policy || !policy.id) {
        console.error('❌ Invalid policy data for partial payment status toggle:', policy);
        toast.error('Error: datos de póliza inválidos');
        return;
      }

      const currentStatus = getPartialPaymentStatus(policy);
      const newStatus = currentStatus === 'Pagado' ? 'No Pagado' : 'Pagado';
      
      console.log(`🔄 Updating policy ${policy.numero_poliza} partial payment status from ${currentStatus} to ${newStatus}`);
      
      // Update local state immediately for better UX
      setFilteredData(prevData => 
        prevData.map(row => 
          row.id === policy.id ? { ...row, estado_pago_parcial: newStatus } : row
        )
      );
      
      // Update Firebase
      await firebaseTableService.updateData(tableName, policy.id, 'estado_pago_parcial', newStatus);
      
      // Calculate next payment date if marking as paid
      if (newStatus === 'Pagado') {
        const totalPayments = policy.total_pagos || calculateTotalPayments(policy.forma_pago);
        const currentPayment = policy.pago_actual || 1;
        const nextPayment = currentPayment + 1;
        
        // Calculate next payment date based on forma_pago
        const startDate = parseDDMMMYYYY(policy.fecha_inicio);
        if (startDate) {
          const nextPaymentDate = new Date(startDate);
          const paymentInterval = {
            'MENSUAL': 1,
            'BIMESTRAL': 2,
            'TRIMESTRAL': 3,
            'CUATRIMESTRAL': 4,
            'SEMESTRAL': 6,
            'ANUAL': 12
          };
          
          const interval = paymentInterval[policy.forma_pago?.toUpperCase()] || 1;
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + (interval * currentPayment));
          
          // Update next payment date and current payment number
          await firebaseTableService.updateData(tableName, policy.id, 'fecha_proximo_pago', toDDMMMYYYY(nextPaymentDate));
          await firebaseTableService.updateData(tableName, policy.id, 'pago_actual', nextPayment);
          
          // Update pagos_realizados array
          const pagosRealizados = policy.pagos_realizados || [];
          const existingPayment = pagosRealizados.find(p => p.numero === currentPayment);
          
          if (existingPayment) {
            existingPayment.pagado = true;
            existingPayment.fecha = toDDMMMYYYY(new Date());
          } else {
            pagosRealizados.push({
              numero: currentPayment,
              fecha: toDDMMMYYYY(new Date()),
              pagado: true
            });
          }
          
          await firebaseTableService.updateData(tableName, policy.id, 'pagos_realizados', pagosRealizados);
        }
      }
      
      toast.success(`Póliza ${policy.numero_poliza} estado de pago parcial actualizado a: ${newStatus}`);
      
      // Refresh the data to ensure consistency
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (err) {
      console.error('❌ Error updating partial payment status:', err);
      toast.error('Error al actualizar el estado de pago parcial');
      
      // Revert local state on error
      setFilteredData(prevData => 
        prevData.map(row => 
          row.id === policy.id ? { ...row, estado_pago_parcial: policy.estado_pago_parcial || 'No Pagado' } : row
        )
      );
    }
  };

  // Handle payment checkbox toggle in modal
  const handlePaymentCheckToggle = async (policy, paymentNumber) => {
    try {
      const pagosRealizados = policy.pagos_realizados || [];
      const existingPayment = pagosRealizados.find(p => p.numero === paymentNumber);
      
      if (existingPayment) {
        existingPayment.pagado = !existingPayment.pagado;
        if (existingPayment.pagado) {
          existingPayment.fecha = toDDMMMYYYY(new Date());
        }
      } else {
        pagosRealizados.push({
          numero: paymentNumber,
          fecha: toDDMMMYYYY(new Date()),
          pagado: true
        });
      }
      
      // Update local state
      setSelectedPolicyForPayment(prev => ({
        ...prev,
        pagos_realizados: pagosRealizados
      }));
      
      // Update Firebase
      await firebaseTableService.updateData(tableName, policy.id, 'pagos_realizados', pagosRealizados);
      
      toast.success(`Pago ${paymentNumber} actualizado`);
      
    } catch (err) {
      console.error('❌ Error updating payment:', err);
      toast.error('Error al actualizar el pago');
    }
  };

  // Debug useEffect to monitor state changes
  useEffect(() => {
    console.log('🔧 State changed:', { 
      showActionsModal, 
      selectedRowForActions: getClientName(selectedRowForActions),
      formaPago: selectedRowForActions?.forma_pago,
      hasPartialPayments: selectedRowForActions?.forma_pago ? hasPartialPayments(selectedRowForActions.forma_pago) : false
    });
  }, [showActionsModal, selectedRowForActions]);

  // Reference to track previous data
  const previousDataRef = useRef([]);
  
  // Reference to handleDataCaptured to avoid dependency issues
  const handleDataCapturedRef = useRef();
  
  // Use column order from ColumnManager if available, otherwise use original order
  const reorderedColumns = useMemo(() => {
    if (!tableColumns || tableColumns.length === 0) return [];

    // Filtrar columnas especiales (consistente con filteredColumns)
    const excludeColumns = [
      'pdf',
      'firebase_doc_id', 
      'estado_pago',
      'estado_cfp',
      'estado_cap',
      'nombre_contratante',
      'created_at',
      'updated_at',
      'createdat',
      'updatedat'
    ];
    
    let filteredColumns = tableColumns.filter(col => {
      const columnName = col.toLowerCase();
      return !excludeColumns.includes(columnName);
    });

    // Ordenamiento personalizado: contratante, numero_poliza, pago_total_o_prima_total, primer_pago, pago_parcial, forma_de_pago, resto, id
    const hasContratante = filteredColumns.includes('contratante');
    const hasNumeroPoliza = filteredColumns.includes('numero_poliza');
    const hasPagoTotal = filteredColumns.includes('pago_total_o_prima_total');
    const hasPrimerPago = filteredColumns.includes('primer_pago');
    const hasPagoParcial = filteredColumns.includes('pago_parcial');
    const hasFormaPago = filteredColumns.includes('forma_de_pago');
    const hasFechaInicio = filteredColumns.includes('fecha_inicio');
    const hasFechaFin = filteredColumns.includes('fecha_fin');
    const hasId = filteredColumns.includes('id');

    // Quitar los que vamos a reordenar
    filteredColumns = filteredColumns.filter(col => 
      col !== 'contratante' && 
      col !== 'numero_poliza' && 
      col !== 'pago_total_o_prima_total' &&
      col !== 'primer_pago' && 
      col !== 'pago_parcial' &&
      col !== 'forma_de_pago' &&
      col !== 'fecha_inicio' &&
      col !== 'fecha_fin' &&
      col !== 'id'
    );

    // Orden final: contratante, numero_poliza, pago_total_o_prima_total, primer_pago, pago_parcial, forma_de_pago, fecha_inicio, fecha_fin, ...resto..., id
    const finalOrder = [
      ...(hasContratante ? ['contratante'] : []),
      ...(hasNumeroPoliza ? ['numero_poliza'] : []),
      ...(hasPagoTotal ? ['pago_total_o_prima_total'] : []),
      ...(hasPrimerPago ? ['primer_pago'] : []),
      ...(hasPagoParcial ? ['pago_parcial'] : []),
      ...(hasFormaPago ? ['forma_de_pago'] : []),
      ...(hasFechaInicio ? ['fecha_inicio'] : []),
      ...(hasFechaFin ? ['fecha_fin'] : []),
      ...filteredColumns,
      ...(hasId ? ['id'] : [])
    ];
    return finalOrder;
  }, [tableColumns, columnOrder, tableName, forceRender]);

  // Filtrar columnas especiales (igual que ColumnManager)
  const filteredColumns = useMemo(() => {
    if (!tableColumns) return [];
    
    const excludeColumns = [
      'pdf',
      'firebase_doc_id', 
      'estado_pago',
      'estado_cfp',
      'estado_cap',
      'nombre_contratante',
      'created_at',
      'updated_at',
      'createdat',
      'updatedat'
    ];
    
    const result = tableColumns.filter(col => {
      const columnName = col.toLowerCase();
      return !excludeColumns.includes(columnName);
    });
    
    // Log para debugging
    if (tableColumns.length > 0) {
      console.log('🔧 DataTable: All tableColumns received:', tableColumns);
      console.log('🔧 DataTable: Filtered columns result:', result);
    }
    
    return result;
  }, [tableColumns]);

  // Simple effect just to set the data - NO SORTING HERE
  useEffect(() => {
    console.log('🔥 Setting data:', data);
    if (!Array.isArray(data)) {
      console.error('❌ Data is not an array:', data);
      setSortedData([]);
      setFilteredData([]);
      setTableColumns([]);
      return;
    }

    if (data.length === 0) {
      setSortedData([]);
      setFilteredData([]);
      setTableColumns([]);
      return;
    }

    // Get complete table structure including custom columns from API
    const updateTableColumns = async () => {
      try {
        // ALWAYS try to get structure from API first if we have a tableName
        if (tableName) {
          console.log('🔧 Getting complete table structure for:', tableName);
          const API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/api' 
            : '/api';
          
          const response = await fetch(`${API_URL}/data/${tableName}/structure`);
          if (response.ok) {
            const structure = await response.json();
            if (structure.columns) {
              const allColumns = structure.columns.map(col => col.name);
              console.log('🔧 DataTable: Got complete column structure from API:', allColumns);
              
              // Always set columns from API structure
              console.log('🔧 DataTable: Setting table columns from API structure:', allColumns);
              setTableColumns(allColumns);
              return; // Exit early - we successfully used API structure
            }
          }
        }
        
        // Fallback to data columns ONLY if API fails
        console.log('⚠️ API structure failed or unavailable, falling back to data columns');
        const dataColumns = Object.keys(data[0]);
        console.log('🔧 Setting table columns from data (fallback):', dataColumns);
        setTableColumns(dataColumns);
      } catch (error) {
        console.error('❌ Error getting table structure:', error);
        // Final fallback to data columns
        const dataColumns = Object.keys(data[0]);
        console.log('🔧 Setting table columns from data (error fallback):', dataColumns);
        setTableColumns(dataColumns);
      }
    };
    
    updateTableColumns();
    
      // Then set the data immediately and synchronously
  console.log('🔄 DataTable updating internal state with new data');
  console.log('🔍 New data first row aseguradora:', data[0]?.aseguradora);
  setSortedData(data);
  setFilteredData(data);
  console.log('✅ DataTable internal state updated');
  
  // Force re-render if user is currently editing
  if (editingCell) {
    console.log('⚡ User is editing - ensuring fresh data for current edit');
  }
    
    // Detect new insertions and handle highlighting
    if (forceHighlightNext || (data.length > previousDataRef.current.length && previousDataRef.current.length > 0)) {
      setForceHighlightNext(false);
      
      // Highlight the newest record after a short delay
      setTimeout(() => {
        if (data.length > 0) {
          // Find the newest record by timestamp
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
        }
      }, 100);
    }
    
    previousDataRef.current = data;
  }, [data, forceHighlightNext, tableName]);

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
    // Don't process if sortedData is empty (still loading)
    if (!sortedData || sortedData.length === 0) {
      console.log('🔍 Skipping search - no sorted data yet');
      return;
    }

    console.log('🔍 SEARCH TERM:', `"${searchTerm}"`, 'LENGTH:', searchTerm.length);
    console.log('🔍 SORTED DATA LENGTH:', sortedData.length);

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
      filteredLength: filtered.length
    });
    
    setFilteredData(filtered);
  }, [searchTerm, sortedData]);

  // Enhanced handler for when data is captured/modified
  const handleDataCaptured = useCallback(async (updatedTableName = null, shouldCloseModal = false) => {
    console.log('📊 Data captured/modified, triggering refresh:', { 
      updatedTableName, 
      currentTableName: tableName,
      shouldCloseModal,
      isEditing: isEditingFlag
    });
    
    // Don't refresh if user is currently editing
    if (isEditingFlag) {
      console.log('⚠️ Skipping data refresh - user is editing');
      return;
    }
    
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
  }, [onRefresh, tableName, isEditingFlag]);

  // Update ref whenever handleDataCaptured changes
  useEffect(() => {
    handleDataCapturedRef.current = handleDataCaptured;
  }, [handleDataCaptured]);

  // Enhanced refresh function with loading state
  const refreshData = async () => {
    // Don't refresh if user is currently editing
    if (isEditingFlag) {
      console.log('⚠️ Skipping refresh - user is editing');
      return;
    }
    
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
        if (handleDataCapturedRef.current) {
          handleDataCapturedRef.current(event.detail?.tableName, shouldCloseModal);
        }
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
        if (handleDataCapturedRef.current) {
          handleDataCapturedRef.current(event.detail?.table || tableName, shouldCloseModal);
        }
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
            if (handleDataCapturedRef.current) {
              handleDataCapturedRef.current(updateInfo.tableName, shouldCloseModal);
            }
            
            // Clear the storage flag
            localStorage.removeItem('dataTableUpdate');
          }
        } catch (error) {
          console.error('❌ Error parsing storage update:', error);
        }
      }
    };

    // Listen for table structure updates (from ColumnManager)
    const handleTableStructureUpdate = (event) => {
      console.log('🔧 DataTable: Table structure updated event received:', event.detail);
      if (event.detail?.tableName === tableName) {
        console.log('🔧 DataTable: Refreshing column structure for current table');
        // Force re-fetch of table structure
        if (data && data.length > 0) {
          const updateTableColumns = async () => {
            try {
              const API_URL = window.location.hostname === 'localhost' 
                ? 'http://localhost:3001/api' 
                : '/api';
              
              const response = await fetch(`${API_URL}/data/${tableName}/structure`);
              if (response.ok) {
                const structure = await response.json();
                if (structure.columns) {
                  const allColumns = structure.columns.map(col => col.name);
                  console.log('🔧 DataTable: Updated column structure:', allColumns);
                  setTableColumns(allColumns);
                }
              }
            } catch (error) {
              console.error('❌ DataTable: Error updating table structure:', error);
            }
          };
          updateTableColumns();
        }
      }
    };

    // Listen for column order updates (from ColumnManager)
    const handleColumnOrderUpdate = (event) => {
      console.log('🔧 DataTable: Column order updated event received:', event.detail);
      if (event.detail?.tableName === tableName) {
        console.log('🔧 DataTable: Updating column order for current table');
        // Force re-render by updating a dummy state
        setForceRender(prev => prev + 1);
      }
    };



    // Add event listeners
    window.addEventListener('dataTableUpdate', handleDataUpdate);
    window.addEventListener('policyDataUpdated', handlePolicyDataUpdate);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tableStructureUpdated', handleTableStructureUpdate);
    window.addEventListener('columnOrderUpdated', handleColumnOrderUpdate);


    return () => {
      window.removeEventListener('dataTableUpdate', handleDataUpdate);
      window.removeEventListener('policyDataUpdated', handlePolicyDataUpdate);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tableStructureUpdated', handleTableStructureUpdate);
      window.removeEventListener('columnOrderUpdated', handleColumnOrderUpdate);

    };
  }, [tableName]); // Removed handleDataCaptured to prevent infinite loop

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
          <div className="refresh-section">
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

  // Use the stable tableColumns instead of dynamic Object.keys

  const handleCellClick = (rowIndex, column, value) => {
    // Remove single click handler functionality
  };

  const handleCellDoubleClickWithRow = (row, column, value) => {
    console.log('✏️ Double click - Direct row access:', { 
      id: row.id, 
      nombre: getClientName(row), 
      column, 
      value: row[column] 
    });
    
    // Prevent editing if already editing
    if (isEditingFlag) {
      console.log('⚠️ Already editing, ignoring double click');
      return;
    }
    
    if (!row || !row.id) {
      console.error('❌ Invalid row data');
      return;
    }
    
    // Clear any existing edit state
    setEditingCell(null);
    setEditValue('');
    setShowPdfUpload(false);
    setIsAnalyzing(false);

    if (column === 'status') {
      setStatusModal({
        isOpen: true,
        rowId: row.id,
        currentStatus: row[column] || 'Vigente 🟢'
      });
      return;
    }
    
    // Set editing flag
    setIsEditingFlag(true);
    
    // Clear any cell selections
    setSelectedCells([]);
    setSelectionStart(null);
    
    // Use the row object directly - NO INDEX CONFUSION
    setTimeout(() => {
      setEditingCell({ 
        rowId: row.id,
        column, 
        value: row[column]
      });
      setEditValue(row[column] !== null ? String(row[column]) : '');
    }, 10);
  };

  // Keep old function for backwards compatibility
  const handleCellDoubleClick = (rowIndex, column, value) => {
    const row = filteredData[rowIndex];
    handleCellDoubleClickWithRow(row, column, value);
  };

  const handleCancelEdit = () => {
    console.log('🚫 Canceling edit - current editing cell:', editingCell);
    setEditingCell(null);
    setEditValue('');
    setShowPdfUpload(false);
    setIsAnalyzing(false);
    setSelectedCells([]);
    setSelectionStart(null);
    setIsEditingFlag(false);
    console.log('🚫 Edit canceled - state cleared');
  };

  const handleConfirmEdit = async () => {
    if (!editingCell) return;

    const { rowId, column } = editingCell;
    
    // Find the row by ID instead of using index
    const row = filteredData.find(r => r.id === rowId);
    
    if (!row) {
      console.error('❌ Could not find row with ID:', rowId);
      return;
    }
    
    console.log('🔄 Updating cell:', {
      id: rowId,
      nombre: getClientName(row),
      column,
      oldValue: row[column],
      newValue: editValue
    });
    
    // Prevent multiple simultaneous edits
    if (isAnalyzing) {
      console.log('⏳ Edit already in progress, ignoring');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // Validate the data before updating
      if (editValue === undefined || editValue === null) {
        throw new Error('Invalid value: Value cannot be empty');
      }

      // Make the API call using the row ID
      const result = await onCellUpdate(rowId, column, editValue);
      
      // Log the result for debugging
      console.log('✅ Update result:', result);

      // Check if result exists and has success property
      if (!result || result.success === false) {
        throw new Error(result?.message || 'Failed to update cell');
      }

      // Show success message first
      toast.success('✅ Celda actualizada correctamente');
      
      // Close the edit popup immediately - DataSection already updated the UI
      setEditingCell(null);
      setEditValue('');
      setShowPdfUpload(false);
      setSelectedCells([]);
      setSelectionStart(null);
      
      // NO NOTIFICATION - DataSection already updated UI and no refresh needed
          } catch (error) {
        console.error('Failed to update cell:', error);
        
        // Show error message with more specific information
        const errorMessage = error.response?.data?.error || error.message || 'Failed to update cell';
        toast.error(`Update failed: ${errorMessage}`);
        
        // Keep the edit popup open so user can try again or cancel
      } finally {
        setIsAnalyzing(false); // Reset processing flag
        setIsEditingFlag(false); // Reset editing flag
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

  // Close edit popup when clicking outside
  const handleEditPopupClick = (e) => {
    e.stopPropagation();
  };

  const handleOverlayClick = () => {
    handleCancelEdit();
  };



  // Add selection handlers
  const handleCellSelection = (event, rowIndex, column, value, rowObject) => {
    event.preventDefault();
    
    // If we're currently editing, don't handle selection
    if (editingCell) {
      return;
    }
    
    // Handle double click for editing - use the actual row object
    if (event.detail === 2) {
      handleCellDoubleClickWithRow(rowObject, column, value);
      return;
    }

    const cellKey = `${rowIndex}-${column}`;
    
    if (event.shiftKey && selectionStart) {
      // Calculate range selection
      const startRow = Math.min(selectionStart.rowIndex, rowIndex);
      const endRow = Math.max(selectionStart.rowIndex, rowIndex);
      const startColIndex = tableColumns.indexOf(selectionStart.column);
      const endColIndex = tableColumns.indexOf(column);
      const startCol = Math.min(startColIndex, endColIndex);
      const endCol = Math.max(startColIndex, endColIndex);
      
      const newSelection = [];
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          newSelection.push(`${r}-${tableColumns[c]}`);
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
        const col = tableColumns.indexOf(column);
        
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
  }, [selectedCells, data, tableColumns]);

  const handleEmailClick = (rowData) => {
    setMailModal({ isOpen: true, rowData });
  };

  const handleOpenEmailModal = (rowData) => {
    console.log('📧 DataTable: Opening email modal via callback with row data:', rowData);
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
      
      // Update local state immediately for better UX
      setFilteredData(prevData => 
        prevData.map(row => 
          row.id === record.id ? { ...row, estado_pago: newStatus } : row
        )
      );
      
      await firebaseTableService.updateData(tableName, record.id, 'estado_pago', newStatus);
      
      toast.success(`Estado de pago actualizado a: ${newStatus}`);
      
      // Notify other components about the edit
      notifyDataEdit(tableName);
      
      // Refresh the data to ensure consistency
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Error al actualizar el estado de pago');
      
      // Revert local state on error
      setFilteredData(prevData => 
        prevData.map(row => 
          row.id === record.id ? { ...row, estado_pago: record.estado_pago || 'No Pagado' } : row
        )
      );
    }
  };

  const handleCapStatusToggle = async (record) => {
    try {
      const currentStatus = record.estado_cap || 'Inactivo';
      const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';
      
      console.log(`🔄 Updating CAP status for record ${record.id} from ${currentStatus} to ${newStatus}`);
      
      // Update local state immediately for better UX
      setFilteredData(prevData => 
        prevData.map(row => 
          row.id === record.id ? { ...row, estado_cap: newStatus } : row
        )
      );
      
      await firebaseTableService.updateData(tableName, record.id, 'estado_cap', newStatus);
      
      toast.success(`Estado CAP actualizado a: ${newStatus}`);
      
      // Notify other components about the edit
      notifyDataEdit(tableName);
      
      // Refresh the data to ensure consistency
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (error) {
      console.error('Error updating CAP status:', error);
      toast.error('Error al actualizar el estado CAP');
      
      // Revert local state on error
      setFilteredData(prevData => 
        prevData.map(row => 
          row.id === record.id ? { ...row, estado_cap: record.estado_cap || 'Inactivo' } : row
        )
      );
    }
  };

  const handleCfpStatusToggle = async (record) => {
    try {
      const currentStatus = record.estado_cfp || 'Inactivo';
      const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';
      
      console.log(`🔄 Updating CFP status for record ${record.id} from ${currentStatus} to ${newStatus}`);
      
      // Update local state immediately for better UX
      setFilteredData(prevData => 
        prevData.map(row => 
          row.id === record.id ? { ...row, estado_cfp: newStatus } : row
        )
      );
      
      await firebaseTableService.updateData(tableName, record.id, 'estado_cfp', newStatus);
      
      toast.success(`Estado CFP actualizado a: ${newStatus}`);
      
      // Notify other components about the edit
      notifyDataEdit(tableName);
      
      // Refresh the data to ensure consistency
      if (onRefresh) {
        await onRefresh();
      }
      
    } catch (error) {
      console.error('Error updating CFP status:', error);
      toast.error('Error al actualizar el estado CFP');
      
      // Revert local state on error
      setFilteredData(prevData => 
        prevData.map(row => 
          row.id === record.id ? { ...row, estado_cfp: record.estado_cfp || 'Inactivo' } : row
        )
      );
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

  // Function to format money amounts with commas
  const formatMoneyAmount = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    
    // Convert to string and clean it
    let cleanValue = String(value).replace(/[^\d.-]/g, '');
    
    // Check if it's a valid number
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) return String(value);
    
    // Format with commas for thousands
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Function to format policy numbers (remove leading zeros)
  const formatPolicyNumber = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    
    // Convert to string
    let strValue = String(value).trim();
    
    // If it's a number with leading zeros, remove them
    if (/^0+/.test(strValue) && strValue.length > 1) {
      // Remove leading zeros but keep at least one digit
      strValue = strValue.replace(/^0+/, '') || '0';
    }
    
    return strValue;
  };

  // Function to check if a column contains money amounts
  const isMoneyColumn = (column) => {
    const columnLower = column.toLowerCase();
    
    // Lista completa de columnas de dinero conocidas
    const exactMoneyColumns = [
      'pago_total_o_prima_total',
      'primer_pago', 
      'pago_parcial',
      'resto',
      'precio',
      'monto',
      'total',
      'importe',
      'prima',
      'suma_asegurada',
      'deducible',
      'coaseguro',
      'prima_total',
      'importe_total',
      'importe_a_pagar_mxn',
      'suma_asegurada_contenidos',
      'suma_asegurada_edificio',
      'valor_inmueble',
      'valor_mercancia',
      'capital',
      'beneficio',
      'indemnizacion',
      'reembolso',
      'costo',
      'tarifa',
      'comision',
      'descuento',
      'recargo',
      'iva',
      'subtotal',
      'importe_neto',
      'importe_bruto'
    ];
    
    // Verificar coincidencia exacta
    if (exactMoneyColumns.includes(columnLower)) {
      return true;
    }
    
    // Verificar patrones de palabras clave en el nombre de la columna
    const moneyKeywords = [
      'prima', 'importe', 'monto', 'precio', 'suma', 'deducible', 
      'coaseguro', 'valor', 'capital', 'beneficio', 'indemnizacion', 
      'reembolso', 'costo', 'tarifa', 'comision', 'descuento', 
      'recargo', 'iva', 'subtotal', 'pago', 'total'
    ];
    
    return moneyKeywords.some(keyword => columnLower.includes(keyword));
  };

  // Function to check if a column is a policy number column
  const isPolicyNumberColumn = (column) => {
    const columnLower = column.toLowerCase();
    const policyColumns = [
      'numero_poliza',
      'numero_poliza',
      'poliza',
      'num_poliza',
      'policy_number',
      'numero_de_poliza'
    ];
    return policyColumns.includes(columnLower);
  };

  // Function to check if a column is a date column
  const isDateColumn = (column) => {
    const columnLower = column.toLowerCase();
    const dateColumns = [
      'fecha_inicio',
      'fecha_fin',
      'fecha_expedicion',
      'desde_vigencia',
      'hasta_vigencia',
      'fecha_pago',
      'fecha_vencimiento',
      'fecha_expiracion',
      'fecha_finalizacion',
      'fecha_termino',
      'vencimiento',
      'expiracion',
      'created_at',
      'updated_at',
      'createdat',
      'updatedat'
    ];
    return dateColumns.includes(columnLower) || columnLower.includes('fecha') || columnLower.includes('vigencia');
  };

  // Function to check if a column is a payment column that should be clickeable
  const isPaymentColumn = (column) => {
    const columnLower = column.toLowerCase();
    const paymentColumns = [
      'pago_actual',
      'pagos_realizados',
      'estado_pago_parcial',
      'fecha_proximo_pago'
    ];
    return paymentColumns.includes(columnLower) || columnLower.includes('pago');
  };

  // Function to format date values
  const formatDateValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    
    // If already in DD/MMM/YYYY format, return as is
    if (typeof value === 'string' && /^\d{1,2}\/[a-z]{3}\/\d{4}$/i.test(value)) {
      return value;
    }
    
    // Convert to DD/MMM/YYYY format
    const formattedDate = toDDMMMYYYY(value);
    return formattedDate || String(value);
  };

  const renderCell = (row, rowIndex, column) => {
    // Debug logging for hogar table
    if (tableName === 'hogar' && column === 'nombre_contratante') {
      console.log('🔍 renderCell debug:', { 
        tableName, 
        column, 
        rowIndex, 
        value: row[column], 
        rowKeys: Object.keys(row) 
      });
    }
    
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
    
    // Format policy number columns (remove leading zeros)
    if (isPolicyNumberColumn(column)) {
      const formattedValue = formatPolicyNumber(row[column]);
      return <span className="policy-number-cell">{formattedValue}</span>;
    }
    
    // Format date columns to DD/MMM/YYYY format
    if (isDateColumn(column)) {
      const formattedValue = formatDateValue(row[column]);
      return <span className="date-cell">{formattedValue}</span>;
    }
    
    // Format money columns with commas
    if (isMoneyColumn(column)) {
      const formattedValue = formatMoneyAmount(row[column]);
      return <span className="money-cell">{formattedValue}</span>;
    }
    
    // Handle payment columns - make them clickeable for partial payments
    if (isPaymentColumn(column) && row.forma_pago && hasPartialPayments(row.forma_pago)) {
      const cellValue = row[column] !== null ? String(row[column]) : '-';
      
      // Special handling for pago_actual column
      if (column.toLowerCase() === 'pago_actual') {
        const totalPayments = row.total_pagos || calculateTotalPayments(row.forma_pago);
        const currentPayment = row.pago_actual || 1;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenPaymentModal(row);
            }}
            className="payment-toggle"
            style={{
              background: 'var(--primary-color)',
              color: 'black',
              border: 'none',
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {currentPayment}/{totalPayments}
          </button>
        );
      }
      
      // For other payment columns, make them clickeable
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPaymentModal(row);
          }}
          className="payment-cell-button"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: '0',
            fontSize: 'inherit'
          }}
        >
          {cellValue}
        </button>
      );
    }
    
    const cellValue = row[column] !== null ? String(row[column]) : '-';
    return <span>{cellValue}</span>;
  };

  // Column reordering logic moved to useMemo above for stability

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

    // Sort the base sortedData, not filteredData
    const sorted = [...sortedData].sort((a, b) => {
      if (a[column] === null) return 1;
      if (b[column] === null) return -1;
      if (a[column] === b[column]) return 0;

      const compareResult = a[column] < b[column] ? -1 : 1;
      return direction === 'ascending' ? compareResult : -compareResult;
    });

    // Update both sorted and filtered data to stay in sync
    setSortedData(sorted);
    // The search useEffect will handle filtering the sorted data
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
        
        <div className="table-header">
          {tableTitle && (
            <div className="table-title">
              <h2>{tableTitle}</h2>
            </div>
          )}
          <div className="table-controls">
            <div className="left-controls">
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
                    padding: '4px 8px',
                    backgroundColor: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    height: '28px'
                  }}
                >
                  ✕
                </button>
              )}
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
              {renderTableSelector()}
            </div>
            <div className="right-controls">
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
            </div>
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
            onOpenEmailModal={handleOpenEmailModal}
          />
        </div>
      </Modal>

      <div className={`table-wrapper ${isRefreshing ? 'refreshing' : ''}`}>
        <table className="data-table">
          <thead>
            <tr>
              {/* COLUMNA ACCIONES MODAL */}
              <th 
                className="action-header actions-modal-header" 
                onClick={() => {
                  console.log('🔧 Header clicked, opening modal');
                  setShowActionsModal(true);
                }}
                style={{
                  width: '70px',
                  minWidth: '70px',
                  maxWidth: '70px',
                  backgroundColor: '#fbbf24',
                  color: 'white',
                  textAlign: 'center',
                  fontSize: '9px',
                  fontWeight: '700',
                  padding: '8px 4px',
                  display: 'table-cell',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: '2px solid #f59e0b',
                  borderRadius: '4px 0 0 4px'
                }}
                title="Click para abrir panel de acciones"
              >
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '1px' 
                }}>
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="3"
                    style={{ width: '18px', height: '18px' }}
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span style={{ fontSize: '7px', letterSpacing: '0.5px' }}>ACCIONES</span>
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
              
              // Debug: basic record count
              console.log('📊 Rendering', sortedForRender.length, 'records');
              
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
                {/* COLUMNA ACCIONES MODAL */}
                <td 
                  className="action-cell actions-modal-cell" 
                  style={{
                    width: '70px',
                    minWidth: '70px', 
                    maxWidth: '70px',
                    backgroundColor: '#f8f9fa',
                    padding: '4px',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🔧 Button clicked, opening modal for row:', row);
                      console.log('🔧 Current states before update:', { showActionsModal, selectedRowForActions });
                      setSelectedRowForActions(row);
                      setShowActionsModal(true);
                      console.log('🔧 States should be updated now');
                    }}
                    className="action-btn actions-modal-btn"
                    title="Abrir panel de acciones"
                    style={{
                      width: '100%',
                      height: '28px',
                      padding: '4px 6px',
                      fontSize: '10px',
                      fontWeight: '600',
                      border: '1px solid #f59e0b',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      backgroundColor: '#fbbf24',
                      color: 'white',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ⚡
                  </button>
                </td>
                {reorderedColumns.map(column => {
                  // Debug logging for hogar table
                  if (tableName === 'hogar' && rowIndex === 0) {
                    console.log('🔍 Column mapping debug:', { 
                      tableName, 
                      column, 
                      rowIndex, 
                      value: row[column],
                      hasValue: row[column] !== undefined && row[column] !== null
                    });
                  }
                  
                  return (
                  <td
                    key={`${rowIndex}-${column}`}
                    onClick={(e) => handleCellSelection(e, rowIndex, column, row[column], row)}
                    className={`editable-cell ${column === 'id' ? 'id-cell' : ''} ${
                      column === 'status' ? 'status-cell' : ''
                    } ${selectedCells.includes(`${rowIndex}-${column}`) ? 'selected-cell' : ''} ${
                      editingCell && editingCell.rowIndex === rowIndex && editingCell.column === column ? 'editing-cell' : ''
                    }`}
                    title="Double-click to edit"
                  >
                    {renderCell(row, rowIndex, column)}
                  </td>
                  );
                })}
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
        tableType={tableName}
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
        <div className="edit-cell-popup" onClick={handleOverlayClick}>
          <div className="edit-cell-content" onClick={handleEditPopupClick}>
            <div className="edit-cell-header">
              <h4>Edit Cell: {editingCell.column}</h4>
              <button 
                className="edit-cell-close" 
                onClick={handleCancelEdit}
                title="Close (Esc)"
              >
                ×
              </button>
            </div>
            <div className="edit-cell-info">
              <textarea
                value={editValue}
                onChange={(e) => {
                  console.log('📝 Textarea value changed:', e.target.value);
                  setEditValue(e.target.value);
                }}
                onKeyDown={handleInputKeyDown}
                onFocus={() => console.log('🎯 Textarea focused')}
                onBlur={() => console.log('🔍 Textarea blurred')}
                autoFocus
                rows={3}
                className="edit-cell-textarea"
                placeholder={`Enter value for ${editingCell.column}...`}
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
                  tableName={tableName}
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

      {/* MODAL DE ACCIONES */}
      {showActionsModal && selectedRowForActions && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="actions-modal" style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '16px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#374151'
              }}>
                Acciones para: {getClientName(selectedRowForActions)}
              </h3>
              <button
                onClick={() => {
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {/* Botón Eliminar */}
              <button
                onClick={() => {
                  handleDeleteClick(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#fee2e2';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#fef2f2';
                }}
              >
                <span>×</span>
                Eliminar
              </button>

              {/* Botón Drive */}
              <button
                onClick={() => {
                  handleDriveClick(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#dbeafe',
                  color: '#1e40af',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#bfdbfe';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#dbeafe';
                }}
              >
                <span>📁</span>
                Drive
              </button>

              {/* Botón Pago */}
              <button
                onClick={() => {
                  handlePaymentStatusToggle(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: (selectedRowForActions.estado_pago === 'Pagado') ? '#dcfce7' : '#fef2f2',
                  color: (selectedRowForActions.estado_pago === 'Pagado') ? '#166534' : '#dc2626',
                  border: `1px solid ${(selectedRowForActions.estado_pago === 'Pagado') ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>💰</span>
                {(selectedRowForActions.estado_pago === 'Pagado') ? 'PAGADO' : 'NO PAGADO'}
              </button>

              {/* Botón CAP */}
              <button
                onClick={() => {
                  handleCapStatusToggle(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: (selectedRowForActions.estado_cap === 'Activo') ? '#dbeafe' : '#f3f4f6',
                  color: (selectedRowForActions.estado_cap === 'Activo') ? '#1e40af' : '#6b7280',
                  border: `1px solid ${(selectedRowForActions.estado_cap === 'Activo') ? '#bfdbfe' : '#d1d5db'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>📋</span>
                CAP
              </button>

              {/* Botón CFP */}
              <button
                onClick={() => {
                  handleCfpStatusToggle(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: (selectedRowForActions.estado_cfp === 'Activo') ? '#e9d5ff' : '#f3f4f6',
                  color: (selectedRowForActions.estado_cfp === 'Activo') ? '#7c3aed' : '#6b7280',
                  border: `1px solid ${(selectedRowForActions.estado_cfp === 'Activo') ? '#c4b5fd' : '#d1d5db'}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>📄</span>
                CFP
              </button>

              {/* Botón Email */}
              <button
                onClick={() => {
                  handleEmailClick(selectedRowForActions);
                  setShowActionsModal(false);
                  setSelectedRowForActions(null);
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#bbf7d0';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#dcfce7';
                }}
              >
                <span>📧</span>
                Email
              </button>

              {/* Botón Pagos Parciales - Solo para pólizas no anuales */}
              {selectedRowForActions.forma_pago && hasPartialPayments(selectedRowForActions.forma_pago) && (
                <button
                  onClick={() => {
                    handleOpenPaymentModal(selectedRowForActions);
                    setShowActionsModal(false);
                    setSelectedRowForActions(null);
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#fde68a';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#fef3c7';
                  }}
                >
                  <span>💳</span>
                  Pagos Parciales
                </button>
              )}

              {/* Botón Estado Pago Parcial - Solo para pólizas no anuales */}
              {selectedRowForActions.forma_pago && hasPartialPayments(selectedRowForActions.forma_pago) && (
                <button
                  onClick={() => {
                    handleTogglePartialPaymentStatus(selectedRowForActions);
                    setShowActionsModal(false);
                    setSelectedRowForActions(null);
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: (getPartialPaymentStatus(selectedRowForActions) === 'Pagado') ? '#dcfce7' : '#fef2f2',
                    color: (getPartialPaymentStatus(selectedRowForActions) === 'Pagado') ? '#166534' : '#dc2626',
                    border: `1px solid ${(getPartialPaymentStatus(selectedRowForActions) === 'Pagado') ? '#bbf7d0' : '#fecaca'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>💰</span>
                  {getPartialPaymentStatus(selectedRowForActions) === 'Pagado' ? 'PAGADO PARCIAL' : 'NO PAGADO PARCIAL'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal for Partial Payments */}
      {showPaymentModal && selectedPolicyForPayment && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <h3>Gestión de Pagos - {selectedPolicyForPayment.numero_poliza}</h3>
              <button onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="payment-modal-body">
              <div className="payment-info">
                <p><strong>Contratante:</strong> {selectedPolicyForPayment.contratante}</p>
                <p><strong>Forma de Pago:</strong> {selectedPolicyForPayment.forma_pago}</p>
                <p><strong>Total de Pagos:</strong> {selectedPolicyForPayment.total_pagos || calculateTotalPayments(selectedPolicyForPayment.forma_pago)}</p>
                <p><strong>Pago Actual:</strong> {selectedPolicyForPayment.pago_actual || 1}/{selectedPolicyForPayment.total_pagos || calculateTotalPayments(selectedPolicyForPayment.forma_pago)}</p>
                <p><strong>Estado:</strong> <span className={`status-badge ${getPartialPaymentStatus(selectedPolicyForPayment).toLowerCase().replace(' ', '-')}`}>
                  {getPartialPaymentStatus(selectedPolicyForPayment)}
                </span></p>
              </div>
              
              {/* Quick action for current payment */}
              <div className="current-payment-action">
                <h4>Acción Rápida - Pago Actual</h4>
                <div className="current-payment-info">
                  <span>Pago {selectedPolicyForPayment.pago_actual || 1}/{selectedPolicyForPayment.total_pagos || calculateTotalPayments(selectedPolicyForPayment.forma_pago)}</span>
                  <button 
                    onClick={() => handleTogglePartialPaymentStatus(selectedPolicyForPayment)}
                    className={`quick-action-btn ${getPartialPaymentStatus(selectedPolicyForPayment).toLowerCase().replace(' ', '-')}`}
                  >
                    {getPartialPaymentStatus(selectedPolicyForPayment) === 'Pagado' ? 'Marcar como No Pagado' : 'Marcar como Pagado'}
                  </button>
                </div>
              </div>
              
              <div className="payment-checklist">
                {Array.from({ length: selectedPolicyForPayment.total_pagos || calculateTotalPayments(selectedPolicyForPayment.forma_pago) }).map((_, index) => {
                  const paymentNumber = index + 1;
                  const payment = selectedPolicyForPayment.pagos_realizados?.find(p => p.numero === paymentNumber);
                  const isPaid = payment?.pagado || paymentNumber === 1; // First payment is always paid
                  const paymentDate = payment?.fecha || (paymentNumber === 1 ? selectedPolicyForPayment.fecha_inicio : null);
                  
                  return (
                    <div key={paymentNumber} className={`payment-item ${isPaid ? 'paid' : 'unpaid'}`}>
                      <input 
                        type="checkbox" 
                        checked={isPaid}
                        onChange={() => handlePaymentCheckToggle(selectedPolicyForPayment, paymentNumber)}
                        disabled={paymentNumber === 1}
                      />
                      <span className="payment-number">Pago {paymentNumber}/{selectedPolicyForPayment.total_pagos || calculateTotalPayments(selectedPolicyForPayment.forma_pago)}</span>
                      <span className="payment-date">{paymentDate ? toDDMMMYYYY(paymentDate) : 'Pendiente'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;