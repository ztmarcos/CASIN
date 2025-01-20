import { useState, useEffect } from 'react';
import './Reports.css';
import tableService from '../../services/data/tableService';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const REPORT_TYPES = ['Vencimientos', 'Pagos Parciales'];

const formatearFecha = (fecha) => {
  const date = new Date(fecha);
  const dia = date.getDate();
  const mes = MESES[date.getMonth()];
  const año = date.getFullYear();
  return `${dia} de ${mes} ${año}`;
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

  // Helper function to normalize policy data from different tables
  const normalizePolicy = (policy, source) => {
    if (source === 'gmm') {
      return {
        id: policy.id,
        numero_poliza: policy.n__mero_de_p__liza,
        contratante: policy.contratante,
        asegurado: policy.nombre_del_asegurado,
        rfc: policy.rfc,
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
        status: 'Vigente', // You might want to calculate this based on dates
        tipo: 'GMM'
      };
    } else if (source === 'autos') {
      return {
        id: policy.id,
        numero_poliza: policy.numero_de_poliza,
        contratante: policy.nombre_contratante,
        asegurado: policy.nombre_contratante, // Assuming same as contratante for autos
        rfc: policy.rfc,
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
        status: 'Vigente', // You might want to calculate this based on dates
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
        // Fetch data from both GMM and autos tables
        const [gmmResponse, autosResponse] = await Promise.all([
          tableService.getData('gmm'),
          tableService.getData('autos')
        ]);

        // Normalize and combine the data
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

      // If there's a search term, search across all fields without any filters
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

      // Only apply filters if there's no search term
      if (selectedType === 'Vencimientos') {
        const expiryDate = new Date(policy.fecha_fin);
        return !isNaN(expiryDate.getTime()) && expiryDate.getMonth() === selectedMonth;
      } else {
        const nextPayment = calculateNextPayment(policy.fecha_inicio, policy.forma_pago);
        return nextPayment && nextPayment.getMonth() === selectedMonth;
      }
    });

    // Sort results by fecha_fin for better readability
    const sortedFiltered = filtered.sort((a, b) => {
      const dateA = new Date(a.fecha_fin);
      const dateB = new Date(b.fecha_fin);
      return dateA - dateB;
    });

    setFilteredPolicies(sortedFiltered);
  }, [selectedMonth, selectedType, policies, searchTerm]);

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
          {/* Only show filters when not searching */}
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
      ) : viewMode === 'table' ? (
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Póliza</th>
                <th>Contratante</th>
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
                  <td colSpan={9} className="no-data">
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
                    <td>{policy.aseguradora}</td>
                    <td>{formatearFecha(policy.fecha_inicio)}</td>
                    <td>{formatearFecha(policy.fecha_fin)}</td>
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
                    <p>Inicio: {formatearFecha(policy.fecha_inicio)}</p>
                    <p>Vencimiento: {formatearFecha(policy.fecha_fin)}</p>
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