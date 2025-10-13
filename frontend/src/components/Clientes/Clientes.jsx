import React, { useState, useEffect } from 'react';
import firebaseClientesService from '../../services/firebaseClientesService';
import { toast } from 'react-hot-toast';
import './Clientes.css';
import { toDDMMMYYYY } from '../../utils/dateUtils';

const Clientes = () => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [stats, setStats] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterByStatus, setFilterByStatus] = useState('all');
  const [filterByRamo, setFilterByRamo] = useState('all');

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    filterAndSortClients();
  }, [clients, searchTerm, sortBy, sortOrder, filterByStatus, filterByRamo]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const [clientsData, statsData] = await Promise.all([
        firebaseClientesService.getAllClients(),
        firebaseClientesService.getClientStats()
      ]);
      
      setClients(clientsData);
      setStats(statsData);
      toast.success(`Cargados ${clientsData.length} clientes`);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortClients = () => {
    let filtered = [...clients];

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(client =>
        client.clientName.toLowerCase().includes(normalizedSearch) ||
        client.policies.some(policy => 
          policy.numero_poliza.toLowerCase().includes(normalizedSearch) ||
          policy.aseguradora.toLowerCase().includes(normalizedSearch)
        )
      );
    }

    // Filtrar por estado de pólizas
    if (filterByStatus !== 'all') {
      filtered = filtered.filter(client => {
        if (filterByStatus === 'active') return client.activePolicies > 0;
        if (filterByStatus === 'expired') return client.expiredPolicies > 0;
        if (filterByStatus === 'mixed') return client.activePolicies > 0 && client.expiredPolicies > 0;
        return true;
      });
    }

    // Filtrar por ramo
    if (filterByRamo !== 'all') {
      filtered = filtered.filter(client =>
        client.policies.some(policy => policy.ramo === filterByRamo)
      );
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        case 'policies':
          aValue = a.totalPolicies;
          bValue = b.totalPolicies;
          break;

        case 'active':
          aValue = a.activePolicies;
          bValue = b.activePolicies;
          break;
        default:
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredClients(filtered);
  };

  const handleRefresh = async () => {
    await loadClients();
  };

  const handleClientClick = (client) => {
    setSelectedClient(selectedClient?.id === client.id ? null : client);
  };



  const formatDate = (dateString) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    
    try {
      // Convert to DD/MMM/YYYY format
      const formattedDate = toDDMMMYYYY(dateString);
      return formattedDate || dateString;
      
    } catch (error) {
      console.error(`❌ Error formateando fecha ${dateString}:`, error);
      return dateString;
    }
  };

  const getStatusBadge = (client) => {
    if (client.activePolicies > 0 && client.expiredPolicies === 0) {
      return <span className="status-badge active">Activas</span>;
    } else if (client.activePolicies === 0 && client.expiredPolicies > 0) {
      return <span className="status-badge expired">Expiradas</span>;
    } else if (client.activePolicies > 0 && client.expiredPolicies > 0) {
      return <span className="status-badge mixed">Mixtas</span>;
    }
    return <span className="status-badge unknown">Desconocido</span>;
  };

  const getRamoOptions = () => {
    const ramos = new Set();
    clients.forEach(client => {
      client.policies.forEach(policy => {
        if (policy.ramo && policy.ramo !== 'N/A') {
          ramos.add(policy.ramo);
        }
      });
    });
    return Array.from(ramos).sort();
  };

  if (loading) {
    return (
      <div className="clientes-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando directorio de clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clientes-container">
      {/* Header */}
      <div className="clientes-header">
        <div className="header-left">
          <h1>📋 Directorio de Clientes</h1>
          <p>Directorio unificado de todos los clientes y sus pólizas</p>
        </div>
        <div className="header-right">
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            title="Actualizar datos"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{stats.totalClients}</div>
            <div className="stat-label">Total Clientes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalPolicies}</div>
            <div className="stat-label">Total Pólizas</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.activePolicies}</div>
            <div className="stat-label">Pólizas Activas</div>
          </div>

        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nombre, póliza o aseguradora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <select 
            value={filterByStatus} 
            onChange={(e) => setFilterByStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activas</option>
            <option value="expired">Solo expiradas</option>
            <option value="mixed">Mixtas</option>
          </select>

          <select 
            value={filterByRamo} 
            onChange={(e) => setFilterByRamo(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos los ramos</option>
            {getRamoOptions().map(ramo => (
              <option key={ramo} value={ramo}>{ramo}</option>
            ))}
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="name">Ordenar por nombre</option>
            <option value="policies">Ordenar por pólizas</option>

            <option value="active">Ordenar por activas</option>
          </select>

          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="sort-btn"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="results-info">
        Mostrando {filteredClients.length} de {clients.length} clientes
      </div>

      {/* Clients List */}
      <div className="clients-list">
        {filteredClients.map(client => (
          <div 
            key={client.id} 
            className={`client-card ${selectedClient?.id === client.id ? 'expanded' : ''}`}
            onClick={() => handleClientClick(client)}
          >
            <div className="client-header">
              <div className="client-info">
                <h3 className="client-name">{client.clientName}</h3>
                <div className="client-meta">
                  <span className="policy-count">
                    📄 {client.totalPolicies} póliza{client.totalPolicies !== 1 ? 's' : ''}
                  </span>

                  {getStatusBadge(client)}
                </div>
              </div>
              <div className="client-actions">
                <span className="expand-icon">
                  {selectedClient?.id === client.id ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {/* Expanded Details */}
            {selectedClient?.id === client.id && (
              <div className="client-details">
                <div className="policies-section">
                  <h4>📋 Pólizas ({client.policies.length})</h4>
                  <div className="policies-grid">
                    {client.policies.map((policy, index) => (
                      <div key={`${policy.id}-${index}`} className="policy-card">
                        <div className="policy-header">
                          <span className="policy-number">#{policy.numero_poliza}</span>
                          <span className="policy-ramo">{policy.ramo}</span>
                        </div>
                        <div className="policy-details">
                          <p><strong>Aseguradora:</strong> {policy.aseguradora}</p>
                          <p><strong>Vigencia:</strong> {formatDate(policy.vigencia_inicio)} - {formatDate(policy.vigencia_fin)}</p>
                          <p><strong>Prima:</strong> {policy.prima_total}</p>
                          <p><strong>Forma de Pago:</strong> {policy.forma_pago}</p>
                          {policy.email !== 'N/A' && (
                            <p><strong>Email:</strong> {policy.email}</p>
                          )}
                          {policy.telefono !== 'N/A' && (
                            <p><strong>Teléfono:</strong> {policy.telefono}</p>
                          )}
                          {policy.direccion !== 'N/A' && (
                            <p><strong>Dirección:</strong> {policy.direccion}</p>
                          )}
                        </div>
                        <div className="policy-footer">
                          <span className="policy-table">Tabla: {policy.tableName}</span>
                          {policy.pdf !== 'N/A' && (
                            <a 
                              href={policy.pdf} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="pdf-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              📄 Ver PDF
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="client-summary">
                  <div className="summary-item">
                    <span className="summary-label">Pólizas Activas:</span>
                    <span className="summary-value active">{client.activePolicies}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Pólizas Expiradas:</span>
                    <span className="summary-value expired">{client.expiredPolicies}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Ramos:</span>
                    <span className="summary-value">{client.collections.join(', ')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredClients.length === 0 && !loading && (
        <div className="no-results">
          <p>No se encontraron clientes con los filtros aplicados</p>
        </div>
      )}
    </div>
  );
};

export default Clientes;
