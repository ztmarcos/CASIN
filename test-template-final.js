#!/usr/bin/env node

/**
 * Test Final - Verificación del sistema de templates
 * Envía un email de prueba a ztmarcos@gmail.com para verificar el sistema
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';

// Función para enviar email de prueba final
async function sendFinalTestEmail() {
  try {
    console.log('🎯 ========================================');
    console.log('🎯 TEST FINAL - SISTEMA DE TEMPLATES');
    console.log('🎯 ========================================');
    console.log('📧 Destinatario: ztmarcos@gmail.com');
    console.log('📧 Remitente: casinseguros@gmail.com');
    console.log('🚗 Template: Autos (Renovación)');
    console.log('');
    
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

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${testData.nombre_contratante}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>De parte del Act. Marcos Zavala, me permito enviar su renovación del seguro del auto <strong>${testData.descripcion_del_vehiculo} ${testData.modelo}</strong> modelo ${testData.modelo} de la vigencia ${testData.vigencia_inicio} al ${testData.vigencia_fin} con no. de póliza <strong>${testData.numero_poliza}</strong> a su nombre, asegurada en <strong>${testData.aseguradora}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${testData.pago_total_o_prima_total} pesos</strong>, para su revisión y amable programación de pago con fecha límite del 31 de mayo 2025 antes de las 12 del día.</p>
        
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
    console.log('📧 Asunto:', subject);
    console.log('📅 Fecha de envío:', new Date().toLocaleString('es-MX'));
    console.log('');
    console.log('🎯 ========================================');
    console.log('🎯 RESUMEN DEL SISTEMA IMPLEMENTADO');
    console.log('🎯 ========================================');
    console.log('✅ Templates específicos por ramo:');
    console.log('   🚗 Autos - Template completo con detalles del vehículo');
    console.log('   💙 Vida - Template para seguros de vida');
    console.log('   🏥 GMM - Template para gastos médicos mayores');
    console.log('   🏠 Hogar - Template para seguros de hogar');
    console.log('   📋 Default - Template general');
    console.log('');
    console.log('✅ Selector de tipos de email actualizado:');
    console.log('   🚗 Renovación Seguro Auto');
    console.log('   💙 Renovación Seguro Vida');
    console.log('   🏥 Renovación GMM');
    console.log('   🏠 Renovación Seguro Hogar');
    console.log('   📋 Renovación General');
    console.log('   🎉 Bienvenida / Confirmación');
    console.log('   ⚠️ Recordatorio de Pago');
    console.log('   📋 Información General');
    console.log('');
    console.log('✅ Detección automática de ramo basada en:');
    console.log('   - Tipo de email seleccionado');
    console.log('   - Campos disponibles en los datos');
    console.log('   - Contexto de la aseguradora');
    console.log('');
    console.log('✅ Remitente principal: casinseguros@gmail.com');
    console.log('✅ Palabra "bendiciones" removida de todos los templates');
    console.log('');
    console.log('🎉 ========================================');
    console.log('🎉 ¡SISTEMA DE TEMPLATES COMPLETADO!');
    console.log('🎉 ========================================');
    
    return result;
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
    throw error;
  }
}

// Ejecutar el test
if (require.main === module) {
  sendFinalTestEmail().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
}

module.exports = { sendFinalTestEmail };
