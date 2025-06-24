import React from 'react';
import { useTeam } from '../../context/TeamContext';
import { getCleanTeamName } from '../../utils/teamUtils';
import './TeamDemo.css';

const TeamDemo = () => {
  const { currentTeam, availableTeams, isLoadingTeams } = useTeam();

  if (isLoadingTeams) {
    return (
      <div className="team-demo loading">
        <h3>Cargando información de equipos...</h3>
      </div>
    );
  }

  return (
    <div className="team-demo">
      <div className="team-demo-card">
        <h3>🏢 Información del Equipo</h3>
        
        {currentTeam ? (
          <div className="current-team-info">
            <div className="team-badge">
              <span className="team-icon">👥</span>
              <div>
                <h4>{getCleanTeamName(currentTeam.name)}</h4>
                <p>{currentTeam.description}</p>
              </div>
              {currentTeam.isDefault && (
                <span className="default-badge">Principal</span>
              )}
            </div>
            
            <div className="team-details">
              <div className="detail-item">
                <strong>ID del Equipo:</strong>
                <code>{currentTeam.id}</code>
              </div>
              <div className="detail-item">
                <strong>Proyecto Firebase:</strong>
                <code>{currentTeam.firebaseProject}</code>
              </div>
              <div className="detail-item">
                <strong>Estado:</strong>
                <span className="status-active">✅ Activo</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="no-team">
            <p>⚠️ No hay equipo seleccionado</p>
          </div>
        )}
        
        <div className="available-teams">
          <h4>Equipos Disponibles ({availableTeams.length})</h4>
          <div className="teams-grid">
            {availableTeams.map(team => (
              <div 
                key={team.id} 
                className={`team-card ${team.id === currentTeam?.id ? 'active' : ''}`}
              >
                <div className="team-card-header">
                  <span className="team-name">{getCleanTeamName(team.name)}</span>
                  {team.id === currentTeam?.id && (
                    <span className="current-indicator">🎯</span>
                  )}
                  {team.isDefault && (
                    <span className="default-indicator">⭐</span>
                  )}
                </div>
                <p className="team-description">{team.description}</p>
                <code className="firebase-project">{team.firebaseProject}</code>
              </div>
            ))}
          </div>
        </div>
        
        <div className="demo-note">
          <p>
            💡 <strong>Nota:</strong> Este es un demo del sistema de equipos. 
            Usa el selector en el header para cambiar entre equipos.
          </p>
          <p>
            🔄 Al cambiar de equipo, la página se recargará para aplicar la nueva configuración.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeamDemo; 