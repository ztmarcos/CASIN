import React, { useState, useEffect } from 'react';
import { fetchBirthdays } from '../../services/birthdayService';
import './Birthdays.css';

const Birthdays = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  useEffect(() => {
    const loadBirthdays = async () => {
      try {
        setLoading(true);
        const data = await fetchBirthdays();
        setBirthdays(data);
      } catch (err) {
        setError('Error loading birthdays: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadBirthdays();
  }, []);

  // Filter birthdays based on search term
  const filteredBirthdays = birthdays.filter(birthday => {
    const searchLower = searchTerm.toLowerCase();
    return (
      birthday.name?.toLowerCase().includes(searchLower) ||
      birthday.rfc?.toLowerCase().includes(searchLower) ||
      birthday.details?.toLowerCase().includes(searchLower)
    );
  });

  // Group birthdays by month
  const groupedBirthdays = filteredBirthdays.reduce((groups, birthday) => {
    const month = birthday.date.toLocaleString('es-MX', { month: 'long' });
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(birthday);
    return groups;
  }, {});

  return (
    <div className="birthdays-container">
      <div className="birthdays-header">
        <h2>Cumpleaños</h2>
        <div className="header-actions">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre, RFC o póliza..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg 
              className="search-icon" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1.5} 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" 
              />
            </svg>
          </div>
          <div className="view-actions">
            <button 
              className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista de cuadrícula"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
            <button 
              className={`view-toggle ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Vista de tabla"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
              </svg>
            </button>
          </div>
          <button className="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Agregar Cumpleaños
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Cargando...</div>
      ) : error ? (
        <div className="error-state">{error}</div>
      ) : filteredBirthdays.length === 0 ? (
        <div className="empty-state">
          {searchTerm ? (
            <p>No se encontraron resultados para "{searchTerm}"</p>
          ) : (
            <p>No hay cumpleaños registrados</p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="birthdays-content">
          {Object.entries(groupedBirthdays).map(([month, monthBirthdays]) => (
            <div key={month} className="month-section">
              <h3 className="month-title">{month}</h3>
              <div className="birthdays-grid">
                {monthBirthdays.map((birthday) => (
                  <div key={birthday.id} className="birthday-card">
                    <div className="birthday-info">
                      <span className="birthday-date">
                        {birthday.formattedDate} ({birthday.age} años)
                      </span>
                      <h3 className="birthday-name">{birthday.name}</h3>
                      <p className="birthday-details">{birthday.details}</p>
                      <span className="birthday-rfc">{birthday.rfc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="birthdays-table-view">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>RFC</th>
                <th>Detalles</th>
                <th>Edad</th>
              </tr>
            </thead>
            <tbody>
              {filteredBirthdays.map((birthday) => (
                <tr key={birthday.id}>
                  <td>{birthday.formattedDate}</td>
                  <td>{birthday.name}</td>
                  <td>{birthday.rfc}</td>
                  <td>{birthday.details}</td>
                  <td>{birthday.age} años</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Birthdays; 