import React, { useState, useEffect } from 'react';
import './DataTable.css';

const DataTable = ({ data, onRowClick }) => {
  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>;
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="table-container" key={JSON.stringify(data)}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} onClick={() => onRowClick(row)}>
              {columns.map(column => (
                <td key={`${index}-${column}`}>{row[column]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable; 