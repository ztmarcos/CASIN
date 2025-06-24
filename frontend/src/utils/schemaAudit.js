import { 
  collection, 
  getDocs, 
  query, 
  limit,
  doc,
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';

class SchemaAuditor {
  constructor() {
    this.collections = new Map();
    this.fieldStats = new Map();
    this.teamData = new Map();
    this.auditReport = {
      timestamp: new Date().toISOString(),
      totalTeams: 0,
      totalCollections: 0,
      fieldAnalysis: {},
      recommendations: [],
      issues: []
    };
  }

  /**
   * Ejecuta auditoría completa de esquemas
   */
  async runFullAudit() {
    console.log('🔍 Iniciando auditoría completa de esquemas...');
    
    try {
      // 1. Descubrir todas las colecciones
      await this.discoverCollections();
      
      // 2. Analizar cada colección
      await this.analyzeCollections();
      
      // 3. Generar estadísticas
      await this.generateStatistics();
      
      // 4. Crear recomendaciones
      this.generateRecommendations();
      
      // 5. Generar reporte final
      const report = this.generateReport();
      
      console.log('✅ Auditoría completada');
      console.log('📊 Reporte:', report);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error en auditoría:', error);
      throw error;
    }
  }

  /**
   * Descubre todas las colecciones existentes
   */
  async discoverCollections() {
    console.log('🔍 Descubriendo colecciones...');
    
    // Lista de colecciones conocidas que vamos a buscar
    const knownCollectionTypes = [
      'contactos', 'polizas', 'tareas', 'reportes', 'configuracion',
      'directorio', 'autos', 'vida', 'gmm', 'birthdays'
    ];
    
    const collections = new Set();
    
    // Buscar colecciones de equipos (team_*)
    for (const collectionType of knownCollectionTypes) {
      try {
        // Colección global (para admins CASIN)
        const globalRef = collection(db, collectionType);
        const globalSnapshot = await getDocs(query(globalRef, limit(1)));
        
        if (!globalSnapshot.empty) {
          collections.add({
            name: collectionType,
            type: 'global',
            teamId: null,
            hasData: true
          });
          console.log(`✅ Encontrada colección global: ${collectionType}`);
        }
        
        // Buscar colecciones de equipos
        // Nota: En Firestore no podemos listar colecciones dinámicamente
        // Tendremos que usar los equipos conocidos
        await this.discoverTeamCollections(collectionType, collections);
        
      } catch (error) {
        console.warn(`⚠️ Error buscando colección ${collectionType}:`, error);
      }
    }
    
    this.auditReport.totalCollections = collections.size;
    console.log(`📊 Total colecciones encontradas: ${collections.size}`);
    
    return Array.from(collections);
  }

  /**
   * Busca colecciones específicas de equipos
   */
  async discoverTeamCollections(collectionType, collections) {
    try {
      // Primero obtener lista de equipos
      const teamsRef = collection(db, 'teams');
      const teamsSnapshot = await getDocs(teamsRef);
      
      for (const teamDoc of teamsSnapshot.docs) {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();
        
        // Guardar datos del equipo
        this.teamData.set(teamId, {
          id: teamId,
          name: teamData.name || 'Sin nombre',
          owner: teamData.owner || 'Desconocido',
          createdAt: teamData.createdAt?.toDate?.() || null
        });
        
        // Buscar colección de este equipo
        const teamCollectionName = `team_${teamId}_${collectionType}`;
        
        try {
          const teamCollectionRef = collection(db, teamCollectionName);
          const teamSnapshot = await getDocs(query(teamCollectionRef, limit(1)));
          
          if (!teamSnapshot.empty) {
            collections.add({
              name: teamCollectionName,
              type: 'team',
              teamId: teamId,
              teamName: teamData.name,
              collectionType: collectionType,
              hasData: true
            });
            console.log(`✅ Encontrada colección de equipo: ${teamCollectionName}`);
          }
        } catch (error) {
          // No existe esta colección para este equipo, normal
        }
      }
      
      this.auditReport.totalTeams = teamsSnapshot.size;
      
    } catch (error) {
      console.warn('⚠️ Error buscando equipos:', error);
    }
  }

  /**
   * Analiza la estructura de cada colección
   */
  async analyzeCollections() {
    console.log('🔬 Analizando estructura de colecciones...');
    
    const collections = await this.discoverCollections();
    
    for (const collectionInfo of collections) {
      try {
        console.log(`📋 Analizando: ${collectionInfo.name}`);
        
        const collectionRef = collection(db, collectionInfo.name);
        const snapshot = await getDocs(query(collectionRef, limit(50))); // Muestra representativa
        
        const schema = this.analyzeCollectionSchema(snapshot, collectionInfo);
        this.collections.set(collectionInfo.name, schema);
        
      } catch (error) {
        console.error(`❌ Error analizando ${collectionInfo.name}:`, error);
        this.auditReport.issues.push({
          type: 'collection_analysis_error',
          collection: collectionInfo.name,
          error: error.message
        });
      }
    }
  }

  /**
   * Analiza el esquema de una colección específica
   */
  analyzeCollectionSchema(snapshot, collectionInfo) {
    const schema = {
      collectionInfo,
      documentCount: snapshot.size,
      fields: new Map(),
      fieldTypes: new Map(),
      fieldFrequency: new Map(),
      sampleDocuments: [],
      uniqueFieldNames: new Set()
    };

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      
      // Guardar algunos documentos de muestra
      if (index < 3) {
        schema.sampleDocuments.push({
          id: doc.id,
          data: this.sanitizeDocumentData(data)
        });
      }

      // Analizar campos
      this.analyzeDocumentFields(data, schema, '');
    });

    // Convertir Map a Object para serialización
    schema.fields = Object.fromEntries(schema.fields);
    schema.fieldTypes = Object.fromEntries(schema.fieldTypes);
    schema.fieldFrequency = Object.fromEntries(schema.fieldFrequency);
    schema.uniqueFieldNames = Array.from(schema.uniqueFieldNames);

    return schema;
  }

  /**
   * Analiza campos de un documento recursivamente
   */
  analyzeDocumentFields(data, schema, prefix = '') {
    for (const [key, value] of Object.entries(data)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      // Registrar campo
      schema.uniqueFieldNames.add(fieldPath);
      
      // Contar frecuencia
      const currentCount = schema.fieldFrequency.get(fieldPath) || 0;
      schema.fieldFrequency.set(fieldPath, currentCount + 1);
      
      // Determinar tipo
      const fieldType = this.getFieldType(value);
      
      // Registrar tipo
      const currentTypes = schema.fieldTypes.get(fieldPath) || new Set();
      currentTypes.add(fieldType);
      schema.fieldTypes.set(fieldPath, currentTypes);
      
      // Información del campo
      const fieldInfo = schema.fields.get(fieldPath) || {
        name: fieldPath,
        types: new Set(),
        examples: [],
        frequency: 0,
        isOptional: false
      };
      
      fieldInfo.types.add(fieldType);
      fieldInfo.frequency = schema.fieldFrequency.get(fieldPath);
      
      // Agregar ejemplo si no es muy largo
      if (fieldInfo.examples.length < 3 && this.isValidExample(value)) {
        fieldInfo.examples.push(value);
      }
      
      schema.fields.set(fieldPath, fieldInfo);
      
      // Recursión para objetos anidados
      if (fieldType === 'object' && value !== null) {
        this.analyzeDocumentFields(value, schema, fieldPath);
      }
    }
  }

  /**
   * Determina el tipo de un campo
   */
  getFieldType(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    if (value && typeof value.toDate === 'function') return 'firebase_timestamp';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  }

  /**
   * Verifica si un valor es un buen ejemplo
   */
  isValidExample(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && value.length > 100) return false;
    if (typeof value === 'object' && JSON.stringify(value).length > 200) return false;
    return true;
  }

  /**
   * Sanitiza datos del documento para el reporte
   */
  sanitizeDocumentData(data) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.length > 50) {
        sanitized[key] = value.substring(0, 50) + '...';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[Object]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Genera estadísticas globales
   */
  async generateStatistics() {
    console.log('📊 Generando estadísticas...');
    
    const collectionTypes = new Map();
    const fieldUsage = new Map();
    
    // Agrupar por tipo de colección
    this.collections.forEach((schema, collectionName) => {
      const collectionType = this.extractCollectionType(collectionName);
      
      if (!collectionTypes.has(collectionType)) {
        collectionTypes.set(collectionType, {
          type: collectionType,
          collections: [],
          totalDocuments: 0,
          commonFields: new Map(),
          allFields: new Set()
        });
      }
      
      const typeData = collectionTypes.get(collectionType);
      typeData.collections.push(schema);
      typeData.totalDocuments += schema.documentCount;
      
      // Analizar campos comunes
      schema.uniqueFieldNames.forEach(fieldName => {
        typeData.allFields.add(fieldName);
        
        const count = typeData.commonFields.get(fieldName) || 0;
        typeData.commonFields.set(fieldName, count + 1);
      });
    });

    // Convertir a formato serializable
    const stats = {};
    collectionTypes.forEach((data, type) => {
      stats[type] = {
        ...data,
        collections: data.collections.length,
        commonFields: Object.fromEntries(data.commonFields),
        allFields: Array.from(data.allFields)
      };
    });

    this.auditReport.fieldAnalysis = stats;
  }

  /**
   * Extrae el tipo de colección del nombre
   */
  extractCollectionType(collectionName) {
    if (collectionName.startsWith('team_')) {
      const parts = collectionName.split('_');
      return parts[parts.length - 1]; // Último segmento después de team_id
    }
    return collectionName;
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  generateRecommendations() {
    console.log('💡 Generando recomendaciones...');
    
    const recommendations = [];
    
    // Analizar campos candidatos a estandarización
    Object.entries(this.auditReport.fieldAnalysis).forEach(([type, data]) => {
      if (data.collections > 1) {
        // Campos que aparecen en todas las colecciones de este tipo
        const universalFields = [];
        const frequentFields = [];
        
        Object.entries(data.commonFields).forEach(([field, count]) => {
          const percentage = (count / data.collections) * 100;
          
          if (percentage === 100) {
            universalFields.push(field);
          } else if (percentage >= 70) {
            frequentFields.push({ field, percentage: Math.round(percentage) });
          }
        });
        
        if (universalFields.length > 0) {
          recommendations.push({
            type: 'standardize_required',
            collectionType: type,
            priority: 'high',
            fields: universalFields,
            description: `Campos que aparecen en TODAS las colecciones de ${type} - candidatos a campos obligatorios`
          });
        }
        
        if (frequentFields.length > 0) {
          recommendations.push({
            type: 'standardize_optional',
            collectionType: type,
            priority: 'medium',
            fields: frequentFields,
            description: `Campos frecuentes en colecciones de ${type} - candidatos a campos opcionales`
          });
        }
      }
    });

    this.auditReport.recommendations = recommendations;
  }

  /**
   * Genera el reporte final
   */
  generateReport() {
    return {
      ...this.auditReport,
      collections: Object.fromEntries(this.collections),
      teams: Object.fromEntries(this.teamData)
    };
  }

  /**
   * Exporta reporte a JSON
   */
  exportToJSON(report) {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Genera reporte en formato Markdown
   */
  exportToMarkdown(report) {
    let markdown = `# Schema Audit Report\n\n`;
    markdown += `**Generated:** ${report.timestamp}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Teams:** ${report.totalTeams}\n`;
    markdown += `- **Total Collections:** ${report.totalCollections}\n`;
    markdown += `- **Issues Found:** ${report.issues.length}\n\n`;

    // Análisis por tipo de colección
    markdown += `## Collection Analysis\n\n`;
    Object.entries(report.fieldAnalysis).forEach(([type, data]) => {
      markdown += `### ${type.toUpperCase()}\n\n`;
      markdown += `- **Collections:** ${data.collections}\n`;
      markdown += `- **Total Documents:** ${data.totalDocuments}\n`;
      markdown += `- **Unique Fields:** ${data.allFields.length}\n\n`;
    });

    // Recomendaciones
    markdown += `## Recommendations\n\n`;
    report.recommendations.forEach((rec, index) => {
      markdown += `### ${index + 1}. ${rec.description}\n\n`;
      markdown += `**Priority:** ${rec.priority.toUpperCase()}\n\n`;
      
      if (Array.isArray(rec.fields)) {
        markdown += `**Fields:**\n`;
        rec.fields.forEach(field => {
          if (typeof field === 'string') {
            markdown += `- ${field}\n`;
          } else {
            markdown += `- ${field.field} (${field.percentage}%)\n`;
          }
        });
        markdown += `\n`;
      }
    });

    return markdown;
  }
}

// Función principal para ejecutar auditoría
export const runSchemaAudit = async () => {
  const auditor = new SchemaAuditor();
  return await auditor.runFullAudit();
};

// Función para exportar reporte
export const exportAuditReport = (report, format = 'json') => {
  const auditor = new SchemaAuditor();
  
  if (format === 'markdown') {
    return auditor.exportToMarkdown(report);
  }
  
  return auditor.exportToJSON(report);
};

export default SchemaAuditor; 