import React, { useState, useEffect } from 'react';
import { fetchBirthdays } from '../../services/birthdayService';
import './Birthdays.css';

const Birthdays = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      ) : (
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
      )}
    </div>
  );
};

export default Birthdays; 