import React, { useState, useEffect } from 'react';
import directorioService from '../../services/directorioService';
import ContactoModal from './ContactoModal';
import './DirectorioSimple.css';

const DirectorioSimple = () => {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [letterFilter, setLetterFilter] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [totalItems, setTotalItems] = useState(0);
  
  // Modal para editar/crear
  const [showModal, setShowModal] = useState(false);
  const [selectedContacto, setSelectedContacto] = useState(null);

  // Alphabet for navigation
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => {
    loadData();
  }, [currentPage, searchTerm, letterFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = {
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(letterFilter && { letter: letterFilter })
      };
      
      const response = await directorioService.getContactos(filters);
      setContactos(response.data || []);
      setTotalItems(response.total || 0);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setError('Error al cargar los contactos');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contacto) => {
    setSelectedContacto(contacto);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedContacto(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await directorioService.deleteContacto(id);
        loadData();
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Error al eliminar el contacto');
      }
    }
  };

  const handleSave = async (contactoData) => {
    try {
      if (selectedContacto) {
        await directorioService.updateContacto(selectedContacto.id, contactoData);
      } else {
        await directorioService.createContacto(contactoData);
      }
      setShowModal(false);
      setSelectedContacto(null);
      loadData();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Error al guardar el contacto');
    }
  };

  const handleLetterFilter = (letter) => {
    setLetterFilter(letterFilter === letter ? '' : letter);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getStatusBadge = (status) => {
    const statusClasses = {
      'cliente': 'status-badge status-cliente',
      'prospecto': 'status-badge status-prospecto', 
      'inactivo': 'status-badge status-inactivo'
    };
    return statusClasses[status] || 'status-badge';
  };

  if (loading && contactos.length === 0) {
    return (
      <div className="directorio-simple">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando contactos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="directorio-simple">
      {/* Header simple */}
      <div className="simple-header">
        <h1>📋 Directorio de Contactos</h1>
        <div className="header-actions">
          <button className="btn-create" onClick={handleCreate}>
            + Nuevo
          </button>
        </div>
      </div>

      {/* Controles de filtros */}
      <div className="controls">
        <div className="search-group">
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>
      </div>

      {/* ABC Navigation */}
      <div className="abc-navigation">
        <div className="abc-header">
          <span className="abc-title">📚 Navegar por letra:</span>
          {letterFilter && (
            <button 
              className="clear-letter-btn"
              onClick={() => handleLetterFilter('')}
              title="Limpiar filtro de letra"
            >
              ✕ Limpiar
            </button>
          )}
        </div>
        <div className="alphabet-grid">
          {alphabet.map((letter) => (
            <button
              key={letter}
              className={`letter-btn ${letterFilter === letter ? 'active' : ''}`}
              onClick={() => handleLetterFilter(letter)}
              title={`Filtrar por letra ${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Información de resultados */}
      <div className="results-info">
        <p>
          Mostrando {contactos.length} de {totalItems} contactos
          {letterFilter && ` - Letra: ${letterFilter}`}
          {searchTerm && ` - Búsqueda: "${searchTerm}"`}
        </p>
      </div>

      {/* Vista de contactos - Condicional */}
      <div className="contacts-grid">
        {contactos.map((contacto) => (
          <div key={contacto.id} className="contact-card">
            <div className="contact-header">
              <h3>{contacto.nombre_completo}</h3>
            </div>
            
            <div className="contact-info">
              {contacto.empresa && (
                <p className="contact-empresa">
                  🏢 {contacto.empresa}
                </p>
              )}
              
              {contacto.ocupacion && (
                <p className="contact-ocupacion">
                  💼 {contacto.ocupacion}
                </p>
              )}

              {contacto.email && (
                <p className="contact-email">
                  📧 <a href={`mailto:${contacto.email}`}>{contacto.email}</a>
                </p>
              )}
              
              {contacto.telefono_movil && (
                <p className="contact-phone">
                  📱 <a href={`tel:${contacto.telefono_movil}`}>{contacto.telefono_movil}</a>
                </p>
              )}
              
              {contacto.telefono_oficina && (
                <p className="contact-phone-office">
                  ☎️ <a href={`tel:${contacto.telefono_oficina}`}>{contacto.telefono_oficina}</a>
                </p>
              )}

              {contacto.origen && (
                <div className="contact-origen">
                  <span className="origen-badge">👤 {contacto.origen}</span>
                </div>
              )}

              {contacto.comentario && (
                <div className="contact-comentario">
                  <p className="comentario-text">
                    💬 {contacto.comentario.length > 80 
                      ? `${contacto.comentario.substring(0, 80)}...` 
                      : contacto.comentario}
                  </p>
                </div>
              )}
            </div>

            <div className="contact-actions">
              <button
                onClick={() => handleEdit(contacto)}
                className="btn-edit"
                title="Editar"
              >
                ✏️ Editar
              </button>
              <button
                onClick={() => handleDelete(contacto.id)}
                className="btn-delete"
                title="Eliminar"
              >
                🗑️ Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(currentPage - 1)} 
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            ← Anterior
          </button>
          
          <span className="page-info">
            Página {currentPage} de {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(currentPage + 1)} 
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ContactoModal
          contacto={selectedContacto}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setSelectedContacto(null);
          }}
        />
      )}

      {/* Link para acceso completo */}
      <div className="full-access-link">
        <a href="/directorio" target="_blank" rel="noopener noreferrer">
          🔗 Abrir versión completa del directorio
        </a>
      </div>
    </div>
  );
};

export default DirectorioSimple; 