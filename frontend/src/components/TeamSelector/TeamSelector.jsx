import React, { useState, useEffect } from 'react';
import { useTeam } from '../../context/TeamContext';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import './TeamSelector.css';

const TeamSelector = () => {
  const { user } = useAuth();
  const { userTeam, switchTeam, isAdmin } = useTeam();
  const [availableTeams, setAvailableTeams] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Solo estos usuarios ven el dropdown de elegir equipo; el resto entra directo a CASIN
  const TEAM_SELECTOR_ADMIN_EMAILS = [
    'z.t.marcos@gmail.com',
    'ztmarcos@gmail.com',
    'marcos@casin.com',
    '2012solitario@gmail.com',
    'marcoszavala09@gmail.com',
    'casinseguros@gmail.com'
  ];

  const canSeeTeamSelector = user && TEAM_SELECTOR_ADMIN_EMAILS.includes(user.email);

  // Cargar equipos disponibles
  useEffect(() => {
    if (canSeeTeamSelector) {
      loadAvailableTeams();
    }
  }, [canSeeTeamSelector]);

  const loadAvailableTeams = async () => {
    try {
      setLoading(true);
      console.log('🔍 TeamSelector: Loading available teams...');
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const teams = [];
      
      teamsSnapshot.forEach((doc) => {
        console.log('📋 Found team:', doc.id, doc.data());
        teams.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Usar solo un CASIN (el más activo); ocultar duplicados
      const { filterToSingleCasin } = await import('../../config/teams');
      const filtered = filterToSingleCasin(teams);
      if (filtered.length < teams.length) {
        console.log(`✅ TeamSelector: Mostrando 1 CASIN (ocultos ${teams.length - filtered.length} duplicados)`);
      }
      teams.length = 0;
      teams.push(...filtered);

      console.log(`✅ TeamSelector: Found ${teams.length} teams`);

      // Ordenar: CASIN primero, luego alfabético
      teams.sort((a, b) => {
        if (a.isMainTeam) return -1;
        if (b.isMainTeam) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      setAvailableTeams(teams);
    } catch (error) {
      console.error('❌ Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = async (teamId) => {
    if (teamId === userTeam?.id) {
      setIsOpen(false);
      return;
    }

    try {
      setLoading(true);
      const selectedTeam = availableTeams.find(t => t.id === teamId);
      
      if (selectedTeam) {
        // Guardar en localStorage para persistencia
        localStorage.setItem('selectedTeamId', teamId);
        localStorage.setItem('selectedTeamName', selectedTeam.name);
        
        await switchTeam(teamId, selectedTeam);
        setIsOpen(false);
        
        // Recargar la página para actualizar todos los datos
        window.location.reload();
      }
    } catch (error) {
      console.error('Error switching team:', error);
      alert('Error al cambiar de equipo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Ocultar selector para todos excepto los admins que pueden cambiar de equipo
  if (!canSeeTeamSelector) {
    return null;
  }

  console.log('✅ TeamSelector: User can see team selector:', user?.email);
  console.log('📊 TeamSelector: Available teams:', availableTeams.length);

  // Si solo hay un equipo, mostrar mensaje de debug
  if (availableTeams.length <= 1) {
    console.log('⚠️ TeamSelector: Only', availableTeams.length, 'team(s) found. Need to create Test Team.');
    // Temporalmente mostrar el selector incluso con 1 equipo para debugging
    // return null;
  }

  return (
    <div className="team-selector">
      <button 
        className="team-selector-button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
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
          {userTeam?.name || 'CASIN'}
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

      {isOpen && (
        <>
          <div className="team-selector-overlay" onClick={() => setIsOpen(false)} />
          <div className="team-selector-dropdown">
            <div className="team-selector-header">
              <span>Cambiar Equipo</span>
              <button 
                className="team-selector-close"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="team-selector-list">
              {loading ? (
                <div className="team-selector-loading">Cargando...</div>
              ) : (
                availableTeams.map((team) => (
                  <button
                    key={team.id}
                    className={`team-selector-item ${team.id === userTeam?.id ? 'active' : ''}`}
                    onClick={() => handleTeamChange(team.id)}
                    disabled={loading}
                  >
                    <div className="team-selector-item-content">
                      <div className="team-selector-item-icon">
                        {team.isMainTeam ? '🏢' : '👥'}
                      </div>
                      <div className="team-selector-item-info">
                        <div className="team-selector-item-name">
                          {team.name}
                          {team.id === userTeam?.id && (
                            <span className="team-selector-item-badge">Actual</span>
                          )}
                        </div>
                        {team.description && (
                          <div className="team-selector-item-description">
                            {team.description}
                          </div>
                        )}
                      </div>
                    </div>
                    {team.id === userTeam?.id && (
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

export default TeamSelector;
