import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Weather from '../Weather/Weather';
import { fetchBirthdays } from '../../services/birthdayService';
import tableService from '../../services/data/tableService';
import './Dashboard.css';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const formatearFecha = (fecha) => {
  const date = new Date(fecha);
  const dia = date.getDate();
  const mes = MESES[date.getMonth()];
  const año = date.getFullYear();
  return `${dia} de ${mes} ${año}`;
};

const Dashboard = () => {
  const [birthdays, setBirthdays] = useState([]);
  const [expirations, setExpirations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch birthdays
        const birthdayData = await fetchBirthdays();
        
        // Filter birthdays for current month
        const currentMonth = new Date().getMonth();
        const thisMonthBirthdays = birthdayData.filter(birthday => 
          birthday.date.getMonth() === currentMonth
        ).sort((a, b) => a.date.getDate() - b.date.getDate());
        
        setBirthdays(thisMonthBirthdays);

        // Fetch policies data
        const [gmmResponse, autosResponse] = await Promise.all([
          tableService.getData('gmm'),
          tableService.getData('autos')
        ]);

        // Normalize and combine the data
        const currentDate = new Date();

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

        // Combine and filter policies expiring this month
        const allPolicies = [...gmmPolicies, ...autosPolicies];
        const monthlyExpirations = allPolicies.filter(policy => {
          const expiryDate = new Date(policy.fecha_fin);
          return expiryDate.getMonth() === currentMonth;
        }).sort((a, b) => new Date(a.fecha_fin) - new Date(b.fecha_fin));

        setExpirations(monthlyExpirations);
        setLoading(false);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Error al cargar los datos del dashboard');
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

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

        {/* Sección 2 - Cumpleaños del Mes */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Cumpleaños del Mes</h3>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-spinner"></div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : birthdays.length === 0 ? (
              <p className="no-birthdays">No hay cumpleaños este mes</p>
            ) : (
              <div className="birthday-list">
                {birthdays.map((birthday) => (
                  <div key={birthday.rfc} className="birthday-item">
                    <div className="birthday-info">
                      <span className="birthday-name">{birthday.name}</span>
                      <span className="birthday-date">{formatearFecha(birthday.date)}</span>
                    </div>
                    <div className="birthday-age">
                      Cumple: {birthday.age + 1} años
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sección 3 - Vencimientos del Mes */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Vencimientos del Mes</h3>
          </div>
          <div className="card-content">
            {loading ? (
              <div className="loading-spinner"></div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : expirations.length === 0 ? (
              <p className="no-expirations">No hay vencimientos este mes</p>
            ) : (
              <div className="expiration-list">
                {expirations.slice(0, 5).map((policy) => (
                  <div key={`${policy.tipo}-${policy.numero_poliza}`} className="expiration-item">
                    <div className="expiration-info">
                      <span className="expiration-type">{policy.tipo}</span>
                      <span className="expiration-policy">{policy.numero_poliza}</span>
                    </div>
                    <div className="expiration-details">
                      <span className="expiration-name">{policy.contratante}</span>
                      <span className="expiration-date">
                        Vence: {formatearFecha(policy.fecha_fin)}
                      </span>
                    </div>
                  </div>
                ))}
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