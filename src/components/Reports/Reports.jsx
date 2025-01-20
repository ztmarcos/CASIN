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

  // Helper function to normalize policy data from different tables
  const normalizePolicy = (policy, source) => {
    if (source === 'gmm') {
      return {
        id: policy.id,
        numero_poliza: policy.n__mero_de_p__liza,
        contratante: policy.contratante,
        asegurado: policy.nombre_del_asegurado,
        rfc: policy.rfc,
        email: policy.e_mail || policy.email,
        fecha_inicio: policy.vigencia__inicio_,
        fecha_fin: policy.vigencia__fin_,
        prima_total: parseFloat(policy.prima_neta || 0),
        derecho_poliza: parseFloat(policy.derecho_de_p__liza || 0),
        recargo_pago_fraccionado: parseFloat(policy.recargo_por_pago_fraccionado || 0),
        iva: parseFloat(policy.i_v_a__16_ || 0),
        pago_total: parseFloat(policy.importe_total_a_pagar || 0),
        forma_pago: policy.forma_de_pago,
        pagos_fraccionados: policy.pagos_fraccionados,
        pago_parcial: policy.monto_parcial,
        aseguradora: policy.aseguradora,
        status: 'Vigente',
        tipo: 'GMM'
      };
    } else if (source === 'autos') {
      return {
        id: policy.id,
        numero_poliza: policy.numero_de_poliza,
        contratante: policy.nombre_contratante,
        asegurado: policy.nombre_contratante,
        rfc: policy.rfc,
        email: policy.e_mail || policy.email,
        fecha_inicio: policy.vigencia_inicio,
        fecha_fin: policy.vigencia_fin,
        prima_total: parseFloat(policy.prima_neta || 0),
        derecho_poliza: parseFloat(policy.derecho_de_poliza || 0),
        recargo_pago_fraccionado: parseFloat(policy.recargo_por_pago_fraccionado || 0),
        iva: parseFloat(policy.i_v_a || 0),
        pago_total: parseFloat(policy.pago_total_o_prima_total || 0),
        forma_pago: policy.forma_de_pago,
        pagos_fraccionados: null,
        pago_parcial: null,
        aseguradora: policy.aseguradora,
        status: 'Vigente',
        tipo: 'Auto'
      };
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

  // Helper function to calculate next payment date
  const calculateNextPayment = (startDate, paymentType, currentDate) => {
    if (!startDate || !paymentType) return null;
    
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return null;
    
    const current = currentDate || new Date();
    const monthsDiff = (current.getFullYear() - start.getFullYear()) * 12 + 
                      (current.getMonth() - start.getMonth());
    
    const paymentIntervals = {
      'Mensual': 1,
      'Trimestral': 3,
      'Semestral': 6,
      'Anual': 12
    };

    const interval = paymentIntervals[paymentType];
    if (!interval) return null;
    
    const paymentsElapsed = Math.floor(monthsDiff / interval);
    const nextPaymentMonth = new Date(start);
    nextPaymentMonth.setMonth(start.getMonth() + (paymentsElapsed + 1) * interval);
    
    return nextPaymentMonth;
  };

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

      if (searchTerm.trim()) {
        return (
          matchesSearch(policy.numero_poliza, searchTerm) ||
          matchesSearch(policy.contratante, searchTerm) ||
          matchesSearch(policy.asegurado, searchTerm) ||
          matchesSearch(policy.rfc, searchTerm) ||
          matchesSearch(policy.aseguradora, searchTerm) ||
          matchesSearch(policy.forma_pago, searchTerm) ||
          matchesSearch(policy.tipo, searchTerm)
        );
      }

      if (selectedType === 'Vencimientos') {
        const expiryDate = parseDate(policy.fecha_fin);
        
        console.log('Checking policy:', {
          policy_number: policy.numero_poliza,
          fecha_fin: policy.fecha_fin,
          parsed_date: expiryDate,
          month: expiryDate?.getMonth(),
          selectedMonth,
          matches: expiryDate?.getMonth() === selectedMonth
        });
        
        if (!expiryDate) {
          console.warn('Invalid or missing date for policy:', policy.numero_poliza, policy.fecha_fin);
          return false;
        }
        
        return expiryDate.getMonth() === selectedMonth;
      } else {
        const nextPayment = calculateNextPayment(policy.fecha_inicio, policy.forma_pago);
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
      tipo: p.tipo,
      parsed_date: parseDate(p.fecha_fin)
    })));

    setFilteredPolicies(sortedFiltered);
  }, [selectedMonth, selectedType, policies, searchTerm]);

  const handleSendEmail = async () => {
    if (filteredPolicies.length === 0) {
      setEmailStatus({ type: 'error', message: 'No hay pólizas para enviar' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      await sendReportEmail(filteredPolicies, selectedType);
      setEmailStatus({ 
        type: 'success', 
        message: `Reporte de ${selectedType} enviado exitosamente` 
      });
    } catch (error) {
      setEmailStatus({ 
        type: 'error', 
        message: 'Error al enviar el reporte por email' 
      });
    } finally {
      setIsSendingEmail(false);
    }
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
              onClick={() => setViewMode('table')}
            >
              ▦ Tabla
            </button>
            <button
              className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              ▤ Tarjetas
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
              <select
                className="filter-select"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                {getDateFormatOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
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
                <th>Tipo</th>
                <th>Póliza</th>
                <th>Contratante</th>
                <th>Email</th>
                <th>Aseguradora</th>
                <th>Fecha Inicio</th>
                <th>Fecha Fin</th>
                <th>Prima Total</th>
                <th>Forma de Pago</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="no-data">
                    No se encontraron pólizas
                  </td>
                </tr>
              ) : (
                filteredPolicies.map(policy => (
                  <tr key={`${policy.id}-${policy.numero_poliza}`}>
                    <td>
                      <span className={`policy-type ${policy.tipo.toLowerCase()}`}>
                        {policy.tipo}
                      </span>
                    </td>
                    <td>{policy.numero_poliza}</td>
                    <td>{policy.contratante}</td>
                    <td>{policy.email || 'No disponible'}</td>
                    <td>{policy.aseguradora}</td>
                    <td>{formatDate(policy.fecha_inicio, dateFormat)}</td>
                    <td>{formatDate(policy.fecha_fin, dateFormat)}</td>
                    <td>${policy.prima_total.toLocaleString()}</td>
                    <td>{policy.forma_pago}</td>
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
              <div key={`${policy.id}-${policy.numero_poliza}`} className="report-card">
                <div className="card-header">
                  <div className="card-header-content">
                    <span className={`policy-type ${policy.tipo.toLowerCase()}`}>
                      {policy.tipo}
                    </span>
                    <h3>{policy.numero_poliza}</h3>
                  </div>
                  <span className="report-type">{policy.aseguradora}</span>
                </div>
                <div className="card-content">
                  <div className="card-info">
                    <strong>{policy.contratante}</strong>
                    <span className={`status-badge status-${policy.status.toLowerCase()}`}>
                      {policy.status}
                    </span>
                  </div>
                  <div className="card-details">
                    <p>Email: {policy.email || 'No disponible'}</p>
                    <p>Inicio: {formatDate(policy.fecha_inicio, dateFormat)}</p>
                    <p>Vencimiento: {formatDate(policy.fecha_fin, dateFormat)}</p>
                    <p>Forma de Pago: {policy.forma_pago}</p>
                    <p className="card-amount">Prima Total: ${policy.prima_total.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}