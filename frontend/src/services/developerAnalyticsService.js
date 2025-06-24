import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';

class DeveloperAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
  }

  // =============== CACHE MANAGEMENT ===============
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // =============== GLOBAL ANALYTICS ===============

  /**
   * Obtiene estadísticas globales del sistema completo
   */
  async getGlobalAnalytics() {
    console.log('📊 Getting global system analytics...');

    try {
      const cacheKey = 'global_analytics';
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log('📋 Using cached global analytics');
        return cached;
      }

      const [teams, users, collections] = await Promise.all([
        this.getAllTeams(),
        this.getAllUsers(), 
        this.getAllCollections()
      ]);

      const analytics = {
        timestamp: new Date().toISOString(),
        
        // Estadísticas principales
        totals: {
          teams: teams.length,
          users: users.length,
          collections: collections.length,
          activeTeams: teams.filter(t => t.isActive).length
        },

        // Desglose por equipo
        teams: teams.map(team => ({
          ...team,
          memberCount: users.filter(u => u.teamId === team.id).length,
          collectionCount: collections.filter(c => c.teamId === team.id).length
        })),

        // Usuarios agrupados por equipo
        usersByTeam: this.groupUsersByTeam(users),

        // Colecciones por tipo
        collectionsByType: this.groupCollectionsByType(collections),

        // Top equipos
        topTeams: this.getTopTeams(teams, users, collections),

        // Estadísticas de uso
        usage: {
          avgUsersPerTeam: teams.length > 0 ? (users.length / teams.length).toFixed(1) : 0,
          avgCollectionsPerTeam: teams.length > 0 ? (collections.filter(c => c.teamId).length / teams.length).toFixed(1) : 0,
          globalCollections: collections.filter(c => !c.teamId).length
        }
      };

      this.setCachedData(cacheKey, analytics);
      console.log('✅ Global analytics calculated:', analytics.totals);

      return analytics;

    } catch (error) {
      console.error('❌ Error getting global analytics:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los equipos del sistema
   */
  async getAllTeams() {
    try {
      console.log('🏢 Loading all teams...');
      
      const teamsQuery = query(
        collection(db, 'teams'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(teamsQuery);
      const teams = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        teams.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          owner: data.owner,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          isActive: data.isActive !== false, // Default true
          firebaseProject: data.firebaseProject,
          isMainTeam: data.isMainTeam || false,
          ...data
        });
      });

      console.log(`📋 Found ${teams.length} teams`);
      return teams;

    } catch (error) {
      console.error('❌ Error loading teams:', error);
      return [];
    }
  }

  /**
   * Obtiene todos los usuarios del sistema
   */
  async getAllUsers() {
    try {
      console.log('👥 Loading all users...');
      
      const usersQuery = query(
        collection(db, 'team_members'),
        orderBy('joinedAt', 'desc')
      );
      
      const snapshot = await getDocs(usersQuery);
      const users = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        users.push({
          id: doc.id,
          email: data.email,
          name: data.name,
          teamId: data.teamId,
          role: data.role,
          status: data.status || 'active',
          joinedAt: data.joinedAt?.toDate?.() || new Date(data.joinedAt),
          invitedBy: data.invitedBy,
          isOwner: data.isOwner || false,
          isTestUser: data.isTestUser || false,
          ...data
        });
      });

      console.log(`👤 Found ${users.length} users`);
      return users;

    } catch (error) {
      console.error('❌ Error loading users:', error);
      return [];
    }
  }

  /**
   * Obtiene todas las colecciones del sistema (explorando Firestore)
   */
  async getAllCollections() {
    try {
      console.log('🗂️ Scanning all collections...');
      
      // Lista de colecciones conocidas (tanto globales como de equipos)
      const knownCollections = [
        // Colecciones globales
        'teams', 'team_members', 'users', 'notifications',
        
        // Tipos de colecciones de equipos
        'contactos', 'polizas', 'autos', 'vida', 'gmm', 'hogar', 
        'diversos', 'mascotas', 'rc', 'negocio', 'emant', 
        'emant_listado', 'emant_caratula', 'tareas', 'reportes', 
        'configuracion', 'directorio_contactos', 'gruposgmm',
        'gruposautos', 'gruposvida', 'listadoautos', 'listadovida'
      ];

      const collections = [];
      const teams = await this.getAllTeams();

      // Agregar colecciones globales
      for (const collectionName of ['teams', 'team_members', 'users', 'notifications']) {
        try {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(query(collectionRef, { limit: 1 }));
          
          collections.push({
            name: collectionName,
            teamId: null, // Global
            type: 'global',
            exists: true,
            documentCount: await this.getCollectionCount(collectionName)
          });
        } catch (error) {
          console.warn(`⚠️ Could not access collection ${collectionName}:`, error.message);
        }
      }

      // Agregar colecciones de equipos
      for (const team of teams) {
        for (const baseType of knownCollections.slice(4)) { // Skip global collections
          const teamCollectionName = `team_${team.id}_${baseType}`;
          
          try {
            const collectionRef = collection(db, teamCollectionName);
            const snapshot = await getDocs(query(collectionRef, { limit: 1 }));
            
            if (!snapshot.empty) {
              collections.push({
                name: teamCollectionName,
                baseType: baseType,
                teamId: team.id,
                teamName: team.name,
                type: 'team',
                exists: true,
                documentCount: await this.getCollectionCount(teamCollectionName)
              });
            }
          } catch (error) {
            // Collection might not exist, skip silently
          }
        }
      }

      console.log(`🗂️ Found ${collections.length} collections`);
      return collections;

    } catch (error) {
      console.error('❌ Error scanning collections:', error);
      return [];
    }
  }

  /**
   * Obtiene el conteo de documentos de una colección
   */
  async getCollectionCount(collectionName) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      return snapshot.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Agrupa usuarios por equipo
   */
  groupUsersByTeam(users) {
    const grouped = {};
    
    users.forEach(user => {
      if (!grouped[user.teamId]) {
        grouped[user.teamId] = [];
      }
      grouped[user.teamId].push(user);
    });

    return grouped;
  }

  /**
   * Agrupa colecciones por tipo
   */
  groupCollectionsByType(collections) {
    const grouped = {
      global: collections.filter(c => c.type === 'global'),
      team: collections.filter(c => c.type === 'team')
    };

    // Agrupa colecciones de equipo por tipo base
    const teamByType = {};
    grouped.team.forEach(collection => {
      const baseType = collection.baseType || 'unknown';
      if (!teamByType[baseType]) {
        teamByType[baseType] = [];
      }
      teamByType[baseType].push(collection);
    });

    grouped.teamByType = teamByType;
    return grouped;
  }

  /**
   * Obtiene los equipos más activos
   */
  getTopTeams(teams, users, collections) {
    return teams
      .map(team => ({
        ...team,
        userCount: users.filter(u => u.teamId === team.id).length,
        collectionCount: collections.filter(c => c.teamId === team.id).length,
        totalDocuments: collections
          .filter(c => c.teamId === team.id)
          .reduce((sum, c) => sum + (c.documentCount || 0), 0)
      }))
      .sort((a, b) => (b.userCount + b.collectionCount) - (a.userCount + a.collectionCount))
      .slice(0, 10);
  }

  /**
   * Obtiene detalles de un equipo específico
   */
  async getTeamDetails(teamId) {
    try {
      console.log(`🔍 Getting details for team: ${teamId}`);

      const [teams, users, collections] = await Promise.all([
        this.getAllTeams(),
        this.getAllUsers(),
        this.getAllCollections()
      ]);

      const team = teams.find(t => t.id === teamId);
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      const teamUsers = users.filter(u => u.teamId === teamId);
      const teamCollections = collections.filter(c => c.teamId === teamId);

      return {
        team,
        users: teamUsers,
        collections: teamCollections,
        stats: {
          userCount: teamUsers.length,
          collectionCount: teamCollections.length,
          totalDocuments: teamCollections.reduce((sum, c) => sum + (c.documentCount || 0), 0),
          admins: teamUsers.filter(u => u.role === 'admin').length,
          members: teamUsers.filter(u => u.role === 'member').length
        }
      };

    } catch (error) {
      console.error(`❌ Error getting team details for ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Limpia la cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Developer analytics cache cleared');
  }
}

export default new DeveloperAnalyticsService(); 