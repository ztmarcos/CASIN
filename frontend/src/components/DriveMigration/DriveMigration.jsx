import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTeam } from '../../context/TeamContext';
import { getCleanTeamName } from '../../utils/teamUtils';
import driveMigrationService from '../../services/driveMigrationService';
import './DriveMigration.css';

const DriveMigration = () => {
  const { user } = useAuth();
  const { userTeam, allTeams, isLoadingTeam } = useTeam();
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isManualTeamId, setIsManualTeamId] = useState(false);
  const [manualTeamId, setManualTeamId] = useState('4JlUqhAvfJMlCDhQ4vgH');
  const [rootFolderId, setRootFolderId] = useState('');

  useEffect(() => {
    // Set up progress callback
    driveMigrationService.setProgressCallback((status) => {
      setMigrationStatus(status);
    });

    // Set default team
    if (userTeam && !selectedTeamId && !isManualTeamId) {
      setSelectedTeamId(userTeam.id);
    }

    return () => {
      driveMigrationService.setProgressCallback(null);
    };
  }, [userTeam, selectedTeamId, isManualTeamId]);

  const getTargetTeamId = () => {
    if (isManualTeamId) {
      return manualTeamId;
    }
    return selectedTeamId || userTeam?.id;
  };

  const getTargetTeamName = () => {
    if (isManualTeamId) {
      return `Team ${manualTeamId}`;
    }
    if (selectedTeamId && allTeams) {
      const team = allTeams.find(t => t.id === selectedTeamId);
      return getCleanTeamName(team?.name) || `Team ${selectedTeamId}`;
    }
    return getCleanTeamName(userTeam?.name) || 'Current Team';
  };

  const startMigration = async () => {
    try {
      const targetTeamId = getTargetTeamId();
      if (!targetTeamId) {
        alert('Por favor selecciona un equipo de destino');
        return;
      }

      console.log(`🚀 Starting migration to team: ${targetTeamId}`);
      
      const result = await driveMigrationService.migrateTeamDrive(
        targetTeamId,
        rootFolderId || null
      );

      console.log('🎉 Migration completed:', result);
      alert(`Migración completada!\n✅ ${result.successfulFiles} archivos migrados\n❌ ${result.failedFiles} errores`);
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      alert(`Error en la migración: ${error.message}`);
    }
  };

  const cancelMigration = () => {
    driveMigrationService.cancelMigration();
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getProgressPercentage = () => {
    if (!migrationStatus || migrationStatus.totalFiles === 0) return 0;
    return Math.round((migrationStatus.processedFiles / migrationStatus.totalFiles) * 100);
  };

  if (isLoadingTeam) {
    return (
      <div className="drive-migration">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando información del equipo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="drive-migration">
      <div className="migration-header">
        <h2>🚀 Migración Drive → Firebase</h2>
        <p>Transfiere todos los archivos de Google Drive al almacenamiento Firebase de un equipo</p>
      </div>

      <div className="migration-config">
        <div className="config-section">
          <h3>👥 Equipo de Destino</h3>
          
          <div className="team-selector">
            <label>
              <input
                type="radio"
                checked={!isManualTeamId}
                onChange={() => setIsManualTeamId(false)}
              />
              Seleccionar equipo existente
            </label>
            
            {!isManualTeamId && (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                disabled={!allTeams || allTeams.length === 0}
              >
                <option value="">Seleccionar equipo...</option>
                {userTeam && (
                  <option value={userTeam.id}>{getCleanTeamName(userTeam.name)} (Mi equipo)</option>
                )}
                {allTeams && allTeams
                  .filter(team => team.id !== userTeam?.id)
                  .map(team => (
                    <option key={team.id} value={team.id}>{getCleanTeamName(team.name)}</option>
                  ))
                }
              </select>
            )}
          </div>

          <div className="team-selector">
            <label>
              <input
                type="radio"
                checked={isManualTeamId}
                onChange={() => setIsManualTeamId(true)}
              />
              Usar ID de equipo específico
            </label>
            
            {isManualTeamId && (
              <input
                type="text"
                value={manualTeamId}
                onChange={(e) => setManualTeamId(e.target.value)}
                placeholder="Ingresa el ID del equipo"
                className="team-id-input"
              />
            )}
          </div>

          <div className="selected-team">
            <strong>Destino: </strong>
            <span className="team-name">{getTargetTeamName()}</span>
            <span className="team-id">({getTargetTeamId()})</span>
          </div>
        </div>

        <div className="config-section">
          <h3>📁 Configuración de Drive</h3>
          <div className="drive-config">
            <label>
              ID de Carpeta Raíz (opcional):
              <input
                type="text"
                value={rootFolderId}
                onChange={(e) => setRootFolderId(e.target.value)}
                placeholder="Dejar vacío para migrar toda la carpeta raíz"
                disabled={migrationStatus?.inProgress}
              />
            </label>
            <small>Si se especifica, solo se migrará el contenido de esa carpeta</small>
          </div>
        </div>
      </div>

      <div className="migration-controls">
        {!migrationStatus?.inProgress ? (
          <button
            onClick={startMigration}
            className="start-migration-btn"
            disabled={!getTargetTeamId()}
          >
            🚀 Iniciar Migración
          </button>
        ) : (
          <button
            onClick={cancelMigration}
            className="cancel-migration-btn"
          >
            ⏹️ Cancelar Migración
          </button>
        )}
      </div>

      {migrationStatus && (
        <div className="migration-status">
          <div className="status-header">
            <h3>📊 Estado de la Migración</h3>
            <div className="status-badges">
              <span className={`status-badge ${migrationStatus.inProgress ? 'active' : 'completed'}`}>
                {migrationStatus.inProgress ? '🔄 En Progreso' : '✅ Completada'}
              </span>
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            <div className="progress-text">
              {migrationStatus.processedFiles} / {migrationStatus.totalFiles} archivos ({getProgressPercentage()}%)
            </div>
          </div>

          {migrationStatus.currentFile && (
            <div className="current-file">
              <strong>Procesando: </strong>
              <span>{migrationStatus.currentFile}</span>
            </div>
          )}

          <div className="status-grid">
            <div className="status-item success">
              <span className="label">✅ Exitosos:</span>
              <span className="value">{migrationStatus.successfulFiles}</span>
            </div>
            <div className="status-item error">
              <span className="label">❌ Errores:</span>
              <span className="value">{migrationStatus.failedFiles}</span>
            </div>
            <div className="status-item duration">
              <span className="label">⏱️ Duración:</span>
              <span className="value">
                {migrationStatus.endTime 
                  ? formatDuration(migrationStatus.endTime - migrationStatus.startTime)
                  : formatDuration(Date.now() - migrationStatus.startTime)
                }
              </span>
            </div>
          </div>

          {migrationStatus.errors && migrationStatus.errors.length > 0 && (
            <div className="errors-section">
              <h4>❌ Errores encontrados:</h4>
              <div className="errors-list">
                {migrationStatus.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="error-item">
                    <strong>{error.file || 'Error general'}:</strong>
                    <span>{error.error}</span>
                    <small>{new Date(error.timestamp).toLocaleTimeString()}</small>
                  </div>
                ))}
                {migrationStatus.errors.length > 10 && (
                  <div className="more-errors">
                    ... y {migrationStatus.errors.length - 10} errores más
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="migration-info">
        <h3>ℹ️ Información importante</h3>
        <ul>
          <li>La migración puede tomar tiempo dependiendo del número de archivos</li>
          <li>Solo se migrarán archivos descargables (no Google Docs/Sheets nativos)</li>
          <li>Se mantendrá la estructura de carpetas original</li>
          <li>Los archivos se almacenarán en Firebase Storage del equipo seleccionado</li>
          <li>Una vez iniciada la migración, los archivos ya procesados no se pueden revertir</li>
        </ul>
      </div>
    </div>
  );
};

export default DriveMigration; 