import { useState, useEffect } from 'react';
import './Reports.css';
import firebaseReportsService from '../../services/firebaseReportsService';
import policyStatusService from '../../services/policyStatusService';
import { formatDate, parseDate, getDateFormatOptions } from '../../utils/dateUtils';
import {
  ARCHIVE_DEAD_MONTHS,
  POR_VENCER_MESES,
  isArchiveDeadPolicy,
  isPolicyExpired,
  isPorVencerProximosMeses,
  isRecentlyExpiredPolicy
} from '../../utils/policyExpiryBuckets';
import { toast } from 'react-hot-toast';
import { useTeam } from '../../context/TeamContext';
import VencimientosGraphics from './VencimientosGraphics';
import MatrixGraphics from './MatrixGraphics';
import airplaneTableService from '../../services/airplaneTableService';
import {
  hasPartialPayments,
  calculateTotalPayments,
  isSinglePaymentForm,
} from '../../utils/policyPaymentReminder';
import {
  buildPartialPaymentUpdate,
  isInstallmentPaid,
  computeInstallmentDueDate,
  getPartialPaymentProgress,
  getPartialPaymentProgressLabel,
  getPartialPaymentProgressStyle,
} from '../../utils/partialPaymentUpdates';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const REPORT_TYPES = [
  'Vencimientos',
  'Vigentes',
  'Vencidas',
  'Archivo muerto',
  'Pagos Parciales',
  'Matriz de Productos'
];

/** Tipos que no filtran por mes del calendario */
const REPORT_TYPES_WITHOUT_MONTH = new Set([
  'Vigentes',
  'Vencidas',
  'Archivo muerto',
  'Matriz de Productos'
]);

