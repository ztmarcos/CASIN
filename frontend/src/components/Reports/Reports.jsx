import { useState, useEffect } from 'react';
import './Reports.css';
import firebaseReportsService from '../../services/firebaseReportsService';
import policyStatusService from '../../services/policyStatusService';
import { sendReportEmail } from '../../services/reportEmailService';
import { formatDate, parseDate, getDateFormatOptions } from '../../utils/dateUtils';
import { toast } from 'react-hot-toast';
import VencimientosGraphics from './VencimientosGraphics';
import MatrixGraphics from './MatrixGraphics';
import airplaneTableService from '../../services/airplaneTableService';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const REPORT_TYPES = ['Vencimientos', 'Pagos Parciales', 'Matriz de Productos'];

// Utility function to get the total amount from a policy, handling multiple field variations
const getPolicyTotalAmount = (policy) => {
  // Try different field variations for total amount (prioritized order)
  const totalFields = [
    'pago_total_o_prima_total', // Most common field in Firebase data
    'pago_total',
    'prima_total', 
    'importe_total',
    'importe_total_a_pagar',
    'prima',
    'total',
    'monto_total'
  ];

  // Debug: Log available payment fields for first policy only
  if (!getPolicyTotalAmount.debugLogged && policy.numero_poliza) {
    console.log('🔍 Policy payment fields available:', {
      numero_poliza: policy.numero_poliza,
      availableFields: totalFields.filter(field => policy[field] !== undefined),
      fieldValues: totalFields.reduce((acc, field) => {
        if (policy[field] !== undefined) {
          acc[field] = policy[field];
        }
        return acc;
      }, {})
    });
    getPolicyTotalAmount.debugLogged = true;
  }

  for (const field of totalFields) {
    if (policy[field] !== undefined && policy[field] !== null && policy[field] !== 0 && policy[field] !== '') {
      const value = policy[field];
      // Handle string values that might contain commas, dollar signs, etc.
      if (typeof value === 'string') {
        const cleanedValue = value.replace(/[\s,$"]/g, ''); // Remove spaces, commas, dollar signs, and quotes
        const numericValue = parseFloat(cleanedValue);
        if (!isNaN(numericValue) && numericValue > 0) {
          return numericValue;
        }
      } else if (typeof value === 'number' && value > 0) {
        return value;
      }
    }
  }
  
  return 0;
};

export default function Reports() {
  const [viewMode, setViewMode] = useState('table');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedType, setSelectedType] = useState('Vencimientos');
  const [filteredPolicies, setFilteredPolicies] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFormat, setDateFormat] = useState('long-es');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [policyStatuses, setPolicyStatuses] = useState({});
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [uniqueClients, setUniqueClients] = useState([]);
  const [uniqueCompanies, setUniqueCompanies] = useState([]);
  const [uniqueRamos, setUniqueRamos] = useState([]);
  const [clientMatrix, setClientMatrix] = useState({});
  
  // Matrix filters
  const [matrixSearchTerm, setMatrixSearchTerm] = useState('');
  const [selectedRamoFilter, setSelectedRamoFilter] = useState('');
  const [selectedAseguradoraFilter, setSelectedAseguradoraFilter] = useState('');

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
      'ANUAL': 12
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
    if (!policy || !policy.ramo || !(policy.id || policy.firebase_doc_id)) {
      console.warn('⚠️ Invalid policy data for getPolicyKey:', policy);
      return 'unknown_unknown';
    }
    const policyId = policy.id || policy.firebase_doc_id;
    return `${policy.ramo.toLowerCase()}_${policyId}`;
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
      
      // Get matrix data for analysis (with cache support)
      const matrixData = await firebaseReportsService.getMatrixData(forceRefresh);
      
      // Set state
      setPolicies(allPolicies);
      setUniqueClients(matrixData.uniqueClients);
      setUniqueCompanies(matrixData.uniqueCompanies);
      setUniqueRamos(matrixData.uniqueRamos);
      setClientMatrix(matrixData.clientMatrix);
      
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
      setPolicyStatuses(statuses);
      
      console.log(`✅ Policy statuses loaded ${forceRefresh ? 'from Firebase' : '(from cache or Firebase)'}`);
    } catch (err) {
      console.error('❌ Error loading policy statuses:', err);
      toast.error('Error al cargar estados de pólizas');
    } finally {
      setIsStatusLoading(false);
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
      await firebaseReportsService.updatePolicyPaymentStatus(policy.ramo.toLowerCase(), policyId, newStatus);
      
      // Update local state
      const policyKey = getPolicyKey(policy);
      setPolicyStatuses(prev => ({
        ...prev,
        [policyKey]: newStatus
      }));
      
      toast.success(`Póliza ${policy.numero_poliza} actualizada a: ${newStatus}`);
      
    } catch (err) {
      console.error('❌ Error updating payment status:', err);
      toast.error('Error al actualizar el estado de pago');
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
          const endDate = parseDate(policy.fecha_fin);
          if (!endDate) return false;
          return endDate.getMonth() === selectedMonth;
        });
      } else if (selectedType === 'Pagos Parciales') {
        filtered = filtered.filter(policy => {
          const nextPaymentDate = parseDate(policy.fecha_proximo_pago);
          if (!nextPaymentDate) return false;
          return nextPaymentDate.getMonth() === selectedMonth;
        });
      }
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

  useEffect(() => {
    const fetchAndFilterPolicies = async () => {
      // 1. Obtener las tablas válidas igual que TableManager
      const allTables = await airplaneTableService.getTables();
      const allowedTableNames = allTables
        .filter(t => t.isParentTable || (!t.isParentTable && !t.isChildTable))
        .map(t => t.name);
      console.log('🔍 Tablas válidas (TableManager):', allowedTableNames);
      // 2. Log de policies para depuración
      console.log('🔍 Ejemplo de policies:', policies.slice(0, 10).map(p => ({
        id: p.id,
        ramo: p.ramo,
        sourceTable: p.sourceTable,
        nombre_contratante: p.nombre_contratante,
        contratante: p.contratante,
        aseguradora: p.aseguradora,
        table: p.table,
        firebase_doc_id: p.firebase_doc_id
      })));
      // 3. Filtrar policies para solo incluir las de esas tablas (lógica actual)
      const filtered = policies.filter(p => allowedTableNames.includes(p.sourceTable || p.ramo?.toLowerCase() || ''));
      // Extract unique values with normalization
      const clients = [...new Set(filtered.map(p => p.nombre_contratante || p.contratante).filter(Boolean))].sort();
      const companies = [...new Set(filtered.map(p => normalizeCompany(p.aseguradora)).filter(Boolean))].sort();
      const ramos = [...new Set(filtered.map(p => normalizeRamo(p.ramo)).filter(Boolean))].sort();
      // Log unique values
      console.log('Unique values found:', {
        clients: clients.length + ' clients',
        companies: companies.length + ' companies: ' + companies.join(', '),
        ramos: ramos.length + ' ramos: ' + ramos.join(', ')
      });
      // Create client matrix
      const matrix = {};
      clients.forEach(client => {
        matrix[client] = {
          companies: {},
          ramos: {}
        };
        // Initialize all to false
        companies.forEach(company => {
          matrix[client].companies[company] = false;
        });
        ramos.forEach(ramo => {
          matrix[client].ramos[ramo] = false;
        });
        // Mark existing relationships
        filtered.forEach(policy => {
          if ((policy.nombre_contratante || policy.contratante) === client) {
            matrix[client].companies[normalizeCompany(policy.aseguradora)] = true;
            matrix[client].ramos[normalizeRamo(policy.ramo)] = true;
          }
        });
      });
      // Log final matrix
      console.log('Final matrix structure:', matrix);
      setUniqueClients(clients);
      setUniqueCompanies(companies);
      setUniqueRamos(ramos);
      setClientMatrix(matrix);
    };
    fetchAndFilterPolicies();
  }, [policies]);

  const handleSendEmail = async () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const fourteenDaysFromNow = new Date(today);
    fourteenDaysFromNow.setDate(today.getDate() + 14);
    
    console.log('Checking policies with dates:', {
      today: today.toISOString(),
      thirtyDaysFromNow: thirtyDaysFromNow.toISOString(),
      fourteenDaysFromNow: fourteenDaysFromNow.toISOString()
    });
    
    // Filter policies based on type and date range
    const duePolicies = filteredPolicies.filter(policy => {
      try {
        if (selectedType === 'Vencimientos') {
          if (!policy.fecha_fin) {
            console.log('Missing fecha_fin for policy:', policy.numero_poliza);
            return false;
          }
          
          const policyEndDate = parseDate(policy.fecha_fin);
          if (!policyEndDate || isNaN(policyEndDate.getTime())) {
            console.log('Invalid fecha_fin for policy:', policy.numero_poliza, policy.fecha_fin);
            return false;
          }

          // Check if policy expires within the next 30 days
          return policyEndDate >= today && policyEndDate <= thirtyDaysFromNow;
        } else {
          // Pagos Parciales
          if (!policy.fecha_proximo_pago) {
            console.log('Missing fecha_proximo_pago for policy:', policy.numero_poliza);
            return false;
          }

          const nextPaymentDate = parseDate(policy.fecha_proximo_pago);
          if (!nextPaymentDate || isNaN(nextPaymentDate.getTime())) {
            console.log('Invalid fecha_proximo_pago for policy:', policy.numero_poliza, policy.fecha_proximo_pago);
            return false;
          }

          // Check if next payment is due within the next 14 days
          return nextPaymentDate >= today && nextPaymentDate <= fourteenDaysFromNow;
        }
      } catch (error) {
        console.error('Error processing policy date:', policy.numero_poliza, error);
        return false;
      }
    });

    console.log('Due policies:', duePolicies.map(p => ({
      numero_poliza: p.numero_poliza,
      fecha_fin: p.fecha_fin,
      fecha_proximo_pago: p.fecha_proximo_pago,
      type: selectedType
    })));

    if (duePolicies.length === 0) {
      setEmailStatus({ 
        type: 'error', 
        message: selectedType === 'Vencimientos' 
          ? 'No hay pólizas que venzan en los próximos 30 días' 
          : 'No hay pólizas con pagos programados en las próximas 2 semanas'
      });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      await sendReportEmail(duePolicies, selectedType);
      setEmailStatus({ 
        type: 'success', 
        message: `Recordatorios enviados exitosamente a ${duePolicies.length} titular(es)` 
      });
    } catch (error) {
      console.error('Error sending emails:', error);
      setEmailStatus({ 
        type: 'error', 
        message: 'Error al enviar los recordatorios por email: ' + error.message 
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const toggleCardExpansion = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Get payment status for a policy
  const getPolicyStatus = (policy) => {
    const policyKey = getPolicyKey(policy);
    return policyStatuses[policyKey] || 'No Pagado';
  };

  // Validate and clean policy data
  const validatePolicy = (policy) => {
    return policy && 
           policy.ramo && 
           (policy.id || policy.firebase_doc_id) && 
           policy.numero_poliza &&
           typeof policy.ramo === 'string' &&
           policy.ramo.trim().length > 0;
  };

  // Normaliza nombres de aseguradoras
  const normalizeCompany = (name) => {
    if (!name) return '';
    const n = name.toString().toLowerCase();
    if (n.includes('qualitas') || n.includes('quálitas')) return 'Qualitas';
    if (n.includes('gnp') || n.includes('grupo nacional provincial')) return 'GNP';
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
              {selectedType !== 'Matriz de Productos' && (
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
          {selectedType !== 'Matriz de Productos' && (
            <button
              className="send-email-btn"
              onClick={handleSendEmail}
              disabled={isSendingEmail || filteredPolicies.length === 0}
            >
              {isSendingEmail ? 'Enviando...' : 'Enviar por Email'}
            </button>
          )}

        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {emailStatus && (
        <div className={`email-status ${emailStatus.type}`}>
          {emailStatus.message}
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
                <h3 className="matrix-title">Matriz Comparativa de Clientes por Ramo y Aseguradora</h3>
                
                {/* Matrix filters */}
                <div className="matrix-filters">
                  <div className="matrix-search-bar">
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      value={matrixSearchTerm}
                      onChange={(e) => setMatrixSearchTerm(e.target.value)}
                      className="matrix-search-input"
                    />
                  </div>
                  <div className="matrix-filter-selects">
                    <select
                      className="matrix-filter-select"
                      value={selectedRamoFilter}
                      onChange={(e) => setSelectedRamoFilter(e.target.value)}
                    >
                      <option value="">Todos los Ramos</option>
                      {uniqueRamos.map(ramo => (
                        <option key={ramo} value={ramo}>{ramo}</option>
                      ))}
                    </select>
                    <select
                      className="matrix-filter-select"
                      value={selectedAseguradoraFilter}
                      onChange={(e) => setSelectedAseguradoraFilter(e.target.value)}
                    >
                      <option value="">Todas las Aseguradoras</option>
                      {uniqueCompanies.map(company => (
                        <option key={company} value={company}>{company}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
{/* Check if we have data to display */}
                {uniqueClients.length === 0 || uniqueRamos.length === 0 || uniqueCompanies.length === 0 ? (
                  <div className="matrix-no-data">
                    <div className="no-data-message">
                      <h4>No hay datos disponibles para mostrar la matriz</h4>
                      <p>
                        {uniqueClients.length === 0 && "No se encontraron clientes. "}
                        {uniqueRamos.length === 0 && "No se encontraron ramos de seguros. "}
                        {uniqueCompanies.length === 0 && "No se encontraron aseguradoras. "}
                      </p>
                      <p>Verifique que las pólizas tengan datos completos de contratante, ramo y aseguradora.</p>
                    </div>
                  </div>
                ) : (
                  (() => {
                    // Filter clients based on search and filter criteria
                    const filteredClients = uniqueClients
                      .filter(client => {
                        // Apply search filter
                        if (matrixSearchTerm.trim()) {
                          return client.toLowerCase().includes(matrixSearchTerm.toLowerCase());
                        }
                        return true;
                      })
                      .filter(client => {
                        // Apply ramo filter
                        if (selectedRamoFilter) {
                          const clientPolicies = policies.filter(p => (p.nombre_contratante || p.contratante) === client);
                          const clientRamos = [...new Set(clientPolicies.map(p => normalizeRamo(p.ramo)))];
                          return clientRamos.includes(selectedRamoFilter);
                        }
                        return true;
                      })
                      .filter(client => {
                        // Apply aseguradora filter
                        if (selectedAseguradoraFilter) {
                          const clientPolicies = policies.filter(p => (p.nombre_contratante || p.contratante) === client);
                          const clientCompanies = [...new Set(clientPolicies.map(p => normalizeCompany(p.aseguradora)))];
                          return clientCompanies.includes(selectedAseguradoraFilter);
                        }
                        return true;
                      });

                    return filteredClients.length === 0 ? (
                      <div className="matrix-no-results">
                        <div className="no-data-message">
                          <h4>No se encontraron resultados</h4>
                          <p>No hay clientes que coincidan con los filtros aplicados.</p>
                          <p>Intente ajustar los criterios de búsqueda o filtros.</p>
                        </div>
                      </div>
                    ) : (
                      <table className="matrix-table">
                        <thead>
                          <tr>
                            <th rowSpan="2">Cliente</th>
                            <th colSpan={uniqueRamos.length}>Ramos de Seguros</th>
                            <th colSpan={uniqueCompanies.length}>Aseguradoras</th>
                            <th rowSpan="2">Total Pólizas</th>
                          </tr>
                          <tr>
                            {uniqueRamos.map(ramo => (
                              <th key={ramo} className="ramo-header">{ramo}</th>
                            ))}
                            {uniqueCompanies.map(company => (
                              <th key={company} className="company-header">{company}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredClients.map(client => {
                            const clientPolicies = policies.filter(p => (p.nombre_contratante || p.contratante) === client);
                            const clientRamos = [...new Set(clientPolicies.map(p => normalizeRamo(p.ramo)))];
                            const clientCompanies = [...new Set(clientPolicies.map(p => normalizeCompany(p.aseguradora)))];
                            
                            return (
                              <tr key={client}>
                                <td className="client-name">{client}</td>
                                
                                {/* Ramo columns */}
                                {uniqueRamos.map(ramo => {
                                  const hasRamo = clientRamos.includes(ramo);
                                  const ramoCompanies = clientPolicies
                                    .filter(p => normalizeRamo(p.ramo) === ramo)
                                    .map(p => normalizeCompany(p.aseguradora));
                                  
                                  return (
                                    <td 
                                      key={`${client}-ramo-${ramo}`}
                                      className={hasRamo ? 'has-policy' : 'no-policy'}
                                      title={hasRamo ? 
                                        `${client} tiene ${ramo} con: ${[...new Set(ramoCompanies)].join(', ')}` : 
                                        `${client} no tiene póliza de ${ramo}`
                                      }
                                    >
                                      {hasRamo ? '✓' : '×'}
                                    </td>
                                  );
                                })}
                                
                                {/* Company columns */}
                                {uniqueCompanies.map(company => {
                                  const hasCompany = clientCompanies.includes(company);
                                  const companyRamos = clientPolicies
                                    .filter(p => normalizeCompany(p.aseguradora) === company)
                                    .map(p => normalizeRamo(p.ramo));
                                  
                                  return (
                                    <td 
                                      key={`${client}-company-${company}`}
                                      className={hasCompany ? 'has-policy' : 'no-policy'}
                                      title={hasCompany ? 
                                        `${client} tiene con ${company}: ${[...new Set(companyRamos)].join(', ')}` : 
                                        `${client} no tiene póliza con ${company}`
                                      }
                                    >
                                      {hasCompany ? '✓' : '×'}
                                    </td>
                                  );
                                })}
                                
                                {/* Total policies */}
                                <td className="policy-count">{clientPolicies.length}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="summary-row">
                            <td><strong>Total por Categoría</strong></td>
                            
                            {/* Ramo totals */}
                            {uniqueRamos.map(ramo => {
                              const ramoCount = policies.filter(p => normalizeRamo(p.ramo) === ramo).length;
                              return (
                                <td key={ramo} className="ramo-total">
                                  <strong>{ramoCount}</strong>
                                </td>
                              );
                            })}
                            
                            {/* Company totals */}
                            {uniqueCompanies.map(company => {
                              const companyCount = policies.filter(p => normalizeCompany(p.aseguradora) === company).length;
                              return (
                                <td key={company} className="company-total">
                                  <strong>{companyCount}</strong>
                                </td>
                              );
                            })}
                            
                            {/* Grand total */}
                            <td className="grand-total">
                              <strong>{policies.length}</strong>
                            </td>
                          </tr>
                        </tfoot>
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
                    <th>Próximo Pago</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.map(policy => (
                    <tr key={`${policy.id}-${policy.numero_poliza}`}>
                      <td>{policy.ramo}</td>
                      <td>{policy.numero_poliza}</td>
                      <td>{policy.nombre_contratante || policy.contratante}</td>
                      <td>{policy.email || 'No disponible'}</td>
                      <td>{policy.aseguradora}</td>
                      <td>{formatDate(policy.fecha_inicio, dateFormat)}</td>
                      <td>{formatDate(policy.fecha_fin, dateFormat)}</td>
                      <td>${getPolicyTotalAmount(policy)?.toLocaleString() || '0'}</td>
                      {selectedType === 'Pagos Parciales' && (
                        <td>${policy.pago_parcial?.toLocaleString() || '0'}</td>
                      )}
                      <td>{policy.forma_pago}</td>
                      <td>{policy.fecha_proximo_pago ? formatDate(policy.fecha_proximo_pago, dateFormat) : 'N/A'}</td>
                      <td>
                        <button 
                          onClick={() => handleToggleStatus(policy)}
                          className={`status-toggle ${getPolicyStatus(policy).toLowerCase().replace(' ', '-')}`}
                        >
                          {getPolicyStatus(policy)}
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
                  className={`report-card ${expandedCards[`${policy.id}-${policy.numero_poliza}`] ? 'expanded' : ''}`}
                  onClick={() => toggleCardExpansion(`${policy.id}-${policy.numero_poliza}`)}
                >
                  <div className="card-header">
                    <div className="card-header-content">
                      <div className="card-header-details">
                        <span className="policy-ramo">{policy.ramo}</span>
                        <span className="report-type">{policy.aseguradora}</span>
                      </div>
                      <h3>{policy.numero_poliza}</h3>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(policy);
                      }}
                      className={`status-toggle ${getPolicyStatus(policy).toLowerCase().replace(' ', '-')}`}
                    >
                      {getPolicyStatus(policy)}
                    </button>
                  </div>
                  <div className="card-content">
                    <div className="card-info">
                      <strong>Contratante: {policy.nombre_contratante || policy.contratante}</strong>
                    </div>
                    <div className="card-details">
                      {!expandedCards[`${policy.id}-${policy.numero_poliza}`] ? (
                        <>
                          <p><span>Vencimiento:</span> {formatDate(policy.fecha_fin)}</p>
                          <p><span>Prima Total:</span> ${getPolicyTotalAmount(policy)?.toLocaleString() || '0'}</p>
                          <p><span>Forma de Pago:</span> {policy.forma_pago}</p>
                        </>
                      ) : (
                        <>
                          <p><span>Email:</span> {policy.email || 'No disponible'}</p>
                          <p><span>RFC:</span> {policy.rfc || 'No disponible'}</p>
                          <p><span>Asegurado:</span> {policy.asegurado || 'No disponible'}</p>
                          <p><span>Inicio:</span> {formatDate(policy.fecha_inicio)}</p>
                          <p><span>Vencimiento:</span> {formatDate(policy.fecha_fin)}</p>
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
                            <p><span>Próximo Pago:</span> {policy.fecha_proximo_pago ? formatDate(policy.fecha_proximo_pago) : 'N/A'}</p>
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
    </div>
  );
}