import React, { useState, useEffect } from 'react';
import './ContactoModal.css';

const ContactoModal = ({ contacto, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    nombre_completo: '',
    nombre_completo_oficial: '',
    nickname: '',
    apellido: '',
    display_name: '',
    empresa: '',
    telefono_oficina: '',
    telefono_casa: '',
    telefono_asistente: '',
    telefono_movil: '',
    telefonos_corregidos: '',
    email: '',
    entidad: '',
    genero: '',
    status_social: '',
    ocupacion: '',
    pais: 'MÉXICO',
    status: 'prospecto',
    origen: '',
    comentario: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (contacto) {
      setFormData({
        nombre_completo: contacto.nombre_completo || '',
        nombre_completo_oficial: contacto.nombre_completo_oficial || '',
        nickname: contacto.nickname || '',
        apellido: contacto.apellido || '',
        display_name: contacto.display_name || '',
        empresa: contacto.empresa || '',
        telefono_oficina: contacto.telefono_oficina || '',
        telefono_casa: contacto.telefono_casa || '',
        telefono_asistente: contacto.telefono_asistente || '',
        telefono_movil: contacto.telefono_movil || '',
        telefonos_corregidos: contacto.telefonos_corregidos || '',
        email: contacto.email || '',
        entidad: contacto.entidad || '',
        genero: contacto.genero || '',
        status_social: contacto.status_social || '',
        ocupacion: contacto.ocupacion || '',
        pais: contacto.pais || 'MÉXICO',
        status: contacto.status || 'prospecto',
        origen: contacto.origen || '',
        comentario: contacto.comentario || ''
      });
    }
  }, [contacto]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre_completo.trim()) {
      newErrors.nombre_completo = 'El nombre completo es requerido';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving contacto:', error);
      alert('Error al guardar el contacto');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{contacto ? 'Editar Contacto' : 'Nuevo Contacto'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="contacto-form">
          <div className="form-grid">
            {/* Información básica */}
            <div className="form-section">
              <h3>Información Básica</h3>
              
              <div className="form-group">
                <label htmlFor="nombre_completo">Nombre Completo *</label>
                <input
                  type="text"
                  id="nombre_completo"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleInputChange}
                  className={errors.nombre_completo ? 'error' : ''}
                  required
                />
                {errors.nombre_completo && <span className="error-text">{errors.nombre_completo}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="nombre_completo_oficial">Nombre Completo Oficial</label>
                <input
                  type="text"
                  id="nombre_completo_oficial"
                  name="nombre_completo_oficial"
                  value={formData.nombre_completo_oficial}
                  onChange={handleInputChange}
                  placeholder="Nombre oficial o legal (si es diferente)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="nickname">Nickname</label>
                <input
                  type="text"
                  id="nickname"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellido">Apellido</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="display_name">Nombre de Pantalla</label>
                <input
                  type="text"
                  id="display_name"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  placeholder="Nombre como se mostrará en el sistema"
                />
              </div>

              <div className="form-group">
                <label htmlFor="genero">Género</label>
                <select
                  id="genero"
                  name="genero"
                  value={formData.genero}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
            </div>

            {/* Información de contacto */}
            <div className="form-section">
              <h3>Información de Contacto</h3>
              
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="telefono_movil">Teléfono Móvil</label>
                <input
                  type="tel"
                  id="telefono_movil"
                  name="telefono_movil"
                  value={formData.telefono_movil}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono_oficina">Teléfono Oficina</label>
                <input
                  type="tel"
                  id="telefono_oficina"
                  name="telefono_oficina"
                  value={formData.telefono_oficina}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono_casa">Teléfono Casa</label>
                <input
                  type="tel"
                  id="telefono_casa"
                  name="telefono_casa"
                  value={formData.telefono_casa}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefono_asistente">Teléfono Asistente</label>
                <input
                  type="tel"
                  id="telefono_asistente"
                  name="telefono_asistente"
                  value={formData.telefono_asistente}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="telefonos_corregidos">Teléfonos Corregidos</label>
                <input
                  type="text"
                  id="telefonos_corregidos"
                  name="telefonos_corregidos"
                  value={formData.telefonos_corregidos}
                  onChange={handleInputChange}
                  placeholder="Números de teléfono corregidos o adicionales"
                />
              </div>
            </div>

            {/* Información profesional */}
            <div className="form-section">
              <h3>Información Profesional</h3>
              
              <div className="form-group">
                <label htmlFor="empresa">Empresa</label>
                <input
                  type="text"
                  id="empresa"
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ocupacion">Ocupación</label>
                <input
                  type="text"
                  id="ocupacion"
                  name="ocupacion"
                  value={formData.ocupacion}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="entidad">Entidad</label>
                <input
                  type="text"
                  id="entidad"
                  name="entidad"
                  value={formData.entidad}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="status_social">Estado Social</label>
                <input
                  type="text"
                  id="status_social"
                  name="status_social"
                  value={formData.status_social}
                  onChange={handleInputChange}
                  placeholder="Estado civil, situación social"
                />
              </div>
            </div>

            {/* Estado y clasificación */}
            <div className="form-section">
              <h3>Estado y Clasificación</h3>
              
              <div className="form-group">
                <label htmlFor="status">Estado</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="prospecto">Prospecto</option>
                  <option value="cliente">Cliente</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="origen">Origen</label>
                <select
                  id="origen"
                  name="origen"
                  value={formData.origen}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar</option>
                  <option value="MZD">MZD</option>
                  <option value="LORENA">LORENA</option>
                  <option value="MICH">MICH</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="pais">País</label>
                <input
                  type="text"
                  id="pais"
                  name="pais"
                  value={formData.pais}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Comentarios */}
          <div className="form-section full-width">
            <h3>Comentarios</h3>
            <div className="form-group">
              <label htmlFor="comentario">Comentarios adicionales</label>
              <textarea
                id="comentario"
                name="comentario"
                value={formData.comentario}
                onChange={handleInputChange}
                rows="4"
                placeholder="Información adicional sobre el contacto..."
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-save">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactoModal; 