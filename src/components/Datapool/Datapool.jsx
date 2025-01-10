import React, { useState, useEffect } from 'react';
import TableCardView from '../TableCardView/TableCardView';
import tableService from '../../services/data/tableService';
import './Datapool.css';

const Datapool = () => {
  const [allData, setAllData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // Get all tables
      const tables = await tableService.getTables();
      
      // Fetch data from each table
      const allTableData = await Promise.all(
        tables.map(async (table) => {
          const result = await tableService.getData(table.name);
          return result.data.map(item => ({
            ...item,
            _sourceTable: table.name // Add source table info to each item
          }));
        })
      );

      // Flatten all data into a single array
      const flattenedData = allTableData.flat();
      setAllData(flattenedData);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data from tables');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (item) => {
    console.log('Selected item:', item);
    // You can implement additional functionality here
  };

  if (isLoading) {
    return <div className="datapool-loading">Loading all data...</div>;
  }

  if (error) {
    return <div className="datapool-error">{error}</div>;
  }

  return (
    <div className="datapool-container">
      <div className="datapool-header">
        <h2>Data Pool</h2>
        <span className="datapool-count">
          {allData.length} total entries
        </span>
      </div>
      <TableCardView 
        data={allData}
        onCardClick={handleCardClick}
      />
    </div>
  );
};

export default Datapool; 