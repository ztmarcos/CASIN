import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { getCleanTeamName } from '../../utils/teamUtils';
import { FEATURES } from '../../config/features';
import logoImage from '/logo.png';
import { Link } from 'react-router-dom';
import Weather from '../Weather/Weather';
import firebaseDashboardService from '../../services/firebaseDashboardService';
import { formatDate } from '../../utils/dateUtils';
import { runFirebaseTests } from '../../utils/firebaseTest';
import { triggerBirthdayEmails } from '../../services/firebaseBirthdayService';

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
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  useEffect(() => {
    loadBirthdays();
    loadExpirations();
    // Trigger automatic birthday emails when dashboard loads
    triggerAutomaticBirthdayEmails();
  }, []);

  const triggerAutomaticBirthdayEmails = async () => {
    try {
      console.log('🎂 Dashboard: Triggering automatic birthday emails...');
      await triggerBirthdayEmails();
      console.log('✅ Dashboard: Birthday emails triggered successfully');
    } catch (error) {
      console.error('❌ Dashboard: Error triggering birthday emails:', error);
    }
  };

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
        contratante: p.nombre_contratante,
        tipo: p.tipo_seguro,
        source: p.source
      })));
      
      // Debug: Log raw data for first few items
      if (sortedExpirations.length > 0) {
        console.log('🔍 Debug - First expiration item raw data:', sortedExpirations[0]);
      }

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

  // Test function to check vencimientos directly
  const testVencimientos = async () => {
    try {
      console.log('🧪 Testing vencimientos directly...');
      const reportsService = firebaseDashboardService.reportsService;
      const vencimientos = await reportsService.getVencimientos();
      console.log('🧪 Direct vencimientos result:', vencimientos);
      return vencimientos;
    } catch (error) {
      console.error('🧪 Error testing vencimientos:', error);
      return [];
    }
  };

  const handlePolicyClick = (policy) => {
    setSelectedPolicy(policy);
    setShowPolicyModal(true);
  };

  const closePolicyModal = () => {
    setSelectedPolicy(null);
    setShowPolicyModal(false);
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
              
              <button 
                onClick={testVencimientos} 
                className="firebase-test-btn"
                style={{ marginTop: '10px' }}
              >
                Test Vencimientos Directly
              </button>
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
            <h3>Vencimientos próximos</h3>
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
                  <div 
                    key={`${policy.tipo_seguro}-${policy.numero_poliza}`} 
                    className="expiration-item clickable"
                    onClick={() => handlePolicyClick(policy)}
                  >
                    <div className="expiration-info">
                      <span className="expiration-type">{policy.tipo_seguro}</span>
                      <span className="expiration-policy">{policy.numero_poliza}</span>
                      <span className="expiration-ramo">{policy.source}</span>
                    </div>
                    <div className="expiration-details">
                      <span className="expiration-name">{policy.nombre_contratante}</span>
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

      </div>

      {/* Policy Modal */}
      {showPolicyModal && selectedPolicy && (
        <div className="policy-modal-overlay" onClick={closePolicyModal}>
          <div className="policy-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="policy-modal-header">
              <h3>Detalles de la Póliza</h3>
              <button className="close-modal-btn" onClick={closePolicyModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="policy-modal-body">
              <div className="policy-details-grid">
                <div className="policy-detail-item">
                  <span className="policy-detail-label">Número de Póliza:</span>
                  <span className="policy-detail-value">{selectedPolicy.numero_poliza}</span>
                </div>
                <div className="policy-detail-item">
                  <span className="policy-detail-label">Contratante:</span>
                  <span className="policy-detail-value">{selectedPolicy.nombre_contratante}</span>
                </div>
                <div className="policy-detail-item">
                  <span className="policy-detail-label">Aseguradora:</span>
                  <span className="policy-detail-value">{selectedPolicy.aseguradora}</span>
                </div>
                <div className="policy-detail-item">
                  <span className="policy-detail-label">Tipo de Seguro:</span>
                  <span className="policy-detail-value">{selectedPolicy.tipo_seguro}</span>
                </div>
                <div className="policy-detail-item">
                  <span className="policy-detail-label">Ramo:</span>
                  <span className="policy-detail-value">{selectedPolicy.source}</span>
                </div>
                <div className="policy-detail-item">
                  <span className="policy-detail-label">Fecha de Vencimiento:</span>
                  <span className="policy-detail-value">{formatDate(selectedPolicy.fecha_fin, 'long-es')}</span>
                </div>
                {selectedPolicy.rfc && (
                  <div className="policy-detail-item">
                    <span className="policy-detail-label">RFC:</span>
                    <span className="policy-detail-value">{selectedPolicy.rfc}</span>
                  </div>
                )}
                {selectedPolicy.email && (
                  <div className="policy-detail-item">
                    <span className="policy-detail-label">Email:</span>
                    <span className="policy-detail-value">{selectedPolicy.email}</span>
                  </div>
                )}
                {selectedPolicy.telefono && (
                  <div className="policy-detail-item">
                    <span className="policy-detail-label">Teléfono:</span>
                    <span className="policy-detail-value">{selectedPolicy.telefono}</span>
                  </div>
                )}
                {selectedPolicy.prima > 0 && (
                  <div className="policy-detail-item">
                    <span className="policy-detail-label">Prima:</span>
                    <span className="policy-detail-value">${selectedPolicy.prima.toLocaleString()} {selectedPolicy.moneda}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 