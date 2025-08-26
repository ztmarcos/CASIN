const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

console.log('🔧 Variables de entorno cargadas');
console.log('- FIREBASE_PRIVATE_KEY presente:', !!process.env.FIREBASE_PRIVATE_KEY);
console.log('- VITE_FIREBASE_PROJECT_ID:', process.env.VITE_FIREBASE_PROJECT_ID);

// Configuración de Firebase Admin
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.VITE_FIREBASE_PROJECT_ID || 'casinbbdd',
  private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  client_email: `firebase-adminsdk-hnwk0@${process.env.VITE_FIREBASE_PROJECT_ID || 'casinbbdd'}.iam.gserviceaccount.com`,
};

// No inicializar Firebase Admin, solo generar las reglas

// Reglas de seguridad para producción
const PRODUCTION_FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Función para verificar si el usuario está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Función para verificar si el usuario es admin CASIN
    function isCASINAdmin() {
      return isAuthenticated() && 
             request.auth.token.email in [
               'z.t.marcos@gmail.com', 
               'ztmarcos@gmail.com', 
               'marcos@casin.com',
               '2012solitario@gmail.com',
               'marcoszavala09@gmail.com',
               'lorenacasin5@gmail.com'
             ];
    }
    
    // Función para verificar si el usuario pertenece a un equipo
    function isTeamMember(teamId) {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/team_members/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/team_members/$(request.auth.uid)).data.teamId == teamId;
    }
    
    // Colecciones globales - Solo administradores CASIN
    match /{collection}/{document} {
      allow read, write: if isCASINAdmin() && 
                           collection in [
                             'autos', 
                             'directorio_contactos', 
                             'vida', 
                             'gmm', 
                             'rc', 
                             'transporte', 
                             'mascotas', 
                             'diversos', 
                             'negocio', 
                             'gruposgmm'
                           ];
    }
    
    // Metadatos de tablas - Solo administradores CASIN
    match /table_metadata/{document} {
      allow read, write: if isCASINAdmin();
    }
    
    // Equipos - Solo administradores CASIN pueden crear/modificar
    match /teams/{teamId} {
      allow read, write: if isCASINAdmin();
      allow read: if isTeamMember(teamId);
    }
    
    // Miembros de equipos
    match /team_members/{memberId} {
      allow read, write: if isCASINAdmin();
      allow read: if isAuthenticated() && request.auth.uid == memberId;
    }
    
    // Datos de equipos con prefijo team_
    match /team_{teamId}_{collection}/{document} {
      allow read, write: if isCASINAdmin() || isTeamMember(teamId);
    }
    
    // Configuraciones específicas por equipo
    match /team_configs/{teamId} {
      allow read, write: if isCASINAdmin() || isTeamMember(teamId);
    }
    
    // Tareas y notificaciones por equipo
    match /team_tasks/{taskId} {
      allow read, write: if isAuthenticated(); // Las tareas pueden ser accedidas por usuarios autenticados
    }
    
    // Reportes y analytics - Solo admins
    match /analytics/{document} {
      allow read, write: if isCASINAdmin();
    }
    
    // Logs del sistema - Solo admins
    match /system_logs/{document} {
      allow read, write: if isCASINAdmin();
    }
    
    // Configuración general - Solo admins
    match /app_config/{document} {
      allow read: if isAuthenticated();
      allow write: if isCASINAdmin();
    }
    
    // Bloquear cualquier otra ruta no especificada
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

async function updateFirestoreRules() {
  try {
    console.log('🔒 Configurando reglas de seguridad de Firestore para producción...');
    
    // Guardar las reglas en un archivo
    fs.writeFileSync('firestore.rules', PRODUCTION_FIRESTORE_RULES);
    console.log('✅ Reglas guardadas en firestore.rules');
    
    console.log('📋 REGLAS DE SEGURIDAD PARA FIREBASE FIRESTORE:');
    console.log('='.repeat(60));
    console.log(PRODUCTION_FIRESTORE_RULES);
    console.log('='.repeat(60));
    
    console.log('\n🚀 PRÓXIMOS PASOS PARA APLICAR LAS REGLAS:');
    console.log('1. Instalar Firebase CLI: npm install -g firebase-tools');
    console.log('2. Hacer login: firebase login');
    console.log('3. Inicializar proyecto: firebase init firestore');
    console.log('4. Reemplazar contenido de firestore.rules con las reglas generadas');
    console.log('5. Desplegar reglas: firebase deploy --only firestore:rules');
    
    console.log('\n📧 USUARIOS ADMINISTRADORES CONFIGURADOS:');
    console.log('- z.t.marcos@gmail.com');
    console.log('- ztmarcos@gmail.com');
    console.log('- marcos@casin.com');
    console.log('- 2012solitario@gmail.com');
    console.log('- marcoszavala09@gmail.com');
    
    console.log('\n🔐 CONFIGURACIÓN DE SEGURIDAD:');
    console.log('✅ Usuarios deben estar autenticados');
    console.log('✅ Solo admins CASIN acceden a colecciones globales');
    console.log('✅ Equipos tienen acceso solo a sus datos');
    console.log('✅ Separación de datos por prefijo team_');
    console.log('✅ Bloqueo de acceso no autorizado');
    
  } catch (error) {
    console.error('❌ Error configurando reglas:', error);
  }
}

// Ejecutar la función
updateFirestoreRules(); 