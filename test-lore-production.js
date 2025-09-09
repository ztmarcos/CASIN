// Script para probar específicamente el envío de correos desde Lore en producción
const API_URL = 'https://sis-casin-216c74c28e12.herokuapp.com/api';

async function testLoreProduction() {
  console.log('🧪 Probando envío de correo desde Lore en producción...');
  console.log('🌐 API URL:', API_URL);
  
  // Datos de prueba específicos para Lore
  const testData = {
    to: 'ztmarcos@gmail.com',
    subject: '🧪 Prueba de Lore - CASIN CRM',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <h2>🧪 Prueba de Lore en Producción</h2>
        
        <p><strong>Hola Marcos,</strong></p>
        
        <p>Este es un correo de prueba enviado desde <strong>Lore</strong> usando el sistema CASIN CRM en producción.</p>
        
        <p><strong>Detalles del envío:</strong></p>
        <ul>
          <li>📧 Remitente: Lore (lorenacasin5@gmail.com)</li>
          <li>📧 Destinatario: ztmarcos@gmail.com</li>
          <li>📅 Fecha: ${new Date().toLocaleString('es-MX')}</li>
          <li>🕐 Hora: ${new Date().toLocaleTimeString('es-MX')}</li>
          <li>🌐 Sistema: CASIN CRM - Producción</li>
          <li>🚀 Servidor: Heroku</li>
          <li>✅ BCC: Activado</li>
        </ul>
        
        <p>Si recibes este correo, significa que el sistema de envío desde Lore está funcionando correctamente.</p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666; font-style: italic;">
          <strong>NOTA:</strong> Este es un correo de prueba automático del sistema CASIN CRM.
        </p>
        
        <p>Cordialmente,<br>
        <strong>Lore - CASIN Seguros</strong></p>
      </div>
    `,
    from: 'lorenacasin5@gmail.com',
    fromName: 'Lore',
    fromPass: 'klejsbcgpjmwoogg',
    sendBccToSender: true,
    cc: '',
    // Datos de prueba simulando una póliza
    nombre_contratante: 'Marco Zavala',
    numero_poliza: 'LORE-TEST-2024-001',
    aseguradora: 'Grupo Nacional Provincial S.A.B',
    pago_total_o_prima_total: '15,000',
    vigencia_inicio: '2024-01-01',
    vigencia_fin: '2024-12-31'
  };

  try {
    console.log('📤 Enviando correo desde Lore...');
    console.log('📧 Remitente:', testData.from);
    console.log('📧 Destinatario:', testData.to);
    console.log('📧 Contraseña (primeros 4 chars):', testData.fromPass.substring(0, 4) + '...');
    
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
      console.log('\n🎉 ¡PRUEBA DE LORE EXITOSA!');
      console.log('✅ El correo se envió correctamente desde Lore');
      console.log('📧 Message ID:', result.messageId);
      console.log('📧 Recipient:', result.recipient);
      console.log('📧 Subject:', result.subject);
      
      if (result.bccSent) {
        console.log('✅ BCC enviado correctamente a:', result.bccSent);
      }
      
      console.log('\n📋 INSTRUCCIONES:');
      console.log('1. Verifica la bandeja de entrada de ztmarcos@gmail.com');
      console.log('2. Verifica la bandeja de entrada de lorenacasin5@gmail.com (debería tener una copia BCC)');
    } else {
      throw new Error(result.error || result.details || 'Error desconocido al enviar correo');
    }

  } catch (error) {
    console.error('\n❌ PRUEBA DE LORE FALLIDA');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    
    // Información adicional para debugging
    console.log('\n🔍 INFORMACIÓN DE DEBUG:');
    console.log('📧 Email de Lore:', testData.from);
    console.log('🔑 Contraseña configurada:', testData.fromPass);
    console.log('🌐 API URL:', API_URL);
  }
}

// Ejecutar la prueba
testLoreProduction();
