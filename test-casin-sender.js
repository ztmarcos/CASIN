// Script para probar que Lore y Mich aparecen como CASIN Seguros
const API_URL = 'https://sis-casin-216c74c28e12.herokuapp.com/api';

async function testCasinSender() {
  console.log('🧪 Probando que Lore y Mich aparecen como CASIN Seguros...');
  console.log('🌐 API URL:', API_URL);
  
  // Prueba con Lore
  console.log('\n📧 === PRUEBA CON LORE ===');
  const loreTestData = {
    to: 'ztmarcos@gmail.com',
    subject: '🧪 Prueba de Lore como CASIN Seguros',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <h2>🧪 Prueba de Lore como CASIN Seguros</h2>
        
        <p><strong>Hola Marcos,</strong></p>
        
        <p>Este correo fue enviado por <strong>Lore</strong> pero debería aparecer como <strong>CASIN Seguros</strong> en el remitente.</p>
        
        <p><strong>Detalles del envío:</strong></p>
        <ul>
          <li>📧 Remitente visible: CASIN Seguros</li>
          <li>📧 Email real: lorenacasin5@gmail.com</li>
          <li>📧 Destinatario: ztmarcos@gmail.com</li>
          <li>📅 Fecha: ${new Date().toLocaleString('es-MX')}</li>
          <li>🌐 Sistema: CASIN CRM - Producción</li>
        </ul>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    from: 'lorenacasin5@gmail.com',
    fromName: 'CASIN Seguros',
    fromPass: 'klejsbcgpjmwoogg',
    sendBccToSender: true,
    cc: '',
    nombre_contratante: 'Marco Zavala',
    numero_poliza: 'LORE-CASIN-TEST-001'
  };

  try {
    const response = await fetch(`${API_URL}/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loreTestData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Lore - Correo enviado exitosamente');
      console.log('📧 Message ID:', result.messageId);
      console.log('📧 BCC enviado a:', result.bccSent);
    } else {
      console.log('❌ Lore - Error:', response.status);
    }
  } catch (error) {
    console.log('❌ Lore - Error:', error.message);
  }

  // Esperar un poco antes de la segunda prueba
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Prueba con Mich
  console.log('\n📧 === PRUEBA CON MICH ===');
  const michTestData = {
    to: 'ztmarcos@gmail.com',
    subject: '🧪 Prueba de Mich como CASIN Seguros',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <h2>🧪 Prueba de Mich como CASIN Seguros</h2>
        
        <p><strong>Hola Marcos,</strong></p>
        
        <p>Este correo fue enviado por <strong>Mich</strong> pero debería aparecer como <strong>CASIN Seguros</strong> en el remitente.</p>
        
        <p><strong>Detalles del envío:</strong></p>
        <ul>
          <li>📧 Remitente visible: CASIN Seguros</li>
          <li>📧 Email real: michelldiaz.casinseguros@gmail.com</li>
          <li>📧 Destinatario: ztmarcos@gmail.com</li>
          <li>📅 Fecha: ${new Date().toLocaleString('es-MX')}</li>
          <li>🌐 Sistema: CASIN CRM - Producción</li>
        </ul>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    from: 'michelldiaz.casinseguros@gmail.com',
    fromName: 'CASIN Seguros',
    fromPass: 'yxeyswjxsicwgoow',
    sendBccToSender: true,
    cc: '',
    nombre_contratante: 'Marco Zavala',
    numero_poliza: 'MICH-CASIN-TEST-001'
  };

  try {
    const response = await fetch(`${API_URL}/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(michTestData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Mich - Correo enviado exitosamente');
      console.log('📧 Message ID:', result.messageId);
      console.log('📧 BCC enviado a:', result.bccSent);
    } else {
      console.log('❌ Mich - Error:', response.status);
    }
  } catch (error) {
    console.log('❌ Mich - Error:', error.message);
  }

  console.log('\n📋 INSTRUCCIONES:');
  console.log('1. Verifica la bandeja de entrada de ztmarcos@gmail.com');
  console.log('2. Los correos deberían aparecer como enviados por "CASIN Seguros"');
  console.log('3. Verifica las bandejas de Lore y Mich para las copias BCC');
}

// Ejecutar la prueba
testCasinSender();
