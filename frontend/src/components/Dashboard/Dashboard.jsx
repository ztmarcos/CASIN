import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Weather from '../Weather/Weather';
import firebaseDashboardService from '../../services/firebaseDashboardService';
import { formatDate } from '../../utils/dateUtils';
import { runFirebaseTests } from '../../utils/firebaseTest';
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
  const [firebaseTestResult, setFirebaseTestResult] = useState(null);
  const [testingFirebase, setTestingFirebase] = useState(false);

  useEffect(() => {
    loadBirthdays();
    loadExpirations();
  }, []);

  const loadBirthdays = async () => {
    try {
      setLoading(prev => ({ ...prev, birthdays: true }));
      
      // Use Firebase service to get today's birthdays
      const todaysBirthdays = await firebaseDashboardService.getBirthdaysForPeriod('today');
      
      // Sort by date
      const sortedBirthdays = todaysBirthdays.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getDate() - dateB.getDate();
      });
      
      setBirthdays(sortedBirthdays);
      setError(prev => ({ ...prev, birthdays: null }));
      
      console.log(`🎂 Dashboard: Loaded ${sortedBirthdays.length} birthdays for today`);
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
      
      // Use Firebase service to get this month's expirations
      const monthlyExpirations = await firebaseDashboardService.getExpirationForPeriod('month');
      
      // Sort by expiration date
      const sortedExpirations = monthlyExpirations.sort((a, b) => {
        return new Date(a.fecha_fin) - new Date(b.fecha_fin);
      });

      console.log('🔄 Firebase Dashboard: Vencimientos encontrados:', sortedExpirations.map(p => ({
        poliza: p.numero_poliza,
        fecha: p.fecha_fin,
        contratante: p.contratante,
        tipo: p.tipo
      })));

      setExpirations(sortedExpirations);
      setError(prev => ({ ...prev, expirations: null }));
    } catch (err) {
      console.error('Error loading expirations:', err);
      setError(prev => ({ ...prev, expirations: 'Error al cargar los vencimientos' }));
      setExpirations([]);
    } finally {
      setLoading(prev => ({ ...prev, expirations: false }));
    }
  };

  const handleFirebaseTest = async () => {
    setTestingFirebase(true);
    setFirebaseTestResult(null);
    
    try {
      const result = await runFirebaseTests();
      setFirebaseTestResult(result);
    } catch (error) {
      setFirebaseTestResult({
        configLoaded: false,
        databaseConnected: false,
        collections: [],
        errors: [error.message]
      });
    } finally {
      setTestingFirebase(false);
    }
  };

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      
      <div className="dashboard-grid">
        {/* Firebase Test Section - Only show if there are errors */}
        {(error.birthdays || error.expirations) && (
          <div className="dashboard-card firebase-test-card">
            <div className="card-header">
              <h3>🔥 Firebase Connection Test</h3>
            </div>
            <div className="card-content">
              <button 
                onClick={handleFirebaseTest} 
                disabled={testingFirebase}
                className="firebase-test-btn"
              >
                {testingFirebase ? 'Testing...' : 'Test Firebase Connection'}
              </button>
              
              {firebaseTestResult && (
                <div className="firebase-test-results">
                  <div className={`test-status ${firebaseTestResult.databaseConnected ? 'success' : 'error'}`}>
                    {firebaseTestResult.databaseConnected ? '✅ Connected' : '❌ Connection Failed'}
                  </div>
                  
                  <div className="test-details">
                    <p><strong>Config Loaded:</strong> {firebaseTestResult.configLoaded ? 'Yes' : 'No'}</p>
                    <p><strong>Collections Found:</strong> {firebaseTestResult.collections.length}</p>
                    
                    {firebaseTestResult.errors.length > 0 && (
                      <div className="test-errors">
                        <strong>Errors:</strong>
                        <ul>
                          {firebaseTestResult.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
            <h3>Cumpleaños de Hoy</h3>
          </div>
          <div className="card-content">
            {loading.birthdays ? (
              <div className="loading-spinner"></div>
            ) : error.birthdays ? (
              <div className="error-message">{error.birthdays}</div>
            ) : birthdays.length === 0 ? (
              <p className="no-birthdays">No hay cumpleaños hoy</p>
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
                <span className="activity-text">Nuevo registro añadido a Firebase</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">1h atrás</span>
                <span className="activity-text">Datos migrados a Firebase</span>
              </div>
              <div className="activity-item">
                <span className="activity-time">3h atrás</span>
                <span className="activity-text">Sistema conectado a Firebase</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 