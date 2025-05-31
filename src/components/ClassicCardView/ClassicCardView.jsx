import React from 'react';
import './ClassicCardView.css';

const ClassicCardView = ({ items, onCardClick }) => {
  // Formatear fecha al estilo español
  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Obtener clase CSS según el estado
  const getStatusClass = (status) => {
    if (!status) return 'status-pending';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('complet') || statusLower.includes('termin')) return 'status-completed';
    if (statusLower.includes('progres') || statusLower.includes('curso')) return 'status-in-progress';
    return 'status-pending';
  };

  return (
    <div className="classic-card-container">
      {items.map((item) => (
        <div 
          key={item.id} 
          className="classic-card"
          onClick={() => onCardClick(item)}
        >
          <div className="card-header">
            <h3 className="card-title">{item.titulo || item.title || 'Sin título'}</h3>
          </div>

          <div className="card-body">
            <p className="card-description">
              {item.descripcion || item.description || 'Sin descripción'}
            </p>

            <div className="card-status-container">
              <span className={`card-status ${getStatusClass(item.estado || item.status)}`}>
                {item.estado || item.status || 'Pendiente'}
              </span>
            </div>

            <div className="card-footer">
              <div className="card-user">
                <i className="user-icon">👤</i>
                <span>{item.usuario || item.user || 'Usuario no asignado'}</span>
              </div>
              <span className="card-date">
                <i className="date-icon">📅</i>
                {formatDate(item.fecha || item.date)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ClassicCardView; 