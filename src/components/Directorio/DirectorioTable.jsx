import React, { useState, useEffect } from 'react';
import './DirectorioTable.css';
import directorioService from '../../services/directorioService';

const DirectorioTable = () => {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  
  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [origenFilter, setOrigenFilter] = useState('');
  const [generoFilter, setGeneroFilter] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  
  // Modal para editar/crear
  const [showModal, setShowModal] = useState(false);
  const [selectedContacto, setSelectedContacto] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadData();
    loadStats();
  }, [currentPage, itemsPerPage, statusFilter, origenFilter, generoFilter, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const filters = {
        page: currentPage,
        limit: itemsPerPage,
        ...(statusFilter && { status: statusFilter }),
        ...(origenFilter && { origen: origenFilter }),
        ...(generoFilter && { genero: generoFilter }),
        ...(searchTerm && { search: searchTerm })
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

  const loadStats = async () => {
    try {
      const statsData = await directorioService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleEdit = (contacto) => {
    setSelectedContacto(contacto);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedContacto(null);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await directorioService.deleteContacto(id);
        loadData();
        loadStats();
      } catch (error) {
        console.error('Error deleting contact:', error);
        alert('Error al eliminar el contacto');
      }
    }
  };

  const handleSave = async (contactoData) => {
    try {
      if (isEditing) {
        await directorioService.updateContacto(selectedContacto.id, contactoData);
      } else {
        await directorioService.createContacto(contactoData);
      }
      setShowModal(false);
      loadData();
      loadStats();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Error al guardar el contacto');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setOrigenFilter('');
    setGeneroFilter('');
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
      <div className="directorio-table-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando contactos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="directorio-table-container">
      {/* Header con estadísticas */}
      <div className="table-header">
        <div className="header-title">
          <h1>Directorio de Contactos</h1>
          <div className="stats-summary">
            <span className="stat-item">
              <strong>Total:</strong> {stats.total || 0}
            </span>
            <span className="stat-item">
              <strong>Clientes:</strong> {stats.clientes || 0}
            </span>
            <span className="stat-item">
              <strong>Prospectos:</strong> {stats.prospectos || 0}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-secondary"
            onClick={() => window.open('/directorio', '_blank')}
          >
            📊 Ver Relaciones
          </button>
          <button className="btn-primary" onClick={handleCreate}>
            + Nuevo Contacto
          </button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filters-row">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los estados</option>
            <option value="cliente">Cliente</option>
            <option value="prospecto">Prospecto</option>
            <option value="inactivo">Inactivo</option>
          </select>

          <select
            value={origenFilter}
            onChange={(e) => setOrigenFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los orígenes</option>
            <option value="web">Web</option>
            <option value="referido">Referido</option>
            <option value="llamada">Llamada</option>
            <option value="email">Email</option>
            <option value="redes_sociales">Redes Sociales</option>
          </select>

          <select
            value={generoFilter}
            onChange={(e) => setGeneroFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los géneros</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
          </select>

          <button onClick={clearFilters} className="btn-clear-filters">
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="table-wrapper">
        {error && (
          <div className="error-message">
            {error}
            <button onClick={loadData} className="btn-retry">Reintentar</button>
          </div>
        )}

        <table className="directorio-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Origen</th>
              <th>Género</th>
              <th>Fecha Nacimiento</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {contactos.length === 0 ? (
              <tr>
                <td colSpan="8" className="no-data">
                  {loading ? 'Cargando...' : 'No se encontraron contactos'}
                </td>
              </tr>
            ) : (
              contactos.map((contacto) => (
                <tr key={contacto.id}>
                  <td className="name-cell">
                    <strong>{contacto.nombre_completo}</strong>
                  </td>
                  <td className="email-cell">
                    {contacto.email && (
                      <a href={`mailto:${contacto.email}`}>{contacto.email}</a>
                    )}
                  </td>
                  <td className="phone-cell">
                    {contacto.telefono && (
                      <a href={`tel:${contacto.telefono}`}>{contacto.telefono}</a>
                    )}
                  </td>
                  <td>
                    <span className={getStatusBadge(contacto.status)}>
                      {contacto.status}
                    </span>
                  </td>
                  <td>{contacto.origen}</td>
                  <td>{contacto.genero}</td>
                  <td>
                    {contacto.fecha_nacimiento && 
                      new Date(contacto.fecha_nacimiento).toLocaleDateString('es-ES')
                    }
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleEdit(contacto)}
                      className="btn-action btn-edit"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(contacto.id)}
                      className="btn-action btn-delete"
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

      {/* Paginación */}
      <div className="pagination-section">
        <div className="pagination-info">
          <span>
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} contactos
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="items-per-page-select"
          >
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
        </div>

        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="btn-pagination"
          >
            ⏮️
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="btn-pagination"
          >
            ⬅️
          </button>
          
          <span className="page-info">
            Página {currentPage} de {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="btn-pagination"
          >
            ➡️
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="btn-pagination"
          >
            ⏭️
          </button>
        </div>
      </div>

      {/* Modal para crear/editar */}
      {showModal && (
        <ContactoModal
          contacto={selectedContacto}
          isEditing={isEditing}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

// Modal component para crear/editar contactos
const ContactoModal = ({ contacto, isEditing, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    telefono: '',
    status: 'prospecto',
    origen: 'web',
    genero: '',
    fecha_nacimiento: '',
    direccion: '',
    notas: ''
  });

  useEffect(() => {
    if (contacto) {
      setFormData({
        nombre_completo: contacto.nombre_completo || '',
        email: contacto.email || '',
        telefono: contacto.telefono || '',
        status: contacto.status || 'prospecto',
        origen: contacto.origen || 'web',
        genero: contacto.genero || '',
        fecha_nacimiento: contacto.fecha_nacimiento ? contacto.fecha_nacimiento.split('T')[0] : '',
        direccion: contacto.direccion || '',
        notas: contacto.notas || ''
      });
    }
  }, [contacto]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{isEditing ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
          <button onClick={onClose} className="btn-close">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre Completo *</label>
              <input
                type="text"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="prospecto">Prospecto</option>
                <option value="cliente">Cliente</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Origen</label>
              <select
                name="origen"
                value={formData.origen}
                onChange={handleChange}
              >
                <option value="web">Web</option>
                <option value="referido">Referido</option>
                <option value="llamada">Llamada</option>
                <option value="email">Email</option>
                <option value="redes_sociales">Redes Sociales</option>
              </select>
            </div>
            <div className="form-group">
              <label>Género</label>
              <select
                name="genero"
                value={formData.genero}
                onChange={handleChange}
              >
                <option value="">Seleccionar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Nacimiento</label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Notas</label>
            <textarea
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DirectorioTable; 