import { useState, useEffect } from 'react';
import './Reports.css';
import tableService from '../../services/data/tableService';
import policyStatusService from '../../services/policyStatusService';
import { sendReportEmail } from '../../services/reportEmailService';
import { formatDate, parseDate, getDateFormatOptions } from '../../utils/dateUtils';
import { toast } from 'react-hot-toast';

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
        asegurado: policy.nombre_del_asegurado || policy.asegurado || policy.contratante
      }
    });

    if (source === 'gmm') {
      const primaTotal = parseFloat(policy.prima_total || policy.pago_total || policy.importe_total_a_pagar || policy.pago_total_o_prima_total || 0);
      const normalized = {
        id: policy.id,
        numero_poliza: policy.n__mero_de_p__liza || policy.numero_de_poliza || policy.numero_poliza,
        contratante: policy.contratante || policy.nombre_contratante,
        asegurado: policy.nombre_del_asegurado || policy.asegurado || policy.contratante,
        rfc: policy.rfc,
        email: policy.e_mail || policy.email,
        fecha_inicio: policy.fecha_inicio || policy.vigencia__inicio_ || policy.vigencia_inicio || policy.desde_vigencia,
        fecha_fin: policy.fecha_fin || policy.vigencia__fin_ || policy.vigencia_fin || policy.hasta_vigencia || policy.vigencia_de_la_poliza_hasta,
        prima_neta: primaTotal,
        prima_total: primaTotal,
        derecho_poliza: parseFloat(policy.derecho_de_p__liza || policy.derecho_de_poliza || 0),
        recargo_pago_fraccionado: parseFloat(policy.recargo_por_pago_fraccionado || 0),
        iva: parseFloat(policy.i_v_a__16_ || policy.i_v_a || policy.iva_16 || 0),
        pago_total: primaTotal,
        forma_pago: policy.forma_de_pago || policy.forma_pago || 'No especificado',
        pagos_fraccionados: policy.pagos_fraccionados,
        pago_parcial: policy.monto_parcial,
        aseguradora: policy.aseguradora === 'Grupo Nacional Provincial S.A.B.' ? 'GNP' : (policy.aseguradora || 'No especificada'),
        fecha_proximo_pago: calculateNextPaymentDate(
          policy.fecha_inicio || policy.vigencia__inicio_ || policy.vigencia_inicio || policy.desde_vigencia,
          policy.forma_de_pago || policy.forma_pago
        ),
        ramo: 'GMM',
        sourceTable: source
      };

      // Log the normalized policy
      console.log('Normalized GMM policy:', {
        numero_poliza: normalized.numero_poliza,
        contratante: normalized.contratante,
        asegurado: normalized.asegurado,
        fecha_inicio: normalized.fecha_inicio,
        fecha_fin: normalized.fecha_fin
      });

      return normalized;
    } else if (source === 'autos') {
      const primaTotal = parseFloat(policy.prima_total || policy.pago_total || policy.pago_total_o_prima_total || 0);
      const normalized = {
        id: policy.id,
        numero_poliza: policy.numero_de_poliza || policy.numero_poliza,
        contratante: policy.nombre_contratante || policy.contratante,
        asegurado: policy.nombre_contratante || policy.contratante,
        rfc: policy.rfc,
        email: policy.e_mail || policy.email,
        fecha_inicio: policy.fecha_inicio || policy.vigencia_inicio || policy.desde_vigencia,
        fecha_fin: policy.fecha_fin || policy.vigencia_fin || policy.hasta_vigencia || policy.vigencia_de_la_poliza_hasta,
        prima_neta: primaTotal,
        prima_total: primaTotal,
        derecho_poliza: parseFloat(policy.derecho_de_poliza || 0),
        recargo_pago_fraccionado: parseFloat(policy.recargo_por_pago_fraccionado || 0),
        iva: parseFloat(policy.i_v_a || policy.iva_16 || 0),
        pago_total: primaTotal,
        forma_pago: policy.forma_de_pago || policy.forma_pago || 'No especificado',
        pagos_fraccionados: null,
        pago_parcial: null,
        aseguradora: policy.aseguradora === 'Grupo Nacional Provincial S.A.B.' ? 'GNP' : (policy.aseguradora || 'No especificada'),
        fecha_proximo_pago: calculateNextPaymentDate(
          policy.fecha_inicio || policy.vigencia_inicio || policy.desde_vigencia,
          policy.forma_de_pago || policy.forma_pago
        ),
        ramo: 'Autos',
        sourceTable: source
      };

      // Log the normalized policy
      console.log('Normalized Autos policy:', {
        numero_poliza: normalized.numero_poliza,
        contratante: normalized.contratante,
        asegurado: normalized.asegurado,
        fecha_inicio: normalized.fecha_inicio,
        fecha_fin: normalized.fecha_fin
      });

      return normalized;
    } else if (source === 'mascotas') {
      // Special handling for mascotas table
      const primaTotal = parseFloat(policy.prima_total || policy.pago_total || 0);
      
      const normalized = {
        id: policy.id,
        numero_poliza: policy.numero_poliza || policy.id,
        contratante: policy.contratante || policy.nombre || policy.nombre_contratante,
        asegurado: policy.asegurado || policy.nombre || policy.nombre_contratante,
        rfc: policy.rfc,
        email: policy.email || policy.e_mail,
        fecha_inicio: policy.fecha_inicio || policy.vigencia_inicio,
        fecha_fin: policy.fecha_fin || policy.vigencia_fin,
        prima_neta: primaTotal,
        prima_total: primaTotal,
        forma_pago: policy.forma_de_pago || policy.FORMA_DE_PAGO || policy.formaPago || 'No especificado',
        aseguradora: policy.aseguradora === 'Grupo Nacional Provincial S.A.B.' ? 'GNP' : (policy.aseguradora || 'No especificada'),
        fecha_proximo_pago: calculateNextPaymentDate(
          policy.fecha_inicio || policy.vigencia_inicio,
          policy.forma_de_pago || policy.FORMA_DE_PAGO || policy.formaPago
        ),
        ramo: 'mascotas',
        sourceTable: source
      };

      // Log the normalized policy
      console.log('Normalized Mascotas policy:', {
        numero_poliza: normalized.numero_poliza,
        contratante: normalized.contratante,
        asegurado: normalized.asegurado,
        fecha_inicio: normalized.fecha_inicio,
        fecha_fin: normalized.fecha_fin
      });

      return normalized;
    }

    // Handle other table types
    return null;
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

      // Define paired tables
      const pairedTables = {
        'gmm': 'gmm-listado',
        'grupos_autos': 'grupos_autos_listado',
        'grupos_vida': 'grupos_vida_listado'
      };

      // Get data from all tables
      const allResponses = await Promise.all(
        tables.map(async (table) => {
          try {
            const response = await tableService.getData(table.name);
            
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
        // Skip listado tables as they're handled with their main tables
        if (tableName.toLowerCase().includes('listado')) {
          return [];
        }

        // Determine the type based on table name
        let policyType = 'other';
        if (tableName.toLowerCase().includes('gmm')) policyType = 'gmm';
        else if (tableName.toLowerCase().includes('auto')) policyType = 'autos';
        else if (tableName.toLowerCase().includes('mascota')) policyType = 'mascotas';
        
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

    // Extract unique values
    const clients = [...new Set(policies.map(p => p.contratante))].sort();
    const companies = [...new Set(policies.map(p => p.aseguradora))].sort();
    const ramos = [...new Set(policies.map(p => p.ramo))].sort();

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
        <div className={viewMode === 'table' ? 'table-container' : 'cards-grid'}>
          {selectedType === 'Matriz de Productos' ? (
            <div className="matrix-container">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th colSpan={uniqueCompanies.length}>Aseguradoras</th>
                    <th colSpan={uniqueRamos.length}>Ramos</th>
                  </tr>
                  <tr>
                    <th></th>
                    {uniqueCompanies.map(company => (
                      <th key={company}>{company}</th>
                    ))}
                    {uniqueRamos.map(ramo => (
                      <th key={ramo}>{ramo}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uniqueClients.map(client => (
                    <tr key={client}>
                      <td>{client}</td>
                      {uniqueCompanies.map(company => (
                        <td key={`${client}-${company}`} className={clientMatrix[client]?.companies[company] ? 'has-policy' : 'no-policy'}>
                          {clientMatrix[client]?.companies[company] ? '✓' : '×'}
                        </td>
                      ))}
                      {uniqueRamos.map(ramo => (
                        <td key={`${client}-${ramo}`} className={clientMatrix[client]?.ramos[ramo] ? 'has-policy' : 'no-policy'}>
                          {clientMatrix[client]?.ramos[ramo] ? '✓' : '×'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
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
      )}
    </div>
  );
}