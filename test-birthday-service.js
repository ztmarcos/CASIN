#!/usr/bin/env node

/**
 * Test Script for Birthday Service
 * Simula el envío de emails de cumpleaños como si fuera hoy
 * Para: ztmarcos@gmail.com
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';

// Datos de prueba para ztmarcos@gmail.com
const TEST_BIRTHDAY_PERSON = {
  id: 'test-ztmarcos',
  name: 'Marcos Zavala',
  email: 'ztmarcos@gmail.com',
  date: new Date().toISOString(), // Simula que es hoy
  age: 30,
  details: 'Cliente CASIN Seguros - Test',
  source: 'test',
  birthdaySource: 'test'
};

// Función para enviar email de cumpleaños usando Gmail
async function sendBirthdayEmailWithGmail(birthdayPerson, message = '') {
  try {
    console.log('🎂 Enviando email de cumpleaños a:', birthdayPerson.email);
    
    const response = await fetch(`${API_URL}/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: birthdayPerson.email,
        subject: `¡Feliz Cumpleaños ${birthdayPerson.name}! 🎉`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c; text-align: center;">🎂 ¡Feliz Cumpleaños! 🎂</h2>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; color: white; text-align: center;">
              <h3 style="margin: 0; font-size: 24px;">${birthdayPerson.name}</h3>
              <p style="font-size: 18px; margin: 20px 0;">¡Que tengas un día maravilloso lleno de alegría y éxito!</p>
              ${message ? `<p style="font-style: italic; margin: 20px 0;">"${message}"</p>` : ''}
              <div style="margin: 30px 0;">
                <span style="font-size: 40px;">🎉 🎈 🎁</span>
              </div>
              <p style="font-size: 16px; margin: 0;">Con cariño,<br><strong>Equipo CASIN Seguros</strong></p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #7f8c8d;">
              <p>Este mensaje fue enviado automáticamente por el sistema de CASIN Seguros</p>
              <p><small>Detalles: ${birthdayPerson.details || 'Cliente CASIN'}</small></p>
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
    console.log('✅ Email de cumpleaños enviado exitosamente:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error enviando email de cumpleaños:', error);
    throw error;
  }
}

// Función para simular el proceso completo de birthday service
async function testBirthdayService() {
  console.log('🎂 ========================================');
  console.log('🎂 TEST BIRTHDAY SERVICE - CASIN SEGUROS');
  console.log('🎂 ========================================');
  console.log('📧 Destinatario: ztmarcos@gmail.com');
  console.log('📅 Simulando envío como si fuera hoy');
  console.log('🔧 Usando credenciales Gmail: casinseguros@gmail.com');
  console.log('');

  try {
    // 1. Verificar que el servidor esté funcionando
    console.log('🔍 Verificando conexión con el servidor...');
    const healthResponse = await fetch(`${API_URL}/health`);
    if (!healthResponse.ok) {
      throw new Error('Servidor no disponible');
    }
    console.log('✅ Servidor funcionando correctamente');

    // 2. Simular envío de email de cumpleaños
    console.log('');
    console.log('📧 Iniciando envío de email de cumpleaños...');
    
    const message = '¡Esperamos que tengas un día increíble lleno de alegría y éxito! 🎉';
    const result = await sendBirthdayEmailWithGmail(TEST_BIRTHDAY_PERSON, message);
    
    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 ¡TEST COMPLETADO EXITOSAMENTE!');
    console.log('🎉 ========================================');
    console.log('📧 Email enviado a: ztmarcos@gmail.com');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Remitente: casinseguros@gmail.com');
    console.log('📧 Asunto: ¡Feliz Cumpleaños Marcos Zavala! 🎉');
    console.log('📅 Fecha de envío:', new Date().toLocaleString('es-MX'));
    console.log('');

    // 3. Mostrar detalles del email enviado
    console.log('📋 Detalles del email:');
    console.log('   - Nombre: Marcos Zavala');
    console.log('   - Email: ztmarcos@gmail.com');
    console.log('   - Mensaje personalizado incluido');
    console.log('   - Diseño con gradientes y emojis');
    console.log('   - Información de CASIN Seguros');
    console.log('   - Timestamp de envío');

  } catch (error) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ ERROR EN EL TEST');
    console.error('❌ ========================================');
    console.error('Error:', error.message);
    console.error('');
    console.error('🔧 Posibles soluciones:');
    console.error('   1. Verificar que el servidor esté corriendo en puerto 3001');
    console.error('   2. Verificar las credenciales de Gmail');
    console.error('   3. Verificar la conexión a internet');
    console.error('   4. Revisar los logs del servidor');
    process.exit(1);
  }
}

// Función para probar múltiples emails
async function testMultipleBirthdayEmails() {
  console.log('🎂 ========================================');
  console.log('🎂 TEST MÚLTIPLES EMAILS DE CUMPLEAÑOS');
  console.log('🎂 ========================================');

  const testBirthdays = [
    {
      name: 'Marcos Zavala',
      email: 'ztmarcos@gmail.com',
      message: '¡Feliz cumpleaños Marcos! Que tengas un día increíble 🎉'
    },
    {
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      message: '¡Que la pases súper bien en tu día especial! 🎂'
    }
  ];

  const results = [];
  const errors = [];

  for (const birthday of testBirthdays) {
    try {
      console.log(`📧 Enviando email a: ${birthday.email}`);
      const result = await sendBirthdayEmailWithGmail({
        ...TEST_BIRTHDAY_PERSON,
        name: birthday.name,
        email: birthday.email
      }, birthday.message);
      
      results.push({
        name: birthday.name,
        email: birthday.email,
        success: true,
        messageId: result.messageId
      });
      
      console.log(`✅ Email enviado exitosamente a ${birthday.name}`);
    } catch (error) {
      errors.push({
        name: birthday.name,
        email: birthday.email,
        error: error.message
      });
      console.log(`❌ Error enviando email a ${birthday.name}: ${error.message}`);
    }
  }

  console.log('');
  console.log('📊 ========================================');
  console.log('📊 RESUMEN DEL TEST');
  console.log('📊 ========================================');
  console.log(`✅ Emails enviados exitosamente: ${results.length}`);
  console.log(`❌ Errores: ${errors.length}`);
  console.log(`📧 Total de intentos: ${testBirthdays.length}`);
  
  if (results.length > 0) {
    console.log('');
    console.log('✅ Emails exitosos:');
    results.forEach(r => {
      console.log(`   - ${r.name} (${r.email}): ${r.messageId}`);
    });
  }
  
  if (errors.length > 0) {
    console.log('');
    console.log('❌ Errores:');
    errors.forEach(e => {
      console.log(`   - ${e.name} (${e.email}): ${e.error}`);
    });
  }
}

// Ejecutar el test
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--multiple')) {
    await testMultipleBirthdayEmails();
  } else {
    await testBirthdayService();
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testBirthdayService, testMultipleBirthdayEmails, sendBirthdayEmailWithGmail };
