import React, { useMemo } from 'react';

const MatrixGraphics = ({ policies, uniqueRamos, uniqueCompanies }) => {
  // Calculate distribution data
  const distributionData = useMemo(() => {
    if (!policies || policies.length === 0) return { ramoData: [], companyData: [], crossData: [] };

    // Group by ramo
    const ramoData = uniqueRamos.map(ramo => {
      const ramoPolicies = policies.filter(p => p.ramo === ramo);
      const companies = [...new Set(ramoPolicies.map(p => p.aseguradora))];
      return {
        ramo,
        count: ramoPolicies.length,
        companies: companies.length,
        policies: ramoPolicies
      };
    }).sort((a, b) => b.count - a.count);

    // Group by company
    const companyData = uniqueCompanies.map(company => {
      const companyPolicies = policies.filter(p => p.aseguradora === company);
      const ramos = [...new Set(companyPolicies.map(p => p.ramo))];
      return {
        company,
        count: companyPolicies.length,
        ramos: ramos.length,
        policies: companyPolicies
      };
    }).sort((a, b) => b.count - a.count);

    // Cross analysis - ramo vs company
    const crossData = uniqueRamos.map(ramo => {
      const ramoCompanies = uniqueCompanies.map(company => {
        const count = policies.filter(p => p.ramo === ramo && p.aseguradora === company).length;
        return { company, count };
      }).filter(item => item.count > 0);
      
      return {
        ramo,
        companies: ramoCompanies,
        total: ramoCompanies.reduce((sum, item) => sum + item.count, 0)
      };
    }).filter(item => item.total > 0);

    return { ramoData, companyData, crossData };
  }, [policies, uniqueRamos, uniqueCompanies]);

  // Color schemes
  const ramoColors = {
    'GMM': '#4F46E5',
    'Autos': '#10B981',
    'Vida': '#F59E0B',
    'Mascotas': '#EF4444',
    'Diversos': '#8B5CF6',
    'Otros': '#6B7280'
  };

  const companyColors = {
    'Plan Seguro': '#3B82F6',
    'GNP': '#EF4444',
    'AXA': '#10B981',
    'Seguros Monterrey': '#F59E0B'
  };

  const getColorForRamo = (ramo) => ramoColors[ramo] || '#6B7280';
  const getColorForCompany = (company) => companyColors[company] || '#8B5CF6';

  return (
    <div className="matrix-graphics">
      <div className="graphics-header">
        <h3>Análisis de Distribución</h3>
      </div>

      {/* Summary Statistics */}
      <div className="matrix-summary">
        <div className="summary-grid">
          <div className="summary-card">
            <h4>Total Pólizas</h4>
            <span className="summary-number">{policies.length}</span>
          </div>
          <div className="summary-card">
            <h4>Ramos Activos</h4>
            <span className="summary-number">{uniqueRamos.length}</span>
          </div>
          <div className="summary-card">
            <h4>Aseguradoras</h4>
            <span className="summary-number">{uniqueCompanies.length}</span>
          </div>
        </div>
      </div>

      {/* Ramos Chart */}
      <div className="matrix-chart-section">
        <h4>Distribución por Ramo</h4>
        <div className="chart-container">
          {distributionData.ramoData.map((item, index) => {
            const maxCount = Math.max(...distributionData.ramoData.map(r => r.count));
            const height = maxCount > 0 ? (item.count / maxCount) * 150 : 0;
            
            return (
              <div key={item.ramo} className="chart-bar">
                <div className="bar-container">
                  <div 
                    className="bar-total" 
                    style={{ 
                      height: `${height}px`,
                      backgroundColor: getColorForRamo(item.ramo)
                    }}
                    title={`${item.ramo}: ${item.count} pólizas en ${item.companies} aseguradoras`}
                  />
                  <div className="bar-value">{item.count}</div>
                </div>
                <div className="bar-label">
                  <div className="ramo-name">{item.ramo}</div>
                  <div className="companies-count">{item.companies} aseg.</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Companies Chart */}
      <div className="matrix-chart-section">
        <h4>Distribución por Aseguradora</h4>
        <div className="chart-container">
          {distributionData.companyData.map((item, index) => {
            const maxCount = Math.max(...distributionData.companyData.map(c => c.count));
            const height = maxCount > 0 ? (item.count / maxCount) * 150 : 0;
            
            return (
              <div key={item.company} className="chart-bar">
                <div className="bar-container">
                  <div 
                    className="bar-total" 
                    style={{ 
                      height: `${height}px`,
                      backgroundColor: getColorForCompany(item.company)
                    }}
                    title={`${item.company}: ${item.count} pólizas en ${item.ramos} ramos`}
                  />
                  <div className="bar-value">{item.count}</div>
                </div>
                <div className="bar-label">
                  <div className="company-name">{item.company}</div>
                  <div className="ramos-count">{item.ramos} ramos</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross Analysis */}
      <div className="matrix-details">
        <h4>Análisis Cruzado: Ramo vs Aseguradora</h4>
        <div className="cross-analysis">
          {distributionData.crossData.map((ramoItem) => (
            <div key={ramoItem.ramo} className="cross-item">
              <div className="cross-header">
                <div 
                  className="ramo-indicator" 
                  style={{ backgroundColor: getColorForRamo(ramoItem.ramo) }}
                ></div>
                <span className="cross-ramo">{ramoItem.ramo}</span>
                <span className="cross-total">{ramoItem.total} pólizas</span>
              </div>
              <div className="cross-companies">
                {ramoItem.companies.map((companyItem) => (
                  <div key={companyItem.company} className="cross-company">
                    <div 
                      className="company-indicator" 
                      style={{ backgroundColor: getColorForCompany(companyItem.company) }}
                    ></div>
                    <span className="company-name">{companyItem.company}</span>
                    <span className="company-count">{companyItem.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MatrixGraphics; 