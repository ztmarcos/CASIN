import React from 'react';
import './TableCardView.css';

const TableCardView = ({ data, onCardClick }) => {
  return (
    <div className="table-card-view">
      {data.map((item) => (
        <div 
          key={item.id} 
          className="data-card"
          onClick={() => onCardClick(item)}
        >
          <div className="card-header">
            <span className="card-id">#{item.id}</span>
            <span className={`card-status status-${item.status?.toLowerCase()}`}>
              {item.status}
            </span>
          </div>
          
          <div className="card-content">
            <h3 className="card-title">{item.name}</h3>
            <div className="card-details">
              {Object.entries(item).map(([key, value]) => {
                if (key !== 'id' && key !== 'name' && key !== 'status') {
                  return (
                    <div key={key} className="card-detail-item">
                      <span className="detail-label">└─ {key}:</span>
                      <span className="detail-value">{value}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TableCardView; 