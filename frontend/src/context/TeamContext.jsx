import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const TeamContext = createContext();

// Configuración de equipos - En el futuro esto vendrá de una base de datos
const TEAMS_CONFIG = {
  'casin-main': {
    id: 'casin-main',
    name: 'CASIN Principal',
    description: 'Equipo principal de CASIN',
    firebaseProject: 'casinbbdd', // Proyecto actual
    isDefault: true
  },
  'casin-team2': {
    id: 'casin-team2',
    name: 'CASIN Equipo 2',
    description: 'Segundo equipo de CASIN',
    firebaseProject: 'casinbbdd-team2', // Nuevo proyecto
    isDefault: false
  },
  'casin-team3': {
    id: 'casin-team3',
    name: 'CASIN Equipo 3',
    description: 'Tercer equipo de CASIN',
    firebaseProject: 'casinbbdd-team3', // Nuevo proyecto
    isDefault: false
  }
};

export const TeamProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentTeam, setCurrentTeam] = useState(null);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);

  // Cargar equipos disponibles para el usuario
  useEffect(() => {
    if (user) {
      loadUserTeams();
    } else {
      setCurrentTeam(null);
      setAvailableTeams([]);
      setIsLoadingTeams(false);
    }
  }, [user]);

  const loadUserTeams = async () => {
    setIsLoadingTeams(true);
    
    try {
      // Por ahora, simular que todos los usuarios tienen acceso a todos los equipos
      // En el futuro, esto vendría de una API que consulte permisos del usuario
      const userTeams = Object.values(TEAMS_CONFIG);
      setAvailableTeams(userTeams);

      // Cargar equipo guardado del localStorage o usar el default
      const savedTeamId = localStorage.getItem('selectedTeam');
      let teamToSelect = null;

      if (savedTeamId && TEAMS_CONFIG[savedTeamId]) {
        teamToSelect = TEAMS_CONFIG[savedTeamId];
      } else {
        // Usar el equipo por defecto
        teamToSelect = Object.values(TEAMS_CONFIG).find(team => team.isDefault);
      }

      if (teamToSelect) {
        setCurrentTeam(teamToSelect);
      }

    } catch (error) {
      console.error('❌ Error loading user teams:', error);
      // En caso de error, usar el equipo por defecto
      const defaultTeam = Object.values(TEAMS_CONFIG).find(team => team.isDefault);
      setAvailableTeams([defaultTeam]);
      setCurrentTeam(defaultTeam);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const switchTeam = (teamId) => {
    const team = TEAMS_CONFIG[teamId];
    if (!team) {
      console.error('❌ Team not found:', teamId);
      return false;
    }

    // Verificar que el usuario tiene acceso a este equipo
    const hasAccess = availableTeams.some(t => t.id === teamId);
    if (!hasAccess) {
      console.error('❌ User does not have access to team:', teamId);
      return false;
    }

    setCurrentTeam(team);
    localStorage.setItem('selectedTeam', teamId);
    
    console.log('✅ Switched to team:', team.name);
    
    // En el futuro, aquí recargaremos los datos del nuevo proyecto Firebase
    // Por ahora, simplemente recargar la página para aplicar cambios
    if (currentTeam && currentTeam.id !== teamId) {
      window.location.reload();
    }

    return true;
  };

  const getTeamFirebaseConfig = (teamId = null) => {
    const team = teamId ? TEAMS_CONFIG[teamId] : currentTeam;
    if (!team) return null;

    // Por ahora retorna la configuración actual
    // En el futuro, aquí retornaremos diferentes configuraciones por equipo
    return {
      projectId: team.firebaseProject,
      // ... otras configuraciones específicas del equipo
    };
  };

  const value = {
    currentTeam,
    availableTeams,
    isLoadingTeams,
    switchTeam,
    getTeamFirebaseConfig,
    teamsConfig: TEAMS_CONFIG
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

export default TeamContext; 