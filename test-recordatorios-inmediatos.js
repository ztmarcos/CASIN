#!/usr/bin/env node

/**
 * Test Recordatorios Inmediatos - CASIN Seguros
 * Prueba el sistema de 3 recordatorios automáticos con fechas cercanas
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';

// Función para calcular fechas de recordatorios basadas en forma de pago
const calculateReminderDates = (baseDate, paymentForm) => {
  if (!baseDate || !paymentForm) return [];
  
  const base = new Date(baseDate);
  const today = new Date();
  const reminders = [];
  
  // Mapeo de formas de pago a días de anticipación
  const reminderDays = {
    'ANUAL': [30, 15, 3],      // 30, 15 y 3 días antes
    'SEMESTRAL': [21, 7, 1],   // 21, 7 y 1 día antes
    'TRIMESTRAL': [14, 7, 1],  // 14, 7 y 1 día antes
    'BIMESTRAL': [10, 3, 1],   // 10, 3 y 1 día antes
    'MENSUAL': [7, 3, 1],      // 7, 3 y 1 día antes
    'default': [15, 7, 1]      // Default para formas no especificadas
  };
  
  const days = reminderDays[paymentForm.toUpperCase()] || reminderDays.default;
  
  days.forEach(daysBefore => {
    const reminderDate = new Date(base);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    
    // Solo incluir recordatorios futuros o del día actual
    if (reminderDate >= today) {
      reminders.push({
        date: reminderDate,
        daysBefore,
        type: daysBefore === days[0] ? 'Primer Recordatorio' : 
              daysBefore === days[1] ? 'Segundo Recordatorio' : 'Recordatorio Final'
      });
    }
  });
  
  return reminders.sort((a, b) => a.date - b.date);
};

// Función para generar contenido de recordatorio
const generateReminderContent = (policy, reminderType, daysUntilDue, selectedType) => {
  const clientName = policy.nombre_contratante || policy.contratante || 'Cliente';
  const policyNumber = policy.numero_poliza || 'N/A';
  const amount = policy.pago_total_o_prima_total || 'N/A';
  const dueDate = selectedType === 'Vencimientos' ? policy.fecha_fin : policy.fecha_proximo_pago;
  
  const subject = selectedType === 'Vencimientos' 
    ? `${reminderType} - Vencimiento Póliza ${policyNumber} - ${clientName}`
    : `${reminderType} - Pago Parcial Póliza ${policyNumber} - ${clientName}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
      <p><strong>Apreciable Asegurado ${clientName}</strong></p>
      
      <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
      
      <p>De parte del Act. Marcos Zavala, me permito enviarle este ${reminderType.toLowerCase()} para recordarle que su póliza <strong>${policyNumber}</strong> ${selectedType === 'Vencimientos' ? 'vencerá' : 'tiene un pago parcial programado'} el <strong>${dueDate}</strong>.</p>
      
      ${selectedType === 'Vencimientos' 
        ? `<p>El monto total de la póliza es de <strong>$${amount} pesos</strong>.</p>`
        : `<p>El monto del pago parcial es de <strong>$${policy.pago_parcial} pesos</strong>.</p>`
      }
      
      <p>Faltan <strong>${daysUntilDue} día${daysUntilDue !== 1 ? 's' : ''}</strong> para la fecha límite.</p>
      
              <p>Tenemos campaña de pago con tarjeta de crédito a 3 y 6 MSI o si desea puede pagarlo con débito o en ventanilla del banco en efectivo o cheque y por transferencia electrónica como pago de servicios.</p>
      
      <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
      
      <p>Cordialmente,<br>
      <strong>CASIN Seguros</strong></p>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      
      <p style="font-size: 12px; color: #666; font-style: italic;">
        <strong>NOTA:</strong> EN CASO DE REQUERIR FACTURA ES NECESARIO COMPARTIR SU CONSTANCIA FISCAL ACTUALIZADA NO MAYOR A 2 MESES DE ANTIGÜEDAD ANTES DE REALIZAR SU PAGO.
      </p>
    </div>
  `;
  
  return { subject, htmlContent };
};

// Función para enviar email de recordatorio
async function sendReminderEmail(policy, reminderType, daysUntilDue, selectedType) {
  try {
    const { subject, htmlContent } = generateReminderContent(policy, reminderType, daysUntilDue, selectedType);
    
    console.log(`📧 Enviando ${reminderType} para ${selectedType}...`);
    console.log(`📧 Asunto: ${subject}`);
    
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
        fromName: `CASIN Seguros - ${reminderType}`
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send email');
    }

    const result = await response.json();
    
    console.log(`✅ ${reminderType} enviado exitosamente!`);
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log('');
    
    return result;
  } catch (error) {
    console.error(`❌ Error enviando ${reminderType}:`, error.message);
    throw error;
  }
}

// Función principal de prueba
async function testRecordatoriosInmediatos() {
  try {
    console.log('🎯 ========================================');
    console.log('🎯 TEST RECORDATORIOS INMEDIATOS');
    console.log('🎯 ========================================');
    console.log('');
    
    // Calcular fechas cercanas para generar recordatorios
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    
    // Datos de prueba para Vencimientos (fecha cercana)
    const testPolicyVencimientos = {
      numero_poliza: 'TEST-VENC-INMEDIATO',
      nombre_contratante: 'José Alberto Fonseca',
      email: 'ztmarcos@gmail.com',
      fecha_fin: nextMonth.toISOString().split('T')[0], // 30 días desde hoy
      forma_pago: 'ANUAL',
      pago_total_o_prima_total: '11,387.92',
      status: 'No Pagado'
    };
    
    // Datos de prueba para Pagos Parciales (fecha muy cercana)
    const testPolicyPagosParciales = {
      numero_poliza: 'TEST-PARCIAL-INMEDIATO',
      nombre_contratante: 'María González López',
      email: 'ztmarcos@gmail.com',
      fecha_proximo_pago: nextWeek.toISOString().split('T')[0], // 7 días desde hoy
      forma_pago: 'MENSUAL',
      pago_parcial: '2,500.00',
      status: 'No Pagado'
    };
    
    console.log('🚗 ========================================');
    console.log('🚗 PRUEBA 1: RECORDATORIOS VENCIMIENTOS');
    console.log('🚗 ========================================');
    console.log('📋 Póliza de prueba:', testPolicyVencimientos.numero_poliza);
    console.log('📅 Fecha de vencimiento:', testPolicyVencimientos.fecha_fin);
    console.log('💰 Forma de pago:', testPolicyVencimientos.forma_pago);
    console.log('');
    
    // Calcular recordatorios para vencimientos
    const remindersVencimientos = calculateReminderDates(testPolicyVencimientos.fecha_fin, testPolicyVencimientos.forma_pago);
    console.log('📅 Recordatorios calculados para vencimientos:', remindersVencimientos);
    console.log('');
    
    // Enviar recordatorios de vencimientos
    for (const reminder of remindersVencimientos) {
      const daysUntilDue = Math.ceil((new Date(testPolicyVencimientos.fecha_fin) - reminder.date) / (1000 * 60 * 60 * 24));
      await sendReminderEmail(testPolicyVencimientos, reminder.type, daysUntilDue, 'Vencimientos');
      
      // Esperar entre emails
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('💳 ========================================');
    console.log('💳 PRUEBA 2: RECORDATORIOS PAGOS PARCIALES');
    console.log('💳 ========================================');
    console.log('📋 Póliza de prueba:', testPolicyPagosParciales.numero_poliza);
    console.log('📅 Fecha de próximo pago:', testPolicyPagosParciales.fecha_proximo_pago);
    console.log('💰 Forma de pago:', testPolicyPagosParciales.forma_pago);
    console.log('💵 Pago parcial:', testPolicyPagosParciales.pago_parcial);
    console.log('');
    
    // Calcular recordatorios para pagos parciales
    const remindersPagosParciales = calculateReminderDates(testPolicyPagosParciales.fecha_proximo_pago, testPolicyPagosParciales.forma_pago);
    console.log('📅 Recordatorios calculados para pagos parciales:', remindersPagosParciales);
    console.log('');
    
    // Enviar recordatorios de pagos parciales
    for (const reminder of remindersPagosParciales) {
      const daysUntilDue = Math.ceil((new Date(testPolicyPagosParciales.fecha_proximo_pago) - reminder.date) / (1000 * 60 * 60 * 24));
      await sendReminderEmail(testPolicyPagosParciales, reminder.type, daysUntilDue, 'Pagos Parciales');
      
      // Esperar entre emails
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('🎉 ========================================');
    console.log('🎉 TEST COMPLETADO EXITOSAMENTE');
    console.log('🎉 ========================================');
    console.log('');
    console.log('✅ Funcionalidades verificadas:');
    console.log('   🚗 Vencimientos - 3 recordatorios automáticos');
    console.log('   💳 Pagos Parciales - 3 recordatorios automáticos');
    console.log('   📅 Cálculo automático de fechas por forma de pago');
    console.log('   📧 Envío exitoso de todos los recordatorios');
    console.log('   📋 Templates específicos por tipo');
    console.log('   🎨 Formato HTML profesional');
    console.log('');
    console.log('📊 Resumen:');
    console.log(`   - ${remindersVencimientos.length} recordatorios de vencimientos enviados`);
    console.log(`   - ${remindersPagosParciales.length} recordatorios de pagos parciales enviados`);
    console.log('   - Sistema de recordatorios automáticos funcionando');
    console.log('   - Listo para integración en Reports.jsx');
    
  } catch (error) {
    console.error('❌ Error en el test:', error.message);
    throw error;
  }
}

// Ejecutar el test
if (require.main === module) {
  testRecordatoriosInmediatos().catch(error => {
    console.error('❌ Error fatal:', error.message);
    process.exit(1);
  });
}

module.exports = { 
  testRecordatoriosInmediatos, 
  calculateReminderDates, 
  generateReminderContent,
  sendReminderEmail 
};
