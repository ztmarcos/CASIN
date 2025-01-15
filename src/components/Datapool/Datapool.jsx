import React, { useState, useEffect } from 'react';
import TableCardView from '../TableCardView/TableCardView';
import tableService from '../../services/data/tableService';
import { fetchBirthdays } from '../../services/birthdayService';
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
            _sourceTable: table.name
          }));
        })
      );

      // Fetch birthdays
      const birthdaysData = await fetchBirthdays();
      const formattedBirthdays = birthdaysData.map(birthday => ({
        ...birthday,
        _sourceTable: 'birthdays',
        name: birthday.name,
        details: `${birthday.formattedDate} (${birthday.age} años)`,
        status: birthday.age >= 60 ? 'Senior' : 'Active'
      }));

      // Combine all data
      const flattenedData = [...allTableData.flat(), ...formattedBirthdays];
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
    if (item._sourceTable === 'birthdays') {
      // Handle birthday card click differently if needed
      console.log('Birthday card clicked:', item);
    } else {
      console.log('Selected item:', item);
    }
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