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
  const [editingMetadata, setEditingMetadata] = useState({
    clientName: '',
    emailPersonal: '',
    telefonoCasa: '',
    telefonoTrabajo: '',
    telefonoCelular: '',
    ocupacion: '',
    notas: ''
  });
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClientMetadata, setNewClientMetadata] = useState({
    clientName: '',
    emailPersonal: '',
    telefonoCasa: '',
    telefonoTrabajo: '',
    telefonoCelular: '',
    ocupacion: '',
    notas: ''
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState(null);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [policiesExpanded, setPoliciesExpanded] = useState(false);
  const [editingField, setEditingField] = useState(null);

  // Primer valor no vacío de las pólizas (para mostrar en directorio, solo lectura)
  const getFirstFromPolicies = (policies, field) => {
    if (!policies?.length) return '';
    const key = field === 'telefono' ? 'telefono' : field;
    const found = policies.find(p => p[key] && p[key] !== 'N/A');
    return found ? String(found[key]).trim() : '';
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (!selectedClient) return;
    setEditingMetadata({
      clientName: selectedClient.clientName ?? '',
      emailPersonal: selectedClient.emailPersonal ?? '',
      telefonoCasa: selectedClient.telefonoCasa ?? '',
      telefonoTrabajo: selectedClient.telefonoTrabajo ?? '',
      telefonoCelular: selectedClient.telefonoCelular ?? '',
      ocupacion: selectedClient.ocupacion ?? '',
      notas: selectedClient.notas ?? ''
    });
    setPoliciesExpanded(false);
    setEditingField(null);
  }, [selectedClient?.id]);

  useEffect(() => {
    filterAndSortClients();
  }, [clients, searchTerm, sortBy, sortOrder, filterByStatus, filterByRamo]);

  const loadClients = async (silent = false, keepSelectedId = null, forceRefresh = false) => {
    try {
      if (!silent) setLoading(true);
      const [clientsData, statsData] = await Promise.all([
        firebaseClientesService.getAllClients(forceRefresh),
        firebaseClientesService.getClientStats()
      ]);
      setClients(clientsData);
      setStats(statsData);
      if (keepSelectedId) {
        const next = clientsData.find(c => c.id === keepSelectedId);
        if (next) setSelectedClient(next);
      }
      if (!silent) toast.success(`Cargados ${clientsData.length} clientes`);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Error al cargar los clientes');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const filterAndSortClients = () => {
    let filtered = [...clients];

    // Filtrar por término de búsqueda
    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(client =>
        (client.clientName && String(client.clientName).toLowerCase().includes(normalizedSearch)) ||
        client.policies.some(policy =>
          (policy.numero_poliza != null && String(policy.numero_poliza).toLowerCase().includes(normalizedSearch)) ||
          (policy.aseguradora != null && String(policy.aseguradora).toLowerCase().includes(normalizedSearch))
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
          aValue = String(a.clientName ?? '').toLowerCase();
          bValue = String(b.clientName ?? '').toLowerCase();
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
          aValue = String(a.clientName ?? '').toLowerCase();
          bValue = String(b.clientName ?? '').toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredClients(filtered);
  };

  const handleClientClick = (client) => {
    setSelectedClient(selectedClient?.id === client.id ? null : client);
  };

  const handleSaveMetadata = async (e) => {
    e?.stopPropagation();
    if (!selectedClient) return;
    const name = String(editingMetadata.clientName ?? '').trim();
    const meta = {
      clientName: name || selectedClient.clientName || selectedClient.id,
      emailPersonal: editingMetadata.emailPersonal ?? '',
      telefonoCasa: editingMetadata.telefonoCasa ?? '',
      telefonoTrabajo: editingMetadata.telefonoTrabajo ?? '',
      telefonoCelular: editingMetadata.telefonoCelular ?? '',
      ocupacion: editingMetadata.ocupacion ?? '',
      notas: editingMetadata.notas ?? ''
    };
    try {
      setSavingMetadata(true);
      await firebaseClientesService.updateClientMetadata(selectedClient.id, meta);
      await loadClients(true, selectedClient?.id);
      toast.success('Datos guardados');
    } catch (err) {
      console.error('Error saving client metadata:', err);
      toast.error('Error al guardar');
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleCreateClient = async (e) => {
    e?.preventDefault();
    const name = String(newClientMetadata.clientName ?? '').trim();
    if (!name) {
      toast.error('Escribe el nombre del cliente');
      return;
    }
    try {
      setCreatingClient(true);
      await firebaseClientesService.createClient(newClientMetadata);
      setNewClientMetadata({
        clientName: '',
        emailPersonal: '',
        telefonoCasa: '',
        telefonoTrabajo: '',
        telefonoCelular: '',
        ocupacion: '',
        notas: ''
      });
      setShowCreateClient(false);
      await loadClients(true);
      toast.success('Cliente creado');
    } catch (err) {
      console.error('Error creating client:', err);
      toast.error(err.message || 'Error al crear cliente');
    } finally {
      setCreatingClient(false);
    }
  };

  const togglePolicies = (e) => {
    e.stopPropagation();
    setPoliciesExpanded(prev => !prev);
  };

  const handleDeleteClient = async (e) => {
    e?.stopPropagation();
    if (!selectedClient) return;
    if (selectedClient.totalPolicies > 0) {
      toast.error('No se puede borrar: el cliente tiene pólizas asociadas.');
      return;
    }
    if (!window.confirm(`¿Borrar al cliente "${selectedClient.clientName}"? Esta acción no se puede deshacer.`)) return;
    try {
      setDeletingClientId(selectedClient.id);
      await firebaseClientesService.deleteClient(selectedClient.id);
      setSelectedClient(null);
      await loadClients(true);
      toast.success('Cliente eliminado');
    } catch (err) {
      console.error('Error deleting client:', err);
      toast.error(err.message || 'Error al eliminar');
    } finally {
      setDeletingClientId(null);
    }
  };



  const formatDate = (dateString) => {
    if (dateString == null || dateString === '' || String(dateString).trim() === '' || String(dateString) === 'N/A') return '—';
    try {
      const formatted = toDDMMMYYYY(dateString);
      return formatted || '—';
    } catch (error) {
      return '—';
    }
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
      </div>

      {showCreateClient && (
        <div className="create-client-overlay" onClick={() => setShowCreateClient(false)}>
          <div className="create-client-modal create-client-modal-full" onClick={(e) => e.stopPropagation()}>
            <h3>Crear cliente</h3>
            <form onSubmit={handleCreateClient} className="create-client-form">
              <div className="create-client-field">
                <label>Nombre</label>
                <input
                  type="text"
                  placeholder="Nombre completo del cliente"
                  value={newClientMetadata.clientName}
                  onChange={(e) => setNewClientMetadata(prev => ({ ...prev, clientName: e.target.value }))}
                  className="create-client-input"
                  required
                  autoFocus
                />
              </div>
              <div className="create-client-field">
                <label>E-mail personal</label>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={newClientMetadata.emailPersonal}
                  onChange={(e) => setNewClientMetadata(prev => ({ ...prev, emailPersonal: e.target.value }))}
                  className="create-client-input"
                />
              </div>
              <div className="create-client-field">
                <label>Tel. casa</label>
                <input
                  type="tel"
                  value={newClientMetadata.telefonoCasa}
                  onChange={(e) => setNewClientMetadata(prev => ({ ...prev, telefonoCasa: e.target.value }))}
                  className="create-client-input"
                />
              </div>
              <div className="create-client-field">
                <label>Tel. trabajo</label>
                <input
                  type="tel"
                  value={newClientMetadata.telefonoTrabajo}
                  onChange={(e) => setNewClientMetadata(prev => ({ ...prev, telefonoTrabajo: e.target.value }))}
                  className="create-client-input"
                />
              </div>
              <div className="create-client-field">
                <label>Tel. celular</label>
                <input
                  type="tel"
                  value={newClientMetadata.telefonoCelular}
                  onChange={(e) => setNewClientMetadata(prev => ({ ...prev, telefonoCelular: e.target.value }))}
                  className="create-client-input"
                />
              </div>
              <div className="create-client-field">
                <label>Ocupación</label>
                <input
                  type="text"
                  placeholder="Ej. Empresario, Contador..."
                  value={newClientMetadata.ocupacion}
                  onChange={(e) => setNewClientMetadata(prev => ({ ...prev, ocupacion: e.target.value }))}
                  className="create-client-input"
                />
              </div>
              <div className="create-client-field">
                <label>Notas</label>
                <textarea
                  placeholder="Notas sobre el cliente..."
                  value={newClientMetadata.notas}
                  onChange={(e) => setNewClientMetadata(prev => ({ ...prev, notas: e.target.value }))}
                  className="create-client-textarea"
                  rows={3}
                />
              </div>
              <div className="create-client-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateClient(false)}>
                  Cancelar
                </button>
                <button type="submit" className="metadata-save-btn" disabled={creatingClient}>
                  {creatingClient ? 'Creando…' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card stat-card--clients">
            <div className="stat-icon" aria-hidden="true">👥</div>
            <div className="stat-metric">
              <div className="stat-number">{stats.totalClients}</div>
              <div className="stat-label">Total Clientes</div>
            </div>
          </div>
          <div className="stat-card stat-card--policies">
            <div className="stat-icon" aria-hidden="true">📄</div>
            <div className="stat-metric">
              <div className="stat-number">{stats.totalPolicies}</div>
              <div className="stat-label">Total Pólizas</div>
            </div>
          </div>
          <div className="stat-card stat-card--active">
            <div className="stat-icon" aria-hidden="true">✅</div>
            <div className="stat-metric">
              <div className="stat-number">{stats.activePolicies}</div>
              <div className="stat-label">Pólizas pvigentes</div>
            </div>
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
            <option value="active">Solo pvigentes</option>
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

            <option value="active">Ordenar por pvigentes</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="sort-btn"
            title={sortOrder === 'asc' ? 'Orden A-Z (clic para Z-A)' : 'Orden Z-A (clic para A-Z)'}
          >
            <span className="sort-btn-label">{sortOrder === 'asc' ? 'A-Z' : 'Z-A'}</span>
            <span className="sort-btn-arrow">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          </button>
        </div>
      </div>

      {/* Results count + Nuevo cliente abajo */}
      <div className="results-row">
        <span className="results-info">
          Mostrando {filteredClients.length} de {clients.length} clientes
        </span>
        <button
          type="button"
          className="btn-create-client"
          onClick={() => {
            setShowCreateClient(true);
            setNewClientMetadata({
              clientName: '',
              emailPersonal: '',
              telefonoCasa: '',
              telefonoTrabajo: '',
              telefonoCelular: '',
              ocupacion: '',
              notas: ''
            });
          }}
        >
          + Nuevo cliente
        </button>
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
                  {(client.emailPersonal || client.telefonoCelular || client.telefonoCasa) && (
                    <span className="client-contact-preview">
                      {client.emailPersonal && <>✉ {client.emailPersonal}</>}
                      {(client.emailPersonal && (client.telefonoCelular || client.telefonoCasa)) && ' · '}
                      {client.telefonoCelular && <>📱 {client.telefonoCelular}</>}
                      {client.telefonoCelular && client.telefonoCasa && ' · '}
                      {client.telefonoCasa && <>🏠 {client.telefonoCasa}</>}
                    </span>
                  )}
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
              <div className="client-details" onClick={(e) => e.stopPropagation()}>
                {/* Directorio: datos de póliza (solo lectura) + datos editables, misma presentación */}
                <div className="client-directorio">
                  <h4>Datos del cliente</h4>
                  <div className="directorio-list">
                    <div className="directorio-row">
                      <span className="directorio-label">Nombre</span>
                      {editingField === 'clientName' ? (
                        <input
                          type="text"
                          placeholder="Nombre del cliente"
                          value={editingMetadata.clientName}
                          onChange={(e) => setEditingMetadata(prev => ({ ...prev, clientName: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          className="directorio-input"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="directorio-value directorio-value-editable"
                          onClick={() => setEditingField('clientName')}
                          title="Clic para editar"
                        >
                          {editingMetadata.clientName || '—'}
                        </span>
                      )}
                    </div>
                    <div className="directorio-row">
                      <span className="directorio-label">Email (póliza)</span>
                      <span className="directorio-value directorio-value-readonly">
                        {getFirstFromPolicies(client.policies, 'email') || '—'}
                      </span>
                    </div>
                    <div className="directorio-row">
                      <span className="directorio-label">Email personal</span>
                      {editingField === 'emailPersonal' ? (
                        <input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          value={editingMetadata.emailPersonal}
                          onChange={(e) => setEditingMetadata(prev => ({ ...prev, emailPersonal: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          className="directorio-input"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="directorio-value directorio-value-editable"
                          onClick={() => setEditingField('emailPersonal')}
                          title="Clic para editar"
                        >
                          {editingMetadata.emailPersonal || '—'}
                        </span>
                      )}
                    </div>
                    <div className="directorio-row">
                      <span className="directorio-label">Teléfono (póliza)</span>
                      <span className="directorio-value directorio-value-readonly">
                        {getFirstFromPolicies(client.policies, 'telefono') || '—'}
                      </span>
                    </div>
                    <div className="directorio-row">
                      <span className="directorio-label">Tel. casa</span>
                      {editingField === 'telefonoCasa' ? (
                        <input
                          type="tel"
                          value={editingMetadata.telefonoCasa}
                          onChange={(e) => setEditingMetadata(prev => ({ ...prev, telefonoCasa: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          className="directorio-input"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="directorio-value directorio-value-editable"
                          onClick={() => setEditingField('telefonoCasa')}
                          title="Clic para editar"
                        >
                          {editingMetadata.telefonoCasa || '—'}
                        </span>
                      )}
                    </div>
                    <div className="directorio-row">
                      <span className="directorio-label">Tel. trabajo</span>
                      {editingField === 'telefonoTrabajo' ? (
                        <input
                          type="tel"
                          value={editingMetadata.telefonoTrabajo}
                          onChange={(e) => setEditingMetadata(prev => ({ ...prev, telefonoTrabajo: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          className="directorio-input"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="directorio-value directorio-value-editable"
                          onClick={() => setEditingField('telefonoTrabajo')}
                          title="Clic para editar"
                        >
                          {editingMetadata.telefonoTrabajo || '—'}
                        </span>
                      )}
                    </div>
                    <div className="directorio-row">
                      <span className="directorio-label">Tel. celular</span>
                      {editingField === 'telefonoCelular' ? (
                        <input
                          type="tel"
                          value={editingMetadata.telefonoCelular}
                          onChange={(e) => setEditingMetadata(prev => ({ ...prev, telefonoCelular: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          className="directorio-input"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="directorio-value directorio-value-editable"
                          onClick={() => setEditingField('telefonoCelular')}
                          title="Clic para editar"
                        >
                          {editingMetadata.telefonoCelular || '—'}
                        </span>
                      )}
                    </div>
                    <div className="directorio-row">
                      <span className="directorio-label">Dirección (póliza)</span>
                      <span className="directorio-value directorio-value-readonly">
                        {getFirstFromPolicies(client.policies, 'direccion') || '—'}
                      </span>
                    </div>
                    <div className="directorio-row">
                      <span className="directorio-label">Ocupación</span>
                      {editingField === 'ocupacion' ? (
                        <input
                          type="text"
                          placeholder="Ej. Empresario, Contador..."
                          value={editingMetadata.ocupacion}
                          onChange={(e) => setEditingMetadata(prev => ({ ...prev, ocupacion: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          className="directorio-input"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="directorio-value directorio-value-editable"
                          onClick={() => setEditingField('ocupacion')}
                          title="Clic para editar"
                        >
                          {editingMetadata.ocupacion || '—'}
                        </span>
                      )}
                    </div>
                    <div className="directorio-row directorio-row-full">
                      <span className="directorio-label">Notas</span>
                      {editingField === 'notas' ? (
                        <textarea
                          placeholder="Notas sobre el cliente..."
                          value={editingMetadata.notas}
                          onChange={(e) => setEditingMetadata(prev => ({ ...prev, notas: e.target.value }))}
                          onBlur={() => setEditingField(null)}
                          className="directorio-textarea"
                          rows={3}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="directorio-value directorio-value-editable"
                          onClick={() => setEditingField('notas')}
                          title="Clic para editar"
                        >
                          {editingMetadata.notas || '—'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="directorio-actions">
                    <button
                      type="button"
                      className="metadata-save-btn"
                      onClick={(e) => { handleSaveMetadata(e); setEditingField(null); }}
                      disabled={savingMetadata}
                    >
                      {savingMetadata ? 'Guardando…' : 'Guardar datos'}
                    </button>
                    {client.totalPolicies === 0 && (
                      <button
                        type="button"
                        className="btn-delete-client"
                        onClick={handleDeleteClient}
                        disabled={deletingClientId === client.id}
                        title="Borrar cliente (solo si no tiene pólizas)"
                      >
                        {deletingClientId === client.id ? 'Borrando…' : 'Borrar cliente'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Pólizas (colapsable) */}
                <div className="policies-section">
                  <button
                    type="button"
                    className="policies-section-header"
                    onClick={togglePolicies}
                    aria-expanded={policiesExpanded}
                  >
                    <span className="policies-section-arrow">{policiesExpanded ? '▼' : '▶'}</span>
                    <span>Pólizas ({client.policies.length})</span>
                  </button>
                  <div className={`policies-section-content ${policiesExpanded ? 'is-expanded' : ''}`}>
                    <div className="policies-grid">
                      {client.policies.map((policy, index) => (
                        <div key={`${policy.id}-${index}`} className="policy-card">
                          <div className="policy-header">
                            <span className="policy-number">#{policy.numero_poliza}</span>
                            <span className="policy-ramo">{policy.ramo}</span>
                          </div>
                          <div className="policy-details">
                            <p><strong>Vigencia:</strong> {formatDate(policy.vigencia_inicio)} – {formatDate(policy.vigencia_fin)}</p>
                            {(policy.email && policy.email !== 'N/A') && (
                              <p><strong>Email:</strong> {policy.email}</p>
                            )}
                            {(policy.direccion && policy.direccion !== 'N/A') && (
                              <p><strong>Dirección:</strong> {policy.direccion}</p>
                            )}
                          </div>
                          <div className="policy-footer">
                            <span className="policy-table">Tabla: {policy.tableName}</span>
                            {policy.pdf && policy.pdf !== 'N/A' && (
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
                </div>

                <div className="client-summary">
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
