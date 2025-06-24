import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';

class SchemaTemplateManager {
  constructor() {
    this.templateVersion = '1.0.0';
    this.templates = this.initializeTemplates();
  }

  /**
   * Definición de plantillas base del sistema
   */
  initializeTemplates() {
    return {
      // Sistema de Pólizas
      polizas: {
        category: 'polizas',
        type: 'required', // Obligatorio para todos los equipos
        name: 'Pólizas Principales',
        description: 'Colección maestra de todas las pólizas',
        fields: {
          numeroPoliza: { type: 'string', required: true, description: 'Número único de póliza' },
          tipoSeguro: { type: 'string', required: true, description: 'Tipo de seguro (autos, vida, etc.)' },
          compania: { type: 'string', required: true, description: 'Compañía aseguradora' },
          cliente: { type: 'string', required: true, description: 'Nombre del cliente' },
          prima: { type: 'number', required: true, description: 'Prima de la póliza' },
          fechaInicio: { type: 'date', required: true, description: 'Fecha de inicio de vigencia' },
          fechaVencimiento: { type: 'date', required: true, description: 'Fecha de vencimiento' },
          status: { type: 'string', required: true, description: 'Estado de la póliza', default: 'vigente' },
          moneda: { type: 'string', required: false, description: 'Moneda de la prima', default: 'MXN' },
          observaciones: { type: 'string', required: false, description: 'Observaciones adicionales' },
          fechaCreacion: { type: 'timestamp', required: true, auto: true }
        },
        sampleData: [
          {
            numeroPoliza: 'POL-001-2024',
            tipoSeguro: 'autos',
            compania: 'Seguros Demo SA',
            cliente: 'Juan Pérez García',
            prima: 15000,
            fechaInicio: new Date(),
            fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            status: 'vigente',
            moneda: 'MXN',
            observaciones: 'Póliza de ejemplo para configuración inicial'
          }
        ]
      },

      // Tipos de Seguros Simples
      autos: {
        category: 'polizas',
        type: 'optional_simple',
        name: 'Seguros de Autos',
        description: 'Pólizas específicas de seguros vehiculares',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          marca: { type: 'string', required: true, description: 'Marca del vehículo' },
          modelo: { type: 'string', required: true, description: 'Modelo del vehículo' },
          año: { type: 'number', required: true, description: 'Año del vehículo' },
          placas: { type: 'string', required: true, description: 'Placas del vehículo' },
          numeroSerie: { type: 'string', required: false, description: 'Número de serie/VIN' },
          cobertura: { type: 'string', required: true, description: 'Tipo de cobertura', default: 'amplia' },
          deducible: { type: 'number', required: false, description: 'Monto del deducible' },
          sumaAsegurada: { type: 'number', required: true, description: 'Suma asegurada del vehículo' }
        }
      },

      vida: {
        category: 'polizas',
        type: 'optional_simple',
        name: 'Seguros de Vida',
        description: 'Pólizas de seguros de vida',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          asegurado: { type: 'string', required: true, description: 'Nombre del asegurado' },
          beneficiarios: { type: 'array', required: true, description: 'Lista de beneficiarios' },
          sumaAsegurada: { type: 'number', required: true, description: 'Suma asegurada' },
          tipoVida: { type: 'string', required: true, description: 'Tipo de seguro de vida', default: 'temporal' },
          edad: { type: 'number', required: true, description: 'Edad del asegurado' },
          ocupacion: { type: 'string', required: false, description: 'Ocupación del asegurado' },
          examenesMedicos: { type: 'boolean', required: false, description: 'Requiere exámenes médicos' }
        }
      },

