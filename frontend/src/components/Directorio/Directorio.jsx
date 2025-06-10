import React, { useState, useEffect } from 'react';
import firebaseDirectorioService from '../../services/firebaseDirectorioService';
import ContactoCard from './ContactoCard';
import ContactoModal from './ContactoModal';
import PolicyModal from './PolicyModal';
import SearchFilters from './SearchFilters';
import { FEATURES } from '../../config/features';
// import RelationshipsView from './RelationshipsView'; // COMMENTED OUT - Relationships functionality disabled
import './Directorio.css';

const Directorio = () => {
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

  useEffect(() => {
    if (viewMode !== 'relationships') {
      loadData();
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
          ? firebaseDirectorioService.searchContactos(searchTerm, params)
          : firebaseDirectorioService.getContactos(params),
        firebaseDirectorioService.getStats()
      ]);
      
      console.log('🔍 Raw contactosData received:', {
        dataLength: contactosData?.data?.length || 0,
        total: contactosData?.total,
        page: contactosData?.page,
        totalPages: contactosData?.totalPages,
        fullResponse: contactosData
      });
      console.log('🔍 Raw statsData received:', {
        stats: statsData?.stats,
        total: statsData?.stats?.total || statsData?.total,
        fullResponse: statsData
      });
      
      const contacts = contactosData.data || contactosData;
      setContactos(contacts);
      
      // Update stats with pagination info from contactosData if available
      const newStats = {
        ...(statsData.stats || statsData),
        total: contactosData.total || (statsData.stats?.total || statsData?.total)
      };
      
      console.log('📊 Setting stats:', {
        originalStatsData: statsData,
        contactosTotal: contactosData.total,
        finalStats: newStats,
        willShowPagination: newStats.total > itemsPerPage
      });
      
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
            const data = await firebaseDirectorioService.getContactoPolicies(contacto.id);
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

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleContactoSave = async (contactoData) => {
    try {
      if (selectedContacto) {
        await firebaseDirectorioService.updateContacto(selectedContacto.id, contactoData);
      } else {
        await firebaseDirectorioService.createContacto(contactoData);
      }
      
      await loadData();
      setShowModal(false);
      setSelectedContacto(null);
    } catch (err) {
      console.error('Error saving contacto:', err);
      throw err;
    }
  };

  const handleContactoDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await firebaseDirectorioService.deleteContacto(id);
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

  // Enhanced pagination with better UX
  const totalPages = stats ? Math.ceil(stats.total / itemsPerPage) : 1;
  
  console.log('📊 Pagination calculation:', {
    statsTotal: stats?.total,
    itemsPerPage,
    totalPages,
    currentPage,
    shouldShowPagination: totalPages > 1
  });
  
  const renderPagination = () => {
    console.log('🔍 Rendering pagination:', { totalPages, currentPage, itemsPerPage });
    if (totalPages <= 1) {
      console.log('❌ Not rendering pagination: totalPages <= 1');
      return null;
    }
    
    return (
      <div className="pagination">
        <div className="pagination-info">
          <span>
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, stats?.total || 0)} de {stats?.total || 0} contactos
          </span>
        </div>
        
        <div className="pagination-controls">
          <div className="items-per-page">
            <label>Mostrar:</label>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>por página</span>
          </div>

          <div className="pagination-buttons">
            <button 
              onClick={() => {
                console.log(`📄 Clicking Primera: ${currentPage} -> 1`);
                setCurrentPage(1);
              }} 
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Primera
            </button>
            
            <button 
              onClick={() => {
                const prevPage = currentPage - 1;
                console.log(`📄 Clicking Anterior: ${currentPage} -> ${prevPage}`);
                setCurrentPage(prevPage);
              }} 
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              Anterior
            </button>

            <span className="page-indicator">
              Página {currentPage} de {totalPages}
            </span>

            <button 
              onClick={() => {
                const nextPage = currentPage + 1;
                console.log(`📄 Clicking Siguiente: ${currentPage} -> ${nextPage} (max: ${totalPages})`);
                setCurrentPage(nextPage);
              }} 
              disabled={currentPage >= totalPages}
              className="pagination-btn"
            >
              Siguiente
            </button>
            
            <button 
              onClick={() => {
                console.log(`📄 Clicking Última: ${currentPage} -> ${totalPages}`);
                setCurrentPage(totalPages);
              }} 
              disabled={currentPage >= totalPages}
              className="pagination-btn"
            >
              Última
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderHeader = () => (
    <>
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
                <td colSpan="9" className="no-results">
                  {loading ? 'Cargando...' : 'No se encontraron contactos'}
                </td>
              </tr>
            ) : (
              contactos.map((contacto) => (
                <tr key={contacto.id} className="contacto-row">
                  <td><strong>{contacto.nombre_completo}</strong></td>
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
                        setSelectedContacto(contacto);
                        setShowModal(true);
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
              key={contacto.id}
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