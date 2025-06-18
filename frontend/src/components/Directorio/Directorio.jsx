import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import directorioServiceAdapter from '../../services/directorioServiceAdapter';
import ContactoCard from './ContactoCard';
import ContactoModal from './ContactoModal';
import PolicyModal from './PolicyModal';
import SearchFilters from './SearchFilters';
import { FEATURES } from '../../config/features';
import { useTeam } from '../../context/TeamContext';
// import RelationshipsView from './RelationshipsView'; // COMMENTED OUT - Relationships functionality disabled
import './Directorio.css';

const Directorio = () => {
  const { userTeam, currentTeam } = useTeam();
  const team = currentTeam || userTeam;
  
  // Ensure team is set for directorio data access
  useEffect(() => {
    if (team?.id) {
      console.log('🏢 Directorio: Setting team context for data access:', team.id, team.name);
      // The team services should automatically use the current team context
    }
  }, [team]);
  
  // Check if directorio is enabled
  if (!FEATURES.DIRECTORIO_ENABLED) {
    return (
      <div className="directorio-container">
        <div className="directorio-disabled">
          <div className="alert alert-warning">
            <h3>📊 Directorio Temporalmente Deshabilitado</h3>
            <p>
              El directorio está temporalmente deshabilitado para optimizar el rendimiento 
              y evitar límites de Firebase. Con 2700+ contactos, se requiere una 
              implementación más eficiente.
            </p>
            <p>
              <strong>Soluciones implementadas:</strong>
            </p>
            <ul>
              <li>✅ Paginación eficiente</li>
              <li>✅ Estadísticas aproximadas</li>
              <li>✅ Uso de API Heroku optimizada</li>
              <li>🔄 En desarrollo: Índices y caché</li>
            </ul>
            <p>
              Para habilitar: Cambia <code>DIRECTORIO_ENABLED: true</code> en 
              <code>frontend/src/config/features.js</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const [viewMode, setViewMode] = useState('cards');
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: '', origen: '', genero: '' });
  const [selectedContacto, setSelectedContacto] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [selectedContactoForPolicies, setSelectedContactoForPolicies] = useState(null);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [contactPolicyTables, setContactPolicyTables] = useState({});
  
  // Payment status state - coordinated with reports functionality
  const [contactPaymentStatuses, setContactPaymentStatuses] = useState({});
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Refs to prevent render loops
  const isNavigatingRef = useRef(false);
  const lastPageChangeRef = useRef(currentPage);

  useEffect(() => {
    console.log('🔄 useEffect triggered:', {
      viewMode,
      currentPage,
      itemsPerPage,
      filtersString: JSON.stringify(filters),
      searchTerm: searchTerm.substring(0, 20) + (searchTerm.length > 20 ? '...' : '')
    });
    
    if (viewMode !== 'relationships') {
      console.log('🔄 About to call loadData() due to dependency change');
      loadData();
    } else {
      console.log('🔄 Skipping loadData() because viewMode is relationships');
    }
  }, [filters, searchTerm, viewMode, currentPage, itemsPerPage]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = { ...filters, page: currentPage, limit: itemsPerPage };
      
      console.log('🔄 Loading directorio data from Firebase...', { 
        searchTerm, 
        params, 
        currentPage, 
        itemsPerPage,
        totalPages: stats ? Math.ceil(stats.total / itemsPerPage) : 'unknown'
      });
      
      const [contactosData, statsData] = await Promise.all([
        searchTerm.trim() 
          ? directorioServiceAdapter.searchContactos(searchTerm, params)
          : directorioServiceAdapter.getContactos(params),
        directorioServiceAdapter.getStats()
      ]);
      
      console.log('🔍 Raw contactosData received:');
      console.log('- dataLength:', contactosData?.data?.length || 0);
      console.log('- total:', contactosData?.total);
      console.log('- page:', contactosData?.page);
      console.log('- totalPages:', contactosData?.totalPages);
      console.log('- full contactosData:', contactosData);
      
      console.log('🔍 Raw statsData received:');
      console.log('- statsData.stats:', statsData?.stats);
      console.log('- statsData.total:', statsData?.total);
      console.log('- full statsData:', statsData);
      
      const contacts = contactosData.data || contactosData;
      
      // Check for and filter out duplicates by ID - more robust approach
      const seenKeys = new Set();
      const duplicateIds = [];
      const uniqueContacts = contacts.filter((contact, index) => {
        // Create a unique React key from multiple sources
        const originalId = contact.id;
        const firebaseId = contact.firebase_doc_id;
        const name = contact.nombre_completo || 'unnamed';
        
        // Generate a unique key for React rendering
        let reactKey;
        if (firebaseId) {
          reactKey = `fb_${firebaseId}`;
        } else if (originalId) {
          reactKey = `id_${originalId}`;
        } else {
          reactKey = `temp_${index}_${name.substring(0, 10)}_${Date.now()}`;
        }
        
        // Check for duplicates using the React key
        if (seenKeys.has(reactKey)) {
          duplicateIds.push({ originalId, reactKey, name });
          console.log(`⚠️ Duplicate React key found:`, { 
            originalId, 
            reactKey, 
            name: contact.nombre_completo,
            contact: contact 
          });
          console.log(`⚠️ This causes React key warning: "key ${reactKey}"`);
          return false; // Filter out duplicate
        }
        
        // Add unique React key to contact for rendering
        contact.reactKey = reactKey;
        
        // Ensure contact has a valid ID for API calls
        if (!contact.id && firebaseId) {
          contact.id = firebaseId;
          console.log(`🔑 Using Firebase doc ID as ID: ${firebaseId}`);
        } else if (!contact.id) {
          contact.id = `generated_${index}_${Date.now()}`;
          console.log(`🔑 Generated ID for contact: ${contact.id}`);
        }
        
        seenKeys.add(reactKey);
        return true;
      });
      
      if (duplicateIds.length > 0) {
        console.log(`⚠️ Found ${duplicateIds.length} duplicate contacts with IDs:`, duplicateIds);
        console.log(`✅ Filtered out duplicates, showing ${uniqueContacts.length} unique contacts`);
        console.log(`⚠️ This may be causing React key warnings like "key 2701"`);
      }
      
      // Debug: Log all contact IDs for verification
      console.log(`🔍 Contact IDs being set (first 10):`, uniqueContacts.slice(0, 10).map(c => c.id));
      console.log(`🔍 Total unique contacts to render: ${uniqueContacts.length}`);
      
      setContactos(uniqueContacts);
      
      // Update stats with pagination info from contactosData if available
      const newStats = {
        ...(statsData.stats || statsData),
        total: contactosData.total || (statsData.stats?.total || statsData?.total)
      };
      
      console.log('📊 Setting stats:');
      console.log('- originalStatsData:', statsData);
      console.log('- contactosTotal:', contactosData.total);
      console.log('- finalStats:', newStats);
      console.log('- finalStats.total:', newStats.total);
      console.log('- willShowPagination:', newStats.total > itemsPerPage);
      
      setStats(newStats);
      
      console.log(`✅ Loaded ${contacts.length} contactos from Firebase`);
      
      // Load policy tables for clients (more efficient)
      const policyTablesMap = {};
      const clienteContactos = contacts.filter(c => c.status === 'cliente');
      
      console.log(`🔍 Loading policies for ${clienteContactos.length} clientes...`);
      
      // Load in batches to avoid overwhelming Firebase
      const batchSize = 5;
      for (let i = 0; i < clienteContactos.length; i += batchSize) {
        const batch = clienteContactos.slice(i, i + batchSize);
        
        await Promise.allSettled(batch.map(async (contacto) => {
          try {
            const data = await directorioServiceAdapter.getPolizasByContacto(contacto.id);
            if (data?.data?.policies && Array.isArray(data.data.policies)) {
              const tables = [...new Set(data.data.policies.map(p => p.tabla_origen).filter(Boolean))];
              policyTablesMap[contacto.id] = tables.length > 0 
                ? tables.map(table => table.toUpperCase()).join(', ')
                : 'Sin pólizas';
            } else {
              policyTablesMap[contacto.id] = 'Sin pólizas';
            }
          } catch (err) {
            console.error(`Error loading policies for contact ${contacto.id}:`, err);
            policyTablesMap[contacto.id] = 'Error al cargar';
          }
        }));
      }
      
      setContactPolicyTables(policyTablesMap);
      setError(null);
    } catch (err) {
      console.error('Error al cargar los contactos desde Firebase:', err);
      setError('Error loading contacts from Firebase');
    } finally {
      setLoading(false);
    }
  };

  // Load payment statuses on component mount
  useEffect(() => {
    loadContactPaymentStatuses();
  }, []);

  const handleSearch = (term) => {
    console.log('🔍 handleSearch called with term:', term);
    console.log('🔍 Current searchTerm:', searchTerm, 'New term:', term);
    
    // Don't reset page if search term is the same
    if (term === searchTerm) {
      console.log('🔍 Search term unchanged, not resetting page');
      return;
    }
    
    setSearchTerm(term);
    // Only reset to page 1 if the search term actually changed
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters) => {
    console.log('🔍 handleFilterChange called with filters:', newFilters);
    console.log('🔍 Current filters:', filters, 'New filters:', newFilters);
    
    // Don't reset page if filters are the same
    if (JSON.stringify(newFilters) === JSON.stringify(filters)) {
      console.log('🔍 Filters unchanged, not resetting page');
      return;
    }
    
    setFilters(newFilters);
    // Only reset to page 1 if filters actually changed
    setCurrentPage(1);
  };

  const handleContactoSave = useCallback(async (contactoData) => {
    try {
      console.log('💾 handleContactoSave called');
      console.log('- selectedContacto:', selectedContacto);
      console.log('- selectedContacto.id:', selectedContacto?.id);
      console.log('- contactoData:', contactoData);
      
      if (selectedContacto) {
        console.log(`🔄 Updating existing contacto: ${selectedContacto.id}`);
        const result = await directorioServiceAdapter.updateContacto(selectedContacto.id, contactoData);
        console.log('✅ Update result:', result);
      } else {
        console.log('➕ Creating new contacto');
        const result = await directorioServiceAdapter.createContacto(contactoData);
        console.log('✅ Create result:', result);
      }
      
      console.log('🔄 Reloading data...');
      await loadData();
      
      console.log('🔒 Closing modal and clearing state...');
      setShowModal(false);
      setSelectedContacto(null);
      
      console.log('✅ handleContactoSave completed successfully');
    } catch (err) {
      console.error('❌ Error saving contacto:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        selectedContacto: selectedContacto,
        contactoData: contactoData
      });
      throw err;
    }
  }, [selectedContacto]);

  const handleContactoDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await directorioServiceAdapter.deleteContacto(id);
        await loadData();
      } catch (err) {
        alert('Error al eliminar el contacto');
      }
    }
  };

  const handleStatCardClick = (filterType) => {
    const newFilters = { ...filters };
    if (filterType === 'all') {
      newFilters.status = '';
    } else {
      newFilters.status = newFilters.status === filterType ? '' : filterType;
    }
    handleFilterChange(newFilters);
  };

  // Payment status functions - coordinated with reports functionality
  const getContactPaymentStatus = (contacto) => {
    return contactPaymentStatuses[contacto.id] || 'No Pagado';
  };

  const handleTogglePaymentStatus = async (contacto) => {
    try {
      const currentStatus = getContactPaymentStatus(contacto);
      const newStatus = currentStatus === 'Pagado' ? 'No Pagado' : 'Pagado';
      
      console.log(`🔄 Updating contact ${contacto.id} payment status from ${currentStatus} to ${newStatus}`);
      
      // Update via Firebase directorio service
      // await directorioServiceAdapter.updateContactoPaymentStatus(contacto.id, newStatus); // TODO: Implementar en adaptador
      
      // Update local state
      setContactPaymentStatuses(prev => ({
        ...prev,
        [contacto.id]: newStatus
      }));
      
      console.log(`✅ Contact ${contacto.nombre_completo} payment status updated to: ${newStatus}`);
      
    } catch (err) {
      console.error('❌ Error updating contact payment status:', err);
      setError('Error al actualizar el estado de pago del contacto');
    }
  };

  const loadContactPaymentStatuses = async () => {
    try {
      setIsStatusLoading(true);
      console.log('📊 Loading contact payment statuses from Firebase...');
      
      // const statuses = await directorioServiceAdapter.getContactPaymentStatuses(); // TODO: Implementar en adaptador
      setContactPaymentStatuses(statuses);
      
      console.log('✅ Contact payment statuses loaded from Firebase');
    } catch (err) {
      console.error('❌ Error loading contact payment statuses:', err);
    } finally {
      setIsStatusLoading(false);
    }
  };

  // Enhanced pagination with better UX - memoized to prevent excessive calculations
  const totalPages = useMemo(() => {
    const total = stats ? Math.ceil(stats.total / itemsPerPage) : 1;
    
    console.log('📊 Pagination calculation (memoized):');
    console.log('- statsTotal:', stats?.total);
    console.log('- itemsPerPage:', itemsPerPage);
    console.log('- totalPages:', total);
    console.log('- currentPage:', currentPage);
    console.log('- shouldShowPagination:', total > 1);
    console.log('- stats object:', stats);
    
    return total;
  }, [stats?.total, itemsPerPage]);

  // Debug effect to track currentPage changes
  useEffect(() => {
    console.log('🎯 currentPage CHANGED:', {
      newCurrentPage: currentPage,
      totalPages: totalPages,
      timestamp: new Date().toLocaleTimeString(),
      stackTrace: new Error().stack
    });
  }, [currentPage]);

  // Handler function for page changes
  const handlePageChange = (newPage) => {
    console.log('📄 handlePageChange called:', { from: currentPage, to: newPage, totalPages });
    
    // Validate page number  
    const maxPages = totalPages || 1;
    if (newPage < 1 || newPage > maxPages) {
      console.warn('⚠️ Invalid page number:', newPage, 'Valid range: 1 -', maxPages);
      return;
    }
    
    if (newPage === currentPage) {
      console.log('📄 Same page, ignoring:', newPage);
      return;
    }
    
    console.log('📄 Setting currentPage from', currentPage, 'to', newPage);
    setCurrentPage(newPage);
    
    // Force scroll to top when page changes
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };
  
  const renderPagination = () => {
    console.log('🔍 Rendering pagination:');
    console.log('- totalPages:', totalPages);
    console.log('- currentPage:', currentPage);
    console.log('- itemsPerPage:', itemsPerPage);
    if (totalPages <= 1) {
      console.log('❌ Not rendering pagination: totalPages <= 1');
      return null;
    }
    
    // Generate page numbers to show
    const getPageNumbers = () => {
      if (totalPages <= 1) return [1];
      
      const delta = 2; // Number of pages to show on each side of current page
      const range = [];
      const rangeWithDots = [];
      
      // If we have few pages, show all
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
          rangeWithDots.push(i);
        }
        return rangeWithDots;
      }
      
      // Always show first page
      rangeWithDots.push(1);
      
      // Calculate range around current page
      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);
      
      // Add ellipsis after first page if needed
      if (start > 2) {
        rangeWithDots.push('...');
      }
      
      // Add pages around current page
      for (let i = start; i <= end; i++) {
        rangeWithDots.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        rangeWithDots.push('...');
      }
      
      // Always show last page (if different from first)
      if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }
      
      return rangeWithDots;
    };
    
    const pageNumbers = totalPages > 1 ? getPageNumbers() : [];
    
    return (
      <div className="pagination-wrapper">
        <div className="pagination-info">
          <span className="pagination-summary">
            📊 Mostrando <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> - <strong>{Math.min(currentPage * itemsPerPage, stats?.total || 0)}</strong> de <strong>{stats?.total || 0}</strong> contactos
          </span>
        </div>
        
        <div className="pagination-main">
          {/* Items per page selector */}
          <div className="items-per-page">
            <label htmlFor="items-select">📄 Mostrar:</label>
            <select 
              id="items-select"
              className="items-select"
              value={itemsPerPage} 
              onChange={(e) => {
                const newLimit = parseInt(e.target.value);
                console.log(`📄 Changing items per page: ${itemsPerPage} -> ${newLimit}`);
                setItemsPerPage(newLimit);
                handlePageChange(1); // Reset to first page when changing items per page
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>por página</span>
          </div>

          {/* Navigation buttons */}
          <div className="pagination-nav">
            <button 
              onClick={() => handlePageChange(1)} 
              disabled={currentPage === 1}
              className="pagination-btn nav-btn first-btn"
              title="Ir a la primera página"
            >
              <span className="btn-icon">⏮️</span>
              <span className="btn-text">Primera</span>
            </button>
            
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
              className="pagination-btn nav-btn prev-btn"
              title="Página anterior"
            >
              <span className="btn-icon">⬅️</span>
              <span className="btn-text">Anterior</span>
            </button>

            {/* Page numbers */}
            <div className="page-numbers">
              {pageNumbers.map((pageNum, index) => {
                if (pageNum === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                      ...
            </span>
                  );
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`pagination-btn page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    title={`Ir a la página ${pageNum}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage >= totalPages}
              className="pagination-btn nav-btn next-btn"
              title="Página siguiente"
            >
              <span className="btn-text">Siguiente</span>
              <span className="btn-icon">➡️</span>
            </button>
            
            <button 
              onClick={() => handlePageChange(totalPages)} 
              disabled={currentPage >= totalPages}
              className="pagination-btn nav-btn last-btn"
              title="Ir a la última página"
            >
              <span className="btn-text">Última</span>
              <span className="btn-icon">⏭️</span>
            </button>
          </div>

          {/* Quick page jump */}
          <div className="page-jump">
            <label htmlFor="page-input">🎯 Ir a:</label>
            <input
              id="page-input"
              type="number"
              min="1"
              max={totalPages}
              className="page-input"
              placeholder={currentPage}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const pageNum = parseInt(e.target.value);
                  if (pageNum >= 1 && pageNum <= totalPages) {
                    console.log(`📄 Jump to page: ${currentPage} -> ${pageNum}`);
                    handlePageChange(pageNum);
                    e.target.value = '';
                  } else {
                    alert(`Por favor ingresa un número entre 1 y ${totalPages}`);
                  }
                }
              }}
              title={`Ingresa un número entre 1 y ${totalPages} y presiona Enter`}
            />
          </div>
        </div>
        
        <div className="pagination-status">
          <span className="current-page-indicator">
            📍 Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </span>
        </div>
      </div>
    );
  };

  const renderHeader = () => (
    <>
      {/* Team info header */}
      {team && (
        <div className="team-info-header" style={{
          background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
          padding: '1rem',
          borderRadius: '12px',
          marginBottom: '1rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#2d3748', fontSize: '1.3rem' }}>
              👥 Directorio de {team.name}
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#718096', fontSize: '0.9rem' }}>
              {team.id === '4JlUqhAvfJMlCDhQ4vgH' 
                ? '🎯 Accediendo directamente a directorio_contactos' 
                : 'Datos aislados por equipo'}
            </p>
            <details style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#4a5568' }}>
              <summary style={{ cursor: 'pointer', fontWeight: '500' }}>🔧 Debug Info</summary>
              <div style={{ marginTop: '0.25rem', padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px' }}>
                <div>Team ID: <code>{team.id}</code></div>
                <div>Directorio Collection: <code>{team.id === '4JlUqhAvfJMlCDhQ4vgH' ? 'directorio_contactos' : `team_${team.id}_directorio_contactos`}</code></div>
                <div>Polizas Collection: <code>{team.id === '4JlUqhAvfJMlCDhQ4vgH' ? 'polizas' : `team_${team.id}_polizas`}</code></div>
                <div>Total Contacts: <strong>{stats?.total || 0}</strong></div>
                <div>Status: {stats?.total > 0 ? '✅ Data found' : '⚠️ No data found'}</div>
              </div>
            </details>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{
              background: team.id === '4JlUqhAvfJMlCDhQ4vgH' ? '#e6fffa' : '#fed7d7',
              color: team.id === '4JlUqhAvfJMlCDhQ4vgH' ? '#234e52' : '#c53030',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '500',
              border: team.id === '4JlUqhAvfJMlCDhQ4vgH' ? '1px solid #81e6d9' : '1px solid #feb2b2'
            }}>
              {team.id === '4JlUqhAvfJMlCDhQ4vgH' ? '🎯 Direct Collection' : '🏢 Team Service v1.0'}
            </span>
            <span style={{
              background: '#fed7d7',
              color: '#c53030',
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: '500',
              border: '1px solid #feb2b2'
            }}>
              🔒 Datos Aislados
            </span>
          </div>
        </div>
      )}
      
      {stats && (
        <div className="stats-cards">
          {[
            { key: 'all', label: 'Total', value: stats.total, filter: '' },
            { key: 'cliente', label: 'Clientes', value: stats.clientes, filter: 'cliente' },
            { key: 'prospecto', label: 'Prospectos', value: stats.prospectos, filter: 'prospecto' }
          ].map(({ key, label, value, filter }) => (
            <div 
              key={key}
              className={`stat-card ${filters.status === filter ? 'active' : ''}`}
              onClick={() => handleStatCardClick(key)}
              title={`Filtrar por ${label.toLowerCase()}`}
            >
              <h3>{label}</h3>
              <p className="stat-number">{value?.toLocaleString() || 0}</p>
            </div>
          ))}
        </div>
      )}

      <SearchFilters
        searchTerm={searchTerm}
        filters={filters}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      {error && <div className="error-message">{error}</div>}
      
      {/* Paginación arriba */}
      {totalPages > 1 && (
        <div className="pagination-top">
          {renderPagination()}
        </div>
      )}
    </>
  );

  const renderTableView = () => (
    <>
      {renderHeader()}
      <div className="table-container">
        <table className="contactos-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Estado Pago</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Status</th>
              <th>Pólizas</th>
              <th>Origen</th>
              <th>Género</th>
              <th>Fecha Nacimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contactos.length === 0 ? (
              <tr>
                <td colSpan="10" className="no-results">
                  {loading ? 'Cargando...' : 'No se encontraron contactos'}
                </td>
              </tr>
            ) : (
              contactos.map((contacto) => (
                <tr key={contacto.reactKey || contacto.id} className="contacto-row">
                  <td><strong>{contacto.nombre_completo}</strong></td>
                  <td>
                    <button 
                      onClick={() => handleTogglePaymentStatus(contacto)}
                      className={`status-toggle ${getContactPaymentStatus(contacto).toLowerCase().replace(' ', '-')}`}
                      disabled={isStatusLoading}
                      title={`Cambiar estado de pago (actual: ${getContactPaymentStatus(contacto)})`}
                    >
                      {getContactPaymentStatus(contacto)}
                    </button>
                  </td>
                  <td>{contacto.email || '-'}</td>
                  <td>{contacto.telefono || '-'}</td>
                  <td>
                    <span className={`status-badge ${contacto.status}`}>
                      {contacto.status === 'cliente' ? 'Cliente' : 'Prospecto'}
                    </span>
                  </td>
                  <td className="policy-tables-cell">
                    {contacto.status === 'cliente' ? (
                      <span className={`policy-tables-status ${
                        !contactPolicyTables[contacto.id] ? 'loading' :
                        contactPolicyTables[contacto.id] === 'Error al cargar' ? 'error' :
                        contactPolicyTables[contacto.id] === 'Sin pólizas' ? 'empty' : 'loaded'
                      }`}>
                        {contactPolicyTables[contacto.id] || 'Cargando...'}
                      </span>
                    ) : (
                      <span className="no-policies">-</span>
                    )}
                  </td>
                  <td>{contacto.origen || '-'}</td>
                  <td>{contacto.genero || '-'}</td>
                  <td>
                    {contacto.fecha_nacimiento 
                      ? new Date(contacto.fecha_nacimiento).toLocaleDateString() 
                      : '-'
                    }
                  </td>
                  <td className="actions-cell">
                    {contacto.status === 'cliente' && (
                      <button 
                        className="btn-policies"
                        onClick={() => {
                          setSelectedContactoForPolicies(contacto);
                          setShowPolicyModal(true);
                        }}
                        title="Ver Pólizas"
                      >
                        📋
                      </button>
                    )}
                    <button 
                      className="btn-edit"
                      onClick={() => {
                        console.log('✏️ Edit button clicked for contacto:', contacto);
                        console.log('- contacto.id:', contacto?.id);
                        console.log('- contacto.nombre_completo:', contacto?.nombre_completo);
                        setSelectedContacto(contacto);
                        setShowModal(true);
                        console.log('- selectedContacto set and modal opened');
                      }}
                      title="Editar contacto"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleContactoDelete(contacto.id)}
                      title="Eliminar contacto"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </>
  );

  const renderCardsView = () => (
    <>
      {renderHeader()}
      <div className="contactos-grid">
        {contactos.length === 0 ? (
          <div className="no-results">
            {loading ? 'Cargando contactos...' : 'No se encontraron contactos'}
          </div>
        ) : (
          contactos.map((contacto) => (
            <ContactoCard
              key={contacto.reactKey || contacto.id}
              contacto={contacto}
              onClick={() => {
                setSelectedContacto(contacto);
                setShowModal(true);
              }}
              onDelete={() => handleContactoDelete(contacto.id)}
              onViewPolicies={() => {
                setSelectedContactoForPolicies(contacto);
                setShowPolicyModal(true);
              }}
              policyTables={contactPolicyTables[contacto.id]}
            />
          ))
        )}
      </div>
      {renderPagination()}
    </>
  );

  const renderContent = () => {
    if (loading && contactos.length === 0) {
      return (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando directorio...</p>
        </div>
      );
    }

    switch (viewMode) {
      case 'cards':
        return renderCardsView();
      case 'table':
        return renderTableView();
      // case 'relationships': // COMMENTED OUT - Relationships functionality disabled
      //   return (
      //     <>
      //       {renderHeader()}
      //       {/* Relationships functionality disabled */}
      //     </>
      //   );
      default:
        return renderTableView();
    }
  };

  return (
    <div className="directorio-container">
      <div className="directorio-header">
        <h1>Directorio de Contactos</h1>
        <div className="header-actions">
          <div className="view-navigation">
            {[
              { mode: 'cards', icon: '📋', label: 'Cards' },
              { mode: 'table', icon: '📊', label: 'Tabla' },
              // { mode: 'relationships', icon: '🔗', label: 'Relaciones' } // COMMENTED OUT - Relationships functionality disabled
            ].map(({ mode, icon, label }) => (
              <button 
                key={mode}
                className={`view-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => setViewMode(mode)}
                title={`Vista ${label}`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          {/* {viewMode !== 'relationships' && ( */}
          {/* Always show "Nuevo Contacto" button since relationships are disabled */}
            <button 
              className="btn-primary" 
              onClick={() => {
                setSelectedContacto(null);
                setShowModal(true);
              }}
              title="Crear nuevo contacto"
            >
              + Nuevo Contacto
            </button>
          {/* )} */}
        </div>
      </div>

      {renderContent()}

      {showModal && (
        <ContactoModal
          key={selectedContacto?.id || 'new'}
          contacto={selectedContacto}
          onSave={handleContactoSave}
          onClose={() => {
            setShowModal(false);
            setSelectedContacto(null);
          }}
        />
      )}

      {showPolicyModal && (
        <PolicyModal
          contacto={selectedContactoForPolicies}
          isOpen={showPolicyModal}
          onClose={() => {
            setShowPolicyModal(false);
            setSelectedContactoForPolicies(null);
          }}
        />
      )}
    </div>
  );
};

export default Directorio; 