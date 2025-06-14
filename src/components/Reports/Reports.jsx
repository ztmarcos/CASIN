import { useState, useEffect } from 'react';
import './Reports.css';
import tableService from '../../services/data/tableService';
import policyStatusService from '../../services/policyStatusService';
import { sendReportEmail } from '../../services/reportEmailService';
import { formatDate, parseDate, getDateFormatOptions } from '../../utils/dateUtils';
import { toast } from 'react-hot-toast';
import VencimientosGraphics from './VencimientosGraphics';
import MatrixGraphics from './MatrixGraphics';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const REPORT_TYPES = ['Vencimientos', 'Pagos Parciales', 'Matriz de Productos'];

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
  const [graphicsTimeView, setGraphicsTimeView] = useState('4months'); // '4months', '6months', 'year'
  const [showGraphicsPanel, setShowGraphicsPanel] = useState(true);
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
  const getPolicyKey = (policy) => `${policy.ramo.toLowerCase()}_${policy.id}`;

  // Load policy statuses from database
  const loadPolicyStatuses = async () => {
    try {
      setIsStatusLoading(true);
      const statuses = await policyStatusService.getStatuses();
      setPolicyStatuses(statuses);
    } catch (error) {
      console.error('Error loading policy statuses:', error);
      toast.error('Error al cargar los estados de las pólizas');
    } finally {
      setIsStatusLoading(false);
    }
  };

  // Load statuses on component mount
  useEffect(() => {
    loadPolicyStatuses();
  }, []);

  const normalizePolicy = (policy, source) => {
    // Log the incoming policy data
    console.log('Normalizing policy:', {
      source,
      raw: policy,
      identifiers: {
        numero_poliza: policy.numero_poliza || policy.n__mero_de_p__liza || policy.numero_de_poliza,
        contratante: policy.contratante || policy.nombre_contratante,
        asegurado: policy.nombre_del_asegurado || policy.asegurado || policy.contratante,
        aseguradora: policy.aseguradora || policy.compania || policy.compañia || 'No especificada'
      }
    });

    // Common fields for all policy types
    const commonFields = {
      id: policy.id,
      numero_poliza: policy.numero_poliza || policy.n__mero_de_p__liza || policy.numero_de_poliza,
      contratante: policy.contratante || policy.nombre_contratante,
      asegurado: policy.nombre_del_asegurado || policy.asegurado || policy.contratante || policy.nombre_contratante,
      rfc: policy.rfc,
      email: policy.e_mail || policy.email,
      fecha_inicio: policy.fecha_inicio || policy.vigencia__inicio_ || policy.vigencia_inicio || policy.desde_vigencia || policy.vigencia_inicio,
      fecha_fin: policy.fecha_fin || policy.vigencia__fin_ || policy.vigencia_fin || policy.hasta_vigencia || policy.vigencia_de_la_poliza_hasta || policy.vigencia_fin,
      aseguradora: policy.aseguradora || 'No especificada',
      forma_pago: policy.forma_de_pago || policy.forma_pago || 'No especificado',
      sourceTable: source
    };

    // Calculate prima total - handle comma-separated numbers
    const cleanNumericValue = (value) => {
      if (!value) return 0;
      return parseFloat(value.toString().replace(/,/g, '')) || 0;
    };
    
    const primaTotal = cleanNumericValue(policy.prima_total || policy.pago_total || policy.importe_total_a_pagar || policy.pago_total_o_prima_total);

    // Common financial fields
    const financialFields = {
      prima_neta: cleanNumericValue(policy.prima_neta) || primaTotal,
      prima_total: primaTotal,
      derecho_poliza: cleanNumericValue(policy.derecho_de_p__liza || policy.derecho_de_poliza || policy.derecho_poliza),
      recargo_pago_fraccionado: cleanNumericValue(policy.recargo_por_pago_fraccionado),
      iva: cleanNumericValue(policy.i_v_a__16_ || policy.i_v_a || policy.iva_16),
      pago_total: primaTotal,
      pagos_fraccionados: policy.pagos_fraccionados,
      pago_parcial: policy.monto_parcial,
      fecha_proximo_pago: calculateNextPaymentDate(
        commonFields.fecha_inicio,
        commonFields.forma_pago
      )
    };

    // Combine common fields with financial fields
    const basePolicy = {
      ...commonFields,
      ...financialFields
    };

    // Determine ramo - first check if policy already has a ramo field, otherwise use source mapping
    let ramo = policy.ramo;
    if (!ramo) {
      switch (source) {
        case 'gmm':
        case 'gruposgmm':
          ramo = 'GMM';
          break;
        case 'autos':
          ramo = 'Autos';
          break;
        case 'mascotas':
          ramo = 'Mascotas';
          break;
        case 'vida':
          ramo = 'Vida';
          break;
        case 'negocio':
          ramo = 'Negocio';
          break;
        case 'diversos':
          ramo = 'Diversos';
          break;
        case 'rc':
          ramo = 'Responsabilidad Civil';
          break;
        case 'transporte':
          ramo = 'Transporte';
          break;
        case 'hogar':
          ramo = 'Hogar';
          break;
        case 'empresarial':
          ramo = 'Empresarial';
          break;
        case 'responsabilidad':
          ramo = 'Responsabilidad Civil';
          break;
        case 'accidentes':
          ramo = 'Accidentes Personales';
          break;
        default:
          ramo = 'Otros';
      }
    }

    return { ...basePolicy, ramo };
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

  const fetchPolicies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get all available tables
      const tables = await tableService.getTables();
      console.log('All available tables:', tables);

      // Define paired tables (only for tables that actually have listado tables)
      const pairedTables = {
        // Removed non-existent paired tables that were causing 500 errors
        // 'autos': 'AutosListado', // - AutosListado doesn't exist
        // 'vida': 'VidaListado',   // - VidaListado doesn't exist
        'GruposAutos': 'AutosListado',
        'GruposVida': 'VidaListado'
      };

      // Get data from all tables
      const allResponses = await Promise.all(
        tables.map(async (table) => {
          try {
            console.log(`Fetching data from table: ${table.name}`);
            const response = await tableService.getData(table.name);
            console.log(`Table ${table.name} returned ${response.data?.length || 0} records`);
            
            // If this is a main table with a paired listado
            if (pairedTables[table.name]) {
              const listadoResponse = await tableService.getData(pairedTables[table.name]);
              console.log(`Processing paired tables ${table.name} and ${pairedTables[table.name]}:`, {
                mainTable: response.data?.length,
                listadoTable: listadoResponse.data?.length
              });
              
              return {
                tableName: table.name,
                data: response.data || [],
                listadoData: listadoResponse.data || []
              };
            }
            
            // For non-paired tables
            return { 
              tableName: table.name, 
              data: response.data || [],
              listadoData: []
            };
          } catch (error) {
            console.error(`Error fetching from ${table.name}:`, error);
            return { tableName: table.name, data: [], listadoData: [] };
          }
        })
      );

      // Process all responses
      const allPolicies = allResponses.flatMap(({ tableName, data, listadoData }) => {
        console.log(`Processing table: ${tableName} with ${data.length} records`);
        
        // Skip listado tables as they're handled with their main tables
        if (tableName.toLowerCase().includes('listado')) {
          console.log(`Skipping listado table: ${tableName}`);
          return [];
        }

        // Determine the type based on exact table name matching
        let policyType = 'other';
        const lowerTableName = tableName.toLowerCase();
        
        if (lowerTableName === 'gmm' || lowerTableName === 'gruposgmm') policyType = 'gmm';
        else if (lowerTableName === 'autos') policyType = 'autos';
        else if (lowerTableName === 'mascotas') policyType = 'mascotas';
        else if (lowerTableName === 'vida') policyType = 'vida';
        else if (lowerTableName === 'negocio') policyType = 'negocio';
        else if (lowerTableName === 'diversos') policyType = 'diversos';
        else if (lowerTableName === 'rc') policyType = 'rc';
        else if (lowerTableName === 'transporte') policyType = 'transporte';
        else if (lowerTableName.includes('hogar')) policyType = 'hogar';
        else if (lowerTableName.includes('empresarial')) policyType = 'empresarial';
        else if (lowerTableName.includes('responsabilidad')) policyType = 'responsabilidad';
        else if (lowerTableName.includes('accidentes')) policyType = 'accidentes';
        
        return data.map(policy => {
          try {
            // If this is a paired table, find corresponding listado entries
            if (pairedTables[tableName] && listadoData.length > 0) {
              // Log the matching process
              console.log(`Matching policy ${policy.numero_de_poliza} with listado entries:`, {
                policyId: policy.id,
                listadoEntries: listadoData.filter(l => l.numero_de_certificado === policy.numero_de_poliza).length
              });
            }
            
            return normalizePolicy(policy, policyType);
          } catch (error) {
            console.error(`Error normalizing policy from ${tableName}:`, policy, error);
            return null;
          }
        }).filter(Boolean);
      });

      // Improved duplicate detection
      const uniquePolicies = allPolicies.reduce((acc, policy) => {
        // Create a unique key that includes more identifying information
        const key = `${policy.numero_poliza}_${policy.ramo}_${policy.contratante}`;
        
        // Log the policy being processed
        console.log('Processing policy for deduplication:', {
          key,
          policy: {
            numero_poliza: policy.numero_poliza,
            ramo: policy.ramo,
            contratante: policy.contratante,
            fecha_inicio: policy.fecha_inicio
          }
        });

        // If we don't have this policy yet, or if this one is more recent
        if (!acc[key] || new Date(policy.fecha_inicio) > new Date(acc[key].fecha_inicio)) {
          // Log when we're updating a policy
          if (acc[key]) {
            console.log('Updating existing policy:', {
              old: {
                numero_poliza: acc[key].numero_poliza,
                fecha_inicio: acc[key].fecha_inicio
              },
              new: {
                numero_poliza: policy.numero_poliza,
                fecha_inicio: policy.fecha_inicio
              }
            });
          }
          acc[key] = policy;
        }
        return acc;
      }, {});

      const finalPolicies = Object.values(uniquePolicies);

      // Log final policy matching results
      console.log('Policy matching results:', {
        total: allPolicies.length,
        unique: finalPolicies.length,
        pairs: finalPolicies.reduce((acc, p) => {
          const key = `${p.contratante}_${p.ramo}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push({
            numero_poliza: p.numero_poliza,
            fecha_inicio: p.fecha_inicio,
            fecha_fin: p.fecha_fin
          });
          return acc;
        }, {})
      });

      setPolicies(finalPolicies);
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError('Failed to load policies data');
      toast.error('Error al cargar los datos de pólizas');
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize company names
  const normalizeCompanyName = (name) => {
    if (!name) return '';
    const normalized = name.toString().trim().toLowerCase();
    // Fix common duplicates
    if (normalized.includes('plan seguro')) return 'Plan Seguro';
    if (normalized.includes('gnp')) return 'GNP';
    if (normalized.includes('axa')) return 'AXA';
    if (normalized.includes('seguros monterrey')) return 'Seguros Monterrey';
    // Return original with proper capitalization
    return name.toString().trim();
  };

  // Add back the initial data fetch
  useEffect(() => {
    console.log('Initial data fetch starting...');
    fetchPolicies();
  }, []);

  // Add the policy update listener
  useEffect(() => {
    const handlePolicyUpdate = () => {
      console.log('Policy update detected, refreshing data...');
      fetchPolicies();
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
    
    let filtered = policies;
    
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
          const nextPaymentDate = policy.fecha_proximo_pago;
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
    if (!policies.length) return;

    // Add debugging logs
    console.log('Building matrix with policies:', policies.length, 'total policies');
    console.log('Policy sources and ramos:', policies.map(p => ({
      id: p.id,
      numero_poliza: p.numero_poliza,
      contratante: p.contratante,
      aseguradora: p.aseguradora,
      ramo: p.ramo,
      sourceTable: p.sourceTable
    })));

    // Extract unique values with normalization
    const clients = [...new Set(policies.map(p => p.contratante).filter(Boolean))].sort();
    
    const companies = [...new Set(policies
      .map(p => normalizeCompanyName(p.aseguradora))
      .filter(Boolean)
    )].sort();
    
    const ramos = [...new Set(policies.map(p => p.ramo).filter(Boolean))].sort();

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
      policies.forEach(policy => {
        if (policy.contratante === client) {
          matrix[client].companies[policy.aseguradora] = true;
          matrix[client].ramos[policy.ramo] = true;
        }
      });
    });

    // Log final matrix
    console.log('Final matrix structure:', matrix);

    setUniqueClients(clients);
    setUniqueCompanies(companies);
    setUniqueRamos(ramos);
    setClientMatrix(matrix);
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

          const nextPaymentDate = policy.fecha_proximo_pago;
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

  // Add toggle status function
  const handleToggleStatus = async (policy) => {
    const policyKey = getPolicyKey(policy);
    const currentStatus = policyStatuses[policyKey] || 'No Pagado';
    const newStatus = currentStatus === 'Pagado' ? 'No Pagado' : 'Pagado';
    
    try {
      // Update in database
      await policyStatusService.updateStatus(policyKey, newStatus);
      
      // Update local state
      setPolicyStatuses(prev => ({
        ...prev,
        [policyKey]: newStatus
      }));

      toast.success(`Estado actualizado: ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  // Get status for a policy
  const getPolicyStatus = (policy) => {
    const policyKey = getPolicyKey(policy);
    return policyStatuses[policyKey] || 'No Pagado';
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
                          const clientPolicies = policies.filter(p => p.contratante === client);
                          const clientRamos = [...new Set(clientPolicies.map(p => p.ramo))];
                          return clientRamos.includes(selectedRamoFilter);
                        }
                        return true;
                      })
                      .filter(client => {
                        // Apply aseguradora filter
                        if (selectedAseguradoraFilter) {
                          const clientPolicies = policies.filter(p => p.contratante === client);
                          const clientCompanies = [...new Set(clientPolicies.map(p => normalizeCompanyName(p.aseguradora)))];
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
                            const clientPolicies = policies.filter(p => p.contratante === client);
                            const clientRamos = [...new Set(clientPolicies.map(p => p.ramo))];
                            const clientCompanies = [...new Set(clientPolicies.map(p => normalizeCompanyName(p.aseguradora)))];
                            
                            return (
                              <tr key={client}>
                                <td className="client-name">{client}</td>
                                
                                {/* Ramo columns */}
                                {uniqueRamos.map(ramo => {
                                  const hasRamo = clientRamos.includes(ramo);
                                  const ramoCompanies = clientPolicies
                                    .filter(p => p.ramo === ramo)
                                    .map(p => p.aseguradora);
                                  
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
                                    .filter(p => normalizeCompanyName(p.aseguradora) === company)
                                    .map(p => p.ramo);
                                  
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
                              const ramoCount = policies.filter(p => p.ramo === ramo).length;
                              return (
                                <td key={ramo} className="ramo-total">
                                  <strong>{ramoCount}</strong>
                                </td>
                              );
                            })}
                            
                            {/* Company totals */}
                            {uniqueCompanies.map(company => {
                              const companyCount = policies.filter(p => normalizeCompanyName(p.aseguradora) === company).length;
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
                      <td>{policy.contratante}</td>
                      <td>{policy.email || 'No disponible'}</td>
                      <td>{policy.aseguradora}</td>
                      <td>{formatDate(policy.fecha_inicio, dateFormat)}</td>
                      <td>{formatDate(policy.fecha_fin, dateFormat)}</td>
                      <td>${policy.prima_total?.toLocaleString() || '0'}</td>
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
                      <strong>Contratante: {policy.contratante}</strong>
                    </div>
                    <div className="card-details">
                      {!expandedCards[`${policy.id}-${policy.numero_poliza}`] ? (
                        <>
                          <p><span>Vencimiento:</span> {formatDate(policy.fecha_fin)}</p>
                          <p><span>Prima Total:</span> ${policy.prima_total?.toLocaleString() || '0'}</p>
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
                            <p className="card-amount"><span>Prima Total:</span> ${policy.pago_total?.toLocaleString() || '0'}</p>
                            {policy.pagos_fraccionados && (
                              <p><span>Pagos Fraccionados:</span> {policy.pagos_fraccionados}</p>
                            )}
                            {policy.pago_parcial && (
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