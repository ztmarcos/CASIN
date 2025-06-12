import React from 'react';
import './ContactoCard.css';

const ContactoCard = ({ contacto, onClick, onDelete, onViewPolicies, policyTables }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'cliente':
        return '#4CAF50';
      case 'prospecto':
        return '#FF9800';
      case 'inactivo':
        return '#9E9E9E';
      default:
        return '#2196F3';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'cliente':
        return '👤';
      case 'prospecto':
        return '🎯';
      case 'inactivo':
        return '⏸️';
      default:
        return '📋';
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return null;
    // Simple phone formatting
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '$1 $2 $3');
  };

  return (
    <div className="contacto-card" onClick={onClick}>
      <div className="contacto-header">
        <div className="contacto-avatar">
          {contacto.nombre_completo ? contacto.nombre_completo.charAt(0).toUpperCase() : '?'}
        </div>
        {/* <div className="contacto-status">
          <span 
            className="status-badge"
            style={{ backgroundColor: getStatusColor(contacto.status) }}
          >
            {getStatusIcon(contacto.status)} {contacto.status}
          </span>
        </div> */}
      </div>

      <div className="contacto-info">
        <h3 className="contacto-name">
          {contacto.nombre_completo || contacto.display_name || 'Sin nombre'}
        </h3>
        
        {contacto.empresa && (
          <p className="contacto-empresa">
            🏢 {contacto.empresa}
          </p>
        )}

        {contacto.ocupacion && (
          <p className="contacto-ocupacion">
            💼 {contacto.ocupacion}
          </p>
        )}

        <div className="contacto-contact">
          {contacto.email && (
            <div className="contact-item">
              <span className="contact-icon">📧</span>
              <span className="contact-text">{contacto.email}</span>
            </div>
          )}
          
          {contacto.telefono_movil && (
            <div className="contact-item">
              <span className="contact-icon">📱</span>
              <span className="contact-text">{formatPhone(contacto.telefono_movil)}</span>
            </div>
          )}
          
          {contacto.telefono_oficina && (
            <div className="contact-item">
              <span className="contact-icon">☎️</span>
              <span className="contact-text">{formatPhone(contacto.telefono_oficina)}</span>
            </div>
          )}
        </div>

        {contacto.origen && (
          <div className="contacto-origen">
            <span className="origen-badge">{contacto.origen}</span>
          </div>
        )}

        {/* Sección de pólizas - solo para clientes */}
        {contacto.status === 'cliente' && (
          <div 
            className="contacto-policies clickable"
            onClick={(e) => {
              e.stopPropagation();
              onViewPolicies && onViewPolicies();
            }}
            title="Click para ver pólizas"
          >
            <div className="policies-header">
              <span className="policies-icon">📋</span>
              <span className="policies-label">Pólizas:</span>
            </div>
            <div className="policies-content">
              {policyTables ? (
                <span className="policies-tables">{policyTables}</span>
              ) : (
                <span className="policies-loading">Cargando...</span>
              )}
            </div>
          </div>
        )}

        {contacto.comentario && (
          <div className="contacto-comentario">
            <p>💬 {contacto.comentario.substring(0, 100)}{contacto.comentario.length > 100 ? '...' : ''}</p>
          </div>
        )}
      </div>

      <div className="contacto-actions">
        <button
          className="btn-edit"
          onClick={(e) => {
            console.log('✏️ Edit button clicked in ContactoCard for:', contacto);
            console.log('- contacto.id:', contacto?.id);
            console.log('- contacto.nombre_completo:', contacto?.nombre_completo);
            e.stopPropagation();
            onClick();
            console.log('- onClick() called');
          }}
          title="Editar contacto"
        >
          ✏️
        </button>
        <button
          className="btn-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Eliminar contacto"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default ContactoCard; 