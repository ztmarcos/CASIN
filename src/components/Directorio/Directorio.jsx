import React, { useState, useEffect } from 'react';
import directorioService from '../../services/directorioService';
import ContactoCard from './ContactoCard';
import ContactoModal from './ContactoModal';
import SearchFilters from './SearchFilters';
import RelationshipsView from './RelationshipsView';
import './Directorio.css';

const Directorio = () => {
  const [viewMode, setViewMode] = useState('table'); // 'cards', 'table', 'relationships'
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    origen: '',
    genero: ''
  });
  const [selectedContacto, setSelectedContacto] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [contactPolicyTables, setContactPolicyTables] = useState({});

  useEffect(() => {
    if (viewMode === 'cards' || viewMode === 'table') {
      loadContactos();
      loadStats();
    }
  }, [filters, searchTerm, viewMode, currentPage, itemsPerPage]);

  const loadContactos = async () => {
    try {
      setLoading(true);
      let data;
      
      const params = {
        ...filters,
        page: currentPage,
        limit: itemsPerPage
      };
      
      if (searchTerm.trim()) {
        data = await directorioService.searchContactos(searchTerm, params);
      } else {
        data = await directorioService.getContactos(params);
      }
      
      const contactosData = data.data || data;
      setContactos(contactosData);
      
      // Cargar tablas de pólizas para clientes
      const policyTablesMap = {};
      const clienteContactos = contactosData.filter(c => c.status === 'cliente');
      
      for (const contacto of clienteContactos) {
        try {
          const tables = await getContactPolicyTables(contacto.id);
          policyTablesMap[contacto.id] = tables;
        } catch (err) {
          console.error(`Error loading policy tables for contact ${contacto.id}:`, err);
          policyTablesMap[contacto.id] = '';
        }
      }
      
      setContactPolicyTables(policyTablesMap);
      setError(null);
    } catch (err) {
      setError('Error al cargar los contactos');
      console.error('Error loading contactos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await directorioService.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Función para obtener las tablas de pólizas de un contacto
  const getContactPolicyTables = async (contactoId) => {
    try {
      const data = await directorioService.getContactoPolicies(contactoId);
      if (data && data.policies) {
        const tables = [...new Set(data.policies.map(p => p.tabla_origen))];
        return tables.map(table => table.toUpperCase()).join(', ');
      }
      return '';
    } catch (err) {
      console.error('Error loading contact policies:', err);
      return '';
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

  const handleContactoClick = (contacto) => {
    setSelectedContacto(contacto);
    setShowModal(true);
  };

  const handleCreateNew = () => {
    setSelectedContacto(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedContacto(null);
  };

  const handleContactoSave = async (contactoData) => {
    try {
      if (selectedContacto) {
        await directorioService.updateContacto(selectedContacto.id, contactoData);
      } else {
        await directorioService.createContacto(contactoData);
      }
      
      await loadContactos();
      await loadStats();
      handleModalClose();
    } catch (err) {
      console.error('Error saving contacto:', err);
      throw err;
    }
  };

  const handleContactoDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await directorioService.deleteContacto(id);
        await loadContactos();
        await loadStats();
      } catch (err) {
        console.error('Error deleting contacto:', err);
        alert('Error al eliminar el contacto');
      }
    }
  };

  // Pagination - now handled server-side
  const currentContactos = contactos;
  const totalPages = stats ? Math.ceil(stats.total / itemsPerPage) : 1;

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of table when changing pages
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Fallback to scroll to top of page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const handleItemsPerPageChange = (newItemsPerPage) => {
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);
    };

    const goToFirstPage = () => paginate(1);
    const goToLastPage = () => paginate(totalPages);
    const goToPrevPage = () => currentPage > 1 && paginate(currentPage - 1);
    const goToNextPage = () => currentPage < totalPages && paginate(currentPage + 1);
    
    return (
      <div className="pagination">
        <div className="pagination-info">
          <span>Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, stats?.total || 0)} de {stats?.total || 0} contactos</span>
        </div>
        
        <div className="pagination-controls">
          <div className="items-per-page">
            <label>Mostrar: </label>
            <select 
              value={itemsPerPage} 
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              className="items-select"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
            <span> por página</span>
          </div>

          <div className="pagination-buttons">
            <button
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="pagination-btn nav-btn"
              title="Primera página"
            >
              ⏮️ Primera
            </button>
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="pagination-btn nav-btn"
              title="Página anterior"
            >
              ⬅️ Anterior
            </button>

            <div className="page-numbers">
              {(() => {
                const pages = [];
                const maxVisiblePages = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                
                if (endPage - startPage < maxVisiblePages - 1) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                if (startPage > 1) {
                  pages.push(
                    <button
                      key={1}
                      onClick={() => paginate(1)}
                      className="pagination-btn page-btn"
                    >
                      1
                    </button>
                  );
                  if (startPage > 2) {
                    pages.push(<span key="start-ellipsis" className="pagination-ellipsis">...</span>);
                  }
                }

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      onClick={() => paginate(i)}
                      className={`pagination-btn page-btn ${currentPage === i ? 'active' : ''}`}
                    >
                      {i}
                    </button>
                  );
                }

                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(<span key="end-ellipsis" className="pagination-ellipsis">...</span>);
                  }
                  pages.push(
                    <button
                      key={totalPages}
                      onClick={() => paginate(totalPages)}
                      className="pagination-btn page-btn"
                    >
                      {totalPages}
                    </button>
                  );
                }

                return pages;
              })()}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="pagination-btn nav-btn"
              title="Página siguiente"
            >
              Siguiente ➡️
            </button>
            <button
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className="pagination-btn nav-btn"
              title="Última página"
            >
              Última ⏭️
            </button>
          </div>

          <div className="page-jump">
            <span>Ir a página: </span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  paginate(page);
                }
              }}
              className="page-input"
            />
            <span> de {totalPages}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleStatCardClick = (filterType) => {
    let newFilters = { ...filters };
    
    if (filterType === 'all') {
      // Si hace click en "Total", limpiar filtro de status
      newFilters.status = '';
    } else if (filterType === 'cliente') {
      // Si hace click en "Clientes", filtrar por cliente
      newFilters.status = newFilters.status === 'cliente' ? '' : 'cliente';
    } else if (filterType === 'prospecto') {
      // Si hace click en "Prospectos", filtrar por prospecto
      newFilters.status = newFilters.status === 'prospecto' ? '' : 'prospecto';
    }
    
    handleFilterChange(newFilters);
  };

  const renderSharedHeader = () => (
    <>
      {stats && (
        <div className="stats-cards">
          <div 
            className={`stat-card ${filters.status === '' ? 'active' : ''}`}
            onClick={() => handleStatCardClick('all')}
            title="Mostrar todos los contactos"
          >
            <h3>Total Contactos</h3>
            <p className="stat-number">{stats.total || 0}</p>
          </div>
          <div 
            className={`stat-card ${filters.status === 'cliente' ? 'active' : ''}`}
            onClick={() => handleStatCardClick('cliente')}
            title="Filtrar solo clientes"
          >
            <h3>Clientes</h3>
            <p className="stat-number">{stats.clientes || 0}</p>
          </div>
          <div 
            className={`stat-card ${filters.status === 'prospecto' ? 'active' : ''}`}
            onClick={() => handleStatCardClick('prospecto')}
            title="Filtrar solo prospectos"
          >
            <h3>Prospectos</h3>
            <p className="stat-number">{stats.prospectos || 0}</p>
          </div>
        </div>
      )}

      {(viewMode === 'cards' || viewMode === 'table') && (
        <SearchFilters
          searchTerm={searchTerm}
          filters={filters}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
        />
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </>
  );

  const renderTableView = () => {
    if (loading) {
      return (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando directorio...</p>
        </div>
      );
    }

    return (
      <>
        {renderSharedHeader()}

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
              {currentContactos.length === 0 ? (
                <tr>
                  <td colSpan="9" className="no-results">
                    No se encontraron contactos
                  </td>
                </tr>
              ) : (
                currentContactos.map((contacto) => (
                  <tr key={contacto.id} className="contacto-row">
                    <td className="nombre-cell">
                      <strong>{contacto.nombre_completo}</strong>
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
                        contactPolicyTables[contacto.id] ? (
                          <span className="policy-tables-list">
                            {contactPolicyTables[contacto.id]}
                          </span>
                        ) : (
                          <span className="loading-tables">Cargando...</span>
                        )
                      ) : (
                        <span className="no-policies">-</span>
                      )}
                    </td>
                    <td>{contacto.origen || '-'}</td>
                    <td>{contacto.genero || '-'}</td>
                    <td>{contacto.fecha_nacimiento ? new Date(contacto.fecha_nacimiento).toLocaleDateString() : '-'}</td>
                    <td className="actions-cell">
                      <button 
                        className="btn-edit"
                        onClick={() => handleContactoClick(contacto)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleContactoDelete(contacto.id)}
                        title="Eliminar"
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
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'cards':
        return renderCardsView();
      case 'table':
        return renderTableView();
      case 'relationships':
        return (
          <>
            {renderSharedHeader()}
            <RelationshipsView />
          </>
        );
      default:
        return renderCardsView();
    }
  };

  const renderCardsView = () => {
    if (loading) {
      return (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando directorio...</p>
        </div>
      );
    }

    return (
      <>
        {renderSharedHeader()}

        <div className="contactos-grid">
          {currentContactos.length === 0 ? (
            <div className="no-results">
              <p>No se encontraron contactos</p>
            </div>
          ) : (
            currentContactos.map((contacto) => (
              <ContactoCard
                key={contacto.id}
                contacto={contacto}
                onClick={() => handleContactoClick(contacto)}
                onDelete={() => handleContactoDelete(contacto.id)}
                policyTables={contactPolicyTables[contacto.id]}
              />
            ))
          )}
        </div>

        {renderPagination()}
      </>
    );
  };

  return (
    <div className="directorio-container">
      <div className="directorio-header">
        <h1>Directorio de Contactos</h1>
        <div className="header-actions">
          <div className="view-navigation">
            <button 
              className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Vista de Tarjetas"
            >
              📋 Cards
            </button>
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Vista de Tabla"
            >
              📊 Tabla
            </button>
            <button 
              className={`view-btn ${viewMode === 'relationships' ? 'active' : ''}`}
              onClick={() => setViewMode('relationships')}
              title="Análisis de Relaciones"
            >
              🔗 Relaciones
            </button>
          </div>
          {(viewMode === 'cards' || viewMode === 'table') && (
            <button className="btn-primary" onClick={handleCreateNew}>
              + Nuevo Contacto
            </button>
          )}
        </div>
      </div>

      {renderContent()}

      {/* Modal for creating/editing contacts */}
      {showModal && (
        <ContactoModal
          contacto={selectedContacto}
          onSave={handleContactoSave}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Directorio; 