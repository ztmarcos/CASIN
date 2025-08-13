#!/usr/bin/env node

/**
 * Test Script Simple para Birthday Service
 * Usa las funciones del frontend directamente
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';

// Simular las funciones del birthday service
async function sendBirthdayEmail(birthdayPerson, message = '') {
  try {
    console.log('🎂 Enviando email de cumpleaños a:', birthdayPerson.email);
    
    const response = await fetch(`${API_URL}/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: birthdayPerson.email,
        subject: `¡Feliz Cumpleaños ${birthdayPerson.nombre}! 🎉`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c; text-align: center;">🎂 ¡Feliz Cumpleaños! 🎂</h2>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; color: white; text-align: center;">
              <h3 style="margin: 0; font-size: 24px;">${birthdayPerson.nombre}</h3>
              <p style="font-size: 18px; margin: 20px 0;">¡Que tengas un día maravilloso lleno de alegría y éxito!</p>
              ${message ? `<p style="font-style: italic; margin: 20px 0;">"${message}"</p>` : ''}
              <div style="margin: 30px 0;">
                <span style="font-size: 40px;">🎉 🎈 🎁</span>
              </div>
              <p style="font-size: 16px; margin: 0;">Con cariño,<br><strong>Equipo CASIN Seguros</strong></p>
            </div>
            <div style="text-align: center; margin-top: 20px; color: #7f8c8d;">
              <p>Este mensaje fue enviado automáticamente por el sistema de CASIN Seguros</p>
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

// Test simple
async function testSimple() {
  console.log('🎂 ========================================');
  console.log('🎂 TEST SIMPLE BIRTHDAY SERVICE');
  console.log('🎂 ========================================');
  
  const testPerson = {
    nombre: 'Marcos Zavala',
    email: 'ztmarcos@gmail.com'
  };
  
  const message = '¡Que tengas un día increíble! 🎉';
  
  try {
    const result = await sendBirthdayEmail(testPerson, message);
    console.log('🎉 ¡Test exitoso!');
    console.log('📧 Message ID:', result.messageId);
  } catch (error) {
    console.error('❌ Test falló:', error.message);
  }
}

// Test con datos reales de Firebase
async function testWithFirebaseData() {
  console.log('🎂 ========================================');
  console.log('🎂 TEST CON DATOS DE FIREBASE');
  console.log('🎂 ========================================');
  
  try {
    // Obtener cumpleaños de hoy desde Firebase
    const response = await fetch(`${API_URL}/birthday`);
    if (!response.ok) {
      throw new Error('No se pudieron obtener los cumpleaños');
    }
    
    const birthdays = await response.json();
    console.log(`📊 Se encontraron ${birthdays.length} cumpleaños en total`);
    
    // Filtrar cumpleaños de hoy
    const today = new Date();
    const todaysBirthdays = birthdays.filter(birthday => {
      const birthdayDate = new Date(birthday.date);
      return birthdayDate.getMonth() === today.getMonth() && 
             birthdayDate.getDate() === today.getDate();
    });
    
    console.log(`🎂 Cumpleaños de hoy: ${todaysBirthdays.length}`);
    
    if (todaysBirthdays.length > 0) {
      console.log('📧 Enviando emails a cumpleañeros de hoy...');
      
      for (const birthday of todaysBirthdays) {
        if (birthday.email) {
          try {
            const result = await sendBirthdayEmail(birthday, '¡Feliz cumpleaños! 🎂');
            console.log(`✅ Email enviado a ${birthday.name} (${birthday.email})`);
          } catch (error) {
            console.log(`❌ Error enviando email a ${birthday.name}: ${error.message}`);
          }
        } else {
          console.log(`⚠️ ${birthday.name} no tiene email configurado`);
        }
      }
    } else {
      console.log('📅 No hay cumpleaños hoy, enviando email de prueba...');
      const testPerson = {
        nombre: 'Marcos Zavala (Test)',
        email: 'ztmarcos@gmail.com'
      };
      await sendBirthdayEmail(testPerson, 'Este es un email de prueba del sistema de cumpleaños 🎂');
    }
    
  } catch (error) {
    console.error('❌ Error en test con Firebase:', error.message);
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--firebase')) {
    await testWithFirebaseData();
  } else {
    await testSimple();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSimple, testWithFirebaseData, sendBirthdayEmail };
