import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  serverTimestamp,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Analizador y Migrador de Datos Firebase
 * Este script analiza los datos existentes y los migra al nuevo formato de equipos
 */

export class DataMigrationService {
  
  /**
   * Analiza todas las colecciones existentes en Firebase
   */
  static async analyzeExistingData() {
    try {
      console.log('🔍 Analizando datos existentes en Firebase...');
      
      // Colecciones que sabemos que existen (de la imagen)
      const existingCollections = [
        'autos',
        'vida', 
        'gmm',
        'directorio_contactos',
        'directorio_policy_links',
        'diversos',
        'emant',
        'emant_caratula',
        'emant_listado',
        'hogar',
        'listadogmm',
        'mascotas',
        'negocio',
        'perros',
        'policy_status',
        'prospeccion_cards',
        'rc',
        'sharepoint_tasks',
        'table_order',
        'table_relationships',
        'transporte',
        'users'
      ];

      const analysis = {
        totalCollections: 0,
        totalDocuments: 0,
        collectionDetails: {},
        suggestedMigration: {}
      };

      // Analizar cada colección
      for (const collectionName of existingCollections) {
        try {
          const collectionRef = collection(db, collectionName);
          const snapshot = await getDocs(collectionRef);
          
          const docs = [];
          snapshot.forEach(doc => {
            docs.push({ id: doc.id, ...doc.data() });
          });

          analysis.collectionDetails[collectionName] = {
            count: docs.length,
            sampleData: docs.slice(0, 2), // Primeros 2 documentos como muestra
            fields: docs.length > 0 ? Object.keys(docs[0]).filter(key => key !== 'id') : []
          };

          analysis.totalCollections++;
          analysis.totalDocuments += docs.length;

          console.log(`📊 ${collectionName}: ${docs.length} documentos`);

        } catch (error) {
          console.warn(`⚠️ No se pudo acceder a la colección ${collectionName}:`, error.message);
        }
      }

      // Sugerir migración
      analysis.suggestedMigration = this.suggestMigrationPlan(analysis.collectionDetails);

      console.log('📋 Análisis completo:', analysis);
      return analysis;

    } catch (error) {
      console.error('❌ Error analizando datos:', error);
      throw error;
    }
  }

  /**
   * Sugiere un plan de migración basado en los datos existentes
   */
  static suggestMigrationPlan(collections) {
    const plan = {
      mainTeam: 'CASIN',
      migrations: {},
      preservation: []
    };

    // Mapear colecciones existentes a nuevas colecciones de equipo
    const migrationMap = {
      'directorio_contactos': 'contactos',
      'autos': 'polizas_autos',
      'vida': 'polizas_vida', 
      'gmm': 'polizas_gmm',
      'hogar': 'polizas_hogar',
      'mascotas': 'polizas_mascotas',
      'negocio': 'polizas_negocio',
      'rc': 'polizas_rc',
      'transporte': 'polizas_transporte',
      'sharepoint_tasks': 'tareas',
      'policy_status': 'configuracion_polizas',
      'users': 'configuracion_usuarios'
    };

    Object.entries(collections).forEach(([oldName, details]) => {
      if (migrationMap[oldName]) {
        plan.migrations[oldName] = {
          newName: migrationMap[oldName],
          targetCollection: `team_CASIN_${migrationMap[oldName]}`,
          documentCount: details.count,
          priority: 'high'
        };
      } else {
        plan.preservation.push({
          collection: oldName,
          action: 'preserve_as_backup',
          reason: 'Estructura no mapeada - conservar para análisis'
        });
      }
    });

    return plan;
  }

  /**
   * Crea el equipo CASIN y migra los datos principales
   */
  static async createCASINTeamWithData(userEmail = 'admin@casin.com') {
    try {
      console.log('🏢 Creando equipo CASIN con datos migrados...');

      // 1. Crear el equipo CASIN
      const teamData = {
        name: 'CASIN Seguros',
        owner: userEmail,
        createdAt: serverTimestamp(),
        firebaseProject: 'casinbbdd',
        settings: {
          allowInvites: true,
          maxMembers: 100,
          migrated: true,
          originalData: true
        },
        description: 'Equipo principal con datos migrados del sistema original'
      };

      const teamDocRef = await addDoc(collection(db, 'teams'), teamData);
      const teamId = 'CASIN'; // ID fijo para CASIN

      console.log('✅ Equipo CASIN creado con ID:', teamDocRef.id);

      // 2. Agregar admin como miembro
      await addDoc(collection(db, 'team_members'), {
        userId: 'casin_admin',
        email: userEmail,
        name: 'Administrador CASIN',
        teamId: teamDocRef.id,
        role: 'admin',
        invitedBy: userEmail,
        joinedAt: serverTimestamp(),
        migrated: true
      });

      // 3. Migrar datos principales
      await this.migrateMainCollections(teamId);

      console.log('🎉 Equipo CASIN creado y datos migrados exitosamente');
      
      return {
        teamId: teamDocRef.id,
        success: true,
        message: 'Equipo CASIN creado con datos migrados'
      };

    } catch (error) {
      console.error('❌ Error creando equipo CASIN:', error);
      throw error;
    }
  }

