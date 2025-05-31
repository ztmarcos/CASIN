import React, { useState } from 'react';
import './TableCardView.css';

const TableCardView = ({ data, onCardClick }) => {
  const [expandedCards, setExpandedCards] = useState(new Set());

  const toggleCard = (cardId, event) => {
    event.stopPropagation();
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const formatTableName = (tableName) => {
    if (!tableName) return 'General';
    return tableName.charAt(0).toUpperCase() + tableName.slice(1);
  };

  const getDisplayTitle = (item) => {
    // Priorizar el nombre del contratante
    if (item.nombre_contratante) {
      return item.nombre_contratante;
    }
    
    const titleFields = [
      'nombre',
      'contratante',
      'name'
    ];
    
    for (const field of titleFields) {
      if (item[field] && typeof item[field] === 'string') {
        return item[field];
      }
    }
    
    return 'Sin título';
  };

  const getDisplaySubtitle = (item) => {
    // Priorizar el número de póliza
    if (item.numero_de_poliza) {
      return `Póliza: ${item.numero_de_poliza}`;
    }
    
    const subtitleFields = [
      'poliza',
      'numero_poliza'
    ];
    
    for (const field of subtitleFields) {
      if (item[field] && typeof item[field] === 'string') {
        return `Póliza: ${item[field]}`;
      }
    }
    
    return '';
  };

  const formatDate = (value) => {
    if (!value) return value;
    if (value.includes('/')) return value; // Ya está formateado
    const date = new Date(value);
    return !isNaN(date.getTime()) ? 
      date.toLocaleDateString('es-MX') : 
      value;
  };

  const formatValue = (key, value) => {
    if (!value) return '-';
    
    // Formatear forma de pago
    if (key === 'forma_de_pago') {
      const formaDePago = value.toString().trim().toLowerCase();
      if (!formaDePago || formaDePago === 'null' || formaDePago === 'undefined') {
        return 'No especificada';
      }
      // Capitalizar primera letra
      return formaDePago.charAt(0).toUpperCase() + formaDePago.slice(1);
    }
    
    // Formatear fechas
    if (key.includes('fecha') || key.includes('vigencia')) {
      return formatDate(value);
    }
    
    // Formatear valores monetarios
    if (key.includes('prima') || key.includes('pago') || key.includes('precio') || key.includes('costo')) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(numValue)) return '-';
      return `$${numValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    }

    // Formatear direcciones
    if (key.includes('direccion') || key.includes('domicilio')) {
      return value.toString().split(',').map(part => part.trim()).join(',\n');
    }

    // Formatear descripciones largas
    if (key.includes('descripcion') || (typeof value === 'string' && value.length > 50)) {
      return value.toString().split(' ').reduce((acc, word) => {
        if (acc.length > 0 && acc[acc.length - 1].length + word.length < 40) {
          acc[acc.length - 1] = `${acc[acc.length - 1]} ${word}`;
        } else {
          acc.push(word);
        }
        return acc;
      }, []).join('\n');
    }
    
    return value.toString();
  };

  const formatFieldName = (field) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderCardContent = (item, isExpanded) => {
    const title = getDisplayTitle(item);
    const subtitle = getDisplaySubtitle(item);

    // Campos que siempre se muestran
    const alwaysShowFields = ['vigencia_fin', 'forma_de_pago'];
    
    // Campos que no se deben mostrar
    const excludeFields = [
      'id', 
      '_sourceTable', 
      'nombre_contratante', 
      'numero_de_poliza',
      'aa',
      'pdf',
      'ramo'
    ];

    // Campos prioritarios cuando está expandido
    const priorityFields = [
      'aseguradora',
      'tipo_de_vehiculo',
      'vigencia_inicio',
      'duracion',
      'prima_neta',
      'pago_total_o_prima_total',
      'descripcion_del_vehiculo',
      'modelo',
      'placas'
    ];

    return (
      <>
        <h3 className="card-title">{title}</h3>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
        <div className={`card-details ${isExpanded ? 'expanded' : ''}`}>
          {/* Mostrar campos principales */}
          {alwaysShowFields.map(field => (
            <div key={field} className="card-detail-item">
              <span className="detail-label">{formatFieldName(field)}:</span>
              <span className="detail-value">{formatValue(field, item[field])}</span>
            </div>
          ))}
          
          {/* Mostrar campos cuando está expandido */}
          {isExpanded && (
            <>
              {/* Primero mostrar campos prioritarios */}
              {priorityFields.map(field => 
                item[field] && (
                  <div key={field} className="card-detail-item">
                    <span className="detail-label">{formatFieldName(field)}:</span>
                    <span className="detail-value">{formatValue(field, item[field])}</span>
                  </div>
                )
              )}
              
              {/* Luego mostrar el resto de campos */}
              {Object.entries(item)
                .filter(([key]) => 
                  !excludeFields.includes(key) && 
                  !alwaysShowFields.includes(key) &&
                  !priorityFields.includes(key) &&
                  item[key] !== null && 
                  item[key] !== undefined &&
                  item[key] !== ''
                )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <div key={key} className="card-detail-item">
                    <span className="detail-label">{formatFieldName(key)}:</span>
                    <span className="detail-value">{formatValue(key, value)}</span>
                  </div>
                ))
              }
            </>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="table-card-view">
      {data.map((item, index) => {
        const cardId = `${item._sourceTable || 'table'}-${item.id || index}`;
        const isExpanded = expandedCards.has(cardId);

        return (
          <div 
            key={cardId}
            className="data-card"
            onClick={() => onCardClick(item)}
          >
            <div className="card-header">
              <div className="card-header-left">
                <span className="card-source-table">
                  {formatTableName(item._sourceTable)}
                </span>
                {item.id && <span className="card-id">#{item.id}</span>}
              </div>
              <div className="card-header-right">
                {item.status && (
                  <span className={`card-status status-${item.status?.toLowerCase()}`}>
                    {item.status}
                  </span>
                )}
                <button 
                  className="expand-button"
                  onClick={(e) => toggleCard(cardId, e)}
                  aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                >
                  {isExpanded ? '−' : '+'}
                </button>
              </div>
            </div>
            
            <div className={`card-content ${isExpanded ? 'expanded' : ''}`}>
              {renderCardContent(item, isExpanded)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TableCardView; 