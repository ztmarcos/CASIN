#!/usr/bin/env node

/**
 * Test Template Autos - Email con template específico para autos
 * Envía un email de prueba a ztmarcos@gmail.com usando el template de autos
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';

// Template de autos (copiado del componente)
const EMAIL_TEMPLATE_AUTOS = (data) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
    <p><strong>Apreciable Asegurado ${data.nombre_contratante || 'Cliente'}</strong></p>
    
    <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
    
    <p>De parte del Act. Marcos Zavala, me permito enviar su renovación del seguro del auto <strong>${data.descripcion_del_vehiculo || 'vehículo'} ${data.modelo || ''} ${data.serie || ''}</strong> modelo ${data.modelo || 'N/A'} de la vigencia ${data.vigencia_inicio || 'N/A'} al ${data.vigencia_fin || 'N/A'} con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
    
    <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || 'N/A'} pesos</strong>, para su revisión y amable programación de pago con fecha límite del ${data.vigencia_fin ? new Date(data.vigencia_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '31 de Mayo 2024'} antes de las 12 del día.</p>
    
            <p>Tenemos campaña de pago con tarjeta de crédito a 3 y 6 MSI o si desea puede pagarlo con débito o en ventanilla del banco en efectivo o cheque y por transferencia electrónica como pago de servicios.</p>
    
    <p>Por otra parte anexo en link donde puede consultar las condiciones generales <a href="https://www.gnp.com.mx/content/pp/mx/es/footer/blue-navigation/asistencia-y-contacto/servicios-en-linea/condiciones-generales/condiciones-generales.html" style="color: #0066cc;">https://www.gnp.com.mx/content/pp/mx/es/footer/blue-navigation/asistencia-y-contacto/servicios-en-linea/condiciones-generales/condiciones-generales.html</a></p>
    
    <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
    
    <p>Cordialmente,<br>
    <strong>CASIN Seguros</strong></p>
    
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
    
    <p style="font-size: 12px; color: #666; font-style: italic;">
      <strong>NOTA:</strong> EN CASO DE REQUERIR FACTURA ES NECESARIO COMPARTIR SU CONSTANCIA FISCAL ACTUALIZADA NO MAYOR A 2 MESES DE ANTIGÜEDAD ANTES DE REALIZAR SU PAGO.
    </p>
  </div>
`;

// Datos de prueba para autos (basado en el ejemplo proporcionado)
const testData = {
  nombre_contratante: 'José Alberto Fonseca',
  descripcion_del_vehiculo: 'S60 T5 KINETIC GEARTRONIC',
  modelo: '2013',
  serie: '',
  numero_poliza: '611960691',
  aseguradora: 'Grupo Nacional Provincial S.A.B',
  pago_total_o_prima_total: '11,387.92',
  vigencia_inicio: '2024',
  vigencia_fin: '2025-05-31',
  e_mail: 'ztmarcos@gmail.com'
};

// Función para enviar email con template de autos
async function sendAutosTemplateEmail() {
  try {
    console.log('🚗 ========================================');
    console.log('🚗 TEST TEMPLATE AUTOS - CASIN SEGUROS');
    console.log('🚗 ========================================');
    console.log('📧 Destinatario: ztmarcos@gmail.com');
    console.log('📧 Remitente: casinseguros@gmail.com');
    console.log('🚗 Ramo: Autos');
    console.log('👤 Cliente: José Alberto Fonseca');
    console.log('🚙 Vehículo: S60 T5 KINETIC GEARTRONIC 2013');
    console.log('📋 Póliza: 611960691');
    console.log('');
    
    const htmlContent = EMAIL_TEMPLATE_AUTOS(testData);
    const subject = `Renovación Seguro Auto - ${testData.nombre_contratante} - Póliza ${testData.numero_poliza}`;
    
    const response = await fetch(`${API_URL}/email/send-welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'ztmarcos@gmail.com',
        subject: subject,
        htmlContent: htmlContent,
        from: 'casinseguros@gmail.com',
        fromPass: 'espajcgariyhsboq',
        fromName: 'CASIN Seguros - Renovaciones'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    const result = await response.json();
    
    console.log('✅ Email enviado exitosamente!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Remitente: casinseguros@gmail.com');
    console.log('📧 Destinatario: ztmarcos@gmail.com');
    console.log('📧 Asunto:', subject);
    console.log('📅 Fecha de envío:', new Date().toLocaleString('es-MX'));
    console.log('');
    console.log('🚗 ========================================');
    console.log('🚗 DETALLES DEL EMAIL ENVIADO');
    console.log('🚗 ========================================');
    console.log('👤 Cliente: José Alberto Fonseca');
    console.log('🚙 Vehículo: S60 T5 KINETIC GEARTRONIC modelo 2013');
    console.log('📋 Póliza: 611960691');
    console.log('🏢 Aseguradora: Grupo Nacional Provincial S.A.B');
    console.log('💰 Monto: $11,387.92 pesos');
    console.log('📅 Vigencia: 2024 al 2025');
    console.log('📅 Fecha límite: 31 de mayo 2025');
    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 ¡EMAIL CON TEMPLATE AUTOS ENVIADO!');
    console.log('🎉 ========================================');
    
    return result;
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    throw error;
  }
}

// Ejecutar el test
if (require.main === module) {
  sendAutosTemplateEmail().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
}

module.exports = { sendAutosTemplateEmail, EMAIL_TEMPLATE_AUTOS };
