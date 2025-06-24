import { collection, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-hot-toast';
import teamDataService from './teamDataService';

class AutoTeamInitializer {
  
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
}

export default AutoTeamInitializer; 