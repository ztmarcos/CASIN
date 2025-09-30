const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testEmailSending() {
  console.log('🧪 Testing email sending to ztmarcos@gmail.com');
  console.log('🌐 API URL:', API_URL);
  
  try {
    const testData = {
      to: 'ztmarcos@gmail.com',
      subject: '🧪 Test Email - CASIN Seguros System',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
          <h2 style="color: #2c3e50; text-align: center;">🧪 Test Email - CASIN Seguros</h2>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; color: white; text-align: center;">
            <h3 style="margin: 0; font-size: 24px;">Test de Sistema de Correos</h3>
            <p style="font-size: 18px; margin: 20px 0;">Este es un correo de prueba para verificar el funcionamiento del sistema de envío de correos de CASIN Seguros.</p>
            
            <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h4 style="margin: 0 0 15px 0;">📋 Detalles del Test:</h4>
              <ul style="text-align: left; margin: 0; padding-left: 20px;">
                <li>✅ Sistema de correos funcionando</li>
                <li>✅ Envío a destinatario específico</li>
                <li>✅ Formato HTML correcto</li>
                <li>✅ Configuración SMTP activa</li>
              </ul>
            </div>
            
            <div style="margin: 30px 0;">
              <span style="font-size: 40px;">📧 ✅ 🎉</span>
            </div>
            
            <p style="font-size: 16px; margin: 0;">Con cariño,<br><strong>Equipo CASIN Seguros</strong></p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #7f8c8d;">
            <p>Este mensaje fue enviado automáticamente por el sistema de CASIN Seguros</p>
            <p><small>Fecha de envío: ${new Date().toLocaleString('es-MX')}</small></p>
            <p><small>Test ID: ${Date.now()}</small></p>
          </div>
        </div>
      `,
      from: 'lorenacasin5@gmail.com',
      fromName: 'Lorena CASIN - Test System',
      fromPass: 'yxeyswjxsicwgoow',
      sendBccToSender: true,
      cc: '',
      clientData: {
        nombre_contratante: 'Marcos Zavala',
        numero_poliza: 'TEST-001',
        email: 'ztmarcos@gmail.com'
      }
    };

    console.log('📤 Sending test email...');
    console.log('📧 To:', testData.to);
    console.log('📧 From:', testData.from);
    console.log('📧 Subject:', testData.subject);
    console.log('📧 BCC to sender:', testData.sendBccToSender);

    const response = await fetch(`${API_URL}/api/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server error response:', errorText);
      throw new Error(`Error del servidor (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Email sent successfully!');
    console.log('📧 Response:', result);

    if (result.success) {
      console.log('🎉 Test email sent successfully to ztmarcos@gmail.com');
      console.log('📧 Message ID:', result.messageId);
      if (result.bccSent) {
        console.log('📧 BCC sent to:', result.bccSent);
      }
    } else {
      throw new Error(result.error || 'Unknown error');
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Additional debugging
    console.log('\n🔍 Debugging information:');
    console.log('🌐 API_URL:', API_URL);
    console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
    console.log('📧 SMTP_HOST:', process.env.SMTP_HOST);
    console.log('📧 SMTP_USER_CASIN:', process.env.SMTP_USER_CASIN ? 'SET' : 'NOT SET');
    console.log('📧 SMTP_PASS_CASIN:', process.env.SMTP_PASS_CASIN ? 'SET' : 'NOT SET');
    
    throw error;
  }
}

// Run the test
testEmailSending()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
