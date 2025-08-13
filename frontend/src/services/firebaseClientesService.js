import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import firebaseTeamService from './firebaseTeamService';

// Firebase configuration
const FIREBASE_ENABLED = true; // ✅ Enabled with Blaze plan

/**
 * FirebaseClientesService - Servicio para gestionar el directorio unificado de clientes
 * 
 * Este servicio extrae todos los nombres de contratante de todas las tablas de Firebase
 * y consolida los duplicados, agrupando todas las pólizas de un mismo cliente.
 */
class FirebaseClientesService {
  constructor() {
    this.db = db;
    this.clientCache = new Map();
    this.lastCacheUpdate = null;
    this.cacheExpiration = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Obtiene el nombre de la colección considerando el equipo actual
   */
  getCollectionName(baseName) {
    if (!FIREBASE_ENABLED) {
      console.log('🔥 Firebase disabled - returning mock data');
      return baseName;
    }

    const currentTeamId = firebaseTeamService.currentTeamId;
    
    // Para el equipo CASIN, usar colecciones directas
    if (currentTeamId === 'CASIN' || currentTeamId === '4JlUqhAvfJMlCDhQ4vgH') {
      return baseName;
    }
    
    // Para otros equipos, usar prefijos
    return `team_${currentTeamId}_${baseName}`;
  }

  /**
   * Extrae el nombre del cliente de un documento según la tabla
   */
  extractClientName(docData, tableName) {
    const clientNameFields = {
      'autos': ['nombre_contratante'],
      'vida': ['contratante'],
      'gmm': ['contratante', 'nombre_del_asegurado'],
      'hogar': ['contratante'],
      'negocio': ['contratante'],
      'diversos': ['contratante'],
      'mascotas': ['contratante'],
      'transporte': ['contratante'],
      'rc': ['asegurado'],
      'emant_caratula': ['contratante'],
      'gruposvida': ['contratante'],
      'gruposautos': ['contratante']
    };

    const fields = clientNameFields[tableName] || ['contratante', 'nombre_contratante', 'asegurado'];
    
    for (const field of fields) {
      if (docData[field] && docData[field].trim()) {
        return docData[field].trim();
      }
    }
    
    return null;
  }

  /**
   * Normaliza el nombre del cliente para mejor comparación
   */
  normalizeClientName(name) {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Reemplaza múltiples espacios con uno solo
      .replace(/[.,]/g, '') // Remueve puntos y comas
      .normalize('NFD') // Normaliza caracteres acentuados
      .replace(/[\u0300-\u036f]/g, ''); // Remueve diacríticos
  }

  /**
   * Extrae todos los clientes de una colección específica
   */
  async extractClientsFromCollection(collectionName) {
    try {
      console.log(`🔍 Extrayendo clientes de: ${collectionName}`);
      
      const collectionRef = collection(this.db, this.getCollectionName(collectionName));
      const snapshot = await getDocs(collectionRef);
      
      const clients = [];
      const clientMap = new Map(); // Para agrupar por nombre normalizado
      
      snapshot.forEach(doc => {
        try {
          const data = doc.data();
          const clientName = this.extractClientName(data, collectionName);
          
          if (clientName) {
            const normalizedName = this.normalizeClientName(clientName);
            
            // Crear objeto de póliza con manejo seguro de campos
            const policy = {
              id: doc.id,
              tableName: collectionName,
              clientName: clientName,
              normalizedName: normalizedName,
              numero_poliza: data.numero_poliza || 'N/A',
              aseguradora: data.aseguradora || 'N/A',
              vigencia_inicio: data.vigencia_inicio || data.fecha_inicio || 'N/A',
              vigencia_fin: data.vigencia_fin || data.fecha_fin || 'N/A',
              forma_pago: data.forma_de_pago || data.forma_pago || 'N/A',
              prima_total: data.pago_total_o_prima_total || data.importe_a_pagar_mxn || data.importe_total || 0,
              email: data.e_mail || data.email || 'N/A',
              rfc: data.rfc || 'N/A',
              direccion: data.domicilio_o_direccion || data.direccion || 'N/A',
              telefono: data.telefono || 'N/A',
              ramo: data.ramo || this.getRamoFromTable(collectionName),
              pdf: data.pdf || 'N/A',
              responsable: data.responsable || 'N/A'
            };
            
            // Agrupar por nombre normalizado
            if (!clientMap.has(normalizedName)) {
              clientMap.set(normalizedName, {
                clientName: clientName,
                normalizedName: normalizedName,
                policies: []
              });
            }
            
            clientMap.get(normalizedName).policies.push(policy);
          }
        } catch (docError) {
          console.warn(`⚠️ Error procesando documento en ${collectionName}:`, docError);
          // Continuar con el siguiente documento
        }
      });
      
      // Convertir el Map a array
      clientMap.forEach(client => {
        clients.push(client);
      });
      
      console.log(`✅ Extraídos ${clients.length} clientes únicos de ${collectionName}`);
      return clients;
      
    } catch (error) {
      console.error(`❌ Error extrayendo clientes de ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Obtiene el ramo basado en el nombre de la tabla
   */
  getRamoFromTable(tableName) {
    const ramoMap = {
      'autos': 'Autos',
      'vida': 'Vida',
      'gmm': 'Gastos Médicos Mayores',
      'hogar': 'Hogar',
      'negocio': 'Negocio',
      'diversos': 'Diversos',
      'mascotas': 'Mascotas',
      'transporte': 'Transporte',
      'rc': 'Responsabilidad Civil',
      'emant_caratula': 'Emant',
      'gruposvida': 'Grupos Vida',
      'gruposautos': 'Grupos Autos'
    };
    
    return ramoMap[tableName] || tableName;
  }

  /**
   * Obtiene todas las colecciones de seguros disponibles
   */
  getInsuranceCollections() {
    return [
      'autos',
      'vida',
      'gmm',
      'hogar',
      'negocio',
      'diversos',
      'mascotas',
      'transporte',
      'rc',
      'emant_caratula',
      'gruposvida',
      'gruposautos'
    ];
  }

  /**
   * Extrae y consolida todos los clientes de todas las colecciones
   */
  async getAllClients(forceRefresh = false) {
    // Verificar cache
    if (!forceRefresh && this.lastCacheUpdate && 
        (Date.now() - this.lastCacheUpdate) < this.cacheExpiration) {
      console.log('📋 Returning cached client data');
      return Array.from(this.clientCache.values());
    }

    console.log('🔄 Extrayendo todos los clientes de todas las colecciones...');
    
    const collections = this.getInsuranceCollections();
    const allClients = [];
    const consolidatedClients = new Map();
    
    // Extraer clientes de cada colección
    for (const collectionName of collections) {
      try {
        const clients = await this.extractClientsFromCollection(collectionName);
        allClients.push(...clients);
      } catch (error) {
        console.warn(`⚠️ Error procesando ${collectionName}:`, error);
      }
    }
    
    // Consolidar clientes duplicados
    allClients.forEach(client => {
      const normalizedName = client.normalizedName;
      
              if (!consolidatedClients.has(normalizedName)) {
          consolidatedClients.set(normalizedName, {
            id: normalizedName, // Usar nombre normalizado como ID
            clientName: client.clientName,
            normalizedName: normalizedName,
            totalPolicies: 0,
            policies: [],
            collections: new Set(),
            activePolicies: 0,
            expiredPolicies: 0
          });
        }
      
      const consolidatedClient = consolidatedClients.get(normalizedName);
      consolidatedClient.policies.push(...client.policies);
      consolidatedClient.totalPolicies += client.policies.length;
      client.policies.forEach(policy => {
        consolidatedClient.collections.add(policy.tableName);
      });
    });
    
    // Calcular estadísticas adicionales
    consolidatedClients.forEach(client => {
      client.collections = Array.from(client.collections);
      
      // Removido cálculo de primas totales
      
      // Contar pólizas activas y expiradas
      const now = new Date();
      client.policies.forEach(policy => {
        try {
          // Solo procesar si hay fecha de fin de vigencia válida
          if (policy.vigencia_fin && policy.vigencia_fin !== 'N/A') {
            const endDate = new Date(policy.vigencia_fin);
            // Verificar que la fecha sea válida
            if (!isNaN(endDate.getTime())) {
              if (endDate > now) {
                client.activePolicies++;
              } else {
                client.expiredPolicies++;
              }
            } else {
              // Si la fecha no es válida, contar como desconocida
              console.warn(`⚠️ Fecha de vigencia inválida para póliza ${policy.numero_poliza}: ${policy.vigencia_fin}`);
            }
          } else {
            // Si no hay fecha, contar como desconocida
            console.warn(`⚠️ Sin fecha de vigencia para póliza ${policy.numero_poliza}`);
          }
        } catch (error) {
          console.error(`❌ Error procesando fecha de póliza ${policy.numero_poliza}:`, error);
        }
      });
    });
    
    // Convertir a array y ordenar por nombre
    const result = Array.from(consolidatedClients.values())
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
    
    // Actualizar cache
    this.clientCache.clear();
    result.forEach(client => {
      this.clientCache.set(client.id, client);
    });
    this.lastCacheUpdate = Date.now();
    
    console.log(`✅ Consolidados ${result.length} clientes únicos con ${result.reduce((total, c) => total + c.totalPolicies, 0)} pólizas totales`);
    
    return result;
  }

  /**
   * Busca clientes por nombre
   */
  async searchClients(searchTerm, limit = 50) {
    const allClients = await this.getAllClients();
    
    if (!searchTerm) {
      return allClients.slice(0, limit);
    }
    
    const normalizedSearch = this.normalizeClientName(searchTerm);
    
    return allClients
      .filter(client => 
        client.normalizedName.includes(normalizedSearch) ||
        client.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, limit);
  }

  /**
   * Obtiene un cliente específico por ID
   */
  async getClientById(clientId) {
    const allClients = await this.getAllClients();
    return allClients.find(client => client.id === clientId);
  }

  /**
   * Obtiene estadísticas generales de clientes
   */
  async getClientStats() {
    const allClients = await this.getAllClients();
    
    const stats = {
      totalClients: allClients.length,
      totalPolicies: allClients.reduce((total, client) => total + client.totalPolicies, 0),
      activePolicies: allClients.reduce((total, client) => total + client.activePolicies, 0),
      expiredPolicies: allClients.reduce((total, client) => total + client.expiredPolicies, 0),
      collections: new Set()
    };
    
    allClients.forEach(client => {
      client.collections.forEach(collection => {
        stats.collections.add(collection);
      });
    });
    
    stats.collections = Array.from(stats.collections);
    
    return stats;
  }

  /**
   * Fuerza la actualización del cache
   */
  async refreshCache() {
    return await this.getAllClients(true);
  }
}

// Singleton instance
const firebaseClientesService = new FirebaseClientesService();
export default firebaseClientesService;
