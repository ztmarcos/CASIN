import { useState, useEffect } from 'react';
import './Reports.css';
import tableService from '../../services/data/tableService';
import { sendReportEmail } from '../../services/reportEmailService';
import { formatDate, parseDate, getDateFormatOptions } from '../../utils/dateUtils';

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

  const normalizePolicy = (policy, source) => {
    if (source === 'gmm') {
      const normalized = {
        id: policy.id,
        numero_poliza: policy.n__mero_de_p__liza,
        contratante: policy.contratante,
        asegurado: policy.nombre_del_asegurado,
        rfc: policy.rfc,
        email: policy.e_mail || policy.email,
        fecha_inicio: policy.vigencia__inicio_,
        fecha_fin: policy.vigencia__fin_,
        prima_neta: parseFloat(policy.prima_neta || 0),
        prima_total: parseFloat(policy.prima_total || policy.pago_total || policy.importe_total_a_pagar || 0),
        derecho_poliza: parseFloat(policy.derecho_de_p__liza || 0),
        recargo_pago_fraccionado: parseFloat(policy.recargo_por_pago_fraccionado || 0),
        iva: parseFloat(policy.i_v_a__16_ || 0),
        pago_total: parseFloat(policy.pago_total || policy.prima_total || policy.importe_total_a_pagar || 0),
        forma_pago: policy.forma_de_pago,
        pagos_fraccionados: policy.pagos_fraccionados,
        pago_parcial: policy.monto_parcial,
        aseguradora: policy.aseguradora,
        status: 'Vigente',
        fecha_proximo_pago: calculateNextPaymentDate(policy.vigencia__inicio_, policy.forma_de_pago),
        ramo: 'GMM'
      };
      return normalized;
    } else if (source === 'autos') {
      const normalized = {
        id: policy.id,
        numero_poliza: policy.numero_de_poliza,
        contratante: policy.nombre_contratante,
        asegurado: policy.nombre_contratante,
        rfc: policy.rfc,
        email: policy.e_mail || policy.email,
        fecha_inicio: policy.vigencia_inicio,
        fecha_fin: policy.vigencia_fin,
        prima_neta: parseFloat(policy.prima_neta || 0),
        prima_total: parseFloat(policy.prima_total || policy.pago_total || policy.pago_total_o_prima_total || 0),
        derecho_poliza: parseFloat(policy.derecho_de_poliza || 0),
        recargo_pago_fraccionado: parseFloat(policy.recargo_por_pago_fraccionado || 0),
        iva: parseFloat(policy.i_v_a || 0),
        pago_total: parseFloat(policy.pago_total || policy.prima_total || policy.pago_total_o_prima_total || 0),
        forma_pago: policy.forma_de_pago,
        pagos_fraccionados: null,
        pago_parcial: null,
        aseguradora: policy.aseguradora,
        status: 'Vigente',
        fecha_proximo_pago: calculateNextPaymentDate(policy.vigencia_inicio, policy.forma_de_pago),
        ramo: 'Autos'
      };
      return normalized;
    }
    return null;
  };

  useEffect(() => {
    const fetchPolicies = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [gmmResponse, autosResponse] = await Promise.all([
          tableService.getData('gmm'),
          tableService.getData('autos')
        ]);

        const gmmPolicies = (gmmResponse.data || [])
          .map(policy => normalizePolicy(policy, 'gmm'))
          .filter(Boolean);
        
        const autosPolicies = (autosResponse.data || [])
          .map(policy => normalizePolicy(policy, 'autos'))
          .filter(Boolean);

        setPolicies([...gmmPolicies, ...autosPolicies]);
      } catch (err) {
        console.error('Error fetching policies:', err);
        setError('Failed to load policies data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  // Helper function to check if a value matches the search term
  const matchesSearch = (value, term) => {
    if (!term.trim()) return true;
    if (!value) return false;
    return value.toString().toLowerCase().includes(term.toLowerCase());
  };

  useEffect(() => {
    const currentDate = new Date();
    
    const filtered = policies.filter(policy => {
      if (!policy) return false;

      // Verificación más estricta para forma de pago anual
      const isAnnualPayment = policy.forma_pago?.toUpperCase().includes('ANUAL') || 
                             policy.forma_pago?.toUpperCase() === 'ANNUAL' ||
                             policy.forma_pago?.toUpperCase() === 'YEARLY';

      // Si estamos en vista de Cobro y es pago anual, excluir la póliza
      if (selectedType === 'Cobro' && isAnnualPayment) {
        return false;
      }

      if (searchTerm.trim()) {
        return (
          matchesSearch(policy.numero_poliza, searchTerm) ||
          matchesSearch(policy.contratante, searchTerm) ||
          matchesSearch(policy.asegurado, searchTerm) ||
          matchesSearch(policy.rfc, searchTerm) ||
          matchesSearch(policy.aseguradora, searchTerm) ||
          matchesSearch(policy.forma_pago, searchTerm)
        );
      }

      if (selectedType === 'Vencimientos') {
        const expiryDate = parseDate(policy.fecha_fin);
        if (!expiryDate) {
          console.warn('Invalid or missing date for policy:', policy.numero_poliza, policy.fecha_fin);
          return false;
        }
        return expiryDate.getMonth() === selectedMonth;
      } else {
        // Solo procesar pagos parciales para formas de pago no anuales
        if (isAnnualPayment) return false;
        const nextPayment = calculateNextPaymentDate(policy.fecha_inicio, policy.forma_pago);
        return nextPayment && nextPayment.getMonth() === selectedMonth;
      }
    });

    const sortedFiltered = filtered.sort((a, b) => {
      const dateA = parseDate(a.fecha_fin);
      const dateB = parseDate(b.fecha_fin);
      if (!dateA || !dateB) return 0;
      return dateA - dateB;
    });

    console.log('Filtered policies:', sortedFiltered.map(p => ({
      numero_poliza: p.numero_poliza,
      fecha_fin: p.fecha_fin,
      parsed_date: parseDate(p.fecha_fin)
    })));

    setFilteredPolicies(sortedFiltered);
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
      ) : viewMode === 'table' ? (
        <div className="table-container">
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
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={11} className="no-data">
                    No se encontraron pólizas
                  </td>
                </tr>
              ) : (
                filteredPolicies.map(policy => (
                  <tr key={`${policy.id}-${policy.numero_poliza}`}>
                    <td>{policy.ramo}</td>
                    <td>{policy.numero_poliza}</td>
                    <td>{policy.contratante}</td>
                    <td>{policy.email || 'No disponible'}</td>
                    <td>{policy.aseguradora}</td>
                    <td>{formatDate(policy.fecha_inicio, dateFormat)}</td>
                    <td>{formatDate(policy.fecha_fin, dateFormat)}</td>
                    <td>${policy.prima_total.toLocaleString()}</td>
                    <td>{policy.forma_pago}</td>
                    <td>{policy.fecha_proximo_pago ? formatDate(policy.fecha_proximo_pago, dateFormat) : 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${policy.status.toLowerCase()}`}>
                        {policy.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredPolicies.length === 0 ? (
            <div className="no-data">
              No se encontraron pólizas
            </div>
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
                  <span className={`status-badge status-${policy.status.toLowerCase()}`}>
                    {policy.status}
                  </span>
                </div>
                <div className="card-content">
                  <div className="card-info">
                    <strong>Contratante: {policy.contratante}</strong>
                  </div>
                  <div className="card-details">
                    {!expandedCards[`${policy.id}-${policy.numero_poliza}`] ? (
                      // Información básica cuando no está expandida
                      <>
                        <p><span>Vencimiento:</span> {formatDate(policy.fecha_fin)}</p>
                        <p><span>Prima Total:</span> ${policy.prima_total.toLocaleString()}</p>
                        <p><span>Forma de Pago:</span> {policy.forma_pago}</p>
                      </>
                    ) : (
                      // Información completa cuando está expandida
                      <>
                        <p><span>Email:</span> {policy.email || 'No disponible'}</p>
                        <p><span>RFC:</span> {policy.rfc || 'No disponible'}</p>
                        <p><span>Asegurado:</span> {policy.asegurado || 'No disponible'}</p>
                        <p><span>Inicio:</span> {formatDate(policy.fecha_inicio)}</p>
                        <p><span>Vencimiento:</span> {formatDate(policy.fecha_fin)}</p>
                        <p><span>Forma de Pago:</span> {policy.forma_pago}</p>
                        <div className="card-section">
                          <h4>Información de Pagos</h4>
                          <p><span>Prima Neta:</span> ${policy.prima_neta.toLocaleString()}</p>
                          <p><span>Derecho de Póliza:</span> ${policy.derecho_poliza.toLocaleString()}</p>
                          <p><span>Recargo por Pago Fraccionado:</span> ${policy.recargo_pago_fraccionado.toLocaleString()}</p>
                          <p><span>IVA:</span> ${policy.iva.toLocaleString()}</p>
                          <p className="card-amount"><span>Prima Total:</span> ${policy.pago_total.toLocaleString()}</p>
                          {policy.pagos_fraccionados && (
                            <p><span>Pagos Fraccionados:</span> {policy.pagos_fraccionados}</p>
                          )}
                          {policy.pago_parcial && (
                            <p><span>Pago Parcial:</span> ${policy.pago_parcial.toLocaleString()}</p>
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