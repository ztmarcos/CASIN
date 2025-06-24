#!/usr/bin/env node

/**
 * Script independiente para ejecutar auditoría de esquemas
 * Uso: node scripts/run-schema-audit.js [--format=json|markdown] [--output=archivo]
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Configurar rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Importar Firebase y utilidades
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config({ path: join(projectRoot, '.env') });

console.log('🔍 Auditoría de Esquemas - Herramienta de Línea de Comandos');
console.log('='.repeat(60));

class CLISchemaAuditor {
  constructor() {
    this.db = null;
    this.app = null;
    this.results = {};
  }

  async initialize() {
    try {
      // Configuración Firebase desde variables de entorno
      const firebaseConfig = {
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID
      };

      // Validar configuración
      const missingVars = Object.entries(firebaseConfig)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
      }

      console.log('🔥 Inicializando conexión a Firebase...');
      console.log(`📊 Proyecto: ${firebaseConfig.projectId}`);

      // Inicializar Firebase
      this.app = initializeApp(firebaseConfig, 'schema-audit-cli');
      this.db = getFirestore(this.app);

      console.log('✅ Conexión establecida exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error inicializando Firebase:', error.message);
      return false;
    }
  }

  async runQuickAudit() {
    console.log('\n🚀 Ejecutando auditoría rápida...');
    
    try {
      // Importar dinámicamente el auditor desde el frontend
      const auditorPath = join(projectRoot, 'frontend/src/utils/schemaAudit.js');
      
      if (!existsSync(auditorPath)) {
        throw new Error('No se encontró el módulo de auditoría');
      }

      // Simular auditoría básica
      const report = await this.performBasicAudit();
      
      console.log('✅ Auditoría completada');
      return report;

    } catch (error) {
      console.error('❌ Error ejecutando auditoría:', error.message);
      throw error;
    }
  }

  async performBasicAudit() {
    const { collection, getDocs, query, limit } = await import('firebase/firestore');
    
    const report = {
      timestamp: new Date().toISOString(),
      source: 'CLI Audit Tool',
      totalTeams: 0,
      totalCollections: 0,
      collections: {},
      teams: {},
      summary: {}
    };

    console.log('📋 Analizando equipos...');
    
    try {
      // Obtener equipos
      const teamsRef = collection(this.db, 'teams');
      const teamsSnapshot = await getDocs(teamsRef);
      
      report.totalTeams = teamsSnapshot.size;
      
      teamsSnapshot.docs.forEach(doc => {
        const teamData = doc.data();
        report.teams[doc.id] = {
          id: doc.id,
          name: teamData.name || 'Sin nombre',
          owner: teamData.owner || 'Desconocido',
          createdAt: teamData.createdAt?.toDate?.()?.toISOString() || null
        };
      });

      console.log(`✅ Encontrados ${report.totalTeams} equipos`);

      // Tipos de colecciones conocidas
      const collectionTypes = [
        'contactos', 'polizas', 'tareas', 'reportes', 'configuracion',
        'directorio', 'autos', 'vida', 'gmm', 'birthdays'
      ];

      console.log('📊 Analizando colecciones...');

      for (const collectionType of collectionTypes) {
        // Colección global
        try {
          const globalRef = collection(this.db, collectionType);
          const globalSnapshot = await getDocs(query(globalRef, limit(1)));
          
          if (!globalSnapshot.empty) {
            report.collections[collectionType] = {
              type: 'global',
              hasData: true,
              sampleSize: globalSnapshot.size
            };
            report.totalCollections++;
            console.log(`  ✅ ${collectionType} (global)`);
          }
        } catch (error) {
          console.log(`  ⚠️ ${collectionType} (global) - Error: ${error.message}`);
        }

        // Colecciones de equipos
        for (const teamId of Object.keys(report.teams)) {
          const teamCollectionName = `team_${teamId}_${collectionType}`;
          
          try {
            const teamRef = collection(this.db, teamCollectionName);
            const teamSnapshot = await getDocs(query(teamRef, limit(1)));
            
            if (!teamSnapshot.empty) {
              report.collections[teamCollectionName] = {
                type: 'team',
                teamId: teamId,
                collectionType: collectionType,
                hasData: true,
                sampleSize: teamSnapshot.size
              };
              report.totalCollections++;
              console.log(`  ✅ ${teamCollectionName}`);
            }
          } catch (error) {
            // No existe, normal
          }
        }
      }

      // Generar resumen
      report.summary = {
        globalCollections: Object.values(report.collections).filter(c => c.type === 'global').length,
        teamCollections: Object.values(report.collections).filter(c => c.type === 'team').length,
        collectionsByType: {}
      };

      // Agrupar por tipo
      Object.values(report.collections).forEach(collection => {
        const type = collection.collectionType || collection.type;
        if (!report.summary.collectionsByType[type]) {
          report.summary.collectionsByType[type] = 0;
        }
        report.summary.collectionsByType[type]++;
      });

      return report;

    } catch (error) {
      console.error('❌ Error en auditoría básica:', error);
      throw error;
    }
  }

  generateMarkdownReport(report) {
    let md = `# 🔍 Schema Audit Report\n\n`;
    md += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`;
    md += `**Source:** ${report.source}\n\n`;

    md += `## 📊 Summary\n\n`;
    md += `- **Total Teams:** ${report.totalTeams}\n`;
    md += `- **Total Collections:** ${report.totalCollections}\n`;
    md += `- **Global Collections:** ${report.summary.globalCollections}\n`;
    md += `- **Team Collections:** ${report.summary.teamCollections}\n\n`;

    md += `## 🏢 Teams\n\n`;
    if (Object.keys(report.teams).length === 0) {
      md += `*No teams found*\n\n`;
    } else {
      Object.values(report.teams).forEach(team => {
        md += `### ${team.name}\n`;
        md += `- **ID:** \`${team.id}\`\n`;
        md += `- **Owner:** ${team.owner}\n`;
        if (team.createdAt) {
          md += `- **Created:** ${new Date(team.createdAt).toLocaleDateString()}\n`;
        }
        md += `\n`;
      });
    }

    md += `## 📋 Collections by Type\n\n`;
    Object.entries(report.summary.collectionsByType).forEach(([type, count]) => {
      md += `- **${type}:** ${count} collections\n`;
    });

    md += `\n## 🗂️ Detailed Collections\n\n`;
    Object.entries(report.collections).forEach(([name, info]) => {
      md += `### ${name}\n`;
      md += `- **Type:** ${info.type}\n`;
      if (info.teamId) {
        md += `- **Team:** ${report.teams[info.teamId]?.name || info.teamId}\n`;
      }
      if (info.collectionType) {
        md += `- **Collection Type:** ${info.collectionType}\n`;
      }
      md += `- **Has Data:** ${info.hasData ? 'Yes' : 'No'}\n`;
      md += `\n`;
    });

    return md;
  }

  async saveReport(report, format = 'json', outputFile = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFile = `schema-audit-${timestamp}.${format}`;
    const filename = outputFile || defaultFile;

    let content;
    if (format === 'markdown' || format === 'md') {
      content = this.generateMarkdownReport(report);
    } else {
      content = JSON.stringify(report, null, 2);
    }

    try {
      await fs.writeFile(filename, content, 'utf8');
      console.log(`💾 Reporte guardado: ${filename}`);
      console.log(`📄 Formato: ${format.toUpperCase()}`);
      console.log(`📦 Tamaño: ${(content.length / 1024).toFixed(2)} KB`);
      return filename;
    } catch (error) {
      console.error('❌ Error guardando reporte:', error.message);
      throw error;
    }
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  // Parsear argumentos
  const options = {
    format: 'json',
    output: null,
    help: false
  };

  args.forEach(arg => {
    if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1];
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  });

  if (options.help) {
    console.log(`
Uso: node scripts/run-schema-audit.js [opciones]

Opciones:
  --format=json|markdown    Formato del reporte (default: json)
  --output=archivo          Archivo de salida (default: auto)
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node scripts/run-schema-audit.js
  node scripts/run-schema-audit.js --format=markdown
  node scripts/run-schema-audit.js --format=json --output=mi-reporte.json
    `);
    return;
  }

  try {
    const auditor = new CLISchemaAuditor();
    
    // Inicializar
    const initialized = await auditor.initialize();
    if (!initialized) {
      process.exit(1);
    }

    // Ejecutar auditoría
    const report = await auditor.runQuickAudit();

    // Mostrar resumen en consola
    console.log('\n📊 Resumen de Resultados:');
    console.log(`   📁 Total Equipos: ${report.totalTeams}`);
    console.log(`   📋 Total Colecciones: ${report.totalCollections}`);
    console.log(`   🌐 Colecciones Globales: ${report.summary.globalCollections}`);
    console.log(`   🏢 Colecciones de Equipos: ${report.summary.teamCollections}`);

    // Guardar reporte
    console.log('\n💾 Guardando reporte...');
    const filename = await auditor.saveReport(report, options.format, options.output);

    console.log('\n🎉 ¡Auditoría completada exitosamente!');
    console.log(`📋 Reporte disponible en: ${filename}`);

  } catch (error) {
    console.error('\n❌ Error ejecutando auditoría:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default CLISchemaAuditor; 