      gmm: {
        category: 'polizas',
        type: 'optional_simple',
        name: 'Gastos Médicos Mayores',
        description: 'Pólizas de gastos médicos mayores',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          asegurado: { type: 'string', required: true },
          tipoCobertura: { type: 'string', required: true, description: 'Tipo de cobertura médica' },
          sumaAsegurada: { type: 'number', required: true },
          deducible: { type: 'number', required: true, description: 'Deducible médico' },
          coaseguro: { type: 'number', required: false, description: 'Porcentaje de coaseguro' },
          redHospitales: { type: 'string', required: false, description: 'Red de hospitales' },
          preexistencias: { type: 'boolean', required: false, description: 'Cubre preexistencias' }
        }
      },

      hogar: {
        category: 'polizas',
        type: 'optional_simple',
        name: 'Seguros de Hogar',
        description: 'Pólizas de seguros para el hogar',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          direccion: { type: 'string', required: true, description: 'Dirección de la propiedad' },
          tipoPropiedad: { type: 'string', required: true, description: 'Casa, departamento, etc.' },
          sumaAseguradaContenidos: { type: 'number', required: true },
          sumaAseguradaEdificio: { type: 'number', required: false },
          coberturaAdicional: { type: 'array', required: false, description: 'Coberturas adicionales' }
        }
      },

      diversos: {
        category: 'polizas',
        type: 'optional_simple',
        name: 'Seguros Diversos',
        description: 'Pólizas de seguros diversos y especializados',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          tipoSeguroDiverso: { type: 'string', required: true, description: 'Tipo específico de seguro' },
          descripcionRiesgo: { type: 'string', required: true, description: 'Descripción del riesgo cubierto' },
          sumaAsegurada: { type: 'number', required: true }
        }
      },

      mascotas: {
        category: 'polizas',
        type: 'optional_simple',
        name: 'Seguros de Mascotas',
        description: 'Pólizas de seguros para mascotas',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          nombreMascota: { type: 'string', required: true, description: 'Nombre de la mascota' },
          especie: { type: 'string', required: true, description: 'Perro, gato, etc.' },
          raza: { type: 'string', required: false, description: 'Raza de la mascota' },
          edad: { type: 'number', required: true, description: 'Edad de la mascota' },
          peso: { type: 'number', required: false, description: 'Peso de la mascota' },
          tipoCobertura: { type: 'string', required: true, description: 'Tipo de cobertura veterinaria' }
        }
      },

      rc: {
        category: 'polizas',
        type: 'optional_simple',
        name: 'Responsabilidad Civil',
        description: 'Pólizas de responsabilidad civil',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          tipoActividad: { type: 'string', required: true, description: 'Actividad que genera responsabilidad' },
          limiteResponsabilidad: { type: 'number', required: true, description: 'Límite de responsabilidad' },
          territorio: { type: 'string', required: false, description: 'Territorio de cobertura' }
        }
      },

      negocio: {
        category: 'polizas',
        type: 'optional_simple',
        name: 'Seguros de Negocio',
        description: 'Pólizas empresariales y comerciales',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          razonSocial: { type: 'string', required: true, description: 'Razón social de la empresa' },
          giroComercial: { type: 'string', required: true, description: 'Giro comercial de la empresa' },
          tipoCobertura: { type: 'string', required: true, description: 'Tipo de cobertura empresarial' },
          numeroEmpleados: { type: 'number', required: false, description: 'Número de empleados' },
          ventasAnuales: { type: 'number', required: false, description: 'Ventas anuales estimadas' }
        }
      },

      // Pólizas Combinadas/Complejas
      emant: {
        category: 'polizas',
        type: 'optional_combined',
        name: 'Emisión y Mantenimiento',
        description: 'Sistema combinado de emisión y mantenimiento de pólizas',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          tipoOperacion: { type: 'string', required: true, description: 'Emisión, renovación, endoso, etc.' },
          estatusEmision: { type: 'string', required: true, description: 'Estado del proceso de emisión' },
          fechaEmision: { type: 'date', required: true },
          fechaMantenimiento: { type: 'date', required: false },
          documentosRequeridos: { type: 'array', required: false },
          observacionesEmision: { type: 'string', required: false }
        }
      },

      emant_listado: {
        category: 'polizas',
        type: 'optional_combined',
        name: 'Listados de Emisión',
        description: 'Listados especializados del sistema de emisión',
        fields: {
          numeroLista: { type: 'string', required: true },
          tipoListado: { type: 'string', required: true, description: 'Tipo de listado generado' },
          fechaGeneracion: { type: 'date', required: true },
          polizasIncluidas: { type: 'array', required: true, description: 'Pólizas incluidas en el listado' },
          status: { type: 'string', required: true, default: 'generado' }
        }
      },

      emant_caratula: {
        category: 'polizas',
        type: 'optional_combined',
        name: 'Carátulas de Pólizas',
        description: 'Carátulas y documentación de pólizas',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          tipoCaratula: { type: 'string', required: true },
          contenidoCaratula: { type: 'object', required: true, description: 'Datos de la carátula' },
          fechaGeneracion: { type: 'date', required: true },
          version: { type: 'string', required: false, default: '1.0' }
        }
      },

      // Gestión de Pólizas
      policy_status: {
        category: 'polizas',
        type: 'recommended',
        name: 'Estados de Pólizas',
        description: 'Control de estados y estatus de pólizas',
        fields: {
          numeroPoliza: { type: 'string', required: true },
          statusActual: { type: 'string', required: true, description: 'Estado actual de la póliza' },
          statusAnterior: { type: 'string', required: false },
          fechaCambio: { type: 'timestamp', required: true, auto: true },
          motivoCambio: { type: 'string', required: false },
          usuarioResponsable: { type: 'string', required: true }
        }
      },

      policy_links: {
        category: 'polizas',
        type: 'recommended',
        name: 'Enlaces de Pólizas',
        description: 'Relaciones y enlaces entre pólizas',
        fields: {
          polizaPrincipal: { type: 'string', required: true },
          polizaRelacionada: { type: 'string', required: true },
          tipoRelacion: { type: 'string', required: true, description: 'Tipo de relación entre pólizas' },
          fechaVinculacion: { type: 'timestamp', required: true, auto: true },
          activa: { type: 'boolean', required: true, default: true }
        }
      },

      // Otras categorías base del sistema
      contactos: {
        category: 'contacts',
        type: 'required',
        name: 'Contactos',
        description: 'Base de datos de contactos y clientes',
        fields: {
          nombre: { type: 'string', required: true, description: 'Nombre completo' },
          email: { type: 'string', required: true, description: 'Correo electrónico' },
          telefono: { type: 'string', required: false, description: 'Teléfono principal' },
          empresa: { type: 'string', required: false, description: 'Empresa donde trabaja' },
          cargo: { type: 'string', required: false, description: 'Cargo o puesto' },
          direccion: { type: 'string', required: false, description: 'Dirección completa' },
          rfc: { type: 'string', required: false, description: 'RFC o identificador fiscal' },
          fechaNacimiento: { type: 'date', required: false, description: 'Fecha de nacimiento' },
          tipoContacto: { type: 'string', required: true, description: 'Cliente, prospecto, proveedor, etc.', default: 'cliente' },
          activo: { type: 'boolean', required: true, default: true },
          notas: { type: 'string', required: false, description: 'Notas adicionales' },
          fechaCreacion: { type: 'timestamp', required: true, auto: true }
        }
      },

      tareas: {
        category: 'management',
        type: 'required',
        name: 'Tareas',
        description: 'Sistema de gestión de tareas y seguimiento',
        fields: {
          titulo: { type: 'string', required: true, description: 'Título de la tarea' },
          descripcion: { type: 'string', required: false, description: 'Descripción detallada' },
          prioridad: { type: 'string', required: true, description: 'alta, media, baja', default: 'media' },
          status: { type: 'string', required: true, description: 'pendiente, en progreso, completada', default: 'pendiente' },
          asignadoA: { type: 'string', required: false, description: 'Usuario asignado' },
          fechaVencimiento: { type: 'date', required: false, description: 'Fecha límite' },
          etiquetas: { type: 'array', required: false, description: 'Etiquetas o categorías' },
          fechaCreacion: { type: 'timestamp', required: true, auto: true },
          fechaActualizacion: { type: 'timestamp', required: false }
        }
      },

      reportes: {
        category: 'management',
        type: 'required',
        name: 'Reportes',
        description: 'Sistema de reportes y análisis',
        fields: {
          nombre: { type: 'string', required: true, description: 'Nombre del reporte' },
          tipo: { type: 'string', required: true, description: 'Tipo de reporte' },
          parametros: { type: 'object', required: false, description: 'Parámetros del reporte' },
          datos: { type: 'object', required: true, description: 'Datos del reporte' },
          fechaGeneracion: { type: 'timestamp', required: true, auto: true },
          generadoPor: { type: 'string', required: true, description: 'Usuario que generó el reporte' },
          formato: { type: 'string', required: false, description: 'PDF, Excel, etc.', default: 'JSON' }
        }
      },

      configuracion: {
        category: 'management',
        type: 'required',
        name: 'Configuración',
        description: 'Configuraciones del equipo y sistema',
        fields: {
          clave: { type: 'string', required: true, description: 'Clave de configuración' },
          valor: { type: 'string', required: true, description: 'Valor de la configuración' },
          tipo: { type: 'string', required: false, description: 'Tipo de dato', default: 'string' },
          descripcion: { type: 'string', required: false, description: 'Descripción de la configuración' },
          categoria: { type: 'string', required: false, description: 'Categoría de configuración' },
          fechaCreacion: { type: 'timestamp', required: true, auto: true },
          fechaActualizacion: { type: 'timestamp', required: false }
        }
      }
    };
  }

  /**
   * Obtiene plantillas por categoría
   */
  getTemplatesByCategory(category) {
    return Object.entries(this.templates)
      .filter(([key, template]) => template.category === category)
      .reduce((acc, [key, template]) => {
        acc[key] = template;
        return acc;
      }, {});
  }

  /**
   * Obtiene plantillas por tipo
   */
  getTemplatesByType(type) {
    return Object.entries(this.templates)
      .filter(([key, template]) => template.type === type)
      .reduce((acc, [key, template]) => {
        acc[key] = template;
        return acc;
      }, {});
  }

  /**
   * Obtiene configuración de plantillas para un equipo
   */
  async getTeamTemplateConfig(teamId) {
    try {
      const configDoc = await getDoc(doc(db, 'team_template_configs', teamId));
      
      if (configDoc.exists()) {
        return configDoc.data();
      }
      
      // Configuración por defecto para equipos nuevos
      return this.getDefaultTeamConfig();
      
    } catch (error) {
      console.error('Error obteniendo configuración de plantillas:', error);
      return this.getDefaultTeamConfig();
    }
  }

  /**
   * Configuración por defecto para equipos nuevos
   */
  getDefaultTeamConfig() {
    return {
      version: this.templateVersion,
      enabledCollections: {
        // Obligatorias
        required: ['polizas', 'contactos', 'tareas', 'reportes', 'configuracion'],
        
        // Recomendadas
        recommended: ['policy_status', 'policy_links'],
        
        // Opcionales simples - el equipo puede elegir
        optional_simple: [],
        
        // Opcionales combinadas - para equipos avanzados
        optional_combined: [],
        
        // Personalizadas - creadas por el equipo
        custom: []
      },
      lastUpdated: new Date().toISOString(),
      createdBy: 'system'
    };
  }

  /**
   * Guarda configuración de plantillas para un equipo
   */
  async saveTeamTemplateConfig(teamId, config, updatedBy) {
    try {
      const configData = {
        ...config,
        version: this.templateVersion,
        lastUpdated: serverTimestamp(),
        updatedBy: updatedBy
      };

      await setDoc(doc(db, 'team_template_configs', teamId), configData, { merge: true });
      
      console.log(`✅ Configuración de plantillas guardada para team: ${teamId}`);
      return configData;
      
    } catch (error) {
      console.error('Error guardando configuración de plantillas:', error);
      throw error;
    }
  }

  /**
   * Crea colecciones basadas en plantillas para un equipo
   */
  async createCollectionsFromTemplates(teamId, selectedCollections, createdBy) {
    try {
      console.log(`🏗️ Creando colecciones para team ${teamId}:`, selectedCollections);
      
      const results = [];
      
      for (const collectionName of selectedCollections) {
        const template = this.templates[collectionName];
        
        if (!template) {
          console.warn(`⚠️ Plantilla no encontrada: ${collectionName}`);
          continue;
        }
        
        try {
          const result = await this.createCollectionFromTemplate(teamId, collectionName, template, createdBy);
          results.push(result);
          
        } catch (error) {
          console.error(`❌ Error creando colección ${collectionName}:`, error);
          results.push({
            collection: collectionName,
            success: false,
            error: error.message
          });
        }
      }
      
      console.log(`✅ Proceso completado. ${results.filter(r => r.success).length}/${results.length} colecciones creadas`);
      return results;
      
    } catch (error) {
      console.error('Error en creación masiva de colecciones:', error);
      throw error;
    }
  }

  /**
   * Crea una colección específica basada en plantilla
   */
  async createCollectionFromTemplate(teamId, collectionName, template, createdBy) {
    try {
      const collectionPath = `team_${teamId}_${collectionName}`;
      
      // Crear documento de configuración de la colección
      const collectionConfig = {
        templateName: collectionName,
        templateVersion: this.templateVersion,
        teamId: teamId,
        category: template.category,
        type: template.type,
        name: template.name,
        description: template.description,
        fields: template.fields,
        createdAt: serverTimestamp(),
        createdBy: createdBy,
        active: true
      };
      
      // Guardar configuración de la colección
      await setDoc(doc(db, 'collection_configs', collectionPath), collectionConfig);
      
      // Crear datos de ejemplo si existen en la plantilla
      if (template.sampleData && template.sampleData.length > 0) {
        for (const sampleItem of template.sampleData) {
          const sampleData = {
            ...sampleItem,
            _isTemplate: true,
            _createdBy: 'template_system',
            _createdAt: serverTimestamp()
          };
          
          await addDoc(collection(db, collectionPath), sampleData);
        }
      }
      
      console.log(`✅ Colección creada: ${collectionPath}`);
      
      return {
        collection: collectionName,
        path: collectionPath,
        success: true,
        config: collectionConfig
      };
      
    } catch (error) {
      console.error(`❌ Error creando colección ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de uso de plantillas
   */
  async getTemplateUsageStats() {
    try {
      // Obtener todas las configuraciones de equipos
      const configsSnapshot = await getDocs(collection(db, 'team_template_configs'));
      
      const stats = {
        totalTeams: configsSnapshot.size,
        templateUsage: {},
        categoryUsage: {},
        typeUsage: {}
      };
      
      configsSnapshot.docs.forEach(doc => {
        const config = doc.data();
        const allEnabled = [
          ...config.enabledCollections.required,
          ...config.enabledCollections.recommended,
          ...config.enabledCollections.optional_simple,
          ...config.enabledCollections.optional_combined,
          ...config.enabledCollections.custom
        ];
        
        allEnabled.forEach(templateName => {
          const template = this.templates[templateName];
          
          // Contar uso por plantilla
          stats.templateUsage[templateName] = (stats.templateUsage[templateName] || 0) + 1;
          
          if (template) {
            // Contar uso por categoría
            stats.categoryUsage[template.category] = (stats.categoryUsage[template.category] || 0) + 1;
            
            // Contar uso por tipo
            stats.typeUsage[template.type] = (stats.typeUsage[template.type] || 0) + 1;
          }
        });
      });
      
      return stats;
      
    } catch (error) {
      console.error('Error obteniendo estadísticas de plantillas:', error);
      return null;
    }
  }
}

export default SchemaTemplateManager; 