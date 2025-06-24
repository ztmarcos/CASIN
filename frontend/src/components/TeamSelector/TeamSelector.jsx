import React, { useState } from 'react';
import { useTeam } from '../../context/TeamContext';
import { getCleanTeamName } from '../../utils/teamUtils';
import './TeamSelector.css';

const TeamSelector = () => {
  const { currentTeam, availableTeams, switchTeam, isLoadingTeams } = useTeam();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleTeamSwitch = async (teamId) => {
    if (teamId === currentTeam?.id || isSwitching) return;

    setIsSwitching(true);
    try {
      const success = switchTeam(teamId);
      if (success) {
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error('❌ Error switching team:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoadingTeams) {
    return (
      <div className="team-selector loading">
        <span className="loading-spinner">⏳</span>
        <span>Cargando equipos...</span>
      </div>
    );
  }

  if (!currentTeam || availableTeams.length <= 1) {
    return null; // No mostrar selector si solo hay un equipo
  }

  return (
    <div className="team-selector">
      <button 
        className="team-selector-button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isSwitching}
      >
        <span className="team-icon">👥</span>
                        <span className="team-name">{getCleanTeamName(currentTeam.name)}</span>
        <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>
          ▼
        </span>
      </button>

      {isDropdownOpen && (
        <div className="team-dropdown">
          <div className="dropdown-header">
            <span>Seleccionar Equipo</span>
          </div>
          
          {availableTeams.map(team => (
            <button
              key={team.id}
              className={`dropdown-item ${team.id === currentTeam.id ? 'active' : ''}`}
              onClick={() => handleTeamSwitch(team.id)}
              disabled={isSwitching}
            >
              <div className="team-info">
                <div className="team-name-dropdown">{getCleanTeamName(team.name)}</div>
                <div className="team-description">{team.description}</div>
              </div>
              
              {team.id === currentTeam.id && (
                <span className="active-indicator">✓</span>
              )}
              
              {team.isDefault && (
                <span className="default-badge">Principal</span>
              )}
            </button>
          ))}
          
          <div className="dropdown-footer">
            <small>Los datos se recargarán al cambiar de equipo</small>
          </div>
        </div>
      )}

      {isSwitching && (
        <div className="switching-overlay">
          <span>Cambiando equipo...</span>
        </div>
      )}
    </div>
  );
};

export default TeamSelector; 