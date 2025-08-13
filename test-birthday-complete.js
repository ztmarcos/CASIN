#!/usr/bin/env node

/**
 * Test Completo para Birthday Service - CASIN Seguros
 * Prueba todas las funcionalidades del sistema de cumpleaños
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para enviar email de cumpleaños
async function sendBirthdayEmail(birthdayPerson, message = '') {
  try {
    log(`🎂 Enviando email de cumpleaños a: ${birthdayPerson.email}`, 'cyan');
    
    const response = await fetch(`${API_URL}/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: birthdayPerson.email,
        subject: `¡Feliz Cumpleaños ${birthdayPerson.nombre || birthdayPerson.name}! 🎉`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c; text-align: center;">🎂 ¡Feliz Cumpleaños! 🎂</h2>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; color: white; text-align: center;">
              <h3 style="margin: 0; font-size: 24px;">${birthdayPerson.nombre || birthdayPerson.name}</h3>
              <p style="font-size: 18px; margin: 20px 0;">¡Que tengas un día maravilloso lleno de alegría y éxito!</p>
              ${message ? `<p style="font-style: italic; margin: 20px 0;">"${message}"</p>` : ''}
              <div style="margin: 30px 0;">
                <span style="font-size: 40px;">🎉 🎈 🎁</span>
              </div>
              <p style="font-size: 16px; margin: 0;">Con cariño,<br><strong>Equipo CASIN Seguros</strong></p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #7f8c8d;">
              <p>Este mensaje fue enviado automáticamente por el sistema de CASIN Seguros</p>
              <p><small>Fecha de envío: ${new Date().toLocaleString('es-MX')}</small></p>
            </div>
          </div>
        `,
        from: 'casinseguros@gmail.com',
        fromPass: 'espajcgariyhsboq',
        fromName: 'CASIN Seguros - Felicitaciones'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send birthday email');
    }

    const result = await response.json();
    log(`✅ Email enviado exitosamente: ${result.messageId}`, 'green');
    return result;
  } catch (error) {
    log(`❌ Error enviando email: ${error.message}`, 'red');
    throw error;
  }
}

// Test 1: Verificar servidor
async function testServerHealth() {
  log('\n🔍 ========================================', 'blue');
  log('🔍 TEST 1: VERIFICACIÓN DEL SERVIDOR', 'blue');
  log('🔍 ========================================', 'blue');
  
  try {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      throw new Error('Servidor no disponible');
    }
    
    const health = await response.json();
    log('✅ Servidor funcionando correctamente', 'green');
    log(`📊 Estado: ${health.status}`, 'cyan');
    log(`🔧 Entorno: ${health.environment}`, 'cyan');
    log(`📅 Timestamp: ${health.timestamp}`, 'cyan');
    
    return true;
  } catch (error) {
    log(`❌ Error de servidor: ${error.message}`, 'red');
    return false;
  }
}

// Test 2: Email simple
async function testSimpleEmail() {
  log('\n📧 ========================================', 'blue');
  log('📧 TEST 2: EMAIL SIMPLE', 'blue');
  log('📧 ========================================', 'blue');
  
  const testPerson = {
    nombre: 'Marcos Zavala',
    email: 'ztmarcos@gmail.com'
  };
  
  const message = '¡Que tengas un día increíble! 🎉';
  
  try {
    const result = await sendBirthdayEmail(testPerson, message);
    log('✅ Test de email simple exitoso', 'green');
    return { success: true, messageId: result.messageId };
  } catch (error) {
    log('❌ Test de email simple falló', 'red');
    return { success: false, error: error.message };
  }
}

// Test 3: Datos de Firebase
async function testFirebaseData() {
  log('\n🔥 ========================================', 'blue');
  log('🔥 TEST 3: DATOS DE FIREBASE', 'blue');
  log('🔥 ========================================', 'blue');
  
  try {
    const response = await fetch(`${API_URL}/birthday`);
    if (!response.ok) {
      throw new Error('No se pudieron obtener los cumpleaños');
    }
    
    const birthdays = await response.json();
    log(`📊 Total de cumpleaños en Firebase: ${birthdays.length}`, 'cyan');
    
    // Filtrar cumpleaños de hoy
    const today = new Date();
    const todaysBirthdays = birthdays.filter(birthday => {
      const birthdayDate = new Date(birthday.date);
      return birthdayDate.getMonth() === today.getMonth() && 
             birthdayDate.getDate() === today.getDate();
    });
    
    log(`🎂 Cumpleaños de hoy: ${todaysBirthdays.length}`, 'yellow');
    
    if (todaysBirthdays.length > 0) {
      log('📧 Enviando emails a cumpleañeros de hoy...', 'cyan');
      
      const results = [];
      for (const birthday of todaysBirthdays) {
        if (birthday.email) {
          try {
            const result = await sendBirthdayEmail(birthday, '¡Feliz cumpleaños! 🎂');
            results.push({ success: true, name: birthday.name, email: birthday.email, messageId: result.messageId });
          } catch (error) {
            results.push({ success: false, name: birthday.name, email: birthday.email, error: error.message });
          }
        } else {
          log(`⚠️ ${birthday.name} no tiene email configurado`, 'yellow');
        }
      }
      
      return { success: true, results, total: todaysBirthdays.length };
    } else {
      log('📅 No hay cumpleaños hoy, enviando email de prueba...', 'yellow');
      const testPerson = {
        nombre: 'Marcos Zavala (Test Firebase)',
        email: 'ztmarcos@gmail.com'
      };
      const result = await sendBirthdayEmail(testPerson, 'Este es un email de prueba del sistema de cumpleaños con Firebase 🎂');
      return { success: true, testEmail: result.messageId };
    }
    
  } catch (error) {
    log(`❌ Error con datos de Firebase: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Test 4: Múltiples emails
async function testMultipleEmails() {
  log('\n📨 ========================================', 'blue');
  log('📨 TEST 4: MÚLTIPLES EMAILS', 'blue');
  log('📨 ========================================', 'blue');
  
  const testEmails = [
    {
      nombre: 'Marcos Zavala',
      email: 'ztmarcos@gmail.com',
      message: '¡Feliz cumpleaños Marcos! Que tengas un día increíble 🎉'
    },
    {
      nombre: 'Juan Pérez',
      email: 'juan.perez@example.com',
      message: '¡Que la pases súper bien en tu día especial! 🎂'
    }
  ];
  
  const results = [];
  
  for (const email of testEmails) {
    try {
      const result = await sendBirthdayEmail(email, email.message);
      results.push({ success: true, name: email.nombre, email: email.email, messageId: result.messageId });
    } catch (error) {
      results.push({ success: false, name: email.nombre, email: email.email, error: error.message });
    }
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log(`📊 Resultados: ${successful} exitosos, ${failed} fallidos`, 'cyan');
  
  return { success: true, results, successful, failed };
}

// Función principal
async function runCompleteTest() {
  log('🎂 ========================================', 'magenta');
  log('🎂 TEST COMPLETO BIRTHDAY SERVICE', 'magenta');
  log('🎂 CASIN SEGUROS', 'magenta');
  log('🎂 ========================================', 'magenta');
  log(`📅 Fecha: ${new Date().toLocaleString('es-MX')}`, 'cyan');
  log(`📧 Remitente: casinseguros@gmail.com`, 'cyan');
  log(`🎯 Destinatario: ztmarcos@gmail.com`, 'cyan');
  
  const results = {
    server: false,
    simpleEmail: null,
    firebase: null,
    multiple: null
  };
  
  // Test 1: Servidor
  results.server = await testServerHealth();
  
  if (!results.server) {
    log('\n❌ El servidor no está disponible. Deteniendo tests.', 'red');
    return results;
  }
  
  // Test 2: Email simple
  results.simpleEmail = await testSimpleEmail();
  
  // Test 3: Firebase
  results.firebase = await testFirebaseData();
  
  // Test 4: Múltiples emails
  results.multiple = await testMultipleEmails();
  
  // Resumen final
  log('\n📊 ========================================', 'magenta');
  log('📊 RESUMEN FINAL DE TESTS', 'magenta');
  log('📊 ========================================', 'magenta');
  
  log(`🔍 Servidor: ${results.server ? '✅ Funcionando' : '❌ Error'}`, results.server ? 'green' : 'red');
  log(`📧 Email Simple: ${results.simpleEmail?.success ? '✅ Exitoso' : '❌ Falló'}`, results.simpleEmail?.success ? 'green' : 'red');
  log(`🔥 Firebase: ${results.firebase?.success ? '✅ Exitoso' : '❌ Falló'}`, results.firebase?.success ? 'green' : 'red');
  log(`📨 Múltiples: ${results.multiple?.success ? '✅ Exitoso' : '❌ Falló'}`, results.multiple?.success ? 'green' : 'red');
  
  const totalEmails = [
    results.simpleEmail?.success ? 1 : 0,
    results.firebase?.testEmail ? 1 : (results.firebase?.results?.filter(r => r.success).length || 0),
    results.multiple?.successful || 0
  ].reduce((a, b) => a + b, 0);
  
  log(`📧 Total de emails enviados: ${totalEmails}`, 'cyan');
  
  log('\n🎉 ========================================', 'green');
  log('🎉 ¡TEST COMPLETO FINALIZADO!', 'green');
  log('🎉 ========================================', 'green');
  
  return results;
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  runCompleteTest().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { runCompleteTest, sendBirthdayEmail };
