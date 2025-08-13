#!/usr/bin/env node

/**
 * Test Simple - Email de Cumpleaños para Marcos
 * Envía un email de prueba a marcoszavala09@gmail.com
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';

// Función para enviar email de cumpleaños
async function sendBirthdayEmail() {
  try {
    console.log('🎂 ========================================');
    console.log('🎂 EMAIL DE PRUEBA PARA MARCOS');
    console.log('🎂 ========================================');
    console.log('📧 Destinatario: marcoszavala09@gmail.com');
    console.log('📧 Remitente: casinseguros@gmail.com');
    console.log('');
    
    const response = await fetch(`${API_URL}/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'marcoszavala09@gmail.com',
        subject: '¡Feliz Cumpleaños Marcos! 🎉',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #e74c3c; text-align: center;">🎂 ¡Feliz Cumpleaños! 🎂</h2>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; color: white; text-align: center;">
              <h3 style="margin: 0; font-size: 24px;">Marcos Zavala</h3>
              <p style="font-size: 18px; margin: 20px 0;">¡Que tengas un día maravilloso lleno de alegría y éxito!</p>
              <p style="font-style: italic; margin: 20px 0;">"¡Esperamos que tengas un día increíble lleno de alegría y éxito! 🎉"</p>
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
    
    console.log('✅ Email enviado exitosamente!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Remitente: casinseguros@gmail.com');
    console.log('📧 Destinatario: marcoszavala09@gmail.com');
    console.log('📧 Asunto: ¡Feliz Cumpleaños Marcos! 🎉');
    console.log('📅 Fecha de envío:', new Date().toLocaleString('es-MX'));
    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 ¡EMAIL ENVIADO EXITOSAMENTE!');
    console.log('🎉 ========================================');
    
    return result;
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    throw error;
  }
}

// Ejecutar el test
if (require.main === module) {
  sendBirthdayEmail().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
}

module.exports = { sendBirthdayEmail };
