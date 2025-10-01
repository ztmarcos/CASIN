const fetch = require('node-fetch');

async function testTableMailEmail() {
  try {
    console.log('📧 Testing TableMail email sending...');
    
    const API_URL = 'http://localhost:3001';
    
    // Test data similar to what TableMail would send
    const emailData = {
      to: 'ztmarcos@gmail.com',
      subject: 'Test TableMail - Sistema de Correos',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Test TableMail Email</h2>
          <p>Este es un test del sistema de correos de TableMail.</p>
          <p>Si recibes este correo, el sistema está funcionando correctamente.</p>
        </div>
      `,
      from: 'lorenacasin5@gmail.com',
      fromName: 'Lorena Acosta - CASIN Seguros',
      fromPass: 'fvjn qfyo uyzg lzkk',
      sendBccToSender: true,
      cc: 'casinseguros@gmail.com'
    };
    
    console.log('📤 Sending email with data:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
      hasPassword: !!emailData.fromPass
    });
    
    const response = await fetch(`${API_URL}/api/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Email sent successfully');
      console.log('📧 Result:', result);
    } else {
      console.error('❌ Error sending email:', result);
      console.error('Status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
}

testTableMailEmail();
