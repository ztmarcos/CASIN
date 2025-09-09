// Script para probar la funcionalidad de BCC
const API_URL = 'https://sis-casin-216c74c28e12.herokuapp.com/api';

async function testBCCFunctionality() {
  console.log('🧪 Probando funcionalidad de BCC...');
  console.log('🌐 API URL:', API_URL);
  
  // Datos de prueba con BCC activado
  const testData = {
    to: 'ztmarcos@gmail.com',
    subject: '🧪 Prueba de BCC - CASIN CRM',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <h2>🧪 Prueba de Funcionalidad BCC</h2>
        
        <p><strong>Hola Marcos,</strong></p>
        
        <p>Este es un correo de prueba para verificar que la funcionalidad de <strong>BCC (copia oculta)</strong> está funcionando correctamente.</p>
        
        <p><strong>Detalles del envío:</strong></p>
        <ul>
          <li>📧 Destinatario: ztmarcos@gmail.com</li>
          <li>📧 Remitente: casinseguros@gmail.com</li>
          <li>📧 BCC: casinseguros@gmail.com (copia oculta al remitente)</li>
          <li>📅 Fecha: ${new Date().toLocaleString('es-MX')}</li>
          <li>🕐 Hora: ${new Date().toLocaleTimeString('es-MX')}</li>
          <li>🌐 Sistema: CASIN CRM - Producción</li>
          <li>🚀 Servidor: Heroku</li>
          <li>✅ BCC: Activado</li>
        </ul>
        
        <p>Si recibes este correo, significa que el sistema está funcionando correctamente.</p>
        <p><strong>El remitente también debería recibir una copia oculta (BCC) de este correo.</strong></p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666; font-style: italic;">
          <strong>NOTA:</strong> Este es un correo de prueba automático del sistema CASIN CRM para verificar la funcionalidad de BCC.
        </p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros - Sistema CRM</strong></p>
      </div>
    `,
    from: 'casinseguros@gmail.com',
    fromName: 'CASIN Seguros',
    fromPass: 'espajcgariyhsboq',
    sendBccToSender: true, // BCC activado
    cc: '',
    // Datos de prueba simulando una póliza
    nombre_contratante: 'Marco Zavala',
    numero_poliza: 'BCC-TEST-2024-001',
    aseguradora: 'Grupo Nacional Provincial S.A.B',
    pago_total_o_prima_total: '15,000',
    vigencia_inicio: '2024-01-01',
    vigencia_fin: '2024-12-31'
  };

  try {
    console.log('📤 Enviando correo con BCC activado...');
    console.log('📧 Remitente:', testData.from);
    console.log('📧 Destinatario:', testData.to);
    console.log('📧 BCC activado:', testData.sendBccToSender);
    
    const response = await fetch(`${API_URL}/email/send-welcome`, {
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
    console.log('📧 Server response:', result);

    if (result.success) {
      console.log('\n🎉 ¡PRUEBA DE BCC EXITOSA!');
      console.log('✅ El correo se envió correctamente');
      console.log('📧 Message ID:', result.messageId);
      console.log('📧 Recipient:', result.recipient);
      console.log('📧 Subject:', result.subject);
      
      if (result.bccSent) {
        console.log('✅ BCC enviado correctamente a:', result.bccSent);
        console.log('📧 El remitente debería recibir una copia oculta del correo');
      } else {
        console.log('⚠️ BCC no se envió - verificar configuración');
      }
      
      console.log('\n📋 INSTRUCCIONES:');
      console.log('1. Verifica la bandeja de entrada de ztmarcos@gmail.com');
      console.log('2. Verifica la bandeja de entrada de casinseguros@gmail.com (debería tener una copia BCC)');
      console.log('3. La copia BCC no debería aparecer en el campo "Para" del destinatario');
    } else {
      throw new Error(result.error || result.details || 'Error desconocido al enviar correo');
    }

  } catch (error) {
    console.error('\n❌ PRUEBA DE BCC FALLIDA');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

// Ejecutar la prueba
testBCCFunctionality();
