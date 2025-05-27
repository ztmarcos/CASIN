import React, { useState, useEffect } from 'react';
import directorioService from '../../services/directorioService';
import './RelationshipsView.css';

const RelationshipsView = () => {
  const [relationships, setRelationships] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactPolicies, setContactPolicies] = useState(null);
  const [loadingPolicies, setLoadingPolicies] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  useEffect(() => {
    loadRelationships();
  }, []);

  const loadRelationships = async () => {
    try {
      setLoading(true);
      const data = await directorioService.getRelationships();
      setRelationships(data.relationships || []);
      setSummary(data.summary || {});
      setError(null);
    } catch (err) {
      setError('Error al cargar las relaciones');
      console.error('Error loading relationships:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadContactPolicies = async (contactId) => {
    try {
      setLoadingPolicies(true);
      const data = await directorioService.getContactoPolicies(contactId);
      setContactPolicies(data);
    } catch (err) {
      console.error('Error loading contact policies:', err);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    loadContactPolicies(contact.id);
  };

  const getMatchTypeLabel = (matchType) => {
    switch (matchType) {
      case 'email_exact':
        return 'Email exacto';
      case 'name_similarity':
        return 'Similitud de nombre';
      default:
        return matchType;
    }
  };

  const getMatchTypeColor = (matchType) => {
    switch (matchType) {
      case 'email_exact':
        return '#28a745'; // Verde
      case 'name_similarity':
        return '#ffc107'; // Amarillo
      default:
        return '#6c757d'; // Gris
    }
  };

  const getSimilarityColor = (score) => {
    if (score >= 0.9) return '#28a745'; // Verde
    if (score >= 0.8) return '#ffc107'; // Amarillo
    return '#fd7e14'; // Naranja
  };

  const updateClientStatus = async () => {
    try {
      setUpdatingStatus(true);
      const result = await directorioService.updateClientStatus();
      
      if (result.success) {
        alert(`✅ ${result.message}\n\nContactos actualizados: ${result.updated_count}\n\nNuevas estadísticas:\n- Clientes: ${result.new_stats.cliente || 0}\n- Prospectos: ${result.new_stats.prospecto || 0}`);
        
        // Reload relationships to reflect changes
        await loadRelationships();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating client status:', error);
      alert(`❌ Error al actualizar el status: ${error.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const renderTableView = () => {
    return (
      <div className="relationships-table-container">
        <table className="relationships-table">
          <thead>
            <tr>
              <th>Contacto</th>
              <th>Email</th>
              <th>Status</th>
              <th>Pólizas</th>
              <th>Tablas</th>
              <th>Tipos de Match</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {relationships.map((relationship) => (
              <tr key={relationship.contacto.id}>
                <td className="contact-name">
                  {relationship.contacto.nombre}
                </td>
                <td className="contact-email">
                  {relationship.contacto.email}
                </td>
                <td>
                  <span className={`status-badge status-${relationship.contacto.status}`}>
                    {relationship.contacto.status}
                  </span>
                </td>
                <td className="policies-count">
                  {relationship.polizas.length}
                </td>
                <td className="tables-list">
                  {[...new Set(relationship.polizas.map(p => p.tabla))].join(', ').toUpperCase()}
                </td>
                <td className="match-types">
                  {[...new Set(relationship.polizas.map(p => getMatchTypeLabel(p.match_type)))].join(', ')}
                </td>
                <td>
                  <button 
                    onClick={() => handleContactClick(relationship.contacto)}
                    className="btn-view-details"
                  >
                    Ver Detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="relationships-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Analizando relaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relationships-container">
        <div className="error-message">
          {error}
          <button onClick={loadRelationships} className="btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relationships-container">
      <div className="relationships-header">
        <h1>🔗 Análisis de Relaciones</h1>
        <div className="header-actions">
          <div className="view-mode-buttons">
            <button 
              onClick={() => setViewMode('cards')}
              className={`view-mode-btn ${viewMode === 'cards' ? 'active' : ''}`}
            >
              📋 Tarjetas
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
            >
              📊 Tabla
            </button>
          </div>
          <button 
            onClick={updateClientStatus}
            disabled={updatingStatus}
            className="btn-update-status"
          >
            {updatingStatus ? '⏳ Actualizando...' : '🔄 Actualizar Status de Clientes'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="summary-section">
          <h2>Resumen de Relaciones</h2>
          <div className="summary-cards">
            <div className="summary-card">
              <h3>Total Relaciones</h3>
              <p className="summary-number">{summary.total_relationships}</p>
            </div>
            <div className="summary-card">
              <h3>Contactos con Pólizas</h3>
              <p className="summary-number">{summary.contacts_with_policies}</p>
            </div>
            <div className="summary-card">
              <h3>Matches por Email</h3>
              <p className="summary-number">{summary.by_match_type?.email_exact || 0}</p>
            </div>
            <div className="summary-card">
              <h3>Matches por Nombre</h3>
              <p className="summary-number">{summary.by_match_type?.name_similarity || 0}</p>
            </div>
          </div>

          {summary.by_table && (
            <div className="table-breakdown">
              <h3>Relaciones por Tabla</h3>
              <div className="table-stats">
                {Object.entries(summary.by_table).map(([table, count]) => (
                  <div key={table} className="table-stat">
                    <span className="table-name">{table.toUpperCase()}</span>
                    <span className="table-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="relationships-content">
        <div className="relationships-list">
          <h2>Contactos con Relaciones ({relationships.length})</h2>
          {relationships.length === 0 ? (
            <div className="no-relationships">
              <p>No se encontraron relaciones entre el directorio y las pólizas.</p>
            </div>
          ) : viewMode === 'table' ? (
            renderTableView()
          ) : (
            <div className="relationships-grid">
              {relationships.map((relationship) => (
                <div 
                  key={relationship.contacto.id} 
                  className="relationship-card"
                  onClick={() => handleContactClick(relationship.contacto)}
                >
                  <div className="contact-info">
                    <h3>{relationship.contacto.nombre}</h3>
                    <p className="contact-email">{relationship.contacto.email}</p>
                    <span className={`status-badge status-${relationship.contacto.status}`}>
                      {relationship.contacto.status}
                    </span>
                  </div>
                  
                  <div className="policies-summary">
                    <p className="policies-count">
                      {relationship.polizas.length} póliza{relationship.polizas.length !== 1 ? 's' : ''}
                    </p>
                    <div className="policies-preview">
                      {relationship.polizas.slice(0, 3).map((poliza, index) => (
                        <div key={index} className="policy-preview">
                          <span className="policy-table">{poliza.tabla.toUpperCase()}</span>
                          <span 
                            className="match-type"
                            style={{ backgroundColor: getMatchTypeColor(poliza.match_type) }}
                          >
                            {getMatchTypeLabel(poliza.match_type)}
                          </span>
                          <span 
                            className="similarity-score"
                            style={{ color: getSimilarityColor(poliza.similarity_score) }}
                          >
                            {Math.round(poliza.similarity_score * 100)}%
                          </span>
                        </div>
                      ))}
                      {relationship.polizas.length > 3 && (
                        <div className="more-policies">
                          +{relationship.polizas.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedContact && (
          <div className="contact-details">
            <div className="contact-details-header">
              <h2>Detalles de {selectedContact.nombre}</h2>
              <button 
                onClick={() => setSelectedContact(null)}
                className="btn-close"
              >
                ✕
              </button>
            </div>

            {loadingPolicies ? (
              <div className="loading-policies">
                <div className="spinner-small"></div>
                <p>Cargando pólizas...</p>
              </div>
            ) : contactPolicies ? (
              <div className="policies-details">
                <h3>Pólizas Encontradas ({contactPolicies.total_policies})</h3>
                {contactPolicies.policies.length === 0 ? (
                  <p>No se encontraron pólizas para este contacto.</p>
                ) : (
                  <div className="policies-list">
                    {contactPolicies.policies.map((policy, index) => (
                      <div key={index} className="policy-detail-card">
                        <div className="policy-header">
                          <h4>Póliza #{policy.numero_poliza}</h4>
                          <span className="policy-table-badge">
                            {policy.tabla_origen.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="policy-info">
                          <p><strong>Contratante:</strong> {policy.contratante}</p>
                          {policy.email && (
                            <p><strong>Email:</strong> {policy.email}</p>
                          )}
                          {policy.ramo && (
                            <p><strong>Ramo:</strong> {policy.ramo}</p>
                          )}
                          {policy.aseguradora && (
                            <p><strong>Aseguradora:</strong> {policy.aseguradora}</p>
                          )}
                          {policy.fecha_inicio && (
                            <p><strong>Fecha Inicio:</strong> {policy.fecha_inicio}</p>
                          )}
                          {policy.fecha_fin && (
                            <p><strong>Fecha Fin:</strong> {policy.fecha_fin}</p>
                          )}
                        </div>

                        <div className="match-info">
                          <span 
                            className="match-type-badge"
                            style={{ backgroundColor: getMatchTypeColor(policy.match_type) }}
                          >
                            {getMatchTypeLabel(policy.match_type)}
                          </span>
                          <span 
                            className="similarity-badge"
                            style={{ backgroundColor: getSimilarityColor(policy.similarity_score) }}
                          >
                            {Math.round(policy.similarity_score * 100)}% similitud
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default RelationshipsView; 