const nodemailer = require('nodemailer');

// Test data for sending emails
const testData = {
  nombre_contratante: 'Marco Zavala',
  numero_poliza: 'TEST-001',
  aseguradora: 'Grupo Nacional Provincial S.A.B',
  pago_total_o_prima_total: '5000',
  vigencia_inicio: '2024-01-01',
  vigencia_fin: '2024-12-31'
};

// Email configurations
const emailConfigs = [
  {
    name: 'Lorena Acosta - CASIN Seguros',
    email: 'lorenacasin5@gmail.com',
    password: 'klejsbcgpjmwoogg',
    testRecipient: 'ztmarcos@gmail.com'
  },
  {
    name: 'Michell Diaz - CASIN Seguros', 
    email: 'michelldiaz.casinseguros@gmail.com',
    password: 'yxeyswjxsicwgoow',
    testRecipient: 'ztmarcos@gmail.com'
  }
];

// Test email template
const generateTestEmail = (senderName, testData) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
      <p><strong>Apreciable Asegurado ${testData.nombre_contratante}</strong></p>
      
      <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
      
      <p>Me permito enviar su nueva póliza de seguro con no. de póliza <strong>${testData.numero_poliza}</strong> a su nombre, asegurada en <strong>${testData.aseguradora}</strong></p>
      
      <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${testData.pago_total_o_prima_total} pesos</strong>, para su revisión y amable programación de pago.</p>
      
      <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
      
      <p>Cordialmente,<br>
      <strong>${senderName}</strong></p>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      
      <p style="font-size: 12px; color: #666; font-style: italic;">
        <strong>NOTA:</strong> Este es un correo de prueba para verificar la configuración del remitente.
      </p>
    </div>
  `;
};

async function sendTestEmails() {
  console.log('🚀 Iniciando envío de correos de prueba...\n');

  for (const config of emailConfigs) {
    try {
      console.log(`📧 Enviando correo de prueba desde: ${config.name} (${config.email})`);
      
      // Create transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.email,
          pass: config.password
        }
      });

      // Email options
      const mailOptions = {
        from: {
          name: config.name,
          address: config.email
        },
        to: config.testRecipient,
        subject: `🧪 Correo de Prueba - ${config.name}`,
        html: generateTestEmail(config.name, testData)
      };

      // Send email
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Correo enviado exitosamente desde ${config.name}`);
      console.log(`   📬 Message ID: ${result.messageId}`);
      console.log(`   📧 Destinatario: ${config.testRecipient}\n`);

    } catch (error) {
      console.error(`❌ Error enviando correo desde ${config.name}:`, error.message);
      console.log('');
    }
  }

  console.log('🏁 Proceso de envío de correos de prueba completado.');
}

// Run the test
sendTestEmails().catch(console.error);
