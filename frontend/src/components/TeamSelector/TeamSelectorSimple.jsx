import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TeamSelector.css';

/**
 * Versión simplificada del TeamSelector para debugging
 * Siempre se muestra, sin importar el número de equipos
 */
const TeamSelectorSimple = () => {
  const [teams, setTeams] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentTeam, setCurrentTeam] = useState(() => {
    // Inicializar desde localStorage
    return localStorage.getItem('selectedTeamName') || 'CASIN';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTeams();
    // Actualizar currentTeam desde localStorage al montar
    const savedTeamName = localStorage.getItem('selectedTeamName');
    if (savedTeamName) {
      setCurrentTeam(savedTeamName);
      console.log('🔄 Restored team from localStorage:', savedTeamName);
    }
  }, []);

  const loadTeams = async () => {
    try {
      console.log('🔍 TeamSelectorSimple: Loading teams...');
      setLoading(true);
      setError(null);
      
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const loadedTeams = [];
      
      teamsSnapshot.forEach((doc) => {
        console.log('📋 Found team:', doc.id, doc.data());
        loadedTeams.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Usar solo un CASIN (el más activo); ocultar duplicados
      const { filterToSingleCasin } = await import('../../config/teams');
      const filtered = filterToSingleCasin(loadedTeams);
      loadedTeams.length = 0;
      loadedTeams.push(...filtered);

      // Ordenar: CASIN primero
      loadedTeams.sort((a, b) => {
        if (a.isMainTeam) return -1;
        if (b.isMainTeam) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      setTeams(loadedTeams);
      console.log(`✅ TeamSelectorSimple: Loaded ${loadedTeams.length} teams`);
      
    } catch (err) {
      console.error('❌ Error loading teams:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = (teamId, teamName) => {
    console.log('🔄 Changing to team:', teamId, teamName);
    setCurrentTeam(teamName);
    setIsOpen(false);
    
    // Guardar en localStorage
    localStorage.setItem('selectedTeamId', teamId);
    localStorage.setItem('selectedTeamName', teamName);
    
    // Recargar página
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  // Siempre mostrar el selector para debugging
  console.log('🎯 TeamSelectorSimple: Rendering with', teams.length, 'teams');

  return (
    <div className="team-selector" style={{ border: '2px solid red', padding: '5px' }}>
      <div style={{ fontSize: '10px', color: 'red' }}>DEBUG MODE</div>
      <button 
        className="team-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        style={{ minWidth: '150px' }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className="team-icon"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" 
          />
        </svg>
        <span className="team-selector-label">
          {loading ? 'Cargando...' : `${currentTeam} (${teams.length})`}
        </span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={2} 
          stroke="currentColor" 
          className={`team-selector-arrow ${isOpen ? 'open' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {error && (
        <div style={{ color: 'red', fontSize: '10px', marginTop: '5px' }}>
          Error: {error}
        </div>
      )}

      {isOpen && (
        <>
          <div className="team-selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="team-selector-dropdown">
            <div className="team-selector-header">
              <span>Cambiar Equipo ({teams.length} disponibles)</span>
              <button 
                className="team-selector-close"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="team-selector-list">
              {loading ? (
                <div className="team-selector-loading">Cargando equipos...</div>
              ) : teams.length === 0 ? (
                <div className="team-selector-loading">
                  No se encontraron equipos. 
                  <br/>
                  ¿Ejecutaste el script create-test-team-admin.js?
                </div>
              ) : (
                teams.map((team) => (
                  <button
                    key={team.id}
                    className={`team-selector-item ${team.name === currentTeam ? 'active' : ''}`}
                    onClick={() => handleTeamChange(team.id, team.name)}
                  >
                    <div className="team-selector-item-content">
                      <div className="team-selector-item-icon">
                        {team.isMainTeam ? '🏢' : '👥'}
                      </div>
                      <div className="team-selector-item-info">
                        <div className="team-selector-item-name">
                          {team.name}
                          {team.name === currentTeam && (
                            <span className="team-selector-item-badge">Actual</span>
                          )}
                        </div>
                        {team.description && (
                          <div className="team-selector-item-description">
                            {team.description}
                          </div>
                        )}
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          ID: {team.id}
                        </div>
                      </div>
                    </div>
                    {team.name === currentTeam && (
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        strokeWidth={2} 
                        stroke="currentColor" 
                        className="team-selector-check"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamSelectorSimple;
