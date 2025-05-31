import React, { useState, useEffect } from 'react';
import directorioService from '../../services/directorioService';
import './PolicyModal.css';

const PolicyModal = ({ contacto, isOpen, onClose }) => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  useEffect(() => {
    if (isOpen && contacto) {
      loadPolicies();
    }
  }, [isOpen, contacto]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading policies for contact:', contacto.id);
      
      const data = await directorioService.getContactoPolicies(contacto.id);
      console.log('Policies data received:', data);
      
      setPolicies(data.policies || []);
    } catch (err) {
      console.error('Error loading policies:', err);
      setError('Error al cargar las pólizas');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-MX');
    } catch {
      return dateStr;
    }
  };

  const getPolicyTypeColor = (tabla) => {
    const colors = {
      'autos': '#4CAF50',
      'vida': '#2196F3',
      'gmm': '#FF9800',
      'hogar': '#9C27B0',
      'negocio': '#F44336',
      'diversos': '#607D8B',
      'rc': '#795548',
      'mascotas': '#E91E63',
      'transporte': '#009688'
    };
    return colors[tabla?.toLowerCase()] || '#757575';
  };

  const renderPolicyCard = (policy, index) => {
    const bgColor = getPolicyTypeColor(policy.tabla_origen);
    
    return (
      <div 
        key={`${policy.numero_poliza}-${index}`} 
        className="policy-card"
        style={{ borderLeftColor: bgColor }}
      >
        <div className="policy-header">
          <span 
            className="policy-type-badge"
            style={{ backgroundColor: bgColor }}
          >
            {policy.tabla_origen?.toUpperCase() || 'DESCONOCIDO'}
          </span>
          <span className="policy-number">
            #{policy.numero_poliza || 'Sin número'}
          </span>
        </div>
        
        <div className="policy-content">
          <div className="policy-main-info">
            <h4 className="policy-title">
              {policy.ramo || policy.aseguradora || 'Ramo no especificado'}
            </h4>
            <p className="policy-description">
              {policy.descripcion || policy.tipo_de_poliza || policy.contratante || 'Sin descripción'}
            </p>
          </div>

          <div className="policy-details">
            {policy.aseguradora && (
              <div className="policy-detail-row">
                <span className="detail-label">🏢 Aseguradora:</span>
                <span className="detail-value">{policy.aseguradora}</span>
              </div>
            )}
            
            {policy.contratante && (
              <div className="policy-detail-row">
                <span className="detail-label">👤 Contratante:</span>
                <span className="detail-value">{policy.contratante}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPolicyTable = () => {
    if (policies.length === 0) return null;

    return (
      <div className="policies-table-container">
        <table className="policies-table">
          <thead>
            <tr>
              <th>Ramo</th>
              <th>Número</th>
              <th>Descripción</th>
              <th>Aseguradora</th>
              <th>Contratante</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy, index) => (
              <tr key={`${policy.numero_poliza}-${index}`}>
                <td>
                  <span 
                    className="table-type-badge"
                    style={{ backgroundColor: getPolicyTypeColor(policy.tabla_origen) }}
                  >
                    {policy.tabla_origen?.toUpperCase() || 'N/A'}
                  </span>
                </td>
                <td className="policy-number-cell">
                  {policy.numero_poliza || 'Sin número'}
                </td>
                <td>
                  <strong>{policy.ramo || 'N/A'}</strong>
                  {policy.descripcion && (
                    <div className="policy-desc">{policy.descripcion}</div>
                  )}
                  {!policy.descripcion && policy.tipo_de_poliza && (
                    <div className="policy-desc">{policy.tipo_de_poliza}</div>
                  )}
                </td>
                <td>{policy.aseguradora || 'N/A'}</td>
                <td>{policy.contratante || contacto.nombre_completo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPolicyCloud = () => {
    if (policies.length === 0) return null;

    const policyTypes = policies.reduce((acc, policy) => {
      const type = policy.tabla_origen?.toUpperCase() || 'DESCONOCIDO';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="policy-cloud">
        <h4>Resumen de Pólizas</h4>
        <div className="cloud-tags">
          {Object.entries(policyTypes).map(([type, count]) => (
            <span 
              key={type}
              className="cloud-tag"
              style={{ 
                backgroundColor: getPolicyTypeColor(type),
                fontSize: `${Math.min(1.2 + (count * 0.2), 1.8)}rem`
              }}
            >
              {type} ({count})
            </span>
          ))}
        </div>
        <div className="cloud-summary">
          <span className="summary-item">
            <strong>Total:</strong> {policies.length}
          </span>
          <span className="summary-item">
            <strong>Tipos:</strong> {Object.keys(policyTypes).length}
          </span>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="policy-modal-overlay" onClick={onClose}>
      <div className="policy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="policy-modal-header">
          <h3>Pólizas de {contacto?.nombre_completo}</h3>
          <div className="modal-header-actions">
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Vista de tarjetas"
              >
                📋
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Vista de tabla"
              >
                📊
              </button>
            </div>
            <button className="close-button" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="policy-modal-content">
          {loading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Cargando pólizas...</p>
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>❌ {error}</p>
              <button onClick={loadPolicies} className="retry-button">
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && policies.length === 0 && (
            <div className="empty-state">
              <p>📄 No se encontraron pólizas para este contacto</p>
            </div>
          )}

          {!loading && !error && policies.length > 0 && (
            <>
              {renderPolicyCloud()}
              
              {viewMode === 'cards' ? (
                <div className="policies-grid">
                  {policies.map((policy, index) => renderPolicyCard(policy, index))}
                </div>
              ) : (
                renderPolicyTable()
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolicyModal; 