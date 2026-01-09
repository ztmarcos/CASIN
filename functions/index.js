const {onRequest} = require('firebase-functions/v2/https');
// const {onSchedule} = require('firebase-functions/v2/scheduler'); // Commented out for now
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

// Initialize Firebase Admin
admin.initializeApp();

// SMTP Configuration
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'casinseguros@gmail.com',
    pass: 'espajcgariyhsboq' // App password
  }
};

/**
 * Test Function - Send test email
 * HTTP Trigger: https://us-central1-casinbbdd.cloudfunctions.net/testEmail
 */
exports.testEmail = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('📧 Test Email Function triggered');
    
    // Create transporter
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    
    // Email content
    const mailOptions = {
      from: {
        name: 'CASIN Seguros - Test',
        address: 'casinseguros@gmail.com'
      },
      to: 'ztmarcos@gmail.com',
      subject: '🧪 Test Email from Firebase Cloud Functions',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f5f7fa; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🧪 Test Email</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Firebase Cloud Functions</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a202c; margin: 0 0 20px 0;">✅ ¡Funciona Correctamente!</h2>
              
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 15px 0;">
                Este es un email de prueba enviado desde <strong>Firebase Cloud Functions</strong>.
              </p>
              
              <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #2d3748; font-size: 14px;">
                  <strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX', { 
                    timeZone: 'America/Mexico_City',
                    dateStyle: 'full',
                    timeStyle: 'long'
                  })}
                </p>
                <p style="margin: 10px 0 0 0; color: #2d3748; font-size: 14px;">
                  <strong>🌐 Proyecto:</strong> CASIN CRM
                </p>
                <p style="margin: 10px 0 0 0; color: #2d3748; font-size: 14px;">
                  <strong>🔧 Función:</strong> testEmail
                </p>
              </div>
              
              <div style="background-color: #edf2f7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2d3748; margin: 0 0 10px 0; font-size: 18px;">🎯 Próximos Pasos</h3>
                <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Configurar función de cumpleaños automática</li>
                  <li style="margin-bottom: 8px;">Configurar función de resumen semanal</li>
                  <li style="margin-bottom: 8px;">Programar ejecuciones con Cloud Scheduler</li>
                </ul>
              </div>
              
              <p style="color: #718096; font-size: 14px; margin: 20px 0 0 0; font-style: italic;">
                Si recibes este email, significa que Firebase Cloud Functions está configurado correctamente y puede enviar correos. 🎉
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; margin: 0; font-size: 12px;">
                CASIN Seguros CRM - Firebase Cloud Functions
              </p>
              <p style="color: #a0aec0; margin: 5px 0 0 0; font-size: 11px;">
                Powered by Firebase & Google Cloud
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `
    };
    
    // Send email
    console.log('📤 Sending test email to ztmarcos@gmail.com...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully:', info.messageId);
    
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Scheduled functions commented out temporarily until APIs are enabled
// Will be enabled after initial deployment

/*
exports.scheduledBirthdayEmails = onSchedule({
  schedule: '0 9 * * *',
  timeZone: 'America/Mexico_City',
  region: 'us-central1'
}, async (event) => {
  console.log('🎂 Scheduled Birthday Emails Function triggered');
  try {
    console.log('✅ Birthday emails processed');
    return null;
  } catch (error) {
    console.error('❌ Error processing birthday emails:', error);
    throw error;
  }
});

exports.scheduledWeeklyResumen = onSchedule({
  schedule: '0 17 * * 5',
  timeZone: 'America/Mexico_City',
  region: 'us-central1'
}, async (event) => {
  console.log('📊 Scheduled Weekly Resumen Function triggered');
  try {
    console.log('✅ Weekly resumen processed');
    return null;
  } catch (error) {
    console.error('❌ Error processing weekly resumen:', error);
    throw error;
  }
});
*/
