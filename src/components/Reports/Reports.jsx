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

const REPORT_TYPES = ['Vencimientos', 'Pagos Parciales'];

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
    if (source === 'gmm') {
      const normalized = {
        id: policy.id,
        numero_poliza: policy.n__mero_de_p__liza || policy.numero_de_poliza || policy.numero_poliza,
        contratante: policy.contratante || policy.nombre_contratante,
        asegurado: policy.nombre_del_asegurado || policy.asegurado || policy.contratante,
        rfc: policy.rfc,
        email: policy.e_mail || policy.email,
        fecha_inicio: policy.fecha_inicio || policy.vigencia__inicio_ || policy.vigencia_inicio || policy.desde_vigencia,
        fecha_fin: policy.fecha_fin || policy.vigencia__fin_ || policy.vigencia_fin || policy.hasta_vigencia || policy.vigencia_de_la_poliza_hasta,
        prima_neta: parseFloat(policy.prima_neta || 0),
        prima_total: parseFloat(policy.prima_total || policy.pago_total || policy.importe_total_a_pagar || policy.pago_total_o_prima_total || 0),
        derecho_poliza: parseFloat(policy.derecho_de_p__liza || policy.derecho_de_poliza || 0),
        recargo_pago_fraccionado: parseFloat(policy.recargo_por_pago_fraccionado || 0),
        iva: parseFloat(policy.i_v_a__16_ || policy.i_v_a || policy.iva_16 || 0),
        pago_total: parseFloat(policy.pago_total || policy.prima_total || policy.importe_total_a_pagar || policy.pago_total_o_prima_total || 0),
        forma_pago: policy.forma_de_pago || policy.forma_pago,
        pagos_fraccionados: policy.pagos_fraccionados,
        pago_parcial: policy.monto_parcial,
        aseguradora: policy.aseguradora,
        fecha_proximo_pago: calculateNextPaymentDate(
          policy.fecha_inicio || policy.vigencia__inicio_ || policy.vigencia_inicio || policy.desde_vigencia,
          policy.forma_de_pago || policy.forma_pago
        ),
        ramo: 'GMM'
      };
      return normalized;
    } else if (source === 'autos') {
      const normalized = {
        id: policy.id,
        numero_poliza: policy.numero_de_poliza || policy.numero_poliza,
        contratante: policy.nombre_contratante || policy.contratante,
        asegurado: policy.nombre_contratante || policy.contratante,
        rfc: policy.rfc,
        email: policy.e_mail || policy.email,
        fecha_inicio: policy.fecha_inicio || policy.vigencia_inicio || policy.desde_vigencia,
        fecha_fin: policy.fecha_fin || policy.vigencia_fin || policy.hasta_vigencia || policy.vigencia_de_la_poliza_hasta,
        prima_neta: parseFloat(policy.prima_neta || 0),
        prima_total: parseFloat(policy.prima_total || policy.pago_total || policy.pago_total_o_prima_total || 0),
        derecho_poliza: parseFloat(policy.derecho_de_poliza || 0),
        recargo_pago_fraccionado: parseFloat(policy.recargo_por_pago_fraccionado || 0),
        iva: parseFloat(policy.i_v_a || policy.iva_16 || 0),
        pago_total: parseFloat(policy.pago_total || policy.prima_total || policy.pago_total_o_prima_total || 0),
        forma_pago: policy.forma_de_pago || policy.forma_pago,
        pagos_fraccionados: null,
        pago_parcial: null,
        aseguradora: policy.aseguradora,
        fecha_proximo_pago: calculateNextPaymentDate(
          policy.fecha_inicio || policy.vigencia_inicio || policy.desde_vigencia,
          policy.forma_de_pago || policy.forma_pago
        ),
        ramo: 'Autos'
      };
      return normalized;
    }
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

      // Get data from all tables without filtering
      const allResponses = await Promise.all(
        tables.map(async (table) => {
          try {
            const response = await tableService.getData(table.name);
            console.log(`Data from ${table.name}:`, {
              count: response.data?.length || 0,
              sample: response.data?.[0]
            });
            return { tableName: table.name, data: response.data || [] };
          } catch (error) {
            console.error(`Error fetching from ${table.name}:`, error);
            return { tableName: table.name, data: [] };
          }
        })
      );

      // Process all responses with better error handling and logging
      const allPolicies = allResponses.flatMap(({ tableName, data }) => {
        // Determine the type based on table name or data structure
        let policyType = 'other';
        if (tableName.toLowerCase().includes('gmm')) policyType = 'gmm';
        else if (tableName.toLowerCase().includes('auto')) policyType = 'autos';
        else if (tableName.toLowerCase().includes('mascota')) policyType = 'mascotas';
        
        const policies = data
          .map(policy => {
            try {
              let normalized;
              if (policyType === 'gmm' || policyType === 'autos') {
                normalized = normalizePolicy(policy, policyType);
              } else {
                // Handle other table types including mascotas
                normalized = {
                  id: policy.id,
                  numero_poliza: policy.numero_poliza || policy.id,
                  contratante: policy.contratante || policy.nombre || policy.nombre_contratante,
                  asegurado: policy.asegurado || policy.nombre || policy.nombre_contratante,
                  rfc: policy.rfc,
                  email: policy.email || policy.e_mail,
                  fecha_inicio: policy.fecha_inicio || policy.vigencia_inicio,
                  fecha_fin: policy.fecha_fin || policy.vigencia_fin,
                  prima_total: parseFloat(policy.prima_total || policy.pago_total || 0),
                  forma_pago: policy.forma_pago || 'No especificado',
                  aseguradora: policy.aseguradora || 'No especificada',
                  fecha_proximo_pago: calculateNextPaymentDate(
                    policy.fecha_inicio || policy.vigencia_inicio,
                    policy.forma_pago
                  ),
                  ramo: tableName
                };
              }
              if (!normalized) {
                console.warn(`Failed to normalize policy from ${tableName}:`, policy);
                return null;
              }
              return {
                ...normalized,
                sourceTable: tableName
              };
            } catch (error) {
              console.error(`Error normalizing policy from ${tableName}:`, policy, error);
              return null;
            }
          })
          .filter(Boolean);

        console.log(`Processed ${policies.length} policies from ${tableName}`);
        return policies;
      });

      // Improved duplicate detection
      const uniquePolicies = allPolicies.reduce((acc, policy) => {
        const key = `${policy.numero_poliza}_${policy.ramo}`;
        if (!acc[key] || new Date(policy.fecha_inicio) > new Date(acc[key].fecha_inicio)) {
          acc[key] = policy;
        }
        return acc;
      }, {});

      const finalPolicies = Object.values(uniquePolicies);

      console.log('Final policies count:', {
        total: allPolicies.length,
        unique: finalPolicies.length,
        byType: finalPolicies.reduce((acc, p) => {
          acc[p.ramo] = (acc[p.ramo] || 0) + 1;
          return acc;
        }, {}),
        bySource: finalPolicies.reduce((acc, p) => {
          acc[p.sourceTable] = (acc[p.sourceTable] || 0) + 1;
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

  const handleSendEmail = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Filter policies that are due today with proper date validation
    const duePolicies = filteredPolicies.filter(policy => {
      try {
        if (!policy.fecha_fin) {
          console.warn('Missing fecha_fin for policy:', policy.numero_poliza);
          return false;
        }
        
        const policyDate = parseDate(policy.fecha_fin);
        if (!policyDate || isNaN(policyDate.getTime())) {
          console.warn('Invalid fecha_fin for policy:', policy.numero_poliza, policy.fecha_fin);
          return false;
        }

        const policyDateStr = policyDate.toISOString().split('T')[0];
        return policyDateStr === todayStr;
      } catch (error) {
        console.error('Error processing policy date:', policy.numero_poliza, error);
        return false;
      }
    });

    console.log('Due policies:', duePolicies.map(p => ({
      numero_poliza: p.numero_poliza,
      fecha_fin: p.fecha_fin,
      parsed_date: parseDate(p.fecha_fin)
    })));

    if (duePolicies.length === 0) {
      setEmailStatus({ 
        type: 'error', 
        message: 'No hay pólizas que venzan hoy para enviar recordatorios' 
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
              <select
                className="filter-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {MONTHS.map((month, index) => (
                  <option key={month} value={index}>{month}</option>
                ))}
              </select>
            </div>
          )}
          <button
            className="send-email-btn"
            onClick={handleSendEmail}
            disabled={isSendingEmail || filteredPolicies.length === 0}
          >
            {isSendingEmail ? 'Enviando...' : 'Enviar por Email'}
          </button>
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
          {filteredPolicies.length === 0 ? (
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
          )}
        </div>
      )}
    </div>
  );
}