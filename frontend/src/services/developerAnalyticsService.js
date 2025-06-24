import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  getDoc,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';

class DeveloperAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    this.teamCollectionsCache = new Map();
    this.TEAM_CACHE_DURATION = 10 * 60 * 1000; // 10 minutos para colecciones por equipo
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

  getTeamCollectionsCache(teamId) {
    const cached = this.teamCollectionsCache.get(teamId);
    if (cached && Date.now() - cached.timestamp < this.TEAM_CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  setTeamCollectionsCache(teamId, data) {
    this.teamCollectionsCache.set(teamId, {
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

      console.log('🔄 Loading fresh analytics data...');

      // Cargar en paralelo para mejor performance
      const [teams, users, collections] = await Promise.all([
        this.getAllTeams(),
        this.getAllUsers(), 
        this.getAllCollectionsOptimized()
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
   * Obtiene todas las colecciones del sistema (optimizado)
   */
  async getAllCollectionsOptimized() {
    try {
      console.log('🗂️ Scanning all collections (optimized)...');
      
      const collections = [];
      const teams = await this.getAllTeams();

      // Primero agregar colecciones globales conocidas
      const globalCollections = ['teams', 'team_members', 'users', 'notifications'];
      
      for (const collectionName of globalCollections) {
        try {
          const count = await this.getCollectionCount(collectionName);
          collections.push({
            name: collectionName,
            teamId: null,
            type: 'global',
            exists: true,
            documentCount: count
          });
        } catch (error) {
          console.warn(`⚠️ Could not access global collection ${collectionName}:`, error.message);
        }
      }

      // Luego escanear colecciones de equipos de manera más inteligente
      await this.scanTeamCollectionsIntelligent(teams, collections);

      console.log(`🗂️ Found ${collections.length} collections total`);
      return collections;

    } catch (error) {
      console.error('❌ Error scanning collections:', error);
      return [];
    }
  }

  /**
   * Escaneo inteligente de colecciones de equipos
   */
  async scanTeamCollectionsIntelligent(teams, collections) {
    console.log('🔍 Intelligent team collections scan...');
    
         // Lista expandida de tipos de colecciones conocidas
     const allKnownTypes = [
       // Tipos básicos
       'contactos', 'polizas', 'tareas', 'reportes', 'configuracion',
       
       // Tipos de seguros
       'autos', 'vida', 'gmm', 'hogar', 'diversos', 'mascotas', 'rc', 'negocio', 'transporte',
       
       // EMANT
       'emant', 'emant_listado', 'emant_caratula',
       
       // Grupos y listados
       'gruposgmm', 'gruposautos', 'gruposvida', 'listadoautos', 'listadovida',
       
       // Directorio y otros
       'directorio_contactos', 'directorio', 'birthdays', 'policy_status',
       
       // Sharepoint y administración
       'sharepoint_tasks', 'prospeccion_cards', 'table_order', 'table_relationships', 'users'
     ];

     // Agregar verificación especial para colecciones CASIN con patrón legacy
     await this.scanCASINLegacyCollections(collections);

    // Usar Promise.all con límite para no sobrecargar Firebase
    const BATCH_SIZE = 5;
    const teamBatches = [];
    
    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
      teamBatches.push(teams.slice(i, i + BATCH_SIZE));
    }

    for (const teamBatch of teamBatches) {
      await Promise.all(teamBatch.map(async (team) => {
        const teamCollections = await this.scanSingleTeamCollections(team, allKnownTypes);
        collections.push(...teamCollections);
      }));
    }
  }

    /**
   * Escanea colecciones CASIN con patrón legacy (team_CASIN_*)
   */
  async scanCASINLegacyCollections(collections) {
    console.log('🔍 Scanning CASIN legacy collections (team_CASIN_*)...');
    
    const casinLegacyTypes = [
      'directorio_contactos', 'autos', 'vida', 'gmm', 'hogar', 'diversos', 
      'mascotas', 'rc', 'negocio', 'transporte', 'emant', 'emant_listado', 
      'emant_caratula', 'policy_status', 'gruposgmm', 'gruposautos', 
      'gruposvida', 'listadoautos', 'listadovida'
    ];

    for (const baseType of casinLegacyTypes) {
      const legacyCollectionName = `team_CASIN_${baseType}`;
      
      try {
        const collectionRef = collection(db, legacyCollectionName);
        const snapshot = await getDocs(query(collectionRef, limit(1)));
        
        if (!snapshot.empty) {
          const count = await this.getCollectionCount(legacyCollectionName);
          
          // Buscar cual equipo CASIN debería tener esta colección
          const casinTeamId = await this.findCASINTeamId();
          
          collections.push({
            name: legacyCollectionName,
            baseType: baseType,
            teamId: casinTeamId,
            teamName: 'CASIN',
            type: 'team',
            exists: true,
            documentCount: count,
            isLegacyPattern: true // Marcar como patrón legacy
          });
          
          console.log(`✅ Found CASIN legacy collection: ${legacyCollectionName} (${count} docs)`);
        }
      } catch (error) {
        // Collection doesn't exist, skip silently
      }
    }
  }

  /**
   * Encuentra el ID del equipo CASIN principal (que debería tener las colecciones legacy)
   */
  async findCASINTeamId() {
    try {
      // IDs conocidos de equipos CASIN
      const casinTeamIds = ['4JlUqhAvfJMlCDhQ4vgH', 'ngXzjqxlBy8Bsv8ks3vc'];
      
      // Obtener información de los equipos CASIN
      const teams = await this.getAllTeams();
      const casinTeams = teams.filter(team => 
        casinTeamIds.includes(team.id) || team.name === 'CASIN'
      );

      if (casinTeams.length === 0) {
        return casinTeamIds[0]; // Fallback
      }

             // Priorizar por fecha de creación (el más antiguo probablemente es el principal)
       const sortedByDate = casinTeams.sort((a, b) => {
         const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
         const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
         return dateA - dateB;
       });

      const mainCasinTeam = sortedByDate[0];
      console.log(`🎯 Main CASIN team identified: ${mainCasinTeam.name} (${mainCasinTeam.id}) - Created: ${mainCasinTeam.createdAt}`);
      
      return mainCasinTeam.id;

    } catch (error) {
      console.warn('⚠️ Error finding CASIN team ID, using fallback:', error);
      return '4JlUqhAvfJMlCDhQ4vgH'; // Fallback
    }
  }

  /**
    * Escanea colecciones de un solo equipo
    */
  async scanSingleTeamCollections(team, knownTypes) {
    const teamId = team.id;
    
    // Verificar cache primero
    const cached = this.getTeamCollectionsCache(teamId);
    if (cached) {
      console.log(`📋 Using cached collections for team ${team.name}`);
      return cached;
    }

    console.log(`🔍 Scanning collections for team: ${team.name} (${teamId})`);
    const teamCollections = [];

    // Buscar en batches para mejor performance
    const BATCH_SIZE = 10;
    for (let i = 0; i < knownTypes.length; i += BATCH_SIZE) {
      const typeBatch = knownTypes.slice(i, i + BATCH_SIZE);
      
      const batchPromises = typeBatch.map(async (baseType) => {
        const teamCollectionName = `team_${teamId}_${baseType}`;
        
        try {
          // Usar limit(1) para verificar existencia sin cargar datos
          const collectionRef = collection(db, teamCollectionName);
          const snapshot = await getDocs(query(collectionRef, limit(1)));
          
          if (!snapshot.empty) {
            const count = await this.getCollectionCount(teamCollectionName);
            return {
              name: teamCollectionName,
              baseType: baseType,
              teamId: teamId,
              teamName: team.name,
              type: 'team',
              exists: true,
              documentCount: count
            };
          }
        } catch (error) {
          // Collection doesn't exist or no access, skip silently
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null);
      teamCollections.push(...validResults);
    }

    // Cache los resultados
    this.setTeamCollectionsCache(teamId, teamCollections);
    
    console.log(`✅ Found ${teamCollections.length} collections for team ${team.name}`);
    return teamCollections;
  }

  /**
   * Obtiene el conteo de documentos de una colección (optimizado)
   */
  async getCollectionCount(collectionName) {
    try {
      // Para colecciones muy grandes, esto puede ser lento
      // En un entorno de producción, consideraría usar aggregation queries
      const snapshot = await getDocs(collection(db, collectionName));
      return snapshot.size;
    } catch (error) {
      console.warn(`⚠️ Could not count documents in ${collectionName}:`, error.message);
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
   * Obtiene detalles de un equipo específico (optimizado)
   */
  async getTeamDetails(teamId) {
    try {
      console.log(`🔍 Getting details for team: ${teamId}`);

      // Verificar cache específico del equipo
      const cacheKey = `team_details_${teamId}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        console.log(`📋 Using cached team details for ${teamId}`);
        return cached;
      }

      // USAR LOS MISMOS DATOS QUE LA VISTA GENERAL para consistencia
      const analytics = await this.getGlobalAnalytics();
      
      // Encontrar el equipo en los datos ya calculados
      const team = analytics.teams.find(t => t.id === teamId);
      if (!team) {
        throw new Error(`Team ${teamId} not found`);
      }

      // Obtener usuarios específicos del equipo
      const users = await this.getUsersByTeam(teamId);
      
      // Filtrar colecciones que pertenecen a este equipo (de los datos globales)
      const teamCollections = analytics.collectionsByType.team.filter(c => c.teamId === teamId);
      
      const details = {
        team,
        users,
        collections: teamCollections,
        stats: {
          userCount: users.length,
          collectionCount: teamCollections.length,
          totalDocuments: teamCollections.reduce((sum, c) => sum + (c.documentCount || 0), 0),
          admins: users.filter(u => u.role === 'admin').length,
          members: users.filter(u => u.role === 'member').length
        }
      };

      // Cache por menos tiempo ya que es más específico
      this.cache.set(cacheKey, {
        data: details,
        timestamp: Date.now()
      });

      console.log(`✅ Team details loaded for ${team.name} - ${teamCollections.length} collections, ${details.stats.totalDocuments} docs`);
      return details;

    } catch (error) {
      console.error(`❌ Error getting team details for ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene usuarios de un equipo específico
   */
  async getUsersByTeam(teamId) {
    try {
      const usersQuery = query(
        collection(db, 'team_members'),
        where('teamId', '==', teamId)
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

      return users;
    } catch (error) {
      console.error(`❌ Error loading users for team ${teamId}:`, error);
      return [];
    }
  }

     /**
    * Obtiene colecciones de un equipo específico
    */
  async getCollectionsByTeam(teamId) {
    // Usar cache si está disponible
    const cached = this.getTeamCollectionsCache(teamId);
    if (cached) {
      return cached;
    }

    // Si no está en cache, escanear
    const teams = await this.getAllTeams();
    const team = teams.find(t => t.id === teamId);
    
    if (!team) {
      return [];
    }

    const collections = [];

    // Escaneo normal de colecciones
    const allKnownTypes = [
      'contactos', 'polizas', 'tareas', 'reportes', 'configuracion',
      'autos', 'vida', 'gmm', 'hogar', 'diversos', 'mascotas', 'rc', 'negocio', 'transporte',
      'emant', 'emant_listado', 'emant_caratula',
      'gruposgmm', 'gruposautos', 'gruposvida', 'listadoautos', 'listadovida',
      'directorio_contactos', 'directorio', 'birthdays', 'policy_status',
      'sharepoint_tasks', 'prospeccion_cards', 'table_order', 'table_relationships', 'users'
    ];

    const normalCollections = await this.scanSingleTeamCollections(team, allKnownTypes);
    collections.push(...normalCollections);

         // Para equipos CASIN, agregar también las colecciones legacy
     if (team.name === 'CASIN' || teamId === '4JlUqhAvfJMlCDhQ4vgH' || teamId === 'ngXzjqxlBy8Bsv8ks3vc') {
       // Verificar si este es el equipo CASIN principal
       const mainCasinTeamId = await this.findCASINTeamId();
       
       if (teamId === mainCasinTeamId) {
         const legacyCollections = [];
         await this.scanCASINLegacyCollections(legacyCollections);
         
         // Solo el equipo principal tiene las colecciones legacy
         const teamLegacyCollections = legacyCollections.filter(col => col.teamId === teamId);
         collections.push(...teamLegacyCollections);
         
         console.log(`🎯 Added ${teamLegacyCollections.length} legacy collections to main CASIN team (${teamId})`);
       } else {
         console.log(`📋 Secondary CASIN team (${teamId}) - no legacy collections assigned`);
       }
     }

    // Cache los resultados
    this.setTeamCollectionsCache(teamId, collections);
    
    return collections;
  }

  /**
   * Limpia la cache
   */
  clearCache() {
    this.cache.clear();
    this.teamCollectionsCache.clear();
    console.log('🗑️ Developer analytics cache cleared');
  }

  /**
   * Obtiene estadísticas de rendimiento del sistema
   */
  getPerformanceStats() {
    return {
      cacheSize: this.cache.size,
      teamCacheSize: this.teamCollectionsCache.size,
      totalCachedItems: this.cache.size + this.teamCollectionsCache.size
    };
  }
}

export default new DeveloperAnalyticsService(); 