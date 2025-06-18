import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import DataMigrationService from '../../utils/dataMigration';
import './DataMigration.css';

const DataMigration = () => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);
  const [currentStep, setCurrentStep] = useState('analysis');

  // Paso 1: Analizar datos existentes
  const handleAnalyzeData = async () => {
    setLoading(true);
    try {
      console.log('🔍 Iniciando análisis de datos...');
      const result = await DataMigrationService.analyzeExistingData();
      setAnalysis(result);
      setCurrentStep('review');
      toast.success(`Análisis completo: ${result.totalDocuments} documentos en ${result.totalCollections} colecciones`);
    } catch (error) {
      console.error('❌ Error en análisis:', error);
      toast.error('Error analizando datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Crear backup
  const handleCreateBackup = async () => {
    setLoading(true);
    try {
      console.log('💾 Creando backup...');
      await DataMigrationService.createBackup();
      toast.success('✅ Backup creado exitosamente');
      setCurrentStep('ready');
    } catch (error) {
      console.error('❌ Error creando backup:', error);
      toast.error('Error creando backup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Paso 3: Ejecutar migración completa
  const handleExecuteMigration = async () => {
    setLoading(true);
    try {
      console.log('🚀 Ejecutando migración completa...');
      const result = await DataMigrationService.executeFullMigration();
      setMigrationResult(result);
      setCurrentStep('complete');
      toast.success('🎉 Migración completa exitosa');
    } catch (error) {
      console.error('❌ Error en migración:', error);
      toast.error('Error en migración: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Solo crear equipo CASIN sin migrar datos
  const handleCreateCASINOnly = async () => {
    setLoading(true);
    try {
      console.log('🏢 Creando solo equipo CASIN...');
      const result = await DataMigrationService.createCASINTeamWithData();
      setMigrationResult({ migration: result });
      toast.success('✅ Equipo CASIN creado exitosamente');
    } catch (error) {
      console.error('❌ Error creando equipo CASIN:', error);
      toast.error('Error creando equipo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="data-migration">
      <div className="migration-header">
        <h1>📦 Migración de Datos</h1>
        <p>Migra tus datos existentes al nuevo sistema de equipos de manera segura</p>
      </div>

      {/* Paso 1: Análisis */}
      {currentStep === 'analysis' && (
        <div className="migration-step">
          <h2>🔍 Paso 1: Analizar Datos Existentes</h2>
          <div className="step-content">
            <p>
              Primero necesitamos analizar qué datos tienes actualmente en Firebase
              para crear un plan de migración seguro.
            </p>
            <div className="warning-box">
              <h3>⚠️ Importante:</h3>
              <ul>
                <li>Este proceso NO modifica tus datos existentes</li>
                <li>Solo analiza las colecciones actuales</li>
                <li>Es completamente seguro ejecutar este análisis</li>
              </ul>
            </div>
            <button 
              onClick={handleAnalyzeData} 
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Analizando...' : '🔍 Analizar Datos'}
            </button>
          </div>
        </div>
      )}

      {/* Paso 2: Revisión */}
      {currentStep === 'review' && analysis && (
        <div className="migration-step">
          <h2>📋 Paso 2: Revisar Análisis</h2>
          <div className="analysis-results">
            <div className="stats-summary">
              <div className="stat">
                <span className="stat-number">{analysis.totalCollections}</span>
                <span className="stat-label">Colecciones</span>
              </div>
              <div className="stat">
                <span className="stat-number">{analysis.totalDocuments}</span>
                <span className="stat-label">Documentos</span>
              </div>
            </div>

            <div className="collections-list">
              <h3>📊 Colecciones Encontradas:</h3>
              {Object.entries(analysis.collectionDetails).map(([name, details]) => (
                <div key={name} className="collection-row">
                  <span className="collection-name">{name}</span>
                  <span className="collection-count">{details.count} docs</span>
                  <span className="collection-fields">
                    {details.fields.length > 0 ? 
                      `Campos: ${details.fields.slice(0, 3).join(', ')}${details.fields.length > 3 ? '...' : ''}` 
                      : 'Sin datos'
                    }
                  </span>
                </div>
              ))}
            </div>

            <div className="migration-plan">
              <h3>🎯 Plan de Migración Sugerido:</h3>
              <div className="plan-details">
                <h4>Equipo Principal: CASIN Seguros</h4>
                {Object.entries(analysis.suggestedMigration.migrations).map(([source, target]) => (
                  <div key={source} className="migration-mapping">
                    <span className="source">{source}</span>
                    <span className="arrow">→</span>
                    <span className="target">{target.targetCollection}</span>
                    <span className="count">({target.documentCount} docs)</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="step-actions">
              <button 
                onClick={handleCreateBackup} 
                disabled={loading}
                className="btn-secondary"
              >
                {loading ? 'Creando Backup...' : '💾 Crear Backup'}
              </button>
              <button 
                onClick={() => setCurrentStep('analysis')} 
                className="btn-outline"
              >
                ← Volver al Análisis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Listo para migrar */}
      {currentStep === 'ready' && (
        <div className="migration-step">
          <h2>🚀 Paso 3: Ejecutar Migración</h2>
          <div className="step-content">
            <div className="ready-info">
              <h3>✅ Todo listo para migrar</h3>
              <p>Ya tienes un backup seguro de tus datos. Ahora puedes elegir:</p>
            </div>

            <div className="migration-options">
              <div className="option">
                <h4>🏢 Opción 1: Solo crear equipo CASIN</h4>
                <p>Crea el equipo CASIN pero mantén los datos en las colecciones originales</p>
                <button 
                  onClick={handleCreateCASINOnly} 
                  disabled={loading}
                  className="btn-secondary"
                >
                  Crear Solo Equipo
                </button>
              </div>

              <div className="option">
                <h4>📦 Opción 2: Migración completa</h4>
                <p>Crea el equipo CASIN Y migra todos los datos al nuevo formato</p>
                <button 
                  onClick={handleExecuteMigration} 
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Migrando...' : '🚀 Migración Completa'}
                </button>
              </div>
            </div>

            <div className="warning-box">
              <h3>⚠️ Antes de continuar:</h3>
              <ul>
                <li>Tus datos originales se conservarán como respaldo</li>
                <li>Se creará el equipo CASIN con acceso a los datos migrados</li>
                <li>Podrás seguir accediendo a los datos originales si es necesario</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Paso 4: Completado */}
      {currentStep === 'complete' && migrationResult && (
        <div className="migration-step">
          <h2>🎉 Migración Completada</h2>
          <div className="completion-info">
            <div className="success-message">
              <h3>✅ Migración exitosa</h3>
              <p>El equipo CASIN ha sido creado y los datos han sido migrados correctamente.</p>
            </div>

            <div className="results-summary">
              <h4>📊 Resultados:</h4>
              <ul>
                <li>✅ Equipo CASIN creado</li>
                <li>✅ Datos migrados al nuevo formato</li>
                <li>✅ Backup de seguridad guardado</li>
                <li>✅ Datos originales preservados</li>
              </ul>
            </div>

            <div className="next-steps">
              <h4>🎯 Próximos pasos:</h4>
              <ol>
                <li>Ve a la página principal y haz login</li>
                <li>Deberías ver el equipo CASIN disponible</li>
                <li>Verifica que todos los datos estén correctos</li>
                <li>Invita a otros usuarios al equipo si es necesario</li>
              </ol>
            </div>

            <button 
              onClick={() => window.location.href = '/'}
              className="btn-primary"
            >
              🏠 Ir al Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Procesando...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataMigration; 