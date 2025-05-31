import React, { useMemo } from 'react';
import { formatDate } from '../../utils/dateUtils';

const VencimientosGraphics = ({ policies, timeView, onTimeViewChange }) => {
  // Calculate vencimientos data based on time view
  const vencimientosData = useMemo(() => {
    if (!policies || policies.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Filter only vencimientos (policies with valid end dates)
    const vencimientosPolicies = policies.filter(policy => {
      if (!policy.fecha_fin) return false;
      const endDate = new Date(policy.fecha_fin);
      return !isNaN(endDate.getTime()); // Only policies with valid dates
    });

    let months = [];
    let startMonth = currentMonth;
    let startYear = currentYear;

    // Determine the range based on timeView
    switch (timeView) {
      case '4months':
        months = Array.from({ length: 4 }, (_, i) => {
          const month = (startMonth + i) % 12;
          const year = startYear + Math.floor((startMonth + i) / 12);
          return { month, year };
        });
        break;
      case '6months':
        months = Array.from({ length: 6 }, (_, i) => {
          const month = (startMonth + i) % 12;
          const year = startYear + Math.floor((startMonth + i) / 12);
          return { month, year };
        });
        break;
      case 'year':
        months = Array.from({ length: 12 }, (_, i) => {
          const month = (startMonth + i) % 12;
          const year = startYear + Math.floor((startMonth + i) / 12);
          return { month, year };
        });
        break;
      default:
        months = Array.from({ length: 4 }, (_, i) => {
          const month = (startMonth + i) % 12;
          const year = startYear + Math.floor((startMonth + i) / 12);
          return { month, year };
        });
    }

    // Group policies by month
    const monthlyData = months.map(({ month, year }) => {
      const monthPolicies = vencimientosPolicies.filter(policy => {
        const endDate = new Date(policy.fecha_fin);
        return endDate.getMonth() === month && endDate.getFullYear() === year;
      });

      // Group by ramo
      const ramoGroups = {};
      monthPolicies.forEach(policy => {
        const ramo = policy.ramo || 'Otros';
        if (!ramoGroups[ramo]) {
          ramoGroups[ramo] = [];
        }
        ramoGroups[ramo].push(policy);
      });

      return {
        month,
        year,
        monthName: new Date(year, month).toLocaleDateString('es-ES', { month: 'long' }),
        totalPolicies: monthPolicies.length,
        ramoGroups,
        policies: monthPolicies
      };
    });

    return monthlyData;
  }, [policies, timeView]);

  // Calculate totals and statistics
  const statistics = useMemo(() => {
    const totalPolicies = vencimientosData.reduce((sum, month) => sum + month.totalPolicies, 0);
    const ramoTotals = {};
    
    vencimientosData.forEach(month => {
      Object.entries(month.ramoGroups).forEach(([ramo, policies]) => {
        ramoTotals[ramo] = (ramoTotals[ramo] || 0) + policies.length;
      });
    });

    return { totalPolicies, ramoTotals };
  }, [vencimientosData]);

  // Get unique ramos for color coding
  const uniqueRamos = Object.keys(statistics.ramoTotals);
  const ramoColors = {
    'GMM': '#4F46E5',
    'Autos': '#10B981',
    'Vida': '#F59E0B',
    'Mascotas': '#EF4444',
    'Diversos': '#8B5CF6',
    'Otros': '#6B7280'
  };

  const getColorForRamo = (ramo) => ramoColors[ramo] || '#6B7280';

  return (
    <div className="vencimientos-graphics">
      <div className="graphics-header">
        <h3>Vencimientos por Período</h3>
        <div className="time-view-controls">
          <button
            className={`time-btn ${timeView === '4months' ? 'active' : ''}`}
            onClick={() => onTimeViewChange('4months')}
          >
            4 Meses
          </button>
          <button
            className={`time-btn ${timeView === '6months' ? 'active' : ''}`}
            onClick={() => onTimeViewChange('6months')}
          >
            6 Meses
          </button>
          <button
            className={`time-btn ${timeView === 'year' ? 'active' : ''}`}
            onClick={() => onTimeViewChange('year')}
          >
            Año
          </button>
        </div>
      </div>

      <div className="graphics-summary">
        <div className="summary-card">
          <h4>Total Vencimientos</h4>
          <span className="summary-number">{statistics.totalPolicies}</span>
        </div>
        <div className="summary-ramos">
          {Object.entries(statistics.ramoTotals).map(([ramo, count]) => (
            <div key={ramo} className="ramo-summary">
              <div 
                className="ramo-color" 
                style={{ backgroundColor: getColorForRamo(ramo) }}
              ></div>
              <span className="ramo-name">{ramo}</span>
              <span className="ramo-count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="graphics-chart">
        <div className="chart-container">
          {vencimientosData.map((monthData, index) => {
            const maxHeight = Math.max(...vencimientosData.map(m => m.totalPolicies));
            const height = maxHeight > 0 ? (monthData.totalPolicies / maxHeight) * 200 : 0;
            
            return (
              <div key={`${monthData.year}-${monthData.month}`} className="chart-bar">
                <div className="bar-container">
                  <div 
                    className="bar-total" 
                    style={{ height: `${height}px` }}
                    title={`${monthData.monthName} ${monthData.year}: ${monthData.totalPolicies} vencimientos`}
                  >
                    {/* Stacked bars by ramo */}
                    {Object.entries(monthData.ramoGroups).map(([ramo, policies], ramoIndex) => {
                      const ramoHeight = (policies.length / monthData.totalPolicies) * height;
                      return (
                        <div
                          key={ramo}
                          className="bar-segment"
                          style={{
                            height: `${ramoHeight}px`,
                            backgroundColor: getColorForRamo(ramo)
                          }}
                          title={`${ramo}: ${policies.length} pólizas`}
                        />
                      );
                    })}
                  </div>
                  <div className="bar-value">{monthData.totalPolicies}</div>
                </div>
                <div className="bar-label">
                  <div className="month-name">{monthData.monthName}</div>
                  <div className="year-name">{monthData.year}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="graphics-details">
        <h4>Detalle por Mes</h4>
        <div className="monthly-details">
          {vencimientosData.map((monthData) => (
            <div key={`${monthData.year}-${monthData.month}`} className="month-detail">
              <div className="month-header">
                <h5>{monthData.monthName} {monthData.year}</h5>
                <span className="month-total">{monthData.totalPolicies} vencimientos</span>
              </div>
              {Object.entries(monthData.ramoGroups).map(([ramo, policies]) => (
                <div key={ramo} className="ramo-detail">
                  <div 
                    className="ramo-indicator" 
                    style={{ backgroundColor: getColorForRamo(ramo) }}
                  ></div>
                  <span className="ramo-name">{ramo}</span>
                  <span className="ramo-count">{policies.length}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VencimientosGraphics; 