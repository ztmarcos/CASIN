const nodemailer = require('nodemailer');
require('dotenv').config({ path: './functions/.env' });

async function testEmail() {
  console.log('🧪 Testing email send...');
  console.log('📧 From:', process.env.SMTP_USER || 'casinseguros@gmail.com');
  console.log('📧 To: ztmarcos@gmail.com');
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'casinseguros@gmail.com',
      pass: process.env.SMTP_PASS
    }
  });

  try {
    // Send test email
    const info = await transporter.sendMail({
      from: `"CASIN Seguros" <${process.env.SMTP_USER || 'casinseguros@gmail.com'}>`,
      to: 'ztmarcos@gmail.com',
      subject: 'Test Email - CASIN',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>🧪 Email de Prueba</h2>
          <p>Este es un email de prueba desde el sistema CASIN.</p>
          <p>Fecha: ${new Date().toLocaleString('es-MX')}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <div style="text-align: center;">
            <img src="https://casin-crm.web.app/footers/casin-logo.png" alt="CASIN Seguros" style="max-width: 105px; height: auto;">
            <p style="color: #666; font-size: 12px; margin-top: 10px;">
              CASIN Seguros<br>
              Email: casinseguros@gmail.com
            </p>
          </div>
        </div>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📨 Message ID:', info.messageId);
    console.log('📬 Response:', info.response);
    
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    if (error.code === 'EAUTH') {
      console.error('🔑 Authentication failed. Check SMTP credentials in functions/.env');
      console.error('💡 You may need to generate a new App Password at:');
      console.error('   https://myaccount.google.com/apppasswords');
    }
    throw error;
  }
}

testEmail()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  });
