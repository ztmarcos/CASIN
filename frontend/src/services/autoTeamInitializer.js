import { collection, getDocs, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-hot-toast';
import teamDataService from './teamDataService';

/**
 * AutoTeamInitializer - Inicializa automáticamente nuevos equipos con el esquema completo de CASIN
 * 
 * Este servicio crea todas las colecciones que tiene CASIN pero vacías (solo con documentos de ejemplo)
 * para que los nuevos equipos tengan la misma estructura desde el inicio.
 */
class AutoTeamInitializer {

  constructor() {
    // Esquema completo de CASIN - todas las colecciones que debe tener cada equipo
    this.casinCollections = [
      'autos',
      'vida', 
      'gmm',
      'hogar',
      'rc',
      'transporte',
      'mascotas',
      'diversos',
      'negocio',
      'emant_caratula',
      'emant_listado',
      'gruposvida',
      'listadovida',
      'gruposautos',
      'listadoautos'
    ];
  }

  /**
   * Inicializa automáticamente un nuevo equipo con todas las colecciones necesarias
   * pero con datos de ejemplo/placeholder solamente
   */
  static async initializeNewTeam(teamId, teamName, ownerEmail) {
    try {
      console.log(`🚀 Auto-inicializando equipo: ${teamName} (${teamId})`);
      
      // 1. Obtener estructura de CASIN como plantilla
      const structure = await this.extractCASINStructure();
      console.log(`📋 Estructura extraída: ${Object.keys(structure).length} colecciones`);
      
      // 2. Crear colecciones con esquemas pero datos placeholder
      const results = await this.createCollectionsWithSchema(teamId, structure, ownerEmail);
      
      console.log(`✅ Equipo ${teamName} inicializado con ${results.length} colecciones`);
      
      // 3. Mostrar notificación al usuario
      toast.success(`🎉 Equipo ${teamName} creado con ${results.length} tipos de pólizas configuradas`);
      
      return results;
      
    } catch (error) {
      console.error(`❌ Error inicializando equipo ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Extrae la estructura de colecciones de CASIN como plantilla
   */
  static async extractCASINStructure() {
    try {
      console.log('📋 Extrayendo estructura de CASIN...');
      
      // Buscar todas las colecciones de CASIN
      const casinCollections = await this.findCASINCollections();
      
      if (casinCollections.length === 0) {
        console.warn('⚠️ No se encontraron colecciones CASIN, usando estructura por defecto');
        return this.getDefaultStructure();
      }

      const structure = {};
      
      for (const collectionName of casinCollections) {
        try {
          const schema = await this.analyzeCollectionStructure(collectionName);
          const templateName = collectionName.replace('team_CASIN_', '');
          structure[templateName] = schema;
          console.log(`✅ Estructura extraída: ${templateName} (${schema.fields.length} campos)`);
        } catch (error) {
          console.warn(`⚠️ Error analizando ${collectionName}:`, error.message);
        }
      }

      return structure;
      
    } catch (error) {
      console.error('❌ Error extrayendo estructura CASIN:', error);
      return this.getDefaultStructure();
    }
  }

  /**
   * Encuentra todas las colecciones de CASIN migrando
   */
  static async findCASINCollections() {
    const knownCollections = [
      'team_CASIN_autos',
      'team_CASIN_vida', 
      'team_CASIN_gmm',
      'team_CASIN_hogar',
      'team_CASIN_rc',
      'team_CASIN_transporte',
      'team_CASIN_mascotas',
      'team_CASIN_diversos',
      'team_CASIN_negocio',
      'team_CASIN_emant_caratula',
      'team_CASIN_emant_listado',
      'team_CASIN_gruposvida',
      'team_CASIN_listadovida',
      'team_CASIN_gruposautos',
      'team_CASIN_listadoautos',
      'team_CASIN_directorio_contactos'
    ];

    const existingCollections = [];
    
    for (const collectionName of knownCollections) {
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        if (!snapshot.empty) {
          existingCollections.push(collectionName);
        }
      } catch (error) {
        console.warn(`⚠️ No se puede acceder a ${collectionName}`);
      }
    }

    console.log(`📊 Colecciones CASIN encontradas: ${existingCollections.length}`);
    return existingCollections;
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

      // Analizar los primeros 5 documentos para obtener la estructura
      const fields = new Set();
      const fieldTypes = {};
      let count = 0;

      snapshot.docs.slice(0, 5).forEach(doc => {
        const data = doc.data();
        
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
        required: this.isFieldRequired(fieldName),
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
   * Crea colecciones con esquemas pero datos placeholder
   */
  static async createCollectionsWithSchema(teamId, structure, ownerEmail) {
    const results = [];
    
    for (const [collectionName, schema] of Object.entries(structure)) {
      try {
        console.log(`📝 Creando colección: ${collectionName}`);
        
        // Crear documento placeholder con estructura correcta
        const placeholderData = this.createPlaceholderDocument(schema, ownerEmail);
        
        // Usar teamDataService para crear en la colección del equipo
        await teamDataService.createDocument(collectionName, placeholderData);
        
        results.push({
          collection: collectionName,
          fields: schema.fields?.length || 0,
          status: 'created'
        });
        
        console.log(`✅ ${collectionName} creada con ${schema.fields?.length || 0} campos`);
        
      } catch (error) {
        console.error(`❌ Error creando ${collectionName}:`, error);
        results.push({
          collection: collectionName,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Crea un documento placeholder con la estructura correcta
   */
  static createPlaceholderDocument(schema, ownerEmail) {
    const placeholderData = {
      _isPlaceholder: true,
      _description: `Documento de ejemplo para ${schema.originalName || schema.name}`,
      _createdBy: ownerEmail,
      _created: new Date().toISOString(),
      teamId: 'placeholder' // Será reemplazado por teamDataService
    };

    // Agregar campos basados en el schema
    if (schema.fields && schema.fields.length > 0) {
      schema.fields.forEach(field => {
        placeholderData[field.name] = this.getPlaceholderValue(field);
      });
    } else {
      // Si no hay schema, usar campos básicos por tipo de colección
      const defaultFields = this.getDefaultFieldsForCollection(schema.originalName || schema.name);
      defaultFields.forEach(field => {
        placeholderData[field.name] = field.placeholder;
      });
    }

    return placeholderData;
  }

  /**
   * Obtiene un valor placeholder apropiado para un campo
   */
  static getPlaceholderValue(field) {
    // No incluir campos técnicos en el placeholder
    const skipFields = ['id', 'firebase_doc_id', 'teamId', 'createdAt', 'updatedAt'];
    if (skipFields.includes(field.name)) {
      return undefined;
    }

    const fieldName = field.name.toLowerCase();
    const fieldType = field.primaryType || 'string';

    // Valores específicos por nombre de campo
    if (fieldName.includes('poliza') || fieldName.includes('numero')) {
      return 'EJEMPLO-001';
    }
    if (fieldName.includes('nombre') || fieldName.includes('contratante')) {
      return 'Ejemplo Cliente';
    }
    if (fieldName.includes('email') || fieldName.includes('correo')) {
      return 'ejemplo@cliente.com';
    }
    if (fieldName.includes('telefono') || fieldName.includes('tel')) {
      return '555-0123';
    }
    if (fieldName.includes('rfc')) {
      return 'XAXX010101000';
    }
    if (fieldName.includes('prima') || fieldName.includes('pago') || fieldName.includes('costo')) {
      return 1000;
    }
    if (fieldName.includes('vigencia') || fieldName.includes('fecha')) {
      return '2024-01-01';
    }
    if (fieldName.includes('status') || fieldName.includes('estado')) {
      return 'vigente';
    }
    if (fieldName.includes('marca') || fieldName.includes('vehiculo')) {
      return 'Toyota';
    }
    if (fieldName.includes('modelo')) {
      return 'Corolla';
    }
    if (fieldName.includes('año')) {
      return 2024;
    }
    if (fieldName.includes('placas')) {
      return 'ABC-123';
    }

    // Valores por tipo
    switch (fieldType) {
      case 'number':
        return 100;
      case 'boolean':
        return true;
      case 'date':
        return '2024-01-01';
      default:
        return 'Ejemplo';
    }
  }

  /**
   * Obtiene campos por defecto para colecciones sin schema
   */
  static getDefaultFieldsForCollection(collectionName) {
    const commonFields = [
      { name: 'numeroPoliza', placeholder: 'EJEMPLO-001' },
      { name: 'nombreContratante', placeholder: 'Cliente Ejemplo' },
      { name: 'status', placeholder: 'vigente' },
      { name: 'prima', placeholder: 1000 },
      { name: 'vigenciaInicio', placeholder: '2024-01-01' },
      { name: 'vigenciaFin', placeholder: '2025-01-01' }
    ];

    const specificFields = {
      'autos': [
        ...commonFields,
        { name: 'marca', placeholder: 'Toyota' },
        { name: 'modelo', placeholder: 'Corolla' },
        { name: 'año', placeholder: 2024 },
        { name: 'placas', placeholder: 'ABC-123' }
      ],
      'vida': [
        ...commonFields,
        { name: 'tipoVida', placeholder: 'individual' },
        { name: 'beneficiario', placeholder: 'Familia' }
      ],
      'gmm': [
        ...commonFields,
        { name: 'tipoCobertura', placeholder: 'familiar' },
        { name: 'hospital', placeholder: 'Red Hospitalaria' }
      ],
      'directorio_contactos': [
        { name: 'nombre', placeholder: 'Cliente Ejemplo' },
        { name: 'email', placeholder: 'cliente@ejemplo.com' },
        { name: 'telefono', placeholder: '555-0123' },
        { name: 'empresa', placeholder: 'Empresa Demo' }
      ]
    };

    return specificFields[collectionName] || commonFields;
  }

  /**
   * Determina el tipo de un campo
   */
  static getFieldType(value) {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'object' && value.toDate) return 'timestamp';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  /**
   * Obtiene el tipo más común de un conjunto de tipos
   */
  static getMostCommonType(types) {
    const typeArray = Array.from(types);
    return typeArray[0] || 'string';
  }

  /**
   * Determina si un campo es requerido
   */
  static isFieldRequired(fieldName) {
    const requiredFields = ['numeroPoliza', 'nombreContratante', 'status'];
    return requiredFields.includes(fieldName);
  }

  /**
   * Categoriza un campo
   */
  static categorizeField(fieldName) {
    if (fieldName.includes('fecha') || fieldName.includes('vigencia')) return 'date';
    if (fieldName.includes('prima') || fieldName.includes('costo')) return 'currency';
    if (fieldName.includes('email')) return 'email';
    if (fieldName.includes('telefono')) return 'phone';
    return 'general';
  }

  /**
   * Categoriza una colección
   */
  static categorizeCollection(collectionName) {
    if (collectionName.includes('auto')) return 'AUTOS';
    if (collectionName.includes('vida')) return 'VIDA';
    if (collectionName.includes('gmm')) return 'GMM';
    if (collectionName.includes('hogar')) return 'HOGAR';
    if (collectionName.includes('contacto') || collectionName.includes('directorio')) return 'DIRECTORIO';
    return 'GENERAL';
  }

  /**
   * Estructura por defecto si no se puede obtener de CASIN
   */
  static getDefaultStructure() {
    return {
      'autos': {
        name: 'autos',
        fields: [
          { name: 'numeroPoliza', primaryType: 'string', required: true },
          { name: 'nombreContratante', primaryType: 'string', required: true },
          { name: 'marca', primaryType: 'string' },
          { name: 'modelo', primaryType: 'string' },
          { name: 'año', primaryType: 'number' },
          { name: 'placas', primaryType: 'string' },
          { name: 'prima', primaryType: 'number' },
          { name: 'status', primaryType: 'string' }
        ]
      },
      'vida': {
        name: 'vida',
        fields: [
          { name: 'numeroPoliza', primaryType: 'string', required: true },
          { name: 'nombreContratante', primaryType: 'string', required: true },
          { name: 'prima', primaryType: 'number' },
          { name: 'beneficiario', primaryType: 'string' },
          { name: 'status', primaryType: 'string' }
        ]
      },
      'gmm': {
        name: 'gmm',
        fields: [
          { name: 'numeroPoliza', primaryType: 'string', required: true },
          { name: 'nombreContratante', primaryType: 'string', required: true },
          { name: 'tipoCobertura', primaryType: 'string' },
          { name: 'prima', primaryType: 'number' },
          { name: 'status', primaryType: 'string' }
        ]
      },
      'directorio_contactos': {
        name: 'directorio_contactos',
        fields: [
          { name: 'nombre', primaryType: 'string', required: true },
          { name: 'email', primaryType: 'string' },
          { name: 'telefono', primaryType: 'string' },
          { name: 'empresa', primaryType: 'string' }
        ]
      }
    };
  }

  /**
   * Analiza la estructura de una colección CASIN existente
   */
  async analyzeCasinCollection(collectionName) {
    try {
      console.log(`📋 Analyzing CASIN collection: ${collectionName}`);
      
      const casinCollection = collection(db, collectionName);
      const snapshot = await getDocs(casinCollection);
      
      if (snapshot.empty) {
        console.log(`⚠️ CASIN collection ${collectionName} is empty, using predefined structure`);
        return this.getPredefinedStructure(collectionName);
      }
      
      // Tomar múltiples documentos para análisis más completo
      const sampleDocs = [];
      let count = 0;
      for (const docSnap of snapshot.docs) {
        if (count >= 5) break; // Analizar hasta 5 documentos
        sampleDocs.push(docSnap.data());
        count++;
      }
      
      // Extraer todos los campos únicos
      const allFields = new Set();
      sampleDocs.forEach(doc => {
        Object.keys(doc).forEach(field => {
          // Excluir campos internos de Firebase
          if (!field.startsWith('_') && 
              field !== 'createdAt' && 
              field !== 'updatedAt' && 
              field !== 'firebase_doc_id') {
            allFields.add(field);
          }
        });
      });
      
      // Crear estructura inteligente basada en datos reales
      const structure = {};
      const firstDoc = sampleDocs[0];
      
      Array.from(allFields).forEach(field => {
        const value = firstDoc[field];
        structure[field] = this.generateIntelligentPlaceholder(field, value, collectionName);
      });
      
      console.log(`✅ Analyzed ${collectionName}: ${Object.keys(structure).length} fields`);
      return structure;
      
    } catch (error) {
      console.error(`❌ Error analyzing ${collectionName}:`, error);
      return this.getPredefinedStructure(collectionName);
    }
  }

  /**
   * Genera placeholders inteligentes basados en el nombre del campo y tipo de datos
   */
  generateIntelligentPlaceholder(fieldName, originalValue, collectionName) {
    const field = fieldName.toLowerCase();
    
    // Placeholders específicos por campo
    if (field.includes('email')) return 'ejemplo@empresa.com';
    if (field.includes('telefono') || field.includes('phone')) return '5512345678';
    if (field.includes('rfc')) return 'XEXX010101000';
    if (field.includes('curp')) return 'XEXX010101HDFXXX01';
    
    // Campos de pólizas
    if (field.includes('poliza') || field.includes('numero')) {
      const prefix = collectionName.toUpperCase().substring(0, 3);
      return `${prefix}-EJEMPLO-001`;
    }
    
    // Nombres y personas
    if (field.includes('contratante') || field.includes('nombre') || field.includes('cliente')) {
      return 'CLIENTE EJEMPLO S.A. DE C.V.';
    }
    if (field.includes('aseguradora')) return 'ASEGURADORA EJEMPLO';
    if (field.includes('agente') || field.includes('responsable')) return 'AGENTE EJEMPLO';
    
    // Direcciones y ubicaciones
    if (field.includes('direccion') || field.includes('domicilio')) {
      return 'Av. Ejemplo #123, Col. Centro, Ciudad de México, C.P. 01000';
    }
    if (field.includes('ciudad')) return 'Ciudad de México';
    if (field.includes('estado')) return 'CDMX';
    if (field.includes('cp') || field.includes('postal')) return '01000';
    
    // Vehículos (para autos)
    if (field.includes('marca')) return 'Toyota';
    if (field.includes('modelo')) return 'Corolla';
    if (field.includes('año') || field.includes('year')) return '2024';
    if (field.includes('placas')) return 'ABC-123-D';
    if (field.includes('serie') || field.includes('vin')) return 'EJEMPLO123456789';
    
    // Montos y pagos
    if (field.includes('importe') || field.includes('prima') || field.includes('precio') || 
        field.includes('total') || field.includes('monto')) {
      return '10,000.00';
    }
    if (field.includes('iva')) return '1,600.00';
    if (field.includes('deducible')) return '5,000.00';
    if (field.includes('coaseguro')) return '10%';
    if (field.includes('suma_asegurada')) return '100,000.00';
    
    // Formas de pago
    if (field.includes('forma_pago') || field.includes('pago')) return 'Anual';
    if (field.includes('vigencia') || field.includes('duracion')) return '365 días';
    
    // Fechas
    if (field.includes('fecha') || field.includes('date')) return '2024-01-01';
    if (field.includes('inicio')) return '2024-01-01';
    if (field.includes('fin') || field.includes('vencimiento')) return '2024-12-31';
    
    // Estados y status
    if (field.includes('status') || field.includes('estado')) return 'Activo';
    if (field.includes('renovacion')) return 'Nueva';
    if (field.includes('version')) return '1';
    
    // Documentos
    if (field.includes('pdf') || field.includes('documento')) return 'DISPONIBLE';
    
    // Basado en el tipo del valor original
    if (typeof originalValue === 'number') {
      if (originalValue > 1000) return 10000; // Probablemente un monto
      return 1;
    }
    if (typeof originalValue === 'boolean') return true;
    if (originalValue instanceof Date) return '2024-01-01';
    
    // Placeholder genérico
    return 'EJEMPLO';
  }

  /**
   * Estructuras predefinidas para colecciones específicas
   */
  getPredefinedStructure(collectionName) {
    const structures = {
      autos: {
        contratante: "CLIENTE EJEMPLO S.A. DE C.V.",
        numero_poliza: "AUTO-EJEMPLO-001",
        aseguradora: "ASEGURADORA EJEMPLO",
        forma_pago: "Anual",
        importe_total_a_pagar: "10,000.00",
        prima_neta: "8,000.00",
        iva_16: "1,280.00",
        marca: "Toyota",
        modelo: "Corolla",
        año: "2024",
        placas: "ABC-123-D",
        rfc: "XEXX010101000",
        telefono: "5512345678",
        email: "ejemplo@empresa.com"
      },
      vida: {
        contratante: "CLIENTE EJEMPLO S.A. DE C.V.",
        numero_poliza: "VIDA-EJEMPLO-001",
        aseguradora: "ASEGURADORA EJEMPLO",
        suma_asegurada: "100,000.00",
        prima_anual: "12,000.00",
        beneficiario: "BENEFICIARIO EJEMPLO",
        rfc: "XEXX010101000"
      },
      gmm: {
        contratante: "CLIENTE EJEMPLO S.A. DE C.V.",
        numero_poliza: "GMM-EJEMPLO-001",
        aseguradora: "ASEGURADORA EJEMPLO",
        tipo_plan: "Plan Básico",
        deducible: "5,000.00",
        coaseguro: "10%",
        suma_asegurada: "500,000.00",
        prima_anual: "15,000.00"
      },
      hogar: {
        contratante: "CLIENTE EJEMPLO S.A. DE C.V.",
        numero_poliza: "HOGAR-EJEMPLO-001",
        aseguradora: "ASEGURADORA EJEMPLO",
        direccion: "Av. Ejemplo #123, Col. Centro, Ciudad de México",
        valor_inmueble: "500,000.00",
        prima_anual: "8,000.00"
      },
      rc: {
        contratante: "CLIENTE EJEMPLO S.A. DE C.V.",
        numero_poliza: "RC-EJEMPLO-001",
        aseguradora: "ASEGURADORA EJEMPLO",
        tipo_responsabilidad: "Civil General",
        suma_asegurada: "1,000,000.00"
      },
      transporte: {
        contratante: "CLIENTE EJEMPLO S.A. DE C.V.",
        numero_poliza: "TRANS-EJEMPLO-001",
        aseguradora: "ASEGURADORA EJEMPLO",
        tipo_mercancia: "Mercancía General",
        valor_mercancia: "100,000.00"
      },
      mascotas: {
        contratante: "CLIENTE EJEMPLO S.A. DE C.V.",
        numero_poliza: "MASC-EJEMPLO-001",
        aseguradora: "ASEGURADORA EJEMPLO",
        nombre_mascota: "Mascota Ejemplo",
        especie: "Perro",
        raza: "Labrador"
      },
      diversos: {
        contratante: "CLIENTE EJEMPLO S.A. DE C.V.",
        numero_poliza: "DIV-EJEMPLO-001",
        aseguradora: "ASEGURADORA EJEMPLO",
        tipo_seguro: "Seguro Diverso",
        descripcion: "Descripción del seguro"
      },
      negocio: {
        contratante: "CLIENTE EJEMPLO S.A. DE C.V.",
        numero_poliza: "NEG-EJEMPLO-001",
        aseguradora: "ASEGURADORA EJEMPLO",
        tipo_negocio: "Comercio",
        giro_comercial: "Servicios"
      }
    };
    
    return structures[collectionName] || {
      nombre: "EJEMPLO",
      descripcion: "Documento de ejemplo para " + collectionName,
      activo: true
    };
  }

  /**
   * Inicializa un equipo con el esquema completo de CASIN
   */
  async initializeTeamWithCasinSchema(teamId) {
    try {
      console.log(`🚀 Initializing team ${teamId} with complete CASIN schema...`);
      console.log(`📋 Creating ${this.casinCollections.length} collections:`, this.casinCollections);
      
      const results = [];
      
      for (const collectionName of this.casinCollections) {
        try {
          console.log(`📝 Creating collection: ${collectionName}`);
          
          // Analizar estructura de CASIN
          const structure = await this.analyzeCasinCollection(collectionName);
          
          // Crear documento de ejemplo para el equipo
          const result = await this.createExampleDocument(teamId, collectionName, structure);
          results.push(result);
          
        } catch (error) {
          console.error(`❌ Error creating ${collectionName}:`, error);
          results.push({ collection: collectionName, success: false, error: error.message });
        }
      }
      
      const successful = results.filter(r => r.success).length;
      console.log(`🎉 Team ${teamId} initialized: ${successful}/${this.casinCollections.length} collections created`);
      
      return {
        success: true,
        teamId,
        collectionsCreated: successful,
        totalCollections: this.casinCollections.length,
        results
      };
      
    } catch (error) {
      console.error(`❌ Error initializing team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Crea un documento de ejemplo en una colección del equipo
   */
  async createExampleDocument(teamId, collectionName, structure) {
    try {
      const teamCollectionName = `team_${teamId}_${collectionName}`;
      
      // Verificar si ya existe
      const existingCollection = collection(db, teamCollectionName);
      const existingSnapshot = await getDocs(existingCollection);
      
      if (!existingSnapshot.empty) {
        console.log(`⚠️ Collection ${teamCollectionName} already exists with ${existingSnapshot.size} documents`);
        return { collection: collectionName, success: true, existed: true };
      }
      
      // Crear documento de ejemplo
      const exampleDoc = {
        ...structure,
        _isPlaceholder: true,
        _schemaVersion: '1.0',
        _teamId: teamId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Guardar en Firebase
      const docRef = doc(db, teamCollectionName, 'ejemplo_001');
      await setDoc(docRef, exampleDoc);
      
      console.log(`✅ Created example document in ${teamCollectionName}`);
      
      return { 
        collection: collectionName, 
        success: true, 
        docId: 'ejemplo_001',
        fieldsCount: Object.keys(structure).length
      };
      
    } catch (error) {
      console.error(`❌ Error creating example document for ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Verifica si un equipo necesita inicialización
   */
  async teamNeedsInitialization(teamId) {
    try {
      // Verificar si al menos las colecciones principales existen
      const mainCollections = ['autos', 'vida', 'gmm', 'hogar'];
      let existingCount = 0;
      
      for (const collectionName of mainCollections) {
        const teamCollectionName = `team_${teamId}_${collectionName}`;
        const collectionRef = collection(db, teamCollectionName);
        const snapshot = await getDocs(collectionRef);
        
        if (!snapshot.empty) {
          existingCount++;
        }
      }
      
      // Si tiene menos de 2 colecciones principales, necesita inicialización
      const needsInit = existingCount < 2;
      console.log(`🔍 Team ${teamId} needs initialization: ${needsInit} (has ${existingCount}/${mainCollections.length} main collections)`);
      
      return needsInit;
      
    } catch (error) {
      console.error(`❌ Error checking team ${teamId} initialization:`, error);
      return true; // En caso de error, asumir que necesita inicialización
    }
  }

  /**
   * Obtiene estadísticas de inicialización
   */
  getInitializationStats() {
    return {
      totalCollections: this.casinCollections.length,
      collections: this.casinCollections,
      description: 'Complete CASIN schema with all insurance types and management collections'
    };
  }
}

// Exportar instancia única
const autoTeamInitializer = new AutoTeamInitializer();
export default autoTeamInitializer; 