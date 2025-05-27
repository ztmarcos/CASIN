import React, { useState, useEffect } from 'react';
import directorioService from '../../services/directorioService';
import ContactoCard from './ContactoCard';
import ContactoModal from './ContactoModal';
import SearchFilters from './SearchFilters';
import RelationshipsView from './RelationshipsView';
import './Directorio.css';

const Directorio = () => {
  const [activeTab, setActiveTab] = useState('contactos');
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
  const [itemsPerPage] = useState(20);

  useEffect(() => {
    if (activeTab === 'contactos') {
      loadContactos();
      loadStats();
    }
  }, [filters, searchTerm, activeTab]);

  const loadContactos = async () => {
    try {
      setLoading(true);
      let data;
      
      if (searchTerm.trim()) {
        data = await directorioService.searchContactos(searchTerm);
      } else {
        data = await directorioService.getContactos(filters);
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

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContactos = contactos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(contactos.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'contactos':
        return renderContactosTab();
      case 'relaciones':
        return <RelationshipsView />;
      default:
        return renderContactosTab();
    }
  };

  const renderContactosTab = () => {
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

        <SearchFilters
          searchTerm={searchTerm}
          filters={filters}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
        />

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => paginate(page)}
                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="directorio-container">
      <div className="directorio-header">
        <h1>Directorio de Contactos</h1>
        <div className="header-actions">
          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'contactos' ? 'active' : ''}`}
              onClick={() => setActiveTab('contactos')}
            >
              📋 Contactos
            </button>
            <button 
              className={`tab-btn ${activeTab === 'relaciones' ? 'active' : ''}`}
              onClick={() => setActiveTab('relaciones')}
            >
              🔗 Relaciones
            </button>
          </div>
          {activeTab === 'contactos' && (
            <button className="btn-primary" onClick={handleCreateNew}>
              + Nuevo Contacto
            </button>
          )}
        </div>
      </div>

      {renderTabContent()}

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