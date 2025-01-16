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

  const renderCardContent = (item, isExpanded) => {
    if (item._sourceTable === 'birthdays') {
      return (
        <>
          <h3 className="card-title">{item.title || item.name}</h3>
          <div className="card-subtitle">{item.subtitle || item.details}</div>
          {isExpanded && (
            <div className="card-details">
              <div className="card-detail-item">
                <span className="detail-label">└─ RFC:</span>
                <span className="detail-value">{item.rfc}</span>
              </div>
              {item.details && (
                <div className="card-detail-item">
                  <span className="detail-label">└─ Detalles:</span>
                  <span className="detail-value">{item.details}</span>
                </div>
              )}
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <h3 className="card-title">{item.title || 'Sin contratante'}</h3>
        <div className="card-subtitle">{item.subtitle || ''}</div>
        {isExpanded && (
          <div className="card-details">
            {Object.entries(item).map(([key, value]) => {
              if (key !== 'id' && 
                  key !== 'title' && 
                  key !== 'subtitle' &&
                  key !== 'status' && 
                  key !== '_sourceTable' &&
                  value !== null && 
                  value !== undefined) {
                return (
                  <div key={key} className="card-detail-item">
                    <span className="detail-label">└─ {key}:</span>
                    <span className="detail-value">
                      {typeof value === 'object' ? JSON.stringify(value) : value.toString()}
                    </span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="table-card-view">
      {data.map((item, index) => {
        const cardId = `${item._sourceTable}-${item.id || index}`;
        const isExpanded = expandedCards.has(cardId);

        return (
          <div 
            key={cardId}
            className={`data-card ${item._sourceTable === 'birthdays' ? 'birthday-card' : ''}`}
            onClick={() => onCardClick(item)}
          >
            <div className="card-header">
              <div className="card-header-left">
                {item._sourceTable && (
                  <span className="card-source-table">{item._sourceTable}</span>
                )}
                {item.id && <span className="card-id">#{item.id}</span>}
              </div>
              <div className="card-header-right">
                {item.status && (
                  <span className={`card-status status-${item.status?.toLowerCase()}`}>
                    {item.status}
                  </span>
                )}
                <button 
                  className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                  onClick={(e) => toggleCard(cardId, e)}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={isExpanded ? "M19.5 12h-15" : "M12 4.5v15m7.5-7.5h-15"} />
                  </svg>
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