  /**
   * Migra las colecciones principales al formato de equipo
   */
  static async migrateMainCollections(teamId) {
    try {
      console.log('📦 Migrando colecciones principales...');

      const migrations = [
        {
          source: 'directorio_contactos',
          target: `team_${teamId}_contactos`,
          transform: (doc) => ({
            ...doc,
            fechaMigracion: serverTimestamp(),
            origenMigracion: 'directorio_contactos'
          })
        },
        {
          source: 'autos',
          target: `team_${teamId}_polizas_autos`,
          transform: (doc) => ({
            ...doc,
            tipoPoliza: 'auto',
            fechaMigracion: serverTimestamp(),
            origenMigracion: 'autos'
          })
        },
        {
          source: 'vida',
          target: `team_${teamId}_polizas_vida`,
          transform: (doc) => ({
            ...doc,
            tipoPoliza: 'vida',
            fechaMigracion: serverTimestamp(),
            origenMigracion: 'vida'
          })
        }
        // Agregar más migraciones según necesidad
      ];

      let totalMigrated = 0;

      for (const migration of migrations) {
        try {
          console.log(`🔄 Migrando ${migration.source} → ${migration.target}`);
          
          const sourceRef = collection(db, migration.source);
          const sourceSnapshot = await getDocs(sourceRef);
          
          const batch = writeBatch(db);
          let batchCount = 0;
          
          sourceSnapshot.forEach(docSnap => {
            const sourceData = docSnap.data();
            const transformedData = migration.transform(sourceData);
            
            const targetRef = doc(collection(db, migration.target));
            batch.set(targetRef, transformedData);
            batchCount++;
            
            // Firebase batch limit is 500
            if (batchCount >= 400) {
              console.log(`⚡ Ejecutando batch de ${batchCount} documentos`);
              batch.commit();
              batchCount = 0;
            }
          });

          if (batchCount > 0) {
            await batch.commit();
          }

          console.log(`✅ Migrados ${sourceSnapshot.size} documentos de ${migration.source}`);
          totalMigrated += sourceSnapshot.size;

        } catch (error) {
          console.error(`❌ Error migrando ${migration.source}:`, error);
        }
      }

      console.log(`🎉 Migración completa: ${totalMigrated} documentos migrados`);
      return totalMigrated;

    } catch (error) {
      console.error('❌ Error en migración:', error);
      throw error;
    }
  }

  /**
   * Crea un backup de todas las colecciones existentes
   */
  static async createBackup() {
    try {
      console.log('💾 Creando backup de datos existentes...');
      
      const backupData = {
        timestamp: new Date().toISOString(),
        collections: {},
        metadata: {
          reason: 'Pre-migration backup',
          version: '1.0'
        }
      };

      // Guardar análisis como backup
      const analysis = await this.analyzeExistingData();
      
      await addDoc(collection(db, 'migration_backups'), {
        ...backupData,
        analysis: analysis,
        createdAt: serverTimestamp()
      });

      console.log('✅ Backup creado exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error creando backup:', error);
      throw error;
    }
  }

  /**
   * Método principal para ejecutar migración completa
   */
  static async executeFullMigration() {
    try {
      console.log('🚀 Iniciando migración completa...');

      // 1. Crear backup
      await this.createBackup();

      // 2. Analizar datos
      const analysis = await this.analyzeExistingData();

      // 3. Crear equipo CASIN con datos
      const result = await this.createCASINTeamWithData();

      return {
        success: true,
        analysis,
        migration: result,
        message: 'Migración completa exitosa'
      };

    } catch (error) {
      console.error('❌ Error en migración completa:', error);
      throw error;
    }
  }
}

export default DataMigrationService; 