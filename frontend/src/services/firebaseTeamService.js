import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";

class FirebaseTeamService {
  constructor() {
    this.teamApps = new Map(); // Map de teamId -> firebase app
    this.teamConfigs = new Map(); // Map de teamId -> config
    this.currentTeamId = null;
    this.currentApp = null;
    this.currentDb = null;
    this.currentAuth = null;
  }

  /**
   * Configuración principal (la que ya tenemos)
   * Se usa para autenticación inicial y gestión de equipos
   */
  getMainConfig() {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };
  }

  /**
   * Genera configuración para un equipo específico
   * En producción, esto vendría de un servicio que crea proyectos Firebase automáticamente
   */
  generateTeamConfig(teamId, teamData) {
    // Por ahora, usamos el proyecto principal con un naming convention
    // En producción real, cada equipo tendría su propio proyecto Firebase
    const mainConfig = this.getMainConfig();
    
    // Estrategia temporal: usar el proyecto principal pero con naming
    // En producción real esto sería proyectos completamente separados
    return {
      ...mainConfig,
      // En desarrollo, usamos el mismo proyecto con prefijos
      projectId: mainConfig.projectId, // En prod sería: `casin-team-${teamId}`
      // En desarrollo, guardamos el teamId para usar como namespace en las colecciones
      teamId: teamId,
      teamName: teamData.name,
      isTeamDatabase: true
    };
  }

  /**
   * Configura Firebase para un equipo específico
   */
  async switchToTeam(teamId, teamData) {
    try {
      console.log(`🔄 Switching to team: ${teamId} (${teamData.name})`);

      // Si ya tenemos la app para este equipo, la reutilizamos
      if (this.teamApps.has(teamId)) {
        console.log('✅ Using existing team Firebase app');
        this.currentTeamId = teamId;
        this.currentApp = this.teamApps.get(teamId);
        this.currentDb = this.currentApp._db;
        this.currentAuth = this.currentApp._auth;
        return {
          app: this.currentApp,
          db: this.currentDb,
          auth: this.currentAuth,
          config: this.teamConfigs.get(teamId)
        };
      }

      // Generar configuración para el equipo
      const teamConfig = this.generateTeamConfig(teamId, teamData);
      
      // Crear nueva app Firebase para el equipo
      const appName = `team-${teamId}`;
      console.log(`🚀 Initializing Firebase app for team: ${appName}`);
      
      const teamApp = initializeApp(teamConfig, appName);
      
      // Inicializar servicios
      const teamDb = getFirestore(teamApp);
      const teamAuth = getAuth(teamApp);

      // Guardar referencias en el objeto app para fácil acceso
      teamApp._db = teamDb;
      teamApp._auth = teamAuth;
      teamApp._config = teamConfig;

      // Guardar en cache
      this.teamApps.set(teamId, teamApp);
      this.teamConfigs.set(teamId, teamConfig);

      // Establecer como actual
      this.currentTeamId = teamId;
      this.currentApp = teamApp;
      this.currentDb = teamDb;
      this.currentAuth = teamAuth;

      console.log(`✅ Team Firebase app initialized: ${teamData.name}`);
      
      return {
        app: teamApp,
        db: teamDb,
        auth: teamAuth,
        config: teamConfig
      };

    } catch (error) {
      console.error(`❌ Error switching to team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene la configuración actual del equipo
   */
  getCurrentTeamConfig() {
    if (!this.currentTeamId) {
      throw new Error('No team is currently selected');
    }
    return {
      teamId: this.currentTeamId,
      app: this.currentApp,
      db: this.currentDb,
      auth: this.currentAuth,
      config: this.teamConfigs.get(this.currentTeamId)
    };
  }

  /**
   * Obtiene la base de datos del equipo actual
   */
  getCurrentDb() {
    if (!this.currentDb) {
      throw new Error('No team database is currently active. Please switch to a team first.');
    }
    return this.currentDb;
  }

  /**
   * Obtiene la auth del equipo actual
   */
  getCurrentAuth() {
    if (!this.currentAuth) {
      throw new Error('No team auth is currently active. Please switch to a team first.');
    }
    return this.currentAuth;
  }

  /**
   * Limpia la configuración de un equipo
   */
  async cleanupTeam(teamId) {
    try {
      if (this.teamApps.has(teamId)) {
        const app = this.teamApps.get(teamId);
        await deleteApp(app);
        this.teamApps.delete(teamId);
        this.teamConfigs.delete(teamId);
        
        if (this.currentTeamId === teamId) {
          this.currentTeamId = null;
          this.currentApp = null;
          this.currentDb = null;
          this.currentAuth = null;
        }
        
        console.log(`🗑️ Cleaned up team Firebase app: ${teamId}`);
      }
    } catch (error) {
      console.error(`❌ Error cleaning up team ${teamId}:`, error);
    }
  }

  /**
   * Obtiene estadísticas de las apps activas
   */
  getStats() {
    return {
      activeTeams: this.teamApps.size,
      currentTeam: this.currentTeamId,
      teams: Array.from(this.teamApps.keys())
    };
  }

  /**
   * Para el equipo 4JlUqhAvfJMlCDhQ4vgH: usa directamente las colecciones específicas
   * Para otros equipos: usa namespaces en las colecciones del proyecto principal
   */
  getNamespacedCollection(collectionName) {
    if (!this.currentTeamId) {
      throw new Error('No team selected for collection access');
    }
    
    // Para el equipo específico 4JlUqhAvfJMlCDhQ4vgH, usar directamente ciertas colecciones
    if (this.currentTeamId === '4JlUqhAvfJMlCDhQ4vgH') {
      // Colecciones que se acceden directamente para este equipo
      const directCollections = [
        'directorio_contactos',
        'polizas', 
        'autos',
        'vida',
        'gmm',
        'hogar',
        'mascotas',
        'negocio',
        'rc',
        'transporte',
        'diversos'
      ];
      
      if (directCollections.includes(collectionName)) {
        console.log(`🎯 Using direct ${collectionName} collection for team 4JlUqhAvfJMlCDhQ4vgH`);
        return collectionName;
      }
    }
    
    const config = this.teamConfigs.get(this.currentTeamId);
    if (config && config.isTeamDatabase) {
      // En desarrollo, usamos prefijos en nombres de colecciones para otros equipos
      const namespacedName = `team_${this.currentTeamId}_${collectionName}`;
      console.log(`🏷️ Using namespaced collection: ${namespacedName}`);
      return namespacedName;
    }
    
    return collectionName;
  }
}

// Singleton instance
export const firebaseTeamService = new FirebaseTeamService();
export default firebaseTeamService; 