import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Weather from '../Weather/Weather';
import { fetchBirthdays } from '../../services/birthdayServiceNew';
import tableService from '../../services/data/tableService';
import { formatDate } from '../../utils/dateUtils';
import './Dashboard.css';

const Dashboard = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [expirations, setExpirations] = useState([]);
  const [loading, setLoading] = useState({
    birthdays: true,
    expirations: true
  });
  const [error, setError] = useState({
    birthdays: null,
    expirations: null
  });
  const [showAllExpirations, setShowAllExpirations] = useState(false);

  useEffect(() => {
    loadBirthdays();
    loadExpirations();
  }, []);

  const loadBirthdays = async () => {
    try {
      setLoading(prev => ({ ...prev, birthdays: true }));
      // Get current date
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentDay = currentDate.getDate();
      
      // Fetch birthdays
      const birthdayData = await fetchBirthdays();
      
      if (!Array.isArray(birthdayData)) {
        throw new Error('Invalid birthday data received');
      }

      // Filter birthdays for today
      const todaysBirthdays = birthdayData
        .filter(birthday => {
          if (!birthday?.date) return false;
          const birthdayDate = new Date(birthday.date);
          if (!birthdayDate.getTime()) return false;
          
          // Check if the birthday is today (same month and day)
          return birthdayDate.getMonth() === currentMonth && 
                 birthdayDate.getDate() === currentDay;
        })
        .sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateA.getDate() - dateB.getDate();
        });
      
      setBirthdays(todaysBirthdays);
      setError(prev => ({ ...prev, birthdays: null }));
    } catch (err) {
      console.error('Error loading birthdays:', err);
      setError(prev => ({ ...prev, birthdays: 'Error al cargar los cumpleaños' }));
      setBirthdays([]);
    } finally {
      setLoading(prev => ({ ...prev, birthdays: false }));
    }
  };

  const loadExpirations = async () => {
    try {
      setLoading(prev => ({ ...prev, expirations: true }));
      
      // Fetch policies data
      const [gmmResponse, autosResponse] = await Promise.all([
        tableService.getData('gmm').catch(err => ({ data: [] })),
        tableService.getData('autos').catch(err => ({ data: [] }))
      ]);

      // Normalize and combine the data
      const gmmPolicies = (gmmResponse.data || []).map(policy => ({
        numero_poliza: policy.n__mero_de_p__liza,
        contratante: policy.contratante,
        fecha_fin: policy.vigencia__fin_,
        aseguradora: policy.aseguradora,
        tipo: 'GMM'
      }));

      const autosPolicies = (autosResponse.data || []).map(policy => ({
        numero_poliza: policy.numero_de_poliza,
        contratante: policy.nombre_contratante,
        fecha_fin: policy.vigencia_fin,
        aseguradora: policy.aseguradora,
        tipo: 'Auto'
      }));

      // Get current date info
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Combine and filter policies expiring this month
      const allPolicies = [...gmmPolicies, ...autosPolicies];
      const monthlyExpirations = allPolicies
        .filter(policy => {
          if (!policy?.fecha_fin) return false;
          const expiryDate = new Date(policy.fecha_fin);
          if (!expiryDate.getTime()) return false;
          
          // Check if expiration is in the current month
          return expiryDate.getMonth() === currentMonth && 
                 expiryDate.getFullYear() === currentYear;
        })
        .sort((a, b) => {
          const dateA = new Date(a.fecha_fin);
          const dateB = new Date(b.fecha_fin);
          return dateA - dateB;
        });

      console.log('Vencimientos encontrados:', monthlyExpirations.map(p => ({
        poliza: p.numero_poliza,
        fecha: p.fecha_fin,
        contratante: p.contratante
      })));

      setExpirations(monthlyExpirations);
      setError(prev => ({ ...prev, expirations: null }));
    } catch (err) {
      console.error('Error loading expirations:', err);
      setError(prev => ({ ...prev, expirations: 'Error al cargar los vencimientos' }));
      setExpirations([]);
    } finally {
      setLoading(prev => ({ ...prev, expirations: false }));
    }
  };

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      
      <div className="dashboard-grid">
        {/* Sección 1 - Clima */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Clima</h3>
          </div>
          <div className="card-content">
            <Weather />
          </div>
        </div>

        {/* Sección 2 - Cumpleaños de la Semana */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Cumpleaños de la Semana</h3>
          </div>
          <div className="card-content">
            {loading.birthdays ? (
              <div className="loading-spinner"></div>
            ) : error.birthdays ? (
              <div className="error-message">{error.birthdays}</div>
            ) : birthdays.length === 0 ? (
              <p className="no-birthdays">No hay cumpleaños esta semana</p>
            ) : (
              <div className="birthday-list">
                {birthdays.slice(0, 3).map((birthday) => {
                  const birthdayDate = new Date(birthday.date);
                  const thisYearBirthday = new Date(
                    new Date().getFullYear(),
                    birthdayDate.getMonth(),
                    birthdayDate.getDate()
                  );
                  const dayName = thisYearBirthday.toLocaleDateString('es-ES', { weekday: 'long' });
                  
                  return (
                    <div key={birthday.id || birthday.rfc} className="birthday-item">
                      <div className="birthday-info">
                        <span className="birthday-name">{birthday.name}</span>
                        <span className="birthday-date">
                          {dayName.charAt(0).toUpperCase() + dayName.slice(1)}
                        </span>
                        <span className="birthday-age">
                          Cumple: {birthday.age + 1} años
                        </span>
                      </div>
                      {birthday.email && (
                        <div className="birthday-email">
                          <span className="email-icon">📧</span>
                          {birthday.email}
                        </div>
                      )}
                    </div>
                  );
                })}
                {birthdays.length > 3 && (
                  <Link to="/birthdays" className="view-more-link">
                    Ver más ({birthdays.length - 3} más)
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sección 3 - Vencimientos de la Semana */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Vencimientos del mes</h3>
          </div>
          <div className="card-content">
            {loading.expirations ? (
              <div className="loading-spinner"></div>
            ) : error.expirations ? (
              <div className="error-message">{error.expirations}</div>
            ) : expirations.length === 0 ? (
              <p className="no-expirations">No hay vencimientos este mes</p>
            ) : (
              <div className="expiration-list">
                {(showAllExpirations ? expirations : expirations.slice(0, 2)).map((policy) => (
                  <div key={`${policy.tipo}-${policy.numero_poliza}`} className="expiration-item">
                    <div className="expiration-info">
                      <span className="expiration-type">{policy.tipo}</span>
                      <span className="expiration-policy">{policy.numero_poliza}</span>
                    </div>
                    <div className="expiration-details">
                      <span className="expiration-name">{policy.contratante}</span>
                      <span className="expiration-date">
                        Vence: {formatDate(policy.fecha_fin, 'long-es')}
                      </span>
                    </div>
                  </div>
                ))}
                {expirations.length > 2 && (
                  <button 
                    onClick={() => setShowAllExpirations(!showAllExpirations)}
                    className="toggle-view-btn"
                  >
                    {showAllExpirations ? 'Ver menos' : `Ver más (${expirations.length - 2} más)`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sección 4 - Actividad Reciente */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Actividad Reciente</h3>
          </div>
          <div className="card-content">
            <div className="activity-list">
              <div className="activity-item">
                <span className="activity-time">2m atrás</span>
                <span className="activity-text">Nuevo registro añadido</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">1h atrás</span>
                <span className="activity-text">Datos actualizados</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">3h atrás</span>
                <span className="activity-text">Respaldo del sistema</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 