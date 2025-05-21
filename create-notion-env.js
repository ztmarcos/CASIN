// Script para ayudar a configurar el archivo .env para Notion
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== Configuración de Notion API ===\n');
console.log('Este script te ayudará a configurar las variables de entorno necesarias para la integración con Notion.');
console.log('Necesitarás tu Notion API Key y Database ID.\n');

// Intenta cargar el archivo .env existente
const envPath = path.resolve(process.cwd(), '.env');
let existingEnv = '';

try {
  if (fs.existsSync(envPath)) {
    existingEnv = fs.readFileSync(envPath, 'utf8');
    console.log('Se encontró un archivo .env existente. Se añadirán las variables de Notion.');
  }
} catch (err) {
  console.log('No se encontró un archivo .env existente. Se creará uno nuevo.');
}

rl.question('Notion API Key (de tu integración de Notion): ', (apiKey) => {
  if (!apiKey.trim()) {
    console.log('\x1b[31m%s\x1b[0m', 'Error: Debes proporcionar un API Key válido.');
    rl.close();
    return;
  }

  rl.question('Notion Database ID (ejemplo: 1f7385297f9a80a3bc5bcec8a3c2debb): ', (databaseId) => {
    if (!databaseId.trim()) {
      console.log('\x1b[31m%s\x1b[0m', 'Error: Debes proporcionar un Database ID válido.');
      rl.close();
      return;
    }

    // Para un database ID limpio, eliminar guiones si están presentes
    const cleanDatabaseId = databaseId.replace(/-/g, '');

    // Verificar si las variables ya existen en el archivo .env
    const notionKeyExists = existingEnv.includes('NOTION_API_KEY=');
    const notionDbExists = existingEnv.includes('NOTION_DATABASE_ID=');

    let newEnv = existingEnv;

    // Actualizar o añadir NOTION_API_KEY
    if (notionKeyExists) {
      newEnv = newEnv.replace(/NOTION_API_KEY=.*(\r?\n|$)/, `NOTION_API_KEY=${apiKey}$1`);
    } else {
      newEnv += `\n# Notion API\nNOTION_API_KEY=${apiKey}\n`;
    }

    // Actualizar o añadir NOTION_DATABASE_ID
    if (notionDbExists) {
      newEnv = newEnv.replace(/NOTION_DATABASE_ID=.*(\r?\n|$)/, `NOTION_DATABASE_ID=${cleanDatabaseId}$1`);
    } else if (!notionKeyExists) { // Si ya añadimos la sección "# Notion API" antes
      newEnv += `NOTION_DATABASE_ID=${cleanDatabaseId}\n`;
    } else {
      newEnv += `\nNOTION_DATABASE_ID=${cleanDatabaseId}\n`;
    }

    // Guardar el archivo .env actualizado
    try {
      fs.writeFileSync(envPath, newEnv);
      console.log('\x1b[32m%s\x1b[0m', '\n✅ Archivo .env actualizado correctamente con las variables de Notion.');
      console.log('\nPara verificar la configuración, ejecuta:');
      console.log('  node check-notion-setup.js');
      console.log('\nSi todo está correcto, inicia el servidor con:');
      console.log('  node start-server.js');
    } catch (err) {
      console.error('\x1b[31m%s\x1b[0m', '\n❌ Error al guardar el archivo .env:');
      console.error(err);
    }

    rl.close();
  });
}); 