import { useState, useEffect } from 'react';
import './Reports.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const REPORT_TYPES = ['Vencimientos', 'Pagos Parciales'];

// This would come from your database - using GMM table structure
const SAMPLE_POLICIES = [
  {
    id: 1,
    numero_poliza: '130498652',
    contratante: 'Pablo Hernandez Garcia Cano',
    asegurado: 'Pablo Hernandez Garcia Cano',
    rfc: 'HEGP680704UN',
    fecha_inicio: '2024-04-20',
    fecha_fin: '2025-04-20',
    prima_total: 57643.47,
    derecho_poliza: 910,
    recargo_pago_fraccionado: 7950.82,
    iva: 3680.94,
    pago_total: 57643.47,
    forma_pago: 'Mensual',
    pagos_fraccionados: 12,
    pago_parcial: 4803.62, // pago_total / pagos_fraccionados
    aseguradora: 'GNP',
    status: 'Vigente'
  }
];

export default function Reports() {
  const [viewMode, setViewMode] = useState('table');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedType, setSelectedType] = useState('Vencimientos');
  const [filteredPolicies, setFilteredPolicies] = useState([]);

  // Helper function to calculate next payment date
  const calculateNextPayment = (startDate, paymentType, currentDate) => {
    const start = new Date(startDate);
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
    const paymentsElapsed = Math.floor(monthsDiff / interval);
    const nextPaymentMonth = new Date(start);
    nextPaymentMonth.setMonth(start.getMonth() + (paymentsElapsed + 1) * interval);
    
    return nextPaymentMonth;
  };

  useEffect(() => {
    const currentDate = new Date();
    currentDate.setMonth(selectedMonth);
    
    const filtered = SAMPLE_POLICIES.filter(policy => {
      if (selectedType === 'Vencimientos') {
        // Check if policy expires in selected month
        const expiryDate = new Date(policy.fecha_fin);
        return expiryDate.getMonth() === selectedMonth;
      } else {
        // Check if next payment is due in selected month
        const nextPayment = calculateNextPayment(policy.fecha_inicio, policy.forma_pago);
        return nextPayment.getMonth() === selectedMonth;
      }
    });

    setFilteredPolicies(filtered);
  }, [selectedMonth, selectedType]);

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2>Reportes</h2>
        <div className="reports-controls">
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
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Póliza</th>
                <th>Contratante</th>
                <th>Aseguradora</th>
                {selectedType === 'Vencimientos' ? (
                  <>
                    <th>Fecha Inicio</th>
                    <th>Fecha Fin</th>
                    <th>Prima Total</th>
                  </>
                ) : (
                  <>
                    <th>Forma de Pago</th>
                    <th>Pago Parcial</th>
                    <th>Próximo Pago</th>
                  </>
                )}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolicies.map(policy => (
                <tr key={policy.id}>
                  <td>{policy.numero_poliza}</td>
                  <td>{policy.contratante}</td>
                  <td>{policy.aseguradora}</td>
                  {selectedType === 'Vencimientos' ? (
                    <>
                      <td>{new Date(policy.fecha_inicio).toLocaleDateString()}</td>
                      <td>{new Date(policy.fecha_fin).toLocaleDateString()}</td>
                      <td>${policy.prima_total.toLocaleString()}</td>
                    </>
                  ) : (
                    <>
                      <td>{policy.forma_pago}</td>
                      <td>${policy.pago_parcial.toLocaleString()}</td>
                      <td>{calculateNextPayment(policy.fecha_inicio, policy.forma_pago).toLocaleDateString()}</td>
                    </>
                  )}
                  <td>
                    <span className={`status-badge status-${policy.status.toLowerCase()}`}>
                      {policy.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredPolicies.map(policy => (
            <div key={policy.id} className="report-card">
              <div className="card-header">
                <h3>{policy.numero_poliza}</h3>
                <span className="report-type">{policy.aseguradora}</span>
              </div>
              <div className="card-content">
                <div className="card-info">
                  <strong>{policy.contratante}</strong>
                  <span className={`status-badge status-${policy.status.toLowerCase()}`}>
                    {policy.status}
                  </span>
                </div>
                {selectedType === 'Vencimientos' ? (
                  <div className="card-details">
                    <p>Inicio: {new Date(policy.fecha_inicio).toLocaleDateString()}</p>
                    <p>Vencimiento: {new Date(policy.fecha_fin).toLocaleDateString()}</p>
                    <p className="card-amount">Prima Total: ${policy.prima_total.toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="card-details">
                    <p>Forma de Pago: {policy.forma_pago}</p>
                    <p>Pago Parcial: ${policy.pago_parcial.toLocaleString()}</p>
                    <p>Próximo Pago: {calculateNextPayment(policy.fecha_inicio, policy.forma_pago).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 