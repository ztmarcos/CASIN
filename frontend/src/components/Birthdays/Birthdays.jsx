import React, { useState, useEffect } from 'react';
import { fetchBirthdays, triggerBirthdayEmails } from '../../services/firebaseBirthdayService';
import './Birthdays.css';

const Birthdays = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [emailStatus, setEmailStatus] = useState(null);
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(true);

  useEffect(() => {
    loadBirthdays();
    // Activar envío automático de correos de cumpleaños
    if (autoEmailEnabled) {
      handleAutoSendEmails();
    }
  }, [autoEmailEnabled]);

  // Function to determine if an RFC belongs to a natural person (persona física)
  const isPersonalRFC = (rfc) => {
    if (!rfc || typeof rfc !== 'string') return false;
    
    // Remove spaces and convert to uppercase
    const cleanRFC = rfc.trim().toUpperCase();
    
    // Personal RFC: 13 characters (4 letters + 6 numbers + 3 characters)
    // Business RFC: 12 characters (3 letters + 6 numbers + 3 characters)
    if (cleanRFC.length === 13) {
      // Check pattern: 4 letters + 6 numbers + 3 alphanumeric characters
      const personalPattern = /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/;
      return personalPattern.test(cleanRFC);
    }
    
    return false;
  };

  const loadBirthdays = async () => {
    try {
      setLoading(true);
      console.log('🎂 Loading birthdays from Firebase...');
      const data = await fetchBirthdays();
      
      // Convert date strings to Date objects
      const processedData = data.map(birthday => ({
        ...birthday,
        date: new Date(birthday.date)
      }));
      
      setBirthdays(processedData);
      console.log(`✅ Loaded ${processedData.length} birthdays from Firebase`);
    } catch (err) {
      console.error('Error loading birthdays:', err);
      setError('Error loading birthdays: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSendEmails = async () => {
    try {
      setEmailStatus({ loading: true });
      const result = await triggerBirthdayEmails();
      setEmailStatus({ 
        success: true, 
        message: `✅ Mail automático de cumpleaños activado. ${result.message || `Se encontraron ${result.emailsSent} cumpleaños para hoy.`}`
      });
      setTimeout(() => setEmailStatus(null), 8000); // Clear message after 8 seconds
    } catch (err) {
      setEmailStatus({ error: true, message: 'Error al activar envío automático: ' + err.message });
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setEmailStatus({ loading: true });
      // Enviar test a ztmarcos@gmail.com con copia a casinseguros@gmail.com
      const testResult = await triggerBirthdayEmails();
      setEmailStatus({ 
        success: true, 
        message: `✅ Test enviado a ztmarcos@gmail.com con copia a casinseguros@gmail.com. ${testResult.message || 'Test completado.'}`
      });
      setTimeout(() => setEmailStatus(null), 8000);
    } catch (err) {
      setEmailStatus({ error: true, message: 'Error en test de correo: ' + err.message });
    }
  };

  // Filter birthdays based on search term and only include personal RFCs (personas físicas)
  const filteredBirthdays = birthdays.filter(birthday => {
    // First filter: only include personal RFCs (exclude businesses)
    if (!isPersonalRFC(birthday.rfc)) {
      return false;
    }
    
    // Second filter: search term
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      birthday.name?.toLowerCase().includes(searchLower) ||
      birthday.rfc?.toLowerCase().includes(searchLower) ||
      birthday.email?.toLowerCase().includes(searchLower) ||
      birthday.details?.toLowerCase().includes(searchLower)
    );
  });

  // Get current date info
  const today = new Date();
  const currentMonth = today.toLocaleString('es-MX', { month: 'long' });
  const todayString = today.toDateString();

  // Filter birthdays for today and current month
  const todayBirthdays = filteredBirthdays.filter(birthday => {
    if (!birthday.date) return false;
    return birthday.date.toDateString() === todayString;
  });

  const currentMonthBirthdays = filteredBirthdays.filter(birthday => {
    if (!birthday.date) return false;
    const birthdayMonth = birthday.date.toLocaleString('es-MX', { month: 'long' });
    return birthdayMonth === currentMonth;
  });

  // Group birthdays by month
  const groupedBirthdays = filteredBirthdays.reduce((groups, birthday) => {
    if (!birthday.date) return groups;
    const month = birthday.date.toLocaleString('es-MX', { month: 'long' });
    if (!groups[month]) {
      groups[month] = [];
    }
    groups[month].push(birthday);
    return groups;
  }, {});

  const formatDate = (date) => {
    if (!date) return 'Fecha no disponible';
    try {
      return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Error en fecha';
    }
  };

  return (
    <div className="birthdays-container">
      <div className="birthdays-header">
        <h2>🎂 Cumpleaños - Personas Físicas</h2>
        {autoEmailEnabled && (
          <div className="auto-email-status">
            <span className="auto-email-badge">
              ✅ Mail automático de cumpleaños activado
            </span>
          </div>
        )}
        <div className="header-actions">
          <div className="search-container">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="search-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por nombre, RFC, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="view-actions">
            <button 
              className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista de tarjetas"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621.504 1.125 1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
              </svg>
            </button>
            <button 
              className={`view-toggle ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Vista de tabla"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621.504 1.125 1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
              </svg>
            </button>
          </div>
          
        </div>
      </div>

      {emailStatus && (
        <div className={`email-status ${emailStatus.success ? 'success' : emailStatus.error ? 'error' : ''}`}>
          {emailStatus.message}
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <p>Cargando cumpleaños desde Firebase...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={loadBirthdays} className="btn-primary">
            Reintentar
          </button>
        </div>
      ) : filteredBirthdays.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron cumpleaños de personas físicas</p>
          <small>Solo se muestran RFC de personas físicas (13 caracteres)</small>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="birthdays-content">
          {/* Today's Birthdays Section */}
          {todayBirthdays.length > 0 && (
            <div className="highlight-section today-section">
              <h3 className="highlight-title">
                🎉 Cumpleaños de Hoy ({todayBirthdays.length})
              </h3>
              <div className="birthdays-grid">
                {todayBirthdays.map((birthday) => (
                  <div key={birthday.id} className="birthday-card today-birthday">
                    <div className="birthday-info">
                      <span className="birthday-date today-badge">
                        ¡HOY! ({birthday.age} años)
                      </span>
                      <h3 className="birthday-name">{birthday.name}</h3>
                      <p className="birthday-details">{birthday.details}</p>
                      <div className="birthday-contact">
                        <span className="birthday-rfc">{birthday.rfc}</span>
                        {birthday.email && (
                          <span className="birthday-email">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="email-icon">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                            </svg>
                            {birthday.email}
                          </span>
                        )}
                      </div>
                      <div className="birthday-metadata">
                        <span className="birthday-source">{birthday.source}</span>
                        <span className="birthday-source-type" title="Fuente de la fecha de nacimiento">
                          {birthday.birthdaySource}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Month Birthdays Section */}
          {currentMonthBirthdays.length > 0 && (
            <div className="highlight-section current-month-section">
              <h3 className="highlight-title">
                📅 Cumpleaños de {currentMonth} ({currentMonthBirthdays.length})
              </h3>
              <div className="birthdays-grid">
                {currentMonthBirthdays
                  .filter(birthday => !todayBirthdays.some(today => today.id === birthday.id)) // Exclude today's birthdays
                  .sort((a, b) => a.date.getDate() - b.date.getDate()) // Sort by day of month
                  .map((birthday) => (
                    <div key={birthday.id} className="birthday-card current-month-birthday">
                      <div className="birthday-info">
                        <span className="birthday-date current-month-badge">
                          {formatDate(birthday.date)} ({birthday.age} años)
                        </span>
                        <h3 className="birthday-name">{birthday.name}</h3>
                        <p className="birthday-details">{birthday.details}</p>
                        <div className="birthday-contact">
                          <span className="birthday-rfc">{birthday.rfc}</span>
                          {birthday.email && (
                            <span className="birthday-email">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="email-icon">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                              </svg>
                              {birthday.email}
                            </span>
                          )}
                        </div>
                        <div className="birthday-metadata">
                          <span className="birthday-source">{birthday.source}</span>
                          <span className="birthday-source-type" title="Fuente de la fecha de nacimiento">
                            {birthday.birthdaySource}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* All Birthdays by Month */}
          <div className="all-birthdays-section">
            <h3 className="section-title">Todos los Cumpleaños por Mes</h3>
            {Object.entries(groupedBirthdays).map(([month, monthBirthdays]) => (
              <div key={month} className="month-section">
                <h4 className="month-title">{month}</h4>
                <div className="birthdays-grid">
                  {monthBirthdays.map((birthday) => (
                    <div key={birthday.id} className="birthday-card">
                      <div className="birthday-info">
                        <span className="birthday-date">
                          {formatDate(birthday.date)} ({birthday.age} años)
                        </span>
                        <h3 className="birthday-name">{birthday.name}</h3>
                        <p className="birthday-details">{birthday.details}</p>
                        <div className="birthday-contact">
                          <span className="birthday-rfc">{birthday.rfc}</span>
                          {birthday.email && (
                            <span className="birthday-email">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="email-icon">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                              </svg>
                              {birthday.email}
                            </span>
                          )}
                        </div>
                        <div className="birthday-metadata">
                          <span className="birthday-source">{birthday.source}</span>
                          <span className="birthday-source-type" title="Fuente de la fecha de nacimiento">
                            {birthday.birthdaySource}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="birthdays-table-view">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>RFC</th>
                <th>Detalles</th>
                <th>Edad</th>
                <th>Fuente</th>
                <th>Origen Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredBirthdays.map((birthday) => (
                <tr key={birthday.id}>
                  <td>{formatDate(birthday.date)}</td>
                  <td>{birthday.name}</td>
                  <td>{birthday.email || '-'}</td>
                  <td>{birthday.rfc || '-'}</td>
                  <td>{birthday.details}</td>
                  <td>{birthday.age} años</td>
                  <td>{birthday.source}</td>
                  <td title="Fuente de la fecha de nacimiento">{birthday.birthdaySource}</td>
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