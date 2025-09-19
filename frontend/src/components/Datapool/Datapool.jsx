import React, { useState, useEffect } from 'react';
import TableCardView from '../TableCardView/TableCardView';
import tableService from '../../services/data/tableService';
import { fetchBirthdays } from '../../services/birthdayServiceNew';
import './Datapool.css';

const Datapool = () => {
  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchTerm, allData]);

  const filterData = () => {
    if (!searchTerm.trim()) {
      setFilteredData(allData);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = allData.filter(item => {
      // Search through all string and number properties
      return Object.entries(item).some(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          return value.toString().toLowerCase().includes(searchTermLower);
        }
        return false;
      });
    });
    setFilteredData(filtered);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get all tables
      const tables = await tableService.getTables();
      
      if (!tables || !Array.isArray(tables)) {
        throw new Error('No tables found or invalid tables data');
      }

      // Fetch data from each table
      const allTableData = await Promise.all(
        tables.map(async (table) => {
          try {
            const result = await tableService.getData(table.name);
            if (!result || !result.data || !Array.isArray(result.data)) {
              console.warn(`No data or invalid data for table ${table.name}`);
              return [];
            }
            return result.data.map(item => {
              // Debug log to see actual fields
              console.log('Available fields:', Object.keys(item));

              // Find nombre_contratante field by looking for keywords
              const nombreContratanteField = Object.keys(item).find(key => 
                key.toLowerCase().includes('nombre_contratante') ||
                key.toLowerCase().includes('contratante') || 
                key.toLowerCase().includes('nombre del contratante') ||
                key.toLowerCase().includes('nombre_del_contratante') ||
                key.toLowerCase().includes('nombrecontratante') ||
                key.toLowerCase().includes('nombre') ||
                key.toLowerCase().includes('contrat')
              );

              // Find poliza field by looking for keywords
              const polizaField = Object.keys(item).find(key => 
                key.toLowerCase().includes('poliza') || 
                key.toLowerCase().includes('numero_poliza') ||
                key.toLowerCase().includes('numero de poliza') ||
                key.toLowerCase().includes('numeropoliza') ||
                key.toLowerCase().includes('numero_de_poliza') ||
                key.toLowerCase().includes('nopoliza') ||
                key.toLowerCase().includes('no_poliza')
              );

              console.log('Found fields:', {
                nombre_contratante: nombreContratanteField,
                poliza: polizaField,
                nombre_contratanteValue: item[nombreContratanteField],
                polizaValue: item[polizaField]
              });

              const title = item[contratanteField] || 
                          item['nombre_del_contratante'] || 
                          item['NOMBRE_DEL_CONTRATANTE'] || 
                          item['nombreDelContratante'] || 
                          'Sin contratante';

              const polizaNum = item[polizaField] || 
                               item['numero_de_poliza'] || 
                               item['NUMERO_DE_POLIZA'] || 
                               item['numeroDePoliza'] || 
                               'N/A';

              return {
                ...item,
                _sourceTable: table.name,
                title,
                subtitle: `Póliza: ${polizaNum} - Tabla: ${table.name}`,
                details: Object.entries(item)
                  .filter(([key]) => 
                    !['_sourceTable'].includes(key) && 
                    key !== contratanteField && 
                    key !== polizaField
                  )
                  .map(([key, value]) => `${key}: ${value}`)
                  .join('\n')
              };
            });
          } catch (err) {
            console.error(`Error loading data for table ${table.name}:`, err);
            return [];
          }
        })
      );

      // Fetch birthdays with error handling
      let birthdaysData = [];
      try {
        birthdaysData = await fetchBirthdays();
        birthdaysData = birthdaysData.map(birthday => ({
          ...birthday,
          _sourceTable: 'birthdays',
          title: birthday.name,
          subtitle: `${birthday.formattedDate} (${birthday.age} años)`,
          details: birthday.details,
          status: birthday.age >= 60 ? 'Senior' : 'Active'
        }));
      } catch (err) {
        console.error('Error loading birthdays:', err);
      }

      // Combine all data
      const flattenedData = [...allTableData.flat(), ...birthdaysData];
      setAllData(flattenedData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
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
        <div className="search-container">
          <input
            type="text"
            placeholder="Search in all data..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          <span className="datapool-count">
            {filteredData.length} of {allData.length} entries
          </span>
        </div>
      </div>
      <TableCardView 
        data={filteredData}
        onCardClick={handleCardClick}
      />
    </div>
  );
};

export default Datapool; 