// Utility function to get the total amount from a policy, handling multiple field variations
const getPolicyTotalAmount = (policy) => {
  // Try different field variations for total amount (prioritized order)
  // Only use fields that represent the TOTAL amount, NOT prima_neta (which is net, not total)
  const totalFields = [
    'pago_total_o_prima_total', // Most common field in Firebase data
    'importe_a_pagar_mxn', // VIDA policies use this (priority!)
    'importe_a_pagar', // Alternative for import to pay
    'pago_total',
    'prima_total',
    'importe_total', // Total amount to pay
    'importe_total_a_pagar', // Total amount to pay
    'prima',
    'total',
    'monto_total'
    // NOTE: prima_neta and prima_neta_mxn are NOT included as they represent net amounts, not totals
  ];

  // Debug: Log available payment fields for VIDA policies, GMM policies, or first policy
  const isGMM = policy.ramo === 'GMM' || policy.sourceTable === 'gmm' || 
                (policy.contratante && policy.contratante.toLowerCase().includes('game time'));
  const isVIDA = policy.ramo === 'VIDA' || policy.sourceTable === 'vida';
  
  if (isGMM) {
    // For GMM, show ALL fields that might contain amounts - use console.log with JSON.stringify for better visibility
    const allAmountFields = ['importe_total', 'prima_neta', 'prima_total', 'pago_total', 
                             'pago_total_o_prima_total', 'importe_total_a_pagar', 'prima', 
                             'total', 'monto_total', 'derecho_poliza', 'iva_16', 'recargo_pago_fraccionado'];
    
    const availableTotalFields = totalFields.filter(field => policy[field] !== undefined && policy[field] !== null && policy[field] !== '');
    const totalFieldValues = totalFields.reduce((acc, field) => {
      if (policy[field] !== undefined && policy[field] !== null && policy[field] !== '') {
        acc[field] = policy[field];
      }
      return acc;
    }, {});
    
    const allAmountFieldValues = allAmountFields.reduce((acc, field) => {
      if (policy[field] !== undefined && policy[field] !== null && policy[field] !== '') {
        acc[field] = policy[field];
      }
      return acc;
    }, {});
    
    console.log('🔍 GMM Policy payment fields - FULL DETAILS:', {
      numero_poliza: policy.numero_poliza,
      contratante: policy.contratante,
      ramo: policy.ramo || policy.sourceTable,
      availableTotalFields: availableTotalFields,
      totalFieldValues: totalFieldValues,
      allAmountFieldValues: allAmountFieldValues
    });
    
    // Also log as JSON string for easier reading
    console.log('📋 GMM Policy ALL fields (JSON):', JSON.stringify({
      numero_poliza: policy.numero_poliza,
      contratante: policy.contratante,
      importe_total: policy.importe_total,
      prima_neta: policy.prima_neta,
      prima_total: policy.prima_total,
      pago_total: policy.pago_total,
      pago_total_o_prima_total: policy.pago_total_o_prima_total
    }, null, 2));
  } else if ((!getPolicyTotalAmount.debugLogged && policy.numero_poliza) || isVIDA) {
    console.log('🔍 Policy payment fields available:', {
      numero_poliza: policy.numero_poliza,
      contratante: policy.contratante,
      ramo: policy.ramo || policy.sourceTable,
      availableFields: totalFields.filter(field => policy[field] !== undefined && policy[field] !== null && policy[field] !== ''),
      fieldValues: totalFields.reduce((acc, field) => {
        if (policy[field] !== undefined && policy[field] !== null && policy[field] !== '') {
          acc[field] = {
            value: policy[field],
            type: typeof policy[field],
            raw: policy[field]
          };
        }
        return acc;
      }, {}),
      finalAmount: 'calculating...'
    });
    if (!getPolicyTotalAmount.debugLogged) {
      getPolicyTotalAmount.debugLogged = true;
    }
  }

  for (const field of totalFields) {
    if (policy[field] !== undefined && policy[field] !== null && policy[field] !== '') {
      const value = policy[field];
      
      // Debug for GMM policies
      if (isGMM && field === 'importe_total') {
        console.log(`🔍 GMM Policy checking field ${field}:`, {
          numero_poliza: policy.numero_poliza,
          contratante: policy.contratante,
          field: field,
          rawValue: value,
          type: typeof value
        });
      }
      
      // Handle string values that might contain commas, dollar signs, "DLS", etc.
      if (typeof value === 'string') {
        // Remove "DLS", "USD", "MXN" and other currency indicators, along with spaces, commas, dollar signs, and quotes
        const cleanedValue = value.replace(/[\s,$"]/g, '').replace(/DLS|USD|MXN|dls|usd|mxn/gi, '').trim();
        const numericValue = parseFloat(cleanedValue);
        if (!isNaN(numericValue)) {
          // For main total fields, only return if > 0
          if (field === 'prima_total' || field === 'pago_total_o_prima_total' || 
              field === 'importe_total' || field === 'importe_total_a_pagar' ||
              field === 'importe_a_pagar_mxn' || field === 'importe_a_pagar' || field === 'pago_total') {
            if (numericValue > 0) {
              // Debug: Log successful amount found
              if (isVIDA || isGMM) {
                console.log(`✅ ${isGMM ? 'GMM' : 'VIDA'} Policy amount found:`, {
                  numero_poliza: policy.numero_poliza,
                  contratante: policy.contratante,
                  field: field,
                  rawValue: value,
                  cleanedValue: cleanedValue,
                  numericValue: numericValue
                });
              }
              return numericValue;
            } else if (isGMM) {
              console.log(`⚠️ GMM Policy ${field} is 0 or negative:`, {
                numero_poliza: policy.numero_poliza,
                contratante: policy.contratante,
                field: field,
                rawValue: value,
                numericValue: numericValue
              });
            }
          } else {
            // For other fallback fields (prima, total, monto_total), return if > 0
            if (numericValue > 0) {
              // Debug: Log fallback field usage
              if (isVIDA || isGMM) {
                console.log(`⚠️ ${isGMM ? 'GMM' : 'VIDA'} Policy using fallback field:`, {
                  numero_poliza: policy.numero_poliza,
                  contratante: policy.contratante,
                  field: field,
                  value: numericValue,
                  originalValue: value,
                  type: typeof value
                });
              }
              return numericValue;
            }
          }
        } else if (isGMM && field === 'importe_total') {
          console.log(`❌ GMM Policy ${field} failed to parse:`, {
            numero_poliza: policy.numero_poliza,
            contratante: policy.contratante,
            field: field,
            rawValue: value,
            cleanedValue: cleanedValue
          });
        }
      } else if (typeof value === 'number') {
        // For main total fields, only return if > 0
        if (field === 'prima_total' || field === 'pago_total_o_prima_total' || 
            field === 'importe_total' || field === 'importe_total_a_pagar' ||
            field === 'importe_a_pagar_mxn' || field === 'importe_a_pagar' || field === 'pago_total') {
          if (value > 0) {
            // Debug: Log successful amount found
            if (isVIDA || isGMM) {
              console.log(`✅ ${isGMM ? 'GMM' : 'VIDA'} Policy amount found:`, {
                numero_poliza: policy.numero_poliza,
                contratante: policy.contratante,
                field: field,
                value: value
              });
            }
            return value;
          } else if (isGMM) {
            console.log(`⚠️ GMM Policy ${field} is 0 or negative:`, {
              numero_poliza: policy.numero_poliza,
              contratante: policy.contratante,
              field: field,
              value: value
            });
          }
        } else {
          // For other fallback fields (prima, total, monto_total), return if > 0
          if (value > 0) {
            // Debug: Log fallback field usage
            if (isVIDA || isGMM) {
              console.log(`⚠️ ${isGMM ? 'GMM' : 'VIDA'} Policy using fallback field:`, {
                numero_poliza: policy.numero_poliza,
                contratante: policy.contratante,
                field: field,
                value: value,
                type: typeof value
              });
            }
            return value;
          }
        }
      }
    }
  }
  
  // Debug: Log final result for VIDA or GMM policies
  if (isVIDA || isGMM) {
    console.log(`❌ ${isGMM ? 'GMM' : 'VIDA'} Policy final amount result:`, {
      numero_poliza: policy.numero_poliza,
      contratante: policy.contratante,
      finalAmount: 0,
      reason: 'No valid amount found in any field',
      availableFields: totalFields.filter(field => {
        const val = policy[field];
        return val !== undefined && val !== null && val !== '';
      })
    });
  }
  
  return 0;
};

export default function Reports() {
  const { userTeam, currentTeam } = useTeam();
  const [viewMode, setViewMode] = useState('table');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedType, setSelectedType] = useState('Vencimientos');
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFormat, setDateFormat] = useState('long-es');
  const [expandedCards, setExpandedCards] = useState({});
  const [policyStatuses, setPolicyStatuses] = useState({});
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPolicyForPayment, setSelectedPolicyForPayment] = useState(null);


  // New state for collapsible layout and graphics
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [graphicsTimeView, setGraphicsTimeView] = useState('year');
  const [showGraphicsPanel, setShowGraphicsPanel] = useState(false);
  const [showMatrixGraphics, setShowMatrixGraphics] = useState(false);

  const calculateNextPaymentDate = (startDate, paymentForm) => {
    if (!startDate || !paymentForm) return null;
    
    const start = new Date(startDate);
    const today = new Date();
    const paymentIntervals = {
      'MENSUAL': 1,
      'BIMESTRAL': 2,
      'TRIMESTRAL': 3,
      'CUATRIMESTRAL': 4,
      'SEMESTRAL': 6,
      'ANUAL': 12,
      'CONTADO': 12,
    };

    const interval = paymentIntervals[paymentForm.toUpperCase()] || 12;
    let nextPayment = new Date(start);

    while (nextPayment <= today) {
      nextPayment.setMonth(nextPayment.getMonth() + interval);
    }

    return nextPayment;
  };

  // Function to get policy status key
  const getPolicyKey = (policy) => {
    if (!policy) {
      return 'unknown_unknown';
    }
    
    const policyId = policy.id || policy.firebase_doc_id || policy.docId || 'unknown_id';
    const ramo = policy.ramo || policy.sourceTable || policy.table || 'unknown_ramo';
    
    // Only warn if we really can't identify the policy
    if (policyId === 'unknown_id') {
      console.warn('⚠️ Policy without valid ID:', policy.numero_poliza || 'Unknown Policy');
    }
    
    return `${ramo.toLowerCase()}_${policyId}`;
  };

  // Load all policies and related data from Firebase
  const loadPolicies = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (forceRefresh) {
        console.log('🔄 Force refreshing policies from Firebase...');
      } else {
        console.log('📊 Loading policies (checking cache first)...');
      }
      
      // Get all policies from Firebase (with cache support)
      const allPolicies = await firebaseReportsService.getAllPolicies(forceRefresh);
      console.log(`✅ Loaded ${allPolicies.length} policies ${forceRefresh ? 'from Firebase' : '(from cache or Firebase)'}`);
      
      // Set state
      setPolicies(allPolicies);
      
      // Load policy statuses (with cache support)
      await loadPolicyStatuses(forceRefresh);
      
      console.log('✅ Reports data loaded successfully from Firebase');
      
    } catch (err) {
      console.error('❌ Error loading policies from Firebase:', err);
      setError('Error al cargar las pólizas: ' + err.message);
      toast.error('Error al cargar las pólizas');
    } finally {
      setIsLoading(false);
    }
  };

  // Load policy statuses from Firebase
  const loadPolicyStatuses = async (forceRefresh = false) => {
    try {
      setIsStatusLoading(true);
      if (forceRefresh) {
        console.log('🔄 Force refreshing policy statuses from Firebase...');
      } else {
        console.log('📊 Loading policy statuses (checking cache first)...');
      }
      
      const statuses = await firebaseReportsService.getPolicyStatuses(forceRefresh);
      
      // Also load estado_pago from policies themselves for conversion to renewal status
      const allPolicies = await firebaseReportsService.getAllPolicies(forceRefresh);
      const policyStatusesFromData = {};
      
      allPolicies.forEach(policy => {
        const policyKey = getPolicyKey(policy);
        if (policy.estado_pago) {
          policyStatusesFromData[policyKey] = policy.estado_pago;
        }
        if (policy.estado_renovacion) {
          policyStatusesFromData[`${policyKey}_renovacion`] = policy.estado_renovacion;
        }
      });
      
      // Merge Firebase statuses with policy data statuses
      const mergedStatuses = { ...statuses, ...policyStatusesFromData };
      setPolicyStatuses(mergedStatuses);
      
      console.log(`✅ Policy statuses loaded ${forceRefresh ? 'from Firebase' : '(from cache or Firebase)'}`);
      console.log(`📊 Loaded ${Object.keys(mergedStatuses).length} policy statuses`);
    } catch (err) {
      console.error('❌ Error loading policy statuses:', err);
      toast.error('Error al cargar estados de pólizas');
    } finally {
      setIsStatusLoading(false);
    }
  };

  const getPolicyCollectionName = (policy) => {
    const sourceTable = policy.sourceTable || policy.table;
    return sourceTable || mapDisplayNameToCollection(policy.ramo);
  };

  const patchPolicyInState = (policy, updateData) => {
    const matchesPolicy = (p) =>
      p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id;

    setFilteredPolicies((prev) =>
      prev.map((p) => (matchesPolicy(p) ? { ...p, ...updateData } : p)),
    );
    setPolicies((prev) =>
      prev.map((p) => (matchesPolicy(p) ? { ...p, ...updateData } : p)),
    );
    setSelectedPolicyForPayment((prev) =>
      prev && matchesPolicy(prev) ? { ...prev, ...updateData } : prev,
    );
  };

  const persistPolicyFields = async (collectionName, policyId, updateData) => {
    for (const [fieldName, fieldValue] of Object.entries(updateData)) {
      if (fieldName === 'estado_pago') {
        await firebaseReportsService.updatePolicyPaymentStatus(
          collectionName,
          policyId,
          fieldValue,
        );
      } else {
        await firebaseReportsService.updatePolicyField(
          collectionName,
          policyId,
          fieldName,
          fieldValue,
        );
      }
    }
  };

  const applyInstallmentUpdate = async (policy, paymentNumber, markAsPaid) => {
    if (!policy || !policy.ramo || !(policy.id || policy.firebase_doc_id)) {
      toast.error('Error: datos de póliza inválidos');
      return false;
    }

    const collectionName = getPolicyCollectionName(policy);
    if (collectionName === 'unknown') {
      toast.error('No se pudo mapear la colección de la póliza');
      return false;
    }

    const policyId = policy.id || policy.firebase_doc_id;
    const updateData = buildPartialPaymentUpdate(policy, paymentNumber, markAsPaid);
    const previousData = {
      pagos_realizados: policy.pagos_realizados,
      pago_actual: policy.pago_actual,
      fecha_proximo_pago: policy.fecha_proximo_pago,
      primer_pago_realizado: policy.primer_pago_realizado,
      estado_pago: policy.estado_pago,
    };

    patchPolicyInState(policy, updateData);

    const policyKey = getPolicyKey(policy);
    if (updateData.estado_pago) {
      setPolicyStatuses((prev) => ({
        ...prev,
        [policyKey]: updateData.estado_pago,
      }));
    }

    try {
      await persistPolicyFields(collectionName, policyId, updateData);
      const total = policy.total_pagos || calculateTotalPayments(policy.forma_pago);
      if (markAsPaid) {
        if (updateData.estado_pago === 'Pagado') {
          toast.success(
            `Póliza ${policy.numero_poliza}: todas las cuotas pagadas. Recordatorios detenidos.`,
          );
        } else {
          toast.success(
            `Cuota ${paymentNumber}/${total} marcada como pagada. Próxima: cuota ${updateData.pago_actual}.`,
          );
        }
      } else {
        toast.success(`Cuota ${paymentNumber}/${total} marcada como pendiente.`);
      }
      return true;
    } catch (err) {
      console.error('❌ Error updating installment:', err);
      patchPolicyInState(policy, previousData);
      toast.error('Error al actualizar la cuota');
      return false;
    }
  };

  // Function to map display names to collection names
  const mapDisplayNameToCollection = (displayName) => {
    if (!displayName) return 'unknown';
    
    const name = displayName.toString().toLowerCase();
    
    // Map display names to actual collection names
    if (name.includes('gastos') || name.includes('médicos') || name.includes('gmm')) return 'gmm';
    if (name.includes('auto') || name.includes('coche') || name.includes('carro')) return 'autos';
    if (name.includes('hogar') || name.includes('casa') || name.includes('vivienda') || name.includes('daños')) return 'hogar';
    if (name.includes('vida')) return 'vida';
    if (name.includes('responsabilidad') || name.includes('civil') || name.includes('rc')) return 'rc';
    if (name.includes('transporte')) return 'transporte';
    if (name.includes('mascota')) return 'mascotas';
    if (name.includes('diverso')) return 'diversos';
    if (name.includes('negocio')) return 'negocio';
    if (name.includes('grupo')) return 'gruposgmm';
    
    // If no match, return the original name in lowercase
    return name.replace(/\s+/g, '_').toLowerCase();
  };

  // Handle primer pago toggle for policies
  const handleTogglePrimerPago = async (policy) => {
    try {
      // Validate policy data
      if (!policy || !policy.ramo || !(policy.id || policy.firebase_doc_id)) {
        console.error('❌ Invalid policy data for primer pago toggle:', policy);
        toast.error('Error: datos de póliza inválidos');
        return;
      }

      const currentStatus = policy.primer_pago_realizado || false;
      const newStatus = !currentStatus;
      
      console.log(`🔄 Updating policy ${policy.numero_poliza} primer pago from ${currentStatus} to ${newStatus}`);
      
      const policyId = policy.id || policy.firebase_doc_id;
      const sourceTable = policy.sourceTable || policy.table;
      const collectionName = sourceTable || mapDisplayNameToCollection(policy.ramo);
      
      console.log(`🗂️ Policy source table: "${sourceTable}", ramo: "${policy.ramo}" -> collection: "${collectionName}"`);
      console.log(`📋 Policy ID: ${policyId}, Collection: ${collectionName}, New Primer Pago Status: ${newStatus}`);
      
      // Validate collection name exists
      if (collectionName === 'unknown') {
        console.error(`❌ Unknown collection mapping for sourceTable: "${sourceTable}", ramo: "${policy.ramo}"`);
        toast.error(`Error: No se pudo mapear la tabla "${sourceTable || policy.ramo}" a una colección válida`);
        return;
      }
      
      const isSinglePayment = isSinglePaymentForm(policy.forma_pago);
      const estadoPago = isSinglePayment ? (newStatus ? 'Pagado' : 'No Pagado') : undefined;
      patchPolicyInState(policy, {
        primer_pago_realizado: newStatus,
        ...(estadoPago ? { estado_pago: estadoPago } : {}),
      });

      await firebaseReportsService.updatePolicyField(collectionName, policyId, 'primer_pago_realizado', newStatus);

      if (isSinglePayment && estadoPago) {
        await firebaseReportsService.updatePolicyPaymentStatus(collectionName, policyId, estadoPago);
        const policyKey = getPolicyKey(policy);
        setPolicyStatuses((prev) => ({ ...prev, [policyKey]: estadoPago }));
      }
      
      const statusText = isSinglePayment
        ? (newStatus ? 'Pago Único ✓' : 'No Pagado')
        : (newStatus ? 'Primer Pago ✓' : 'No Pagado');
      
      toast.success(
        newStatus && isSinglePayment
          ? `Póliza ${policy.numero_poliza}: ${statusText}. Recordatorios detenidos.`
          : `Póliza ${policy.numero_poliza} actualizada a: ${statusText}`,
      );
      
    } catch (err) {
      console.error('❌ Error updating primer pago status:', err);
      toast.error('Error al actualizar el estado de primer pago');
      
      // Revert local state on error
      setFilteredPolicies(prevPolicies => 
        prevPolicies.map(p => 
          (p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id) 
            ? { ...p, primer_pago_realizado: policy.primer_pago_realizado || false } 
            : p
        )
      );
    }
  };

  // Handle policy expiration toggle (Vencido/Activo) - This is informational only
  const handleTogglePolicyExpiration = async (policy) => {
    // This is informational based on fecha_fin, but we can allow manual override
    try {
      if (!policy || !policy.ramo || !(policy.id || policy.firebase_doc_id)) {
        console.error('❌ Invalid policy data for expiration toggle:', policy);
        toast.error('Error: datos de póliza inválidos');
        return;
      }

      const currentOverride = policy.expiration_override || null;
      // Toggle: null -> 'activo' -> 'vencido' -> null
      let newOverride;
      if (currentOverride === null || currentOverride === undefined) {
        newOverride = 'activo';
      } else if (currentOverride === 'activo') {
        newOverride = 'vencido';
      } else {
        newOverride = null;
      }
      
      console.log(`🔄 Updating policy ${policy.numero_poliza} expiration override from ${currentOverride} to ${newOverride}`);
      
      const policyId = policy.id || policy.firebase_doc_id;
      const sourceTable = policy.sourceTable || policy.table;
      const collectionName = sourceTable || mapDisplayNameToCollection(policy.ramo);
      
      if (collectionName === 'unknown') {
        console.error(`❌ Unknown collection mapping for sourceTable: "${sourceTable}", ramo: "${policy.ramo}"`);
        toast.error(`Error: No se pudo mapear la tabla "${sourceTable || policy.ramo}" a una colección válida`);
        return;
      }
      
      // Update local state immediately for better UX
      setFilteredPolicies(prevPolicies => 
        prevPolicies.map(p => 
          (p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id) 
            ? { ...p, expiration_override: newOverride } 
            : p
        )
      );
      
      await firebaseReportsService.updatePolicyField(collectionName, policyId, 'expiration_override', newOverride);
      
      toast.success(`Estado de vencimiento actualizado`);
      
    } catch (err) {
      console.error('❌ Error updating expiration status:', err);
      toast.error('Error al actualizar el estado de vencimiento');
      
      // Revert local state on error
      setFilteredPolicies(prevPolicies => 
        prevPolicies.map(p => 
          (p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id) 
            ? { ...p, expiration_override: policy.expiration_override } 
            : p
        )
      );
    }
  };

  // Handle payment status toggle for policies
  const handleToggleStatus = async (policy) => {
    try {
      // Validate policy data
      if (!policy || !policy.ramo || !(policy.id || policy.firebase_doc_id)) {
        console.error('❌ Invalid policy data for status toggle:', policy);
        toast.error('Error: datos de póliza inválidos');
        return;
      }

      const currentStatus = getPolicyStatus(policy);
      const newStatus = currentStatus === 'Pagado' ? 'No Pagado' : 'Pagado';
      
      console.log(`🔄 Updating policy ${policy.numero_poliza} payment status from ${currentStatus} to ${newStatus}`);
      
      const policyId = policy.id || policy.firebase_doc_id;
      // Use sourceTable/table instead of ramo for collection mapping
      const sourceTable = policy.sourceTable || policy.table;
      const collectionName = sourceTable || mapDisplayNameToCollection(policy.ramo);
      
      console.log(`🗂️ Policy source table: "${sourceTable}", ramo: "${policy.ramo}" -> collection: "${collectionName}"`);
      console.log(`📋 Policy ID: ${policyId}, Collection: ${collectionName}, New Status: ${newStatus}`);
      
      // Validate collection name exists
      if (collectionName === 'unknown') {
        console.error(`❌ Unknown collection mapping for sourceTable: "${sourceTable}", ramo: "${policy.ramo}"`);
        toast.error(`Error: No se pudo mapear la tabla "${sourceTable || policy.ramo}" a una colección válida`);
        return;
      }
      
      // Update local state immediately for better UX
      setFilteredPolicies(prevPolicies => 
        prevPolicies.map(p => 
          (p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id) 
            ? { ...p, estado_pago: newStatus } 
            : p
        )
      );
      
      await firebaseReportsService.updatePolicyPaymentStatus(collectionName, policyId, newStatus);
      
      // Update local state
      const policyKey = getPolicyKey(policy);
      setPolicyStatuses(prev => ({
        ...prev,
        [policyKey]: newStatus
      }));
      
      toast.success(
        newStatus === 'Pagado'
          ? `Póliza ${policy.numero_poliza} actualizada a: ${newStatus}. Recordatorios automáticos detenidos.`
          : `Póliza ${policy.numero_poliza} actualizada a: ${newStatus}`
      );
      
    } catch (err) {
      console.error('❌ Error updating payment status:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Error al actualizar el estado de pago';
      
      if (err.message.includes('No se pudo conectar')) {
        errorMessage = 'No se pudo conectar con el servidor. Verifique que el servidor esté ejecutándose.';
      } else if (err.message.includes('API endpoint not found')) {
        errorMessage = 'Error del servidor: endpoint no encontrado. Contacte al administrador.';
      } else if (err.message.includes('Document with ID')) {
        errorMessage = 'Póliza no encontrada en la base de datos.';
      } else if (err.message.includes('Failed to update document')) {
        errorMessage = 'Error al actualizar en la base de datos.';
      }
      
      toast.error(errorMessage);
      
      // Revert local state on error
      setFilteredPolicies(prevPolicies => 
        prevPolicies.map(p => 
          (p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id) 
            ? { ...p, estado_pago: policy.estado_pago || 'No Pagado' } 
            : p
        )
      );
    }
  };

  // Handle CAP status toggle for policies
  const handleToggleCapStatus = async (policy) => {
    try {
      // Validate policy data
      if (!policy || !policy.ramo || !(policy.id || policy.firebase_doc_id)) {
        console.error('❌ Invalid policy data for CAP status toggle:', policy);
        toast.error('Error: datos de póliza inválidos');
        return;
      }

      const currentStatus = policy.estado_cap || 'Inactivo';
      const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';
      
      console.log(`🔄 Updating policy ${policy.numero_poliza} CAP status from ${currentStatus} to ${newStatus}`);
      
      // Update local state immediately for better UX
      setFilteredPolicies(prevPolicies => 
        prevPolicies.map(p => 
          (p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id) 
            ? { ...p, estado_cap: newStatus } 
            : p
        )
      );
      
      const policyId = policy.id || policy.firebase_doc_id;
      // Use sourceTable/table instead of ramo for collection mapping
      const sourceTable = policy.sourceTable || policy.table;
      const collectionName = sourceTable || mapDisplayNameToCollection(policy.ramo);
      
      console.log(`🗂️ Policy source table: "${sourceTable}", ramo: "${policy.ramo}" -> collection: "${collectionName}"`);
      console.log(`📋 Policy ID: ${policyId}, Collection: ${collectionName}, New CAP Status: ${newStatus}`);
      
      // Validate collection name exists
      if (collectionName === 'unknown') {
        console.error(`❌ Unknown collection mapping for sourceTable: "${sourceTable}", ramo: "${policy.ramo}"`);
        toast.error(`Error: No se pudo mapear la tabla "${sourceTable || policy.ramo}" a una colección válida`);
        return;
      }
      
      await firebaseReportsService.updatePolicyField(collectionName, policyId, 'estado_cap', newStatus);
      
      // Update local state
      const policyKey = getPolicyKey(policy);
      setPolicyStatuses(prev => ({
        ...prev,
        [`${policyKey}_cap`]: newStatus
      }));
      
      toast.success(`Póliza ${policy.numero_poliza} CAP actualizado a: ${newStatus}`);
      
    } catch (err) {
      console.error('❌ Error updating CAP status:', err);
      toast.error('Error al actualizar el estado CAP');
      
      // Revert local state on error
      setFilteredPolicies(prevPolicies => 
        prevPolicies.map(p => 
          (p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id) 
            ? { ...p, estado_cap: policy.estado_cap || 'Inactivo' } 
            : p
        )
      );
    }
  };

  // Handle CFP status toggle for policies
  const handleToggleCfpStatus = async (policy) => {
    try {
      // Validate policy data
      if (!policy || !policy.ramo || !(policy.id || policy.firebase_doc_id)) {
        console.error('❌ Invalid policy data for CFP status toggle:', policy);
        toast.error('Error: datos de póliza inválidos');
        return;
      }

      const currentStatus = policy.estado_cfp || 'Inactivo';
      const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';
      
      console.log(`🔄 Updating policy ${policy.numero_poliza} CFP status from ${currentStatus} to ${newStatus}`);
      
      // Update local state immediately for better UX
      setFilteredPolicies(prevPolicies => 
        prevPolicies.map(p => 
          (p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id) 
            ? { ...p, estado_cfp: newStatus } 
            : p
        )
      );
      
      const policyId = policy.id || policy.firebase_doc_id;
      // Use sourceTable/table instead of ramo for collection mapping
      const sourceTable = policy.sourceTable || policy.table;
      const collectionName = sourceTable || mapDisplayNameToCollection(policy.ramo);
      
      console.log(`🗂️ Policy source table: "${sourceTable}", ramo: "${policy.ramo}" -> collection: "${collectionName}"`);
      console.log(`📋 Policy ID: ${policyId}, Collection: ${collectionName}, New CFP Status: ${newStatus}`);
      
      // Validate collection name exists
      if (collectionName === 'unknown') {
        console.error(`❌ Unknown collection mapping for sourceTable: "${sourceTable}", ramo: "${policy.ramo}"`);
        toast.error(`Error: No se pudo mapear la tabla "${sourceTable || policy.ramo}" a una colección válida`);
        return;
      }
      
      await firebaseReportsService.updatePolicyField(collectionName, policyId, 'estado_cfp', newStatus);
      
      // Update local state
      const policyKey = getPolicyKey(policy);
      setPolicyStatuses(prev => ({
        ...prev,
        [`${policyKey}_cfp`]: newStatus
      }));
      
      toast.success(`Póliza ${policy.numero_poliza} CFP actualizado a: ${newStatus}`);
      
    } catch (err) {
      console.error('❌ Error updating CFP status:', err);
      toast.error('Error al actualizar el estado CFP');
      
      // Revert local state on error
      setFilteredPolicies(prevPolicies => 
        prevPolicies.map(p => 
          (p.id === policy.id || p.firebase_doc_id === policy.firebase_doc_id) 
            ? { ...p, estado_cfp: policy.estado_cfp || 'Inactivo' } 
            : p
        )
      );
    }
  };

  const matchesSearch = (value, term) => {
    if (!term.trim()) return true;
    if (value === null || value === undefined) return false;

    // Enhanced text normalization for mixed case handling
    const normalizeText = (text) => {
      return text.toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces
        .trim();
    };

    // Split search terms and remove empty strings
    const searchTerms = normalizeText(term)
      .split(/\s+/)
      .filter(Boolean);

    // Handle different value types and ensure case-insensitive matching
    let normalizedValue;
    if (value instanceof Date) {
      normalizedValue = normalizeText(formatDate(value));
    } else if (typeof value === 'object' && value !== null) {
      // For objects, try to stringify them
      try {
        normalizedValue = normalizeText(JSON.stringify(value));
      } catch {
        return false;
      }
    } else {
      normalizedValue = normalizeText(value.toString());
    }

    // Match if any of the search terms is found in the normalized value
    return searchTerms.some(term => normalizedValue.includes(term));
  };

  useEffect(() => {
    console.log('Initial data fetch starting...');
    loadPolicies();
  }, []);

  // Reload policies when team changes (so Michelle/CASIN gets CASIN data, not cached other team)
  const teamId = currentTeam?.id ?? userTeam?.id;
  useEffect(() => {
    if (!teamId) return;
    console.log('📊 Reports: team changed, reloading policies for team:', teamId);
    loadPolicies(true);
  }, [teamId]);

  // Add the policy update listener
  useEffect(() => {
    const handlePolicyUpdate = () => {
      console.log('Policy update detected, refreshing data...');
      loadPolicies();
    };

    window.addEventListener('policyDataUpdated', handlePolicyUpdate);
    return () => window.removeEventListener('policyDataUpdated', handlePolicyUpdate);
  }, []);

  useEffect(() => {
    if (!policies.length) return;

    console.log('Filtering policies...');
    console.log('Search term:', searchTerm);
    console.log('Selected month:', selectedMonth);
    console.log('Selected type:', selectedType);
    console.log('Total policies:', policies.length);
    
    // First, filter out invalid policies
    let filtered = policies.filter(policy => {
      const isValid = validatePolicy(policy);
      if (!isValid) {
        console.warn('⚠️ Skipping invalid policy:', policy);
      }
      return isValid;
    });
    
    // If there's a search term, only apply search filter
    if (searchTerm.trim()) {
      filtered = policies.filter(policy => {
        if (!policy) return false;

        return Object.entries(policy).some(([key, value]) => {
          if (typeof value === 'function' || 
              (typeof value === 'object' && value !== null && !(value instanceof Date))) {
            return false;
          }

          const isMatch = matchesSearch(value, searchTerm);
          if (isMatch) {
            console.log('Match found in field:', key, 'value:', value);
          }
          return isMatch;
        });
      });
    } else {
      // Only apply month and type filters if there's no search term
      if (selectedType === 'Vencimientos') {
        filtered = filtered.filter(policy => {
          if (isArchiveDeadPolicy(policy)) {
            return false;
          }
          const endDate = parseDate(policy.fecha_fin);
          if (!endDate) {
            console.warn('⚠️ Vencimientos: Skipping policy with invalid fecha_fin:', policy.numero_poliza, policy.fecha_fin);
            return false;
          }
          return endDate.getMonth() === selectedMonth;
        });
      } else if (selectedType === 'Pagos Parciales') {
        filtered = filtered.filter(policy => {
          const nextPaymentDate = parseDate(policy.fecha_proximo_pago);
          if (!nextPaymentDate) {
            // For annual policies, use fecha_fin instead of fecha_proximo_pago
            if (isSinglePaymentForm(policy.forma_pago) && policy.fecha_fin) {
              const endDate = parseDate(policy.fecha_fin);
              if (endDate) {
                console.log('ℹ️ Using fecha_fin for annual policy:', policy.numero_poliza);
                return endDate.getMonth() === selectedMonth;
              }
            }
            console.warn('⚠️ Pagos Parciales: Skipping policy with invalid fecha_proximo_pago:', policy.numero_poliza, policy.fecha_proximo_pago);
            return false;
          }
          return nextPaymentDate.getMonth() === selectedMonth;
        });
      } else if (selectedType === 'Vigentes') {
        const beforeVigentes = filtered.length;
        const activePolicies = filtered.filter(policy => !isPolicyExpired(policy));
        const expiredCount = beforeVigentes - activePolicies.length;
        console.log(`📋 Vigentes filter: total policies=${beforeVigentes}, vigentes=${activePolicies.length}, vencidas=${expiredCount}`);
        if (beforeVigentes > 0 && activePolicies.length === 0) {
          const sample = filtered.slice(0, 3).map(p => ({
            numero_poliza: p.numero_poliza,
            fecha_fin: p.fecha_fin,
            expiration_override: p.expiration_override,
            isExpired: isPolicyExpired(p)
          }));
          console.warn('⚠️ Vigentes: no hay pólizas vigentes. Muestra de pólizas (¿todas vencidas?):', sample);
        }
        filtered = [...activePolicies].sort((a, b) => {
          const dateA = parseDate(a.fecha_fin) || parseDate(a.fecha_inicio) || new Date(0);
          const dateB = parseDate(b.fecha_fin) || parseDate(b.fecha_inicio) || new Date(0);
          return dateB - dateA; // más reciente primero
        });
      } else if (selectedType === 'Vencidas') {
        filtered = [...filtered.filter(isRecentlyExpiredPolicy)].sort((a, b) => {
          const dateA = parseDate(a.fecha_fin) || new Date(0);
          const dateB = parseDate(b.fecha_fin) || new Date(0);
          return dateB - dateA;
        });
      } else if (selectedType === 'Archivo muerto') {
        filtered = [...filtered.filter(isArchiveDeadPolicy)].sort((a, b) => {
          const dateA = parseDate(a.fecha_fin) || new Date(0);
          const dateB = parseDate(b.fecha_fin) || new Date(0);
          return dateA - dateB;
        });
      }
    }

    // Pagos Parciales: solo vigentes (excluye archivo muerto y pólizas vencidas)
    if (selectedType === 'Pagos Parciales') {
      filtered = filtered.filter((policy) => !isPolicyExpired(policy));
    }

    console.log('Filtered policies count:', filtered.length);
    console.log('Filtered policies:', filtered.map(p => ({
      numero_poliza: p.numero_poliza,
      fecha_fin: p.fecha_fin,
      fecha_proximo_pago: p.fecha_proximo_pago,
      type: selectedType,
      searchApplied: !!searchTerm.trim()
    })));

    setFilteredPolicies(filtered);
  }, [selectedMonth, selectedType, policies, searchTerm]);

  const toggleCardExpansion = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handlePolicyClick = (policy) => {
    console.log('📋 POLICY CLICK HANDLER CALLED!');
    console.log('📋 Policy clicked! Opening preview for:', policy.numero_poliza || policy.policy_number);
    console.log('📋 Policy data:', policy);
    console.log('📋 Setting selectedPolicy and showPolicyModal to true');
    setSelectedPolicy(policy);
    setShowPolicyModal(true);
    console.log('📋 Modal state should now be open');
  };

  const handleClosePolicyModal = () => {
    setShowPolicyModal(false);
    setSelectedPolicy(null);
  };

  // Get payment status for a policy
  const getPolicyStatus = (policy) => {
    const policyKey = getPolicyKey(policy);
    return policyStatuses[policyKey] || 'No Pagado';
  };

  const getLastPaymentReminderLabel = (policy) => {
    const log = policy?.payment_reminders_log;
    if (!Array.isArray(log) || log.length === 0) return null;
    const last = log[log.length - 1];
    if (!last?.sentAt) return null;
    const date = new Date(last.sentAt);
    if (Number.isNaN(date.getTime())) return null;
    const when = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `Recordatorio ${when}`;
  };

  // Get renewal status for a policy
  const getPolicyRenewalStatus = (policy) => {
    const policyKey = getPolicyKey(policy);
    
    console.log(`🔍 Getting renewal status for policy ${policy.numero_poliza}:`, {
      policyKey,
      renewalStatus: policyStatuses[`${policyKey}_renovacion`],
      policyRenewalStatus: policy.estado_renovacion,
      paymentStatus: policyStatuses[policyKey],
      policyPaymentStatus: policy.estado_pago
    });
    
    // First check if we have a specific renewal status
    if (policyStatuses[`${policyKey}_renovacion`] || policy.estado_renovacion) {
      return policyStatuses[`${policyKey}_renovacion`] || policy.estado_renovacion;
    }
    
    // If no renewal status exists, convert from existing payment status
    const paymentStatus = policyStatuses[policyKey] || policy.estado_pago;
    if (paymentStatus === 'Pagado') {
      console.log(`✅ Converting Pagado to Renovado for policy ${policy.numero_poliza}`);
      return 'Renovado';
    } else if (paymentStatus === 'No Pagado') {
      console.log(`✅ Converting No Pagado to No Renovado for policy ${policy.numero_poliza}`);
      return 'No Renovado';
    }
    
    // Default fallback
    console.log(`⚠️ Using default No Renovado for policy ${policy.numero_poliza}`);
    return 'No Renovado';
  };

  // Open payment modal for partial payments
  const handleOpenPaymentModal = (policy) => {
    console.log('🔍 Opening payment modal for policy:', policy.numero_poliza);
    setSelectedPolicyForPayment(policy);
    setShowPaymentModal(true);
  };

  const getNextDueInstallmentNumber = (policy) => {
    const total = policy.total_pagos || calculateTotalPayments(policy.forma_pago);
    for (let i = 1; i <= total; i += 1) {
      if (!isInstallmentPaid(policy.pagos_realizados, i)) return i;
    }
    return null;
  };

  // Handle payment checkbox toggle in modal (cualquier cuota)
  const handlePaymentCheckToggle = async (policy, paymentNumber) => {
    const markAsPaid = !isInstallmentPaid(policy.pagos_realizados, paymentNumber);
    await applyInstallmentUpdate(policy, paymentNumber, markAsPaid);
  };

  // Validate and clean policy data - simplified for matrix
  const validatePolicy = (policy) => {
    if (!policy) {
      console.warn('⚠️ Null/undefined policy found');
      return false;
    }
    
    if (!(policy.id || policy.firebase_doc_id || policy.docId)) {
      console.warn('⚠️ Policy without valid ID:', policy.numero_poliza || 'Unknown');
      return false;
    }
    
    if (!(policy.numero_poliza || policy.policy_number)) {
      console.warn('⚠️ Policy without policy number:', policy.id || policy.firebase_doc_id);
      return false;
    }
    
    // Additional validation for dates
    if (policy.fecha_fin && !parseDate(policy.fecha_fin)) {
      console.warn('⚠️ Policy with invalid fecha_fin:', policy.numero_poliza, policy.fecha_fin);
      // Don't reject the policy, just warn
    }
    
    if (policy.fecha_proximo_pago && !parseDate(policy.fecha_proximo_pago)) {
      console.warn('⚠️ Policy with invalid fecha_proximo_pago:', policy.numero_poliza, policy.fecha_proximo_pago);
      // Don't reject the policy, just warn
    }
    
    return true;
  };

  // Normaliza nombres de aseguradoras
  const normalizeCompany = (name) => {
    if (!name) return '';
    const n = name.toString().toLowerCase();
    if (n.includes('qualitas') || n.includes('quálitas') || n.includes('quálitas compañía de seguros')) return 'Qualitas';
    if (n.includes('gnp') || n.includes('grupo nacional provincial') || n.includes('grupo nacional provincial s.a.b')) return 'GNP';
    if (n.includes('hdi')) return 'HDI';
    if (n.includes('plan seguro')) return 'Plan Seguro';
    if (n.includes('sura')) return 'SURA';
    return name.trim();
  };
  // Normaliza nombres de ramos
  const normalizeRamo = (ramo) => {
    if (!ramo) return '';
    const n = ramo.toString().toLowerCase();
    if (n.includes('hogar') || n.includes('daños')) return 'Hogar';
    if (n.includes('gmm') || n.includes('gastos médicos')) return 'GMM';
    if (n.includes('automóvil') || n.includes('auto') || n.includes('motor') || n.includes('amplia póliza')) return 'Autos';
    return ramo.trim();
  };

  /** Pólizas ya vencidas: no mostrar próximo pago en tabla/tarjetas */
  const hideProximoPagoInReport =
    selectedType === 'Archivo muerto' || selectedType === 'Vencidas';

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>Reportes</h2>
        <div className="reports-controls">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar en todas las pólizas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              title={viewMode === 'table' ? 'Ver como tarjetas' : 'Ver como tabla'}
            >
              {viewMode === 'table' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="4" y="4" width="7" height="7" />
                  <rect x="13" y="4" width="7" height="7" />
                  <rect x="4" y="13" width="7" height="7" />
                  <rect x="13" y="13" width="7" height="7" />
                </svg>
              )}
            </button>
          </div>
          {!searchTerm.trim() && (
            <div className="filters">
              <select
                className="filter-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                {REPORT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {!REPORT_TYPES_WITHOUT_MONTH.has(selectedType) && (
                <select
                  className="filter-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
              )}
            </div>
          )}

        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="loading-message">
          Cargando datos...
        </div>
      ) : isStatusLoading ? (
        <div className="loading-message">Cargando estados de pólizas...</div>
      ) : (
        <div className={`reports-layout ${(selectedType === 'Vencimientos' && showGraphicsPanel) || (selectedType === 'Matriz de Productos' && showMatrixGraphics) ? 'with-graphics' : 'no-graphics'}`}>
          {/* Left Panel - Main Reports Content */}
                      <div className={`reports-left-panel ${(selectedType === 'Vencimientos' && showGraphicsPanel) || (selectedType === 'Matriz de Productos' && showMatrixGraphics) ? 'with-right-panel' : 'full-width'}`}>
            <div className={viewMode === 'table' ? 'table-container' : 'cards-grid'}>
          {selectedType === 'Matriz de Productos' ? (
            <div className="matrix-container">
              <div className="matrix-section">
                <h3 className="matrix-title">Matriz de Productos</h3>
                
                {filteredPolicies.length === 0 ? (
                  <div className="matrix-no-data">
                    <div className="no-data-message">
                      <h4>No hay pólizas disponibles</h4>
                    </div>
                  </div>
                ) : (
                  (() => {
                    // Extraer datos únicos de las pólizas filtradas usando nombres normalizados
                    const clients = [...new Set(filteredPolicies.map(p => p.contratante || p.nombre_contratante).filter(Boolean))].sort();
                    const ramos = [...new Set(filteredPolicies.map(p => normalizeRamo(p.sourceTable || p.table || p.ramo || '')).filter(Boolean))].sort();
                    const companies = [...new Set(filteredPolicies.map(p => normalizeCompany(p.aseguradora)).filter(Boolean))].sort();
                    
                    return (
                      <table className="reports-table matrix-table">
                        <thead>
                          <tr>
                            <th className="client-header">Cliente</th>
                            {ramos.map(ramo => (
                              <th key={ramo} className="ramo-header">{ramo}</th>
                            ))}
                            {companies.map(company => (
                              <th key={company} className="company-header">{company}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {clients.map(client => {
                            const clientPolicies = filteredPolicies.filter(p => (p.contratante || p.nombre_contratante) === client);
                            const clientRamos = [...new Set(clientPolicies.map(p => normalizeRamo(p.sourceTable || p.table || p.ramo || '')))];
                            const clientCompanies = [...new Set(clientPolicies.map(p => normalizeCompany(p.aseguradora)))];
                            
                            return (
                              <tr key={client}>
                                <td className="client-name">{client}</td>
                                
                                {/* Columnas de Ramos */}
                                {ramos.map(ramo => {
                                  const hasRamo = clientRamos.includes(ramo);
                                  return (
                                    <td key={`${client}-ramo-${ramo}`} className={`${hasRamo ? 'has-policy' : 'no-policy'} ramo-cell`}>
                                      {hasRamo ? '✓' : '×'}
                                    </td>
                                  );
                                })}
                                
                                {/* Columnas de Aseguradoras */}
                                {companies.map(company => {
                                  const hasCompany = clientCompanies.includes(company);
                                  return (
                                    <td key={`${client}-company-${company}`} className={`${hasCompany ? 'has-policy' : 'no-policy'} company-cell`}>
                                      {hasCompany ? '✓' : '×'}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()
                )}
              </div>
            </div>
          ) : (
            filteredPolicies.length === 0 ? (
              <div className="no-data">
                No se encontraron pólizas
              </div>
            ) : viewMode === 'table' ? (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Ramo</th>
                    <th>Póliza</th>
                    <th>Contratante</th>
                    <th>Email</th>
                    <th>Aseguradora</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Fin</th>
                    <th>Prima Total</th>
                    {selectedType === 'Pagos Parciales' && <th>Pago Parcial</th>}
                    <th>Forma de Pago</th>
                    {selectedType === 'Pagos Parciales' && <th>Pagos</th>}
                    {!hideProximoPagoInReport && <th>Próximo Pago</th>}
                    <th>Vencimiento</th>
                    {selectedType === 'Vencimientos' && <th>Cuota / Pago</th>}
                    {(['Vigentes', 'Vencidas', 'Archivo muerto'].includes(selectedType)) && <th>Estado Pago</th>}
                    <th>CAP</th>
                    <th>CFP</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.map((policy, index) => (
                      <tr 
                        key={`${policy.id || policy.firebase_doc_id || index}-${policy.numero_poliza}`}
                        className={`clickable-row ${isArchiveDeadPolicy(policy) ? 'archive-dead-policy' : ''} ${isPolicyExpired(policy) && !isArchiveDeadPolicy(policy) ? 'expired-policy' : ''}`}
                        onClick={(e) => {
                          console.log('📋 CLICK DETECTED! Row clicked for policy:', policy.numero_poliza);
                          e.preventDefault();
                          handlePolicyClick(policy);
                        }}
                        onMouseEnter={() => console.log('📋 Mouse entered row:', policy.numero_poliza)}
                        title="CLICK AQUÍ para ver detalles completos de la póliza"
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: '#f8fafc',
                          transition: 'all 0.2s'
                        }}
                      >
                        <td>{policy.ramo}</td>
                        <td>{policy.numero_poliza}</td>
                        <td>{policy.contratante || policy.nombre_contratante}</td>
                        <td>{policy.email || 'No disponible'}</td>
                        <td>{policy.aseguradora}</td>
                        <td>{formatDate(policy.fecha_inicio, dateFormat)}</td>
                        <td>
                          {formatDate(policy.fecha_fin, dateFormat)}
                          {isArchiveDeadPolicy(policy) && (
                            <span className="archive-indicator" title={`Archivo muerto: vencida hace más de ${ARCHIVE_DEAD_MONTHS} meses`}>
                              📦 ARCHIVO
                            </span>
                          )}
                          {isPolicyExpired(policy) && !isArchiveDeadPolicy(policy) && (
                            <span className="expired-indicator" title="Póliza vencida (reciente)">
                              ⚠️ VENCIDA
                            </span>
                          )}
                          {selectedType === 'Vencimientos' &&
                            isPorVencerProximosMeses(policy) &&
                            !isPolicyExpired(policy) && (
                              <span
                                className="por-vencer-indicator"
                                title={`Por vencer: fin de vigencia en los próximos ${POR_VENCER_MESES} meses`}
                              >
                                POR VENCER
                              </span>
                            )}
                        </td>
                        <td>${getPolicyTotalAmount(policy)?.toLocaleString() || '0'}</td>
                        {selectedType === 'Pagos Parciales' && (
                          <td>
                            {hasPartialPayments(policy.forma_pago) 
                              ? `$${policy.pago_parcial?.toLocaleString() || '0'}`
                              : `$${getPolicyTotalAmount(policy)?.toLocaleString() || '0'}`
                            }
                          </td>
                        )}
                        <td>{policy.forma_pago}</td>
                        {selectedType === 'Pagos Parciales' && hasPartialPayments(policy.forma_pago) && (
                          <td>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPaymentModal(policy);
                              }}
                              className={`installment-progress-btn ${getPartialPaymentProgressStyle(policy)}`}
                              title="Ver y marcar pagos"
                            >
                              {getPartialPaymentProgressLabel(policy)}
                            </button>
                          </td>
                        )}
                        {selectedType === 'Pagos Parciales' && !hasPartialPayments(policy.forma_pago) && (
                          <td>
                            <span className="annual-payment-indicator">Pago Único</span>
                          </td>
                        )}
                        {!hideProximoPagoInReport && (
                          <td>
                            {policy.fecha_proximo_pago 
                              ? formatDate(policy.fecha_proximo_pago, dateFormat) 
                              : (hasPartialPayments(policy.forma_pago) 
                                  ? 'N/A' 
                                  : (policy.fecha_fin ? formatDate(policy.fecha_fin, dateFormat) : 'N/A')
                                )
                            }
                          </td>
                        )}
                        <td>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePolicyExpiration(policy);
                            }}
                            className={`status-toggle ${isPolicyExpired(policy) ? 'vencido' : 'activo'}`}
                          >
                            {isPolicyExpired(policy) ? 'Vencido' : 'Activo'}
                          </button>
                        </td>
                        {selectedType === 'Vencimientos' && (
                          <td>
                            {hasPartialPayments(policy.forma_pago) ? (
                              <div className="payment-status-cell">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPaymentModal(policy);
                                  }}
                                  className={`installment-progress-btn ${getPartialPaymentProgressStyle(policy)}`}
                                  title="Ver y marcar pagos"
                                >
                                  {getPartialPaymentProgressLabel(policy)}
                                </button>
                                {getLastPaymentReminderLabel(policy) && (
                                  <span
                                    className="payment-reminder-badge"
                                    title={
                                      policy.payment_reminders_log?.[
                                        policy.payment_reminders_log.length - 1
                                      ]?.reminderType || 'Recordatorio enviado'
                                    }
                                  >
                                    {getLastPaymentReminderLabel(policy)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePrimerPago(policy);
                                }}
                                className={`status-toggle ${policy.primer_pago_realizado ? 'pagado' : 'no-pagado'}`}
                              >
                                {policy.primer_pago_realizado ? 'Pago Único ✓' : 'No Pagado'}
                              </button>
                            )}
                          </td>
                        )}
                        {['Vigentes', 'Vencidas', 'Archivo muerto'].includes(selectedType) && (
                          <td>
                            <div className="payment-status-cell">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(policy);
                                }}
                                className={`status-toggle ${getPolicyStatus(policy).toLowerCase().replace(' ', '-')}`}
                              >
                                {getPolicyStatus(policy)}
                              </button>
                              {getLastPaymentReminderLabel(policy) && (
                                <span
                                  className="payment-reminder-badge"
                                  title={policy.payment_reminders_log?.[policy.payment_reminders_log.length - 1]?.reminderType || 'Recordatorio enviado'}
                                >
                                  {getLastPaymentReminderLabel(policy)}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        <td>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCapStatus(policy);
                            }}
                            className={`status-toggle cap-toggle ${
                              (policy.estado_cap === 'Activo') ? 'cap-active' : 'cap-inactive'
                            }`}
                            title="Cambiar estado CAP"
                          >
                            CAP
                          </button>
                        </td>
                        <td>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleCfpStatus(policy);
                            }}
                            className={`status-toggle cfp-toggle ${
                              (policy.estado_cfp === 'Activo') ? 'cfp-active' : 'cfp-inactive'
                            }`}
                            title="Cambiar estado CFP"
                          >
                            CFP
                          </button>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              filteredPolicies.map(policy => (
                <div 
                  key={`${policy.id}-${policy.numero_poliza}`} 
                  className={`report-card ${expandedCards[`${policy.id}-${policy.numero_poliza}`] ? 'expanded' : ''} ${isArchiveDeadPolicy(policy) ? 'archive-dead-policy' : ''} ${isPolicyExpired(policy) && !isArchiveDeadPolicy(policy) ? 'expired-policy' : ''}`}
                  onClick={() => toggleCardExpansion(`${policy.id}-${policy.numero_poliza}`)}
                >
                  <div className="card-actions">
                    <button 
                      className="view-details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePolicyClick(policy);
                      }}
                      title="Ver todos los detalles de la póliza"
                    >
                      👁️ Ver Detalles
                    </button>
                  </div>
                  <div className="card-header">
                    <div className="card-header-content">
                      <div className="card-header-details">
                        <span className="policy-ramo">{policy.ramo}</span>
                        <span className="report-type">{policy.aseguradora}</span>
                      </div>
                      <h3>{policy.numero_poliza}</h3>
                    </div>
                    <div className="card-status-buttons">
                      <div className="payment-status-cell">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(policy);
                          }}
                          className={`status-toggle ${getPolicyStatus(policy).toLowerCase().replace(' ', '-')}`}
                        >
                          {getPolicyStatus(policy)}
                        </button>
                        {getLastPaymentReminderLabel(policy) && (
                          <span className="payment-reminder-badge">
                            {getLastPaymentReminderLabel(policy)}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCapStatus(policy);
                        }}
                        className={`status-toggle cap-toggle ${
                          (policy.estado_cap === 'Activo') ? 'cap-active' : 'cap-inactive'
                        }`}
                        title="Cambiar estado CAP"
                      >
                        CAP
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCfpStatus(policy);
                        }}
                        className={`status-toggle cfp-toggle ${
                          (policy.estado_cfp === 'Activo') ? 'cfp-active' : 'cfp-inactive'
                        }`}
                        title="Cambiar estado CFP"
                      >
                        CFP
                      </button>
                    </div>
                  </div>
                  <div className="card-content">
                    <div className="card-info">
                      <strong>Contratante: {policy.contratante || policy.nombre_contratante}</strong>
                    </div>
                    <div className="card-details">
                      {!expandedCards[`${policy.id}-${policy.numero_poliza}`] ? (
                        <>
                          <p>
                            <span>Vencimiento:</span> {formatDate(policy.fecha_fin)}
                            {isArchiveDeadPolicy(policy) && (
                              <span className="archive-indicator" title={`Archivo muerto: vencida hace más de ${ARCHIVE_DEAD_MONTHS} meses`}>
                                📦 ARCHIVO
                              </span>
                            )}
                            {isPolicyExpired(policy) && !isArchiveDeadPolicy(policy) && (
                              <span className="expired-indicator" title="Póliza vencida (reciente)">
                                ⚠️ VENCIDA
                              </span>
                            )}
                            {selectedType === 'Vencimientos' &&
                              isPorVencerProximosMeses(policy) &&
                              !isPolicyExpired(policy) && (
                                <span
                                  className="por-vencer-indicator"
                                  title={`Por vencer: fin de vigencia en los próximos ${POR_VENCER_MESES} meses`}
                                >
                                  POR VENCER
                                </span>
                              )}
                          </p>
                          <p><span>Prima Total:</span> ${getPolicyTotalAmount(policy)?.toLocaleString() || '0'}</p>
                          <p><span>Forma de Pago:</span> {policy.forma_pago}</p>
                        </>
                      ) : (
                        <>
                          <p><span>Email:</span> {policy.email || 'No disponible'}</p>
                          <p><span>RFC:</span> {policy.rfc || 'No disponible'}</p>
                          <p><span>Asegurado:</span> {policy.asegurado || 'No disponible'}</p>
                          <p><span>Inicio:</span> {formatDate(policy.fecha_inicio)}</p>
                          <p>
                            <span>Vencimiento:</span> {formatDate(policy.fecha_fin)}
                            {isArchiveDeadPolicy(policy) && (
                              <span className="archive-indicator" title={`Archivo muerto: vencida hace más de ${ARCHIVE_DEAD_MONTHS} meses`}>
                                📦 ARCHIVO
                              </span>
                            )}
                            {isPolicyExpired(policy) && !isArchiveDeadPolicy(policy) && (
                              <span className="expired-indicator" title="Póliza vencida (reciente)">
                                ⚠️ VENCIDA
                              </span>
                            )}
                            {selectedType === 'Vencimientos' &&
                              isPorVencerProximosMeses(policy) &&
                              !isPolicyExpired(policy) && (
                                <span
                                  className="por-vencer-indicator"
                                  title={`Por vencer: fin de vigencia en los próximos ${POR_VENCER_MESES} meses`}
                                >
                                  POR VENCER
                                </span>
                              )}
                          </p>
                          <p><span>Forma de Pago:</span> {policy.forma_pago}</p>
                          <div className="card-section">
                            <h4>Información de Pagos</h4>
                            <p><span>Prima Neta:</span> ${policy.prima_neta?.toLocaleString() || '0'}</p>
                            <p><span>Derecho de Póliza:</span> ${policy.derecho_poliza?.toLocaleString() || '0'}</p>
                            <p><span>Recargo por Pago Fraccionado:</span> ${policy.recargo_pago_fraccionado?.toLocaleString() || '0'}</p>
                            <p><span>IVA:</span> ${policy.iva?.toLocaleString() || '0'}</p>
                            <p className="card-amount"><span>Prima Total:</span> ${getPolicyTotalAmount(policy)?.toLocaleString() || '0'}</p>
                            {policy.pagos_fraccionados && (
                              <p><span>Pagos Fraccionados:</span> {policy.pagos_fraccionados}</p>
                            )}
                            {selectedType === 'Pagos Parciales' && policy.pago_parcial && (
                              <p><span>Pago Parcial:</span> ${policy.pago_parcial?.toLocaleString()}</p>
                            )}
                            {!hideProximoPagoInReport && (
                              <p><span>Próximo Pago:</span> {
                                policy.fecha_proximo_pago 
                                  ? formatDate(policy.fecha_proximo_pago) 
                                  : (hasPartialPayments(policy.forma_pago) 
                                      ? 'N/A' 
                                      : (policy.fecha_fin ? formatDate(policy.fecha_fin) : 'N/A')
                                    )
                              }</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="card-footer">
                    <button className="expand-btn">
                      {expandedCards[`${policy.id}-${policy.numero_poliza}`] ? '−' : '+'}
                    </button>
                  </div>
                </div>
              ))
            )
          )}
            </div>
          </div>
          
          {/* Graphics Control Button - Always visible for Vencimientos and Matrix */}
          {(selectedType === 'Vencimientos' || selectedType === 'Matriz de Productos') && (
            <div className="graphics-control-container">
              <button
                className={`unified-graphics-btn ${(selectedType === 'Vencimientos' && showGraphicsPanel) || (selectedType === 'Matriz de Productos' && showMatrixGraphics) ? 'active' : ''}`}
                onClick={() => {
                  if (selectedType === 'Vencimientos') {
                    setShowGraphicsPanel(!showGraphicsPanel);
                  } else if (selectedType === 'Matriz de Productos') {
                    setShowMatrixGraphics(!showMatrixGraphics);
                  }
                  setIsRightPanelCollapsed(false); // Reset collapse state
                }}
                title={
                  selectedType === 'Vencimientos' 
                    ? (showGraphicsPanel ? 'Ocultar gráficos' : 'Mostrar gráficos')
                    : (showMatrixGraphics ? 'Ocultar gráficos' : 'Mostrar gráficos')
                }
              >
                {((selectedType === 'Vencimientos' && showGraphicsPanel) || (selectedType === 'Matriz de Productos' && showMatrixGraphics)) ? (
                  <span>×</span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M3 3v18h18M8 17l4-4 4 4 6-6" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Right Panel - Graphics for Vencimientos */}
          {selectedType === 'Vencimientos' && showGraphicsPanel && (
            <div className="reports-right-panel">
              <VencimientosGraphics
                policies={policies}
                timeView={graphicsTimeView}
                onTimeViewChange={setGraphicsTimeView}
              />
            </div>
          )}

          {/* Right Panel - Graphics for Matrix */}
          {selectedType === 'Matriz de Productos' && showMatrixGraphics && (
            <div className="reports-right-panel">
              <MatrixGraphics
                policies={policies}
                uniqueRamos={uniqueRamos}
                uniqueCompanies={uniqueCompanies}
              />
            </div>
          )}
        </div>
      )}

      {/* Policy Details Modal */}
      {console.log('📋 MODAL RENDER CHECK:', { showPolicyModal, selectedPolicy: !!selectedPolicy })}
      {showPolicyModal && selectedPolicy && (
        <div className="policy-modal-overlay" onClick={handleClosePolicyModal}>
          <div className="policy-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="policy-modal-header">
              <h3>Detalles Completos de la Póliza</h3>
              <div className="policy-modal-title">
                <span className="policy-number">{selectedPolicy.numero_poliza}</span>
                <span className="policy-ramo">{selectedPolicy.ramo}</span>
              </div>
              <button 
                className="close-policy-modal-btn"
                onClick={handleClosePolicyModal}
              >
                ×
              </button>
            </div>
            <div className="policy-modal-body">
              <div className="policy-details-grid">
                {Object.entries(selectedPolicy)
                  .filter(([key, value]) => 
                    value !== null && 
                    value !== undefined && 
                    value !== '' && 
                    typeof value !== 'function' &&
                    !['id', 'firebase_doc_id'].includes(key)
                  )
                  .sort(([a], [b]) => {
                    // Priority order for important fields
                    const priority = [
                      'numero_poliza', 'ramo', 'aseguradora', 
                      'contratante', 'nombre_contratante', 'asegurado',
                      'email', 'rfc', 'telefono',
                      'fecha_inicio', 'fecha_fin', 'fecha_expedicion',
                      'forma_pago', 'fecha_proximo_pago',
                      'prima_neta', 'prima_total', 'derecho_poliza', 'iva', 'pago_total_o_prima_total',
                      'status', 'estado_pago'
                    ];
                    const aIndex = priority.indexOf(a);
                    const bIndex = priority.indexOf(b);
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return a.localeCompare(b);
                  })
                  .map(([key, value]) => {
                    // Format field names for display
                    const formatFieldName = (fieldName) => {
                      return fieldName
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase())
                        .replace(/Rfc/g, 'RFC')
                        .replace(/Iva/g, 'IVA')
                        .replace(/Gmm/g, 'GMM');
                    };

                    // Format values for display
                    const formatValue = (val) => {
                      if (val === null || val === undefined) return 'N/A';
                      
                      // Handle dates
                      if (key.includes('fecha') || key.includes('date')) {
                        try {
                          const date = parseDate(val);
                          return date ? formatDate(date, dateFormat) : val.toString();
                        } catch {
                          return val.toString();
                        }
                      }
                      
                      // Handle monetary values
                      if (key.includes('prima') || key.includes('pago') || key.includes('derecho') || 
                          key.includes('total') || key.includes('iva') || key.includes('recargo') ||
                          key.includes('importe') || key.includes('monto')) {
                        const numValue = typeof val === 'string' ? 
                          parseFloat(val.replace(/[\s,$"]/g, '')) : 
                          parseFloat(val);
                        if (!isNaN(numValue) && numValue > 0) {
                          return `$${numValue.toLocaleString()}`;
                        }
                      }
                      
                      // Handle boolean values
                      if (typeof val === 'boolean') {
                        return val ? 'Sí' : 'No';
                      }
                      
                      // Handle objects
                      if (typeof val === 'object') {
                        try {
                          return JSON.stringify(val, null, 2);
                        } catch {
                          return val.toString();
                        }
                      }
                      
                      return val.toString();
                    };

                    const isImportantField = [
                      'numero_poliza', 'ramo', 'aseguradora', 'contratante', 
                      'email', 'pago_total_o_prima_total', 'status'
                    ].includes(key);

                    return (
                      <div 
                        key={key} 
                        className={`policy-detail-item ${isImportantField ? 'important' : ''}`}
                      >
                        <div className="policy-field-name">
                          {formatFieldName(key)}
                        </div>
                        <div className="policy-field-value">
                          {formatValue(value)}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            <div className="policy-modal-footer">
              <div className="policy-modal-info">
                <span>Total de campos: {Object.keys(selectedPolicy).length}</span>
                <span>Origen: {selectedPolicy.sourceTable || selectedPolicy.table || 'Firebase'}</span>
              </div>
              <button 
                className="close-policy-modal-btn-footer"
                onClick={handleClosePolicyModal}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal for Partial Payments */}
      {showPaymentModal && selectedPolicyForPayment && (() => {
        const totalInstallments =
          selectedPolicyForPayment.total_pagos ||
          calculateTotalPayments(selectedPolicyForPayment.forma_pago);
        const { paid, total } = getPartialPaymentProgress(selectedPolicyForPayment);
        const nextDue = getNextDueInstallmentNumber(selectedPolicyForPayment);
        const progressPct = total > 0 ? Math.round((paid / total) * 100) : 0;

        return (
          <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
            <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
              <div className="payment-modal-header">
                <div className="payment-modal-header__text">
                  <h3>Pagos · {selectedPolicyForPayment.numero_poliza}</h3>
                  <p className="payment-modal-subtitle">
                    {selectedPolicyForPayment.contratante || selectedPolicyForPayment.nombre_contratante}
                    {' · '}
                    {selectedPolicyForPayment.forma_pago}
                  </p>
                </div>
                <button
                  type="button"
                  className="payment-modal-close"
                  onClick={() => setShowPaymentModal(false)}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>

              <div className="payment-modal-body">
                <div className="payment-modal-summary">
                  <div className="payment-modal-summary__top">
                    <span className={`installment-progress-btn large ${getPartialPaymentProgressStyle(selectedPolicyForPayment)}`}>
                      {paid}/{total}
                    </span>
                    <div className="payment-modal-summary__meta">
                      <span>{paid} de {total} pagos realizados</span>
                      {selectedPolicyForPayment.pago_parcial != null &&
                        selectedPolicyForPayment.pago_parcial !== '' && (
                        <span>
                          $
                          {parseFloat(
                            String(selectedPolicyForPayment.pago_parcial).replace(/,/g, ''),
                          ).toLocaleString()}{' '}
                          por pago
                        </span>
                      )}
                      {selectedPolicyForPayment.fecha_proximo_pago && (
                        <span>
                          Próximo: {formatDate(selectedPolicyForPayment.fecha_proximo_pago, dateFormat)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="payment-progress-track" aria-hidden="true">
                    <div
                      className="payment-progress-fill"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                <p className="payment-modal-hint">
                  Marca cada cuota al recibir el pago. El contador en la tabla muestra cuántas llevas ({paid}/{total}).
                </p>

                <div className="payment-checklist">
                  {Array.from({ length: totalInstallments }).map((_, index) => {
                    const paymentNumber = index + 1;
                    const isPaid = isInstallmentPaid(
                      selectedPolicyForPayment.pagos_realizados,
                      paymentNumber,
                    );
                    const paidOn = selectedPolicyForPayment.pagos_realizados?.find(
                      (p) => Number(p.numero) === paymentNumber,
                    )?.fecha;
                    const dueOn = computeInstallmentDueDate(
                      selectedPolicyForPayment,
                      paymentNumber,
                    );
                    const isNext = !isPaid && paymentNumber === nextDue;
                    const dueDateObj = dueOn ? parseDate(dueOn) : null;
                    const isOverdue =
                      !isPaid &&
                      dueDateObj &&
                      dueDateObj < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <label
                        key={paymentNumber}
                        className={`payment-item ${isPaid ? 'paid' : isOverdue ? 'overdue' : 'unpaid'} ${isNext ? 'next-due' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={isPaid}
                          onChange={() =>
                            handlePaymentCheckToggle(selectedPolicyForPayment, paymentNumber)
                          }
                        />
                        <span className="payment-item__main">
                          <span className="payment-number">Cuota {paymentNumber}</span>
                          {isNext && <span className="payment-badge next">Próxima</span>}
                          {isPaid && <span className="payment-badge paid">Pagada</span>}
                          {isOverdue && <span className="payment-badge overdue">Vencida</span>}
                        </span>
                        <span className="payment-item__dates">
                          <span className="payment-due">
                            Vence: {dueOn ? formatDate(dueOn, dateFormat) : '—'}
                          </span>
                          {isPaid && paidOn && (
                            <span className="payment-paid-on">
                              Pagado: {formatDate(paidOn, dateFormat)}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}