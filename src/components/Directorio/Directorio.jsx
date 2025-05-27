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
  const [itemsPerPage] = useState(50);

  useEffect(() => {
    if (viewMode === 'cards' || viewMode === 'table') {
      loadContactos();
      loadStats();
    }
  }, [filters, searchTerm, viewMode, currentPage]);

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
      
      setContactos(data.data || data);
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

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="pagination">
        <div className="pagination-info">
          Página {currentPage} de {totalPages} 
          {stats && ` (${stats.total} contactos total)`}
        </div>
        <div className="pagination-buttons">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const page = i + 1;
            if (totalPages > 10) {
              // Show first 3, current page area, and last 3
              if (page <= 3 || page >= totalPages - 2 || Math.abs(page - currentPage) <= 1) {
                return (
                  <button
                    key={page}
                    onClick={() => paginate(page)}
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                );
              } else if (page === 4 && currentPage > 6) {
                return <span key={page}>...</span>;
              } else if (page === totalPages - 3 && currentPage < totalPages - 5) {
                return <span key={page}>...</span>;
              }
              return null;
            }
            return (
              <button
                key={page}
                onClick={() => paginate(page)}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSharedHeader = () => (
    <>
      {stats && (
        <div className="stats-cards">
          <div className="stat-card">
            <h3>Total Contactos</h3>
            <p className="stat-number">{stats.total || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Clientes</h3>
            <p className="stat-number">{stats.clientes || 0}</p>
          </div>
          <div className="stat-card">
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
                <th>Origen</th>
                <th>Género</th>
                <th>Fecha Nacimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {currentContactos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-results">
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