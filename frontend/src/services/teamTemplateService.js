import { collection, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config/api';
import teamDataService from './teamDataService';

class TeamTemplateService {
  /**
   * Extrae la estructura de columnas de las colecciones existentes de CASIN
   */
  static async extractCASINStructure() {
    try {
      console.log('📋 Extrayendo estructura de tablas CASIN...');
      
      // Buscar todas las colecciones que empiecen con team_CASIN_
      const casinCollections = await this.findCASINCollections();
      
      if (casinCollections.length === 0) {
        console.warn('⚠️ No se encontraron colecciones CASIN migradas');
        return this.getDefaultStructure();
      }

      const templates = {};
      
      for (const collectionName of casinCollections) {
        try {
          const structure = await this.analyzeCollectionStructure(collectionName);
          const templateName = collectionName.replace('team_CASIN_', '');
          templates[templateName] = structure;
          console.log(`✅ Estructura extraída: ${templateName} (${structure.fields.length} campos)`);
        } catch (error) {
          console.warn(`⚠️ Error analizando ${collectionName}:`, error.message);
        }
      }

      return templates;
      
    } catch (error) {
      console.error('❌ Error extrayendo estructura CASIN:', error);
      return this.getDefaultStructure();
    }
  }

  /**
   * Encuentra todas las colecciones que empiecen con team_CASIN_
   */
  static async findCASINCollections() {
    try {
      // Lista de colecciones conocidas que podrían existir
      const potentialCollections = [
        'team_CASIN_directorio_contactos',
        'team_CASIN_autos',
        'team_CASIN_vida', 
        'team_CASIN_gmm',
        'team_CASIN_hogar',
        'team_CASIN_mascotas',
        'team_CASIN_negocio',
        'team_CASIN_rc',
        'team_CASIN_transporte',
        'team_CASIN_emant',
        'team_CASIN_emant_caratula',
        'team_CASIN_emant_listado',
        'team_CASIN_sharepoint_tasks',
        'team_CASIN_policy_status',
        'team_CASIN_prospeccion_cards',
        'team_CASIN_table_order',
        'team_CASIN_table_relationships',
        'team_CASIN_users',
        'team_CASIN_diversos'
      ];

      const existingCollections = [];
      
      for (const collectionName of potentialCollections) {
        try {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          if (!snapshot.empty) {
            existingCollections.push(collectionName);
          }
        } catch (error) {
          // Colección no existe, continuar
        }
      }

      console.log(`🔍 Encontradas ${existingCollections.length} colecciones CASIN`);
      return existingCollections;
      
    } catch (error) {
      console.error('❌ Error buscando colecciones CASIN:', error);
      return [];
    }
  }

  /**
   * Analiza la estructura de una colección específica
   */
  static async analyzeCollectionStructure(collectionName) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      if (snapshot.empty) {
        return {
          name: collectionName,
          fields: [],
          sampleCount: 0
        };
      }

      // Analizar los primeros 10 documentos para obtener la estructura completa
      const fields = new Set();
      const fieldTypes = {};
      const sampleData = [];
      let count = 0;

      snapshot.docs.slice(0, 10).forEach(doc => {
        const data = doc.data();
        sampleData.push(data);
        
        Object.keys(data).forEach(field => {
          fields.add(field);
          
          // Determinar tipo de campo
          const value = data[field];
          const type = this.getFieldType(value);
          
          if (!fieldTypes[field]) {
            fieldTypes[field] = new Set();
          }
          fieldTypes[field].add(type);
        });
        
        count++;
      });

      // Convertir a estructura final
      const fieldStructure = Array.from(fields).map(fieldName => ({
        name: fieldName,
        types: Array.from(fieldTypes[fieldName]),
        primaryType: this.getMostCommonType(fieldTypes[fieldName]),
        required: this.isFieldRequired(fieldName, sampleData),
        category: this.categorizeField(fieldName)
      }));

      return {
        name: collectionName,
        originalName: collectionName.replace('team_CASIN_', ''),
        fields: fieldStructure,
        sampleCount: count,
        totalDocuments: snapshot.size,
        category: this.categorizeCollection(collectionName)
      };

    } catch (error) {
      console.error(`❌ Error analizando estructura de ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Determina el tipo de un campo
   */
  static getFieldType(value) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (value && typeof value.toDate === 'function') return 'timestamp'; // Firestore Timestamp
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  /**
   * Obtiene el tipo más común de un set de tipos
   */
  static getMostCommonType(typesSet) {
    const types = Array.from(typesSet);
    if (types.length === 1) return types[0];
    
    // Prioridad: string > number > boolean > object > array > timestamp > null
    const priority = ['string', 'number', 'boolean', 'object', 'array', 'timestamp', 'date', 'null'];
    
    for (const type of priority) {
      if (types.includes(type)) return type;
    }
    
    return types[0];
  }

  /**
   * Determina si un campo es requerido
   */
  static isFieldRequired(fieldName, sampleData) {
    // Campos que siempre consideramos requeridos
    const alwaysRequired = ['id', 'nombre', 'email', 'numeroPoliza'];
    if (alwaysRequired.some(req => fieldName.toLowerCase().includes(req.toLowerCase()))) {
      return true;
    }

    // Si aparece en más del 80% de los documentos, considerarlo requerido
    const presentCount = sampleData.filter(doc => 
      doc[fieldName] !== null && 
      doc[fieldName] !== undefined && 
      doc[fieldName] !== ''
    ).length;
    
    return (presentCount / sampleData.length) > 0.8;
  }

  /**
   * Categoriza un campo por su nombre
   */
  static categorizeField(fieldName) {
    const field = fieldName.toLowerCase();
    
    if (field.includes('id') || field === '_migrated' || field.includes('_originalCollection')) return 'system';
    if (field.includes('nombre') || field.includes('name')) return 'identity';
    if (field.includes('email') || field.includes('telefono') || field.includes('phone')) return 'contact';
    if (field.includes('fecha') || field.includes('date') || field.includes('created') || field.includes('updated')) return 'temporal';
    if (field.includes('status') || field.includes('estado') || field.includes('activo')) return 'status';
    if (field.includes('poliza') || field.includes('prima') || field.includes('seguro')) return 'insurance';
    if (field.includes('empresa') || field.includes('company') || field.includes('trabajo')) return 'business';
    if (field.includes('direccion') || field.includes('address') || field.includes('pais') || field.includes('ciudad')) return 'address';
    
    return 'general';
  }

  /**
   * Categoriza una colección
   */
  static categorizeCollection(collectionName) {
    const name = collectionName.toLowerCase();
    
    if (name.includes('contactos') || name.includes('directorio')) return 'contacts';
    if (name.includes('poliza') || name.includes('autos') || name.includes('vida') || name.includes('gmm')) return 'policies';
    if (name.includes('emant')) return 'emant';
    if (name.includes('task') || name.includes('tarea')) return 'tasks';
    if (name.includes('user') || name.includes('usuario')) return 'users';
    if (name.includes('table_') || name.includes('config')) return 'configuration';
    
    return 'general';
  }

  /**
   * Crea un nuevo equipo usando las plantillas extraídas
   */
  static async createTeamFromTemplate(teamId, teamName, userEmail, templates = null) {
    try {
      console.log(`🏗️ Creando equipo ${teamName} con plantillas...`);
      
      if (!templates) {
        templates = await this.extractCASINStructure();
      }

      const results = [];
      
      for (const [templateName, structure] of Object.entries(templates)) {
        try {
          const newCollectionName = `team_${teamId}_${templateName}`;
          
          // Crear colección con documento plantilla
          const templateDocument = this.createTemplateDocument(structure, userEmail);
          
          const docRef = await addDoc(collection(db, newCollectionName), templateDocument);
          
          console.log(`✅ Creada colección: ${newCollectionName}`);
          results.push({
            collection: newCollectionName,
            template: templateName,
            fields: structure.fields.length,
            docId: docRef.id
          });
          
        } catch (error) {
          console.error(`❌ Error creando ${templateName}:`, error);
          results.push({
            collection: `team_${teamId}_${templateName}`,
            template: templateName,
            error: error.message
          });
        }
      }

      console.log(`🎉 Equipo creado con ${results.length} colecciones`);
      return results;
      
    } catch (error) {
      console.error('❌ Error creando equipo desde plantilla:', error);
      throw error;
    }
  }

  /**
   * Crea un documento plantilla basado en la estructura
   */
  static createTemplateDocument(structure, userEmail) {
    const doc = {
      _isTemplate: true,
      _createdAt: new Date().toISOString(),
      _createdBy: userEmail,
      _templateSource: 'CASIN_migration',
      _instructions: 'Este es un documento plantilla. Elimínalo cuando agregues datos reales.'
    };

    // Agregar campos con valores por defecto
    structure.fields.forEach(field => {
      if (field.category === 'system') return; // Skip system fields
      
      doc[field.name] = this.getDefaultValueForField(field);
    });

    return doc;
  }

  /**
   * Obtiene un valor por defecto para un campo según su tipo
   */
  static getDefaultValueForField(field) {
    const fieldName = field.name.toLowerCase();
    
    // Valores específicos por nombre de campo
    if (fieldName.includes('nombre')) return 'Ejemplo Nombre';
    if (fieldName.includes('email')) return 'ejemplo@empresa.com';
    if (fieldName.includes('telefono') || fieldName.includes('phone')) return '555-0123';
    if (fieldName.includes('empresa') || fieldName.includes('company')) return 'Empresa Ejemplo';
    if (fieldName.includes('poliza')) return 'POL-001-EJEMPLO';
    if (fieldName.includes('status') || fieldName.includes('estado')) return 'activo';
    
    // Valores por tipo
    switch (field.primaryType) {
      case 'string':
        return field.required ? 'valor_ejemplo' : '';
      case 'number':
        return field.required ? 0 : null;
      case 'boolean':
        return field.required ? true : false;
      case 'date':
      case 'timestamp':
        return new Date();
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  }

  /**
   * Estructura por defecto si no hay datos CASIN
   */
  static getDefaultStructure() {
    return {
      directorio_contactos: {
        name: 'team_NEW_directorio_contactos',
        originalName: 'directorio_contactos',
        fields: [
          { name: 'nombre_completo', primaryType: 'string', required: true, category: 'identity' },
          { name: 'email', primaryType: 'string', required: false, category: 'contact' },
          { name: 'telefono_movil', primaryType: 'string', required: false, category: 'contact' },
          { name: 'empresa', primaryType: 'string', required: false, category: 'business' },
          { name: 'ocupacion', primaryType: 'string', required: false, category: 'business' },
          { name: 'status', primaryType: 'string', required: true, category: 'status' },
          { name: 'origen', primaryType: 'string', required: false, category: 'general' },
          { name: 'comentario', primaryType: 'string', required: false, category: 'general' },
          { name: 'created_at', primaryType: 'timestamp', required: true, category: 'temporal' }
        ],
        category: 'contacts'
      },
      autos: {
        name: 'team_NEW_autos',
        originalName: 'autos',
        fields: [
          { name: 'numeroPoliza', primaryType: 'string', required: true, category: 'insurance' },
          { name: 'asegurado', primaryType: 'string', required: true, category: 'identity' },
          { name: 'compania', primaryType: 'string', required: true, category: 'insurance' },
          { name: 'prima', primaryType: 'number', required: false, category: 'insurance' },
          { name: 'vigenciaInicio', primaryType: 'date', required: false, category: 'temporal' },
          { name: 'vigenciaFin', primaryType: 'date', required: false, category: 'temporal' },
          { name: 'status', primaryType: 'string', required: true, category: 'status' }
        ],
        category: 'policies'
      }
    };
  }

  /**
   * Crear equipo CASIN específicamente para un usuario
   */
  static async createCASINTeamForUser(userEmail, userName = null) {
    try {
      console.log(`🏢 Creando equipo CASIN para ${userEmail}...`);

      // 1. Crear el equipo CASIN
      const teamData = {
        name: 'CASIN Seguros',
        owner: userEmail,
        createdAt: new Date(),
        firebaseProject: 'casinbbdd',
        settings: {
          allowInvites: true,
          maxMembers: 50,
          isMainTeam: true
        },
        description: 'Equipo principal CASIN Seguros'
      };

      const teamDocRef = await addDoc(collection(db, 'teams'), teamData);
      console.log('✅ Equipo CASIN creado con ID:', teamDocRef.id);

      // 2. Agregar al usuario como admin del equipo
      await addDoc(collection(db, 'team_members'), {
        userId: userEmail.replace('@', '_').replace('.', '_'), // UID simple
        email: userEmail,
        name: userName || userEmail,
        teamId: teamDocRef.id,
        role: 'admin',
        invitedBy: userEmail,
        joinedAt: new Date(),
        isOwner: true
      });

      console.log('✅ Usuario agregado como admin del equipo CASIN');

      return {
        teamId: teamDocRef.id,
        teamName: 'CASIN Seguros',
        userRole: 'admin',
        success: true,
        message: 'Equipo CASIN creado exitosamente'
      };

    } catch (error) {
      console.error('❌ Error creando equipo CASIN:', error);
      throw error;
    }
  }

  /**
   * Estructura de colecciones base de CASIN
   */
  getCasinCollections() {
    return [
      { 
        name: 'autos', 
        title: 'Seguros de Autos',
        icon: '🚗',
        description: 'Seguros de vehículos particulares'
      },
      { 
        name: 'vida', 
        title: 'Seguros de Vida',
        icon: '❤️',
        description: 'Seguros de vida y gastos médicos'
      },
      { 
        name: 'gmm', 
        title: 'Gastos Médicos Mayores',
        icon: '🏥',
        description: 'Seguros de gastos médicos mayores'
      },
      { 
        name: 'hogar', 
        title: 'Seguros de Hogar',
        icon: '🏠',
        description: 'Seguros de vivienda y hogar'
      },
      { 
        name: 'rc', 
        title: 'Responsabilidad Civil',
        icon: '⚖️',
        description: 'Seguros de responsabilidad civil'
      },
      { 
        name: 'transporte', 
        title: 'Seguros de Transporte',
        icon: '🚛',
        description: 'Seguros de carga y transporte'
      },
      { 
        name: 'mascotas', 
        title: 'Seguros de Mascotas',
        icon: '🐕',
        description: 'Seguros para mascotas'
      },
      { 
        name: 'diversos', 
        title: 'Seguros Diversos',
        icon: '📋',
        description: 'Otros tipos de seguros'
      },
      { 
        name: 'negocio', 
        title: 'Seguros de Negocio',
        icon: '🏢',
        description: 'Seguros empresariales y comerciales'
      },
      { 
        name: 'emant_caratula', 
        title: 'EMANT Carátula',
        icon: '📄',
        description: 'Documentos carátula EMANT'
      },
      { 
        name: 'emant_listado', 
        title: 'EMANT Listado',
        icon: '📃',
        description: 'Listados EMANT'
      },
      { 
        name: 'gruposvida', 
        title: 'Grupos Vida',
        icon: '👥',
        description: 'Grupos de seguros de vida'
      },
      { 
        name: 'listadovida', 
        title: 'Listado Vida',
        icon: '📊',
        description: 'Listados de seguros de vida'
      },
      { 
        name: 'gruposautos', 
        title: 'Grupos Autos',
        icon: '🚗👥',
        description: 'Grupos de seguros de autos'
      },
      { 
        name: 'listadoautos', 
        title: 'Listado Autos',
        icon: '🚗📊',
        description: 'Listados de seguros de autos'
      }
    ];
  }

  /**
   * Obtener la estructura de columnas de una colección CASIN original
   */
  async getCasinCollectionStructure(collectionName) {
    try {
      console.log(`🔍 Getting structure for CASIN collection: ${collectionName}`);
      
      // Consultar la API para obtener algunos documentos de ejemplo
      const response = await fetch(`${API_URL}/data/${collectionName}?limit=5`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const sampleData = result.data || [];
      
      if (sampleData.length === 0) {
        console.warn(`⚠️ No sample data found for ${collectionName}`);
        return [];
      }
      
      // Extraer estructura de columnas del primer documento
      const firstDoc = sampleData[0];
      const columns = Object.keys(firstDoc).map(key => ({
        name: key,
        type: this.inferColumnType(firstDoc[key]),
        nullable: true
      }));
      
      console.log(`✅ Found ${columns.length} columns for ${collectionName}`);
      return columns;
      
    } catch (error) {
      console.error(`❌ Error getting structure for ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Inferir el tipo de columna basado en el valor
   */
  inferColumnType(value) {
    if (value === null || value === undefined) return 'text';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string') {
      if (value.match(/^\d{4}-\d{2}-\d{2}/)) return 'date';
      if (value.includes('@')) return 'email';
    }
    return 'text';
  }

  /**
   * Crear una colección vacía con estructura similar a CASIN
   */
  async initializeTeamCollection(collectionName) {
    try {
      console.log(`🚀 Initializing team collection: ${collectionName}`);
      
      // Obtener la estructura de la colección original
      const structure = await this.getCasinCollectionStructure(collectionName);
      
      // Crear un documento inicial con la estructura
      const initialDocument = {
        _template: true,
        _created: new Date().toISOString(),
        _description: `Colección ${collectionName} inicializada para el equipo`,
        _source: 'CASIN_template'
      };
      
      // Agregar campos de ejemplo basados en la estructura
      structure.forEach(column => {
        switch (column.type) {
          case 'number':
            initialDocument[column.name] = 0;
            break;
          case 'boolean':
            initialDocument[column.name] = false;
            break;
          case 'date':
            initialDocument[column.name] = new Date().toISOString();
            break;
          default:
            initialDocument[column.name] = `Ejemplo_${column.name}`;
        }
      });
      
      // Crear la colección con el documento inicial
      const result = await teamDataService.createDocument(collectionName, initialDocument);
      console.log(`✅ Collection ${collectionName} initialized successfully`);
      
      return {
        success: true,
        collectionName,
        structure,
        initialDocumentId: result.id
      };
      
    } catch (error) {
      console.error(`❌ Error initializing collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Inicializar todas las colecciones CASIN para un equipo
   */
  async initializeAllTeamCollections() {
    try {
      console.log(`🚀 Initializing all CASIN collections for current team`);
      
      const collections = this.getCasinCollections();
      const results = [];
      
      for (const collection of collections) {
        try {
          const result = await this.initializeTeamCollection(collection.name);
          results.push(result);
          console.log(`✅ Initialized: ${collection.name}`);
        } catch (error) {
          console.error(`❌ Failed to initialize: ${collection.name}`, error);
          results.push({
            success: false,
            collectionName: collection.name,
            error: error.message
          });
        }
      }
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`🎯 Collection initialization complete: ${successful} successful, ${failed} failed`);
      
      return {
        total: collections.length,
        successful,
        failed,
        results
      };
      
    } catch (error) {
      console.error(`❌ Error initializing team collections:`, error);
      throw error;
    }
  }

  /**
   * Migrar datos específicos de CASIN a un equipo (para casos especiales)
   */
  async migrateDataFromCasin(collectionName, filters = {}) {
    try {
      console.log(`📋 Migrating data from CASIN ${collectionName} to team collection`);
      
      // Construir query con filtros
      let queryString = `limit=100`;
      if (Object.keys(filters).length > 0) {
        const filterParams = Object.entries(filters)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        queryString += `&${filterParams}`;
      }
      
      // Obtener datos de CASIN
      const response = await fetch(`${API_URL}/data/${collectionName}?${queryString}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      const casinData = result.data || [];
      
      if (casinData.length === 0) {
        console.warn(`⚠️ No data found in CASIN ${collectionName} with filters:`, filters);
        return { migrated: 0, total: 0 };
      }
      
      // Limpiar datos (quitar IDs y campos internos)
      const cleanData = casinData.map(doc => {
        const { id, _template, _created, _description, _source, ...cleanDoc } = doc;
        return {
          ...cleanDoc,
          _migrated: true,
          _migratedAt: new Date().toISOString(),
          _originalSource: 'CASIN'
        };
      });
      
      // Migrar a la colección del equipo
      const migrationResults = await teamDataService.createMultipleDocuments(collectionName, cleanData);
      
      console.log(`✅ Migrated ${migrationResults.length} documents from CASIN ${collectionName}`);
      
      return {
        migrated: migrationResults.length,
        total: casinData.length,
        results: migrationResults
      };
      
    } catch (error) {
      console.error(`❌ Error migrating data from CASIN ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de migración para todas las colecciones
   */
  async getMigrationStatus() {
    try {
      console.log(`📊 Getting migration status for all collections`);
      
      const collections = this.getCasinCollections();
      const status = [];
      
      for (const collection of collections) {
        try {
          // Contar documentos en la colección del equipo
          const teamCount = await teamDataService.countDocuments(collection.name);
          
          // Obtener count de CASIN
          const response = await fetch(`${API_URL}/data/${collection.name}`);
          let casinCount = 0;
          if (response.ok) {
            const result = await response.json();
            casinCount = result.total || 0;
          }
          
          status.push({
            collection: collection.name,
            title: collection.title,
            icon: collection.icon,
            teamCount,
            casinCount,
            isInitialized: teamCount > 0,
            migrationPercentage: casinCount > 0 ? Math.round((teamCount / casinCount) * 100) : 0
          });
          
        } catch (error) {
          console.error(`❌ Error getting status for ${collection.name}:`, error);
          status.push({
            collection: collection.name,
            title: collection.title,
            icon: collection.icon,
            teamCount: 0,
            casinCount: 0,
            isInitialized: false,
            migrationPercentage: 0,
            error: error.message
          });
        }
      }
      
      console.log(`✅ Migration status retrieved for ${status.length} collections`);
      return status;
      
    } catch (error) {
      console.error(`❌ Error getting migration status:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const teamTemplateService = new TeamTemplateService();
export default teamTemplateService; 