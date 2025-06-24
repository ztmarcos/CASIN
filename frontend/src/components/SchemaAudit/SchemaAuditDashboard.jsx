import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { runSchemaAudit, exportAuditReport } from '../../utils/schemaAudit';
import './SchemaAuditDashboard.css';

const SchemaAuditDashboard = () => {
  const [auditReport, setAuditReport] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTab, setSelectedTab] = useState('summary');
  const [expandedCollections, setExpandedCollections] = useState(new Set());

  const runAudit = async () => {
    setIsRunning(true);
    
    try {
      toast.loading('Ejecutando auditoría de esquemas...', { id: 'audit' });
      
      const report = await runSchemaAudit();
      setAuditReport(report);
      
      toast.success('Auditoría completada exitosamente', { id: 'audit' });
      
    } catch (error) {
      console.error('Error en auditoría:', error);
      toast.error('Error ejecutando auditoría: ' + error.message, { id: 'audit' });
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = (format = 'json') => {
    if (!auditReport) {
      toast.error('No hay reporte para descargar');
      return;
    }

    try {
      const content = exportAuditReport(auditReport, format);
      const blob = new Blob([content], { 
        type: format === 'json' ? 'application/json' : 'text/markdown' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schema-audit-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Reporte descargado en formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Error descargando reporte: ' + error.message);
    }
  };

  const toggleCollectionExpansion = (collectionName) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionName)) {
      newExpanded.delete(collectionName);
    } else {
      newExpanded.add(collectionName);
    }
    setExpandedCollections(newExpanded);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const renderSummary = () => (
    <div className="audit-summary">
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-icon">🏢</div>
          <div className="card-content">
            <h3>{auditReport.totalTeams}</h3>
            <p>Equipos Activos</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <h3>{auditReport.totalCollections}</h3>
            <p>Colecciones Totales</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <h3>{auditReport.issues.length}</h3>
            <p>Problemas Encontrados</p>
          </div>
        </div>
        
        <div className="summary-card">
          <div className="card-icon">💡</div>
          <div className="card-content">
            <h3>{auditReport.recommendations.length}</h3>
            <p>Recomendaciones</p>
          </div>
        </div>
      </div>

      <div className="audit-metadata">
        <p><strong>Generado:</strong> {formatTimestamp(auditReport.timestamp)}</p>
      </div>
    </div>
  );

  const renderCollections = () => (
    <div className="collections-analysis">
      <h3>Análisis por Tipo de Colección</h3>
      
      {Object.entries(auditReport.fieldAnalysis).map(([type, data]) => (
        <div key={type} className="collection-type-card">
          <div className="collection-type-header">
            <h4>{type.toUpperCase()}</h4>
            <div className="collection-stats">
              <span className="stat">
                <strong>{data.collections}</strong> colecciones
              </span>
              <span className="stat">
                <strong>{data.totalDocuments}</strong> documentos
              </span>
              <span className="stat">
                <strong>{data.allFields.length}</strong> campos únicos
              </span>
            </div>
          </div>
          
          <div className="fields-analysis">
            <h5>Campos Comunes</h5>
            <div className="fields-grid">
              {Object.entries(data.commonFields)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([field, count]) => {
                  const percentage = Math.round((count / data.collections) * 100);
                  return (
                    <div key={field} className="field-item">
                      <span className="field-name">{field}</span>
                      <div className="field-usage">
                        <div 
                          className="usage-bar" 
                          style={{ width: `${percentage}%` }}
                        />
                        <span className="usage-text">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderRecommendations = () => (
    <div className="recommendations">
      <h3>Recomendaciones de Estandarización</h3>
      
      {auditReport.recommendations.length === 0 ? (
        <div className="no-recommendations">
          <p>🎉 ¡No se encontraron recomendaciones! Tu esquema está bien estructurado.</p>
        </div>
      ) : (
        auditReport.recommendations.map((rec, index) => (
          <div key={index} className="recommendation-card">
            <div className="rec-header">
              <div className="rec-priority" style={{ backgroundColor: getPriorityColor(rec.priority) }}>
                {rec.priority.toUpperCase()}
              </div>
              <h4>{rec.description}</h4>
            </div>
            
            <div className="rec-content">
              <p><strong>Tipo de colección:</strong> {rec.collectionType}</p>
              
              <div className="rec-fields">
                <h5>Campos afectados:</h5>
                <ul>
                  {rec.fields.map((field, fieldIndex) => (
                    <li key={fieldIndex}>
                      {typeof field === 'string' ? (
                        <code>{field}</code>
                      ) : (
                        <span>
                          <code>{field.field}</code> 
                          <span className="field-percentage">({field.percentage}% de equipos)</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderTeams = () => (
    <div className="teams-overview">
      <h3>Equipos Registrados</h3>
      
      <div className="teams-grid">
        {Object.values(auditReport.teams).map((team) => (
          <div key={team.id} className="team-card">
            <div className="team-header">
              <h4>{team.name}</h4>
              <span className="team-id">{team.id}</span>
            </div>
            
            <div className="team-details">
              <p><strong>Propietario:</strong> {team.owner}</p>
              {team.createdAt && (
                <p><strong>Creado:</strong> {formatTimestamp(team.createdAt)}</p>
              )}
            </div>
            
            <div className="team-collections">
              <h5>Colecciones:</h5>
              {Object.entries(auditReport.collections)
                .filter(([name]) => name.includes(team.id))
                .map(([name, schema]) => (
                  <div key={name} className="collection-item">
                    <span className="collection-name">
                      {schema.collectionInfo.collectionType}
                    </span>
                    <span className="collection-docs">
                      {schema.documentCount} docs
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIssues = () => (
    <div className="issues-section">
      <h3>Problemas Encontrados</h3>
      
      {auditReport.issues.length === 0 ? (
        <div className="no-issues">
          <p>✅ ¡No se encontraron problemas en la auditoría!</p>
        </div>
      ) : (
        auditReport.issues.map((issue, index) => (
          <div key={index} className="issue-card">
            <div className="issue-type">{issue.type}</div>
            <div className="issue-details">
              <p><strong>Colección:</strong> {issue.collection}</p>
              <p><strong>Error:</strong> {issue.error}</p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="schema-audit-dashboard">
      <div className="dashboard-header">
        <h1>🔍 Auditoría de Esquemas</h1>
        <p>Analiza y optimiza la estructura de tus bases de datos</p>
        
        <div className="header-actions">
          <button 
            className="audit-btn primary"
            onClick={runAudit}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <span className="spinner">⏳</span>
                Ejecutando Auditoría...
              </>
            ) : (
              <>
                <span>🚀</span>
                Ejecutar Auditoría
              </>
            )}
          </button>
          
          {auditReport && (
            <div className="download-actions">
              <button 
                className="audit-btn secondary"
                onClick={() => downloadReport('json')}
              >
                📄 Descargar JSON
              </button>
              <button 
                className="audit-btn secondary"
                onClick={() => downloadReport('markdown')}
              >
                📝 Descargar MD
              </button>
            </div>
          )}
        </div>
      </div>

      {auditReport && (
        <div className="dashboard-content">
          <div className="tabs-navigation">
            <button 
              className={`tab ${selectedTab === 'summary' ? 'active' : ''}`}
              onClick={() => setSelectedTab('summary')}
            >
              📊 Resumen
            </button>
            <button 
              className={`tab ${selectedTab === 'collections' ? 'active' : ''}`}
              onClick={() => setSelectedTab('collections')}
            >
              📋 Colecciones
            </button>
            <button 
              className={`tab ${selectedTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setSelectedTab('recommendations')}
            >
              💡 Recomendaciones
            </button>
            <button 
              className={`tab ${selectedTab === 'teams' ? 'active' : ''}`}
              onClick={() => setSelectedTab('teams')}
            >
              🏢 Equipos
            </button>
            <button 
              className={`tab ${selectedTab === 'issues' ? 'active' : ''}`}
              onClick={() => setSelectedTab('issues')}
            >
              ⚠️ Problemas
            </button>
          </div>

          <div className="tab-content">
            {selectedTab === 'summary' && renderSummary()}
            {selectedTab === 'collections' && renderCollections()}
            {selectedTab === 'recommendations' && renderRecommendations()}
            {selectedTab === 'teams' && renderTeams()}
            {selectedTab === 'issues' && renderIssues()}
          </div>
        </div>
      )}

      {!auditReport && !isRunning && (
        <div className="no-data-state">
          <div className="no-data-content">
            <div className="no-data-icon">🔍</div>
            <h2>Auditoría de Esquemas</h2>
            <p>
              Ejecuta una auditoría completa para analizar la estructura de tus bases de datos,
              identificar inconsistencias y recibir recomendaciones de optimización.
            </p>
            <p className="no-data-features">
              <strong>La auditoría analizará:</strong>
            </p>
            <ul className="features-list">
              <li>✅ Estructura de campos por colección</li>
              <li>✅ Campos comunes entre equipos</li>
              <li>✅ Inconsistencias de tipos de datos</li>
              <li>✅ Recomendaciones de estandarización</li>
              <li>✅ Estadísticas de uso por equipo</li>
            </ul>
            
            <button 
              className="audit-btn primary large"
              onClick={runAudit}
            >
              🚀 Comenzar Auditoría
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchemaAuditDashboard; 