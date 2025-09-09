// Script para probar el nuevo template de seguro de hogar
const API_URL = 'https://sis-casin-216c74c28e12.herokuapp.com/api';

async function testHogarTemplate() {
  console.log('🧪 Probando nuevo template de seguro de hogar...');
  console.log('🌐 API URL:', API_URL);
  
  // Datos de prueba para seguro de hogar
  const testData = {
    to: 'ztmarcos@gmail.com',
    subject: '🏠 Nueva Póliza Seguro Hogar - Marco Zavala - Póliza HOGAR-2024-001',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurada (o), buen día</strong></p>
        
        <p>Tenemos el gusto de enviar la emisión del seguro de Hogar con no. de póliza <strong>HOGAR-2024-001</strong> a su nombre, que inicia la vigencia del <strong>2024-01-01</strong> al <strong>2024-12-31</strong>, con un costo anual de <strong>$25,000 pesos</strong>, asegurados en la compañía de seguros <strong>Grupo Nacional Provincial S.A.B</strong>.</p>
        
        <p>Se adjunta carátula, condiciones generales y el aviso de cobro para la amable programación del pago; el plazo vence el día <strong>31 de diciembre de 2024</strong> a las 12:00 del día, puede ser liquidado mediante tarjeta de crédito a 3 o 6 MSI, pagando con cheque o efectivo en ventanilla bancaria o transferencia como pago de servicios.</p>
        
        <p>Agradecemos nos informe qué forma de pago utilizará para poder apoyarle.</p>
        
        <p><strong>Importante:</strong> Favor de revisar factura anexa.</p>
        
        <p>En caso de requerir algún cambio de uso del CFDI o cambie de domicilio fiscal o régimen, favor de enviarnos la constancia de identificación fiscal no mayor a 2 meses de antigüedad para actualizar sus datos y emitir su factura con sus datos vigentes, una vez emitida, ya no podrán hacer cambios.</p>
        
        <p>Para dar cumplimiento a las disposiciones legales agradecemos, nos dé acuse de recibido de este correo.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    from: 'casinseguros@gmail.com',
    fromName: 'CASIN Seguros',
    fromPass: 'espajcgariyhsboq',
    sendBccToSender: true,
    cc: '',
    // Datos de prueba simulando una póliza de hogar
    nombre_contratante: 'Marco Zavala',
    numero_poliza: 'HOGAR-2024-001',
    aseguradora: 'Grupo Nacional Provincial S.A.B',
    pago_total_o_prima_total: '25000',
    prima_neta: '25000',
    vigencia_inicio: '2024-01-01',
    vigencia_fin: '2024-12-31',
    ramo: 'hogar'
  };

  try {
    console.log('📤 Enviando correo con nuevo template de hogar...');
    console.log('📧 Remitente:', testData.from);
    console.log('📧 Destinatario:', testData.to);
    console.log('📧 Póliza:', testData.numero_poliza);
    console.log('📧 Monto:', testData.pago_total_o_prima_total);
    
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
      console.log('\n🎉 ¡PRUEBA DE TEMPLATE HOGAR EXITOSA!');
      console.log('✅ El correo se envió correctamente con el nuevo template');
      console.log('📧 Message ID:', result.messageId);
      console.log('📧 Recipient:', result.recipient);
      console.log('📧 Subject:', result.subject);
      
      if (result.bccSent) {
        console.log('✅ BCC enviado correctamente a:', result.bccSent);
      }
      
      console.log('\n📋 CARACTERÍSTICAS DEL NUEVO TEMPLATE:');
      console.log('✅ Saludo: "Apreciable Asegurada (o), buen día"');
      console.log('✅ Información completa de la póliza');
      console.log('✅ Detalles de vigencia y costo');
      console.log('✅ Opciones de pago (3 y 6 MSI)');
      console.log('✅ Instrucciones fiscales');
      console.log('✅ Solicitud de acuse de recibo');
      
      console.log('\n📋 INSTRUCCIONES:');
      console.log('1. Verifica la bandeja de entrada de ztmarcos@gmail.com');
      console.log('2. El correo debería mostrar el nuevo formato para seguros de hogar');
      console.log('3. Verifica la bandeja de CASIN para la copia BCC');
    } else {
      throw new Error(result.error || result.details || 'Error desconocido al enviar correo');
    }

  } catch (error) {
    console.error('\n❌ PRUEBA DE TEMPLATE HOGAR FALLIDA');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

// Ejecutar la prueba
testHogarTemplate();
