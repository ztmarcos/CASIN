import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../../config/api.js';
import DriveSelector from '../Drive/DriveSelector.jsx';
import { getSenderOptions } from '../../config/users.js';
import './TableMail.css';

const SENDER_OPTIONS = getSenderOptions();

// Templates de email por ramo y tipo (nueva póliza o renovación)
const EMAIL_TEMPLATES = {
  // ===== AUTOS =====
  autos: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su nueva póliza de seguro del auto <strong>${data.descripcion_del_vehiculo || 'vehículo'} ${data.modelo || ''} ${data.serie || ''}</strong> modelo ${data.modelo || 'N/A'} de la vigencia ${data.vigencia_inicio || 'N/A'} al ${data.vigencia_fin || 'N/A'} con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
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
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su renovación del seguro del auto <strong>${data.descripcion_del_vehiculo || 'vehículo'} ${data.modelo || ''} ${data.serie || ''}</strong> modelo ${data.modelo || 'N/A'} de la vigencia ${data.vigencia_inicio || 'N/A'} al ${data.vigencia_fin || 'N/A'} con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
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
    `
  },
  
  // ===== VIDA =====
  vida: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su nueva póliza de seguro de vida con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su renovación del seguro de vida con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `
  },
  
  // ===== GMM =====
  gmm: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su nueva póliza de Gastos Médicos Mayores con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su renovación del seguro de Gastos Médicos Mayores con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `
  },
  
  // ===== MASCOTAS =====
  mascotas: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su nueva póliza de seguro de mascotas con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su renovación del seguro de mascotas con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `
  },
  
  // ===== NEGOCIO =====
  negocio: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su nueva póliza de seguro de negocio con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su renovación del seguro de negocio con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `
  },
  
  // ===== RC (RESPONSABILIDAD CIVIL) =====
  rc: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su nueva póliza de seguro de Responsabilidad Civil con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su renovación del seguro de Responsabilidad Civil con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `
  },
  
  // ===== TRANSPORTE =====
  transporte: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su nueva póliza de seguro de transporte con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su renovación del seguro de transporte con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `
  },
  
  // ===== HOGAR =====
  hogar: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su nueva póliza de seguro de hogar con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su renovación del seguro de hogar con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `
  },
  
  // ===== DEFAULT =====
  default: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || data.asegurado || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su nueva póliza de seguro con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.nombre_contratante || data.contratante || data.asegurado || 'Cliente'}</strong></p>
        
        <p>Tengo el gusto de saludarle, esperando se encuentre bien.</p>
        
        <p>Me permito enviar su renovación del seguro con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, asegurada en <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong></p>
        
        <p>Anexo carátula y recibo de cobro anual por la cantidad de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, para su revisión y amable programación de pago.</p>
        
        <p>Quedando atenta a su amable confirmación de recibido, le agradezco su amable atención.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    recibo: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Estimada ${data.nombre_contratante || data.contratante || data.asegurado || 'Cliente'}</strong>, buen día</p>
        
        <p>Por este medio, deseo informar de la renovación del seguro de ${data.ramo || 'Vida'} del Sr. ${data.nombre_contratante || data.contratante || data.asegurado || 'Cliente'} de la vigencia ${data.vigencia_inicio || 'N/A'}-${data.vigencia_fin ? new Date(data.vigencia_fin).getFullYear() : 'N/A'}, asegurado en <strong>${data.aseguradora || 'AXA Seguros'}</strong>.</p>
        
        <p>Adjunto el recibo de cobro por <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} ${data.moneda || 'dls'}</strong> de la póliza de ${data.ramo || 'vida'} no. <strong>${data.numero_poliza || 'N/A'}</strong> para su revisión y amable programación del pago con fecha límite ${data.vigencia_fin ? new Date(data.vigencia_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}.</p>
        
        <p>Quedo al pendiente de su amable confirmación de recibido.</p>
        
        <p>Saludos cordiales!!</p>
      </div>
    `
  }
};

const TableMail = ({ isOpen, onClose, rowData, tableType }) => {
  const [emailContent, setEmailContent] = useState({ subject: '', message: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showDriveSelector, setShowDriveSelector] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [emailType, setEmailType] = useState('nueva_autos');
  const fileInputRef = useRef(null);
  const [sender, setSender] = useState(SENDER_OPTIONS[0]);
  const [sendBccToSender, setSendBccToSender] = useState(true); // Por defecto activado
  const [ccEmails, setCcEmails] = useState(''); // Campo CC manual
  const [plainTextMessage, setPlainTextMessage] = useState(''); // Mensaje en texto plano para edición

  // Función para convertir HTML a texto plano
  const htmlToPlainText = (html) => {
    if (!html) return '';
    
    // Crear un elemento temporal para parsear el HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Obtener el texto plano - usar textContent que es más confiable
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Limpiar espacios extra pero mantener saltos de línea
    text = text.replace(/[ \t]+/g, ' ').trim();
    
    // Reemplazar etiquetas comunes con formato legible para los templates
    text = text
      .replace(/Apreciable Asegurado/g, '\nApreciable Asegurado')
      .replace(/Tengo el gusto de saludarle/g, '\n\nTengo el gusto de saludarle')
      .replace(/De parte del Act\. Marcos Zavala/g, '\n\nMe permito')
      .replace(/me permito enviar su renovación/g, '\n\nme permito enviar su renovación')
      .replace(/Anexo carátula y recibo/g, '\n\nAnexo carátula y recibo')
      .replace(/para su revisión y amable programación/g, '\n\npara su revisión y amable programación')
      .replace(/Tenemos campaña de pago/g, '\n\nTenemos campaña de pago')
      .replace(/Por otra parte anexo/g, '\n\nPor otra parte anexo')
      .replace(/Quedando atenta/g, '\n\nQuedando atenta')
      .replace(/le agradezco su amable atención/g, '\n\nle agradezco su amable atención')
      .replace(/Cordialmente/g, '\n\nCordialmente')
      .replace(/CASIN Seguros/g, '\nCASIN Seguros')
      .replace(/NOTA:/g, '\n\nNOTA:')
      .replace(/EN CASO DE REQUERIR FACTURA/g, '\n\nEN CASO DE REQUERIR FACTURA');
    
    // Limpiar líneas vacías múltiples y espacios al inicio
    text = text.replace(/\n{3,}/g, '\n\n').replace(/^\s+/, '');
    
    return text;
  };

  // Función para convertir texto plano a HTML
  const plainTextToHtml = (text) => {
    if (!text) return '';
    
    return text
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/<p><\/p>/g, '')
      .replace(/<p>\s*<\/p>/g, '');
  };

  // Función para detectar automáticamente el tipo de póliza basado en los datos
  const detectPolicyType = (data) => {
    if (!data) return 'nueva_general';
    
    console.log('🔍 Iniciando detección de tipo de póliza...');
    console.log('📊 Datos recibidos:', data);
    console.log('🏷️ Tipo de tabla:', tableType);
    
    // Detectar si es nueva póliza o renovación basado en fechas
    const isNewPolicy = () => {
      if (data.vigencia_inicio) {
        const startDate = new Date(data.vigencia_inicio);
        const today = new Date();
        // Si la vigencia inicia en el futuro o muy recientemente (últimos 30 días), es nueva
        const isNew = startDate > today || (today - startDate) < (30 * 24 * 60 * 60 * 1000);
        console.log('📅 Análisis de fechas:', {
          vigencia_inicio: data.vigencia_inicio,
          startDate,
          today,
          isNew
        });
        return isNew;
      }
      console.log('📅 No hay fecha de vigencia, asumiendo renovación');
      return false; // Por defecto asumimos renovación
    };
    
    const isNew = isNewPolicy();
    const prefix = isNew ? 'nueva_' : 'renovacion_';
    console.log('🔄 Prefijo determinado:', prefix);
    
    // PRIORIDAD 1: Tipo de tabla (más confiable)
    if (tableType) {
      console.log('🏷️ Analizando tipo de tabla:', tableType);
      const tableTypeLower = tableType.toLowerCase();
      
      // Mapeo específico de tipos de tabla
      const tableTypeMap = {
        'vida': 'vida',
        'life': 'vida',
        'gmm': 'gmm',
        'gastos médicos': 'gmm',
        'médicos': 'gmm',
        'hogar': 'hogar',
        'casa': 'hogar',
        'vivienda': 'hogar',
        'mascotas': 'mascotas',
        'mascota': 'mascotas',
        'pet': 'mascotas',
        'negocio': 'negocio',
        'empresa': 'negocio',
        'comercial': 'negocio',
        'rc': 'rc',
        'responsabilidad civil': 'rc',
        'transporte': 'transporte',
        'carga': 'transporte',
        'autos': 'autos',
        'auto': 'autos',
        'vehículo': 'autos',
        'carro': 'autos'
      };
      
      // Buscar coincidencia exacta o parcial
      for (const [key, value] of Object.entries(tableTypeMap)) {
        if (tableTypeLower.includes(key)) {
          console.log('✅ Coincidencia encontrada en tipo de tabla:', key, '→', value);
          return prefix + value;
        }
      }
      console.log('❌ No se encontró coincidencia en tipo de tabla');
    } else {
      console.log('❌ No hay tipo de tabla disponible');
    }
    
    // PRIORIDAD 2: Campos específicos de autos (muy confiable)
    const autoFields = [
      'descripcion_del_vehiculo', 'modelo', 'placas', 'marca', 'serie',
      'anio', 'color', 'numero_motor', 'numero_serie', 'tipo_vehiculo'
    ];
    
    const foundAutoFields = autoFields.filter(field => data[field] && data[field].toString().trim() !== '');
    const hasAutoFields = foundAutoFields.length > 0;
    
    console.log('🚗 Analizando campos de auto:', {
      foundAutoFields,
      hasAutoFields
    });
    
    if (hasAutoFields) {
      console.log('✅ Campos de auto encontrados, detectando como autos');
      return prefix + 'autos';
    }
    
    // PRIORIDAD 3: Campo ramo específico (muy confiable)
    if (data.ramo) {
      console.log('📋 Analizando campo ramo:', data.ramo);
      const ramo = data.ramo.toLowerCase().trim();
      
      // Mapeo específico para campo ramo
      const ramoMap = {
        'vida': 'vida',
        'life': 'vida',
        'gmm': 'gmm',
        'gastos médicos mayores': 'gmm',
        'gastos medicos mayores': 'gmm',
        'hogar': 'hogar',
        'casa': 'hogar',
        'vivienda': 'hogar',
        'mascotas': 'mascotas',
        'mascota': 'mascotas',
        'negocio': 'negocio',
        'empresa': 'negocio',
        'comercial': 'negocio',
        'rc': 'rc',
        'responsabilidad civil': 'rc',
        'transporte': 'transporte',
        'carga': 'transporte',
        'autos': 'autos',
        'auto': 'autos',
        'vehículo': 'autos'
      };
      
      for (const [key, value] of Object.entries(ramoMap)) {
        if (ramo.includes(key)) {
          console.log('✅ Coincidencia encontrada en ramo:', key, '→', value);
          return prefix + value;
        }
      }
      console.log('❌ No se encontró coincidencia en ramo');
    } else {
      console.log('❌ No hay campo ramo disponible');
    }
    
    // PRIORIDAD 4: Campo tipo_poliza específico
    if (data.tipo_poliza) {
      console.log('🏷️ Analizando campo tipo_poliza:', data.tipo_poliza);
      const tipo = data.tipo_poliza.toLowerCase().trim();
      
      const tipoMap = {
        'vida': 'vida',
        'gmm': 'gmm',
        'gastos médicos': 'gmm',
        'hogar': 'hogar',
        'casa': 'hogar',
        'mascotas': 'mascotas',
        'mascota': 'mascotas',
        'negocio': 'negocio',
        'empresa': 'negocio',
        'rc': 'rc',
        'responsabilidad civil': 'rc',
        'transporte': 'transporte',
        'carga': 'transporte',
        'autos': 'autos',
        'auto': 'autos',
        'vehículo': 'autos'
      };
      
      for (const [key, value] of Object.entries(tipoMap)) {
        if (tipo.includes(key)) {
          console.log('✅ Coincidencia encontrada en tipo_poliza:', key, '→', value);
          return prefix + value;
        }
      }
      console.log('❌ No se encontró coincidencia en tipo_poliza');
    } else {
      console.log('❌ No hay campo tipo_poliza disponible');
    }
    
    // PRIORIDAD 5: Aseguradora (menos confiable, solo palabras muy específicas)
    if (data.aseguradora) {
      console.log('🏢 Analizando aseguradora:', data.aseguradora);
      const aseguradora = data.aseguradora.toLowerCase().trim();
      
      // Solo palabras muy específicas para evitar falsos positivos
      if (aseguradora.includes('gastos médicos mayores') || aseguradora.includes('gmm')) {
        console.log('✅ Aseguradora GMM detectada');
        return prefix + 'gmm';
      }
      if (aseguradora.includes('mascotas') || aseguradora.includes('pet')) {
        console.log('✅ Aseguradora mascotas detectada');
        return prefix + 'mascotas';
      }
      if (aseguradora.includes('transporte') || aseguradora.includes('carga')) {
        console.log('✅ Aseguradora transporte detectada');
        return prefix + 'transporte';
      }
      if (aseguradora.includes('responsabilidad civil') || aseguradora.includes('rc')) {
        console.log('✅ Aseguradora RC detectada');
        return prefix + 'rc';
      }
      console.log('❌ No se encontró coincidencia específica en aseguradora');
    } else {
      console.log('❌ No hay campo aseguradora disponible');
    }
    
    // PRIORIDAD 6: Lógica específica para vida (solo si no hay otros indicadores)
    if (data.contratante && !hasAutoFields && !data.ramo && !data.tipo_poliza) {
      console.log('✅ Detectando como vida por lógica de exclusión (tiene contratante, no tiene auto/ramo/tipo_poliza)');
      return prefix + 'vida';
    }
    
    // Por defecto: general
    console.log('🔄 No se pudo detectar tipo específico, usando general');
    return prefix + 'general';
  };

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmailContent({ subject: '', message: '' });
      setError(null);
      setSuccess(null);
      setAttachments([]);
      setSelectedFolder(null);
      setEmailType('nueva_autos');
      setSender(SENDER_OPTIONS[0]); // Reset sender on close
      setSendBccToSender(true); // Reset BCC option - SIEMPRE activado por defecto
      setCcEmails(''); // Reset CC field
      setPlainTextMessage(''); // Reset plain text message
    }
  }, [isOpen]);

  const extractEmail = (data) => {
    if (data && typeof data === 'object') {
      const emailFields = ['e_mail', 'email', 'correo', 'mail'];
      for (const field of emailFields) {
        if (data[field] && typeof data[field] === 'string' && data[field].includes('@')) {
          return data[field].trim();
        }
      }
    }

    return '';
  };

  useEffect(() => {
    if (isOpen && rowData) {
      // Detectar automáticamente el tipo de póliza cuando se abre el modal
      const detectedType = detectPolicyType(rowData);
      console.log('🔍 Tipo de póliza detectado automáticamente:', detectedType);
      console.log('📋 Datos analizados:', {
        tableType,
        hasAutoFields: ['descripcion_del_vehiculo', 'modelo', 'placas', 'marca', 'serie', 'anio', 'color', 'numero_motor', 'numero_serie', 'tipo_vehiculo'].some(field => rowData[field] && rowData[field].toString().trim() !== ''),
        ramo: rowData.ramo,
        tipo_poliza: rowData.tipo_poliza,
        aseguradora: rowData.aseguradora,
        contratante: rowData.contratante,
        rowData
      });
      setEmailType(detectedType);
    }
  }, [isOpen, rowData]);

  useEffect(() => {
    if (isOpen && rowData && emailType) {
      generateEmailContent();
    }
  }, [isOpen, rowData, emailType]);

  const generateEmailContent = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const emailAddress = extractEmail(rowData);
      if (!emailAddress) {
        throw new Error('No se encontró una dirección de correo válida');
      }

      console.log('Generando correo tipo:', emailType, 'para:', { ...rowData, email: emailAddress });

      // Determinar el ramo y tipo basado en el tipo de email seleccionado o en los datos
      let ramo = 'default';
      let tipo = 'renovacion'; // Por defecto es renovación
      
      // Si el tipo de email especifica un ramo y tipo, usarlo
      if (emailType === 'recibo') {
        ramo = 'default';
        tipo = 'recibo';
      } else if (emailType.includes('autos')) {
        ramo = 'autos';
        tipo = emailType.includes('nueva') ? 'nueva' : 'renovacion';
      } else if (emailType.includes('vida')) {
        ramo = 'vida';
        tipo = emailType.includes('nueva') ? 'nueva' : 'renovacion';
      } else if (emailType.includes('gmm')) {
        ramo = 'gmm';
        tipo = emailType.includes('nueva') ? 'nueva' : 'renovacion';
      } else if (emailType.includes('hogar')) {
        ramo = 'hogar';
        tipo = emailType.includes('nueva') ? 'nueva' : 'renovacion';
      } else if (emailType.includes('mascotas')) {
        ramo = 'mascotas';
        tipo = emailType.includes('nueva') ? 'nueva' : 'renovacion';
      } else if (emailType.includes('negocio')) {
        ramo = 'negocio';
        tipo = emailType.includes('nueva') ? 'nueva' : 'renovacion';
      } else if (emailType.includes('rc')) {
        ramo = 'rc';
        tipo = emailType.includes('nueva') ? 'nueva' : 'renovacion';
      } else if (emailType.includes('transporte')) {
        ramo = 'transporte';
        tipo = emailType.includes('nueva') ? 'nueva' : 'renovacion';
      } else if (emailType.includes('general')) {
        ramo = 'default';
        tipo = emailType.includes('nueva') ? 'nueva' : 'renovacion';
      } else {
        // Intentar detectar el ramo basado en los campos disponibles
        if (rowData.descripcion_del_vehiculo || rowData.modelo || rowData.placas) {
          ramo = 'autos';
        } else if (rowData.contratante && rowData.numero_poliza) {
          // Intentar detectar si es vida basado en el contexto
          if (rowData.aseguradora && rowData.aseguradora.toLowerCase().includes('vida')) {
            ramo = 'vida';
          } else if (rowData.aseguradora && rowData.aseguradora.toLowerCase().includes('gmm')) {
            ramo = 'gmm';
          } else if (rowData.aseguradora && rowData.aseguradora.toLowerCase().includes('hogar')) {
            ramo = 'hogar';
          }
        }
      }

      console.log('Ramo detectado:', ramo, 'Tipo:', tipo);

      // Usar el template específico del ramo y tipo
      const ramoTemplates = EMAIL_TEMPLATES[ramo] || EMAIL_TEMPLATES.default;
      const template = ramoTemplates[tipo] || ramoTemplates.renovacion;
      const htmlContent = template(rowData);
      
      // Generar asunto basado en el tipo de email, ramo y tipo de póliza
      let subject = 'Póliza de Seguro - CASIN Seguros';
      
      if (emailType === 'nueva_autos' || (ramo === 'autos' && tipo === 'nueva')) {
        subject = `Nueva Póliza Seguro Auto - ${rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_autos' || (ramo === 'autos' && tipo === 'renovacion')) {
        subject = `Renovación Seguro Auto - ${rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_vida' || (ramo === 'vida' && tipo === 'nueva')) {
        subject = `Nueva Póliza Seguro Vida - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_vida' || (ramo === 'vida' && tipo === 'renovacion')) {
        subject = `Renovación Seguro Vida - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_gmm' || (ramo === 'gmm' && tipo === 'nueva')) {
        subject = `Nueva Póliza GMM - ${rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_gmm' || (ramo === 'gmm' && tipo === 'renovacion')) {
        subject = `Renovación GMM - ${rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_hogar' || (ramo === 'hogar' && tipo === 'nueva')) {
        subject = `Nueva Póliza Seguro Hogar - ${rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_hogar' || (ramo === 'hogar' && tipo === 'renovacion')) {
        subject = `Renovación Seguro Hogar - ${rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_mascotas' || (ramo === 'mascotas' && tipo === 'nueva')) {
        subject = `Nueva Póliza Mascotas - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_mascotas' || (ramo === 'mascotas' && tipo === 'renovacion')) {
        subject = `Renovación Mascotas - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_negocio' || (ramo === 'negocio' && tipo === 'nueva')) {
        subject = `Nueva Póliza Negocio - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_negocio' || (ramo === 'negocio' && tipo === 'renovacion')) {
        subject = `Renovación Negocio - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_rc' || (ramo === 'rc' && tipo === 'nueva')) {
        subject = `Nueva Póliza RC - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_rc' || (ramo === 'rc' && tipo === 'renovacion')) {
        subject = `Renovación RC - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_transporte' || (ramo === 'transporte' && tipo === 'nueva')) {
        subject = `Nueva Póliza Transporte - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_transporte' || (ramo === 'transporte' && tipo === 'renovacion')) {
        subject = `Renovación Transporte - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_general' || (ramo === 'default' && tipo === 'nueva')) {
        subject = `Nueva Póliza - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_general' || (ramo === 'default' && tipo === 'renovacion')) {
        subject = `Renovación de Póliza - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'bienvenida') {
        subject = `Bienvenida - Confirmación de Póliza - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'}`;
      } else if (emailType === 'recordatorio') {
        subject = `Recordatorio de Pago - Póliza ${rowData.numero_poliza || 'N/A'} - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'}`;
      } else if (emailType === 'informacion') {
        subject = `Información de Póliza - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'}`;
      } else if (emailType === 'recibo') {
        subject = `Recibo de Cobro - Póliza ${rowData.numero_poliza || 'N/A'} - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'}`;
      }

      const emailContent = {
        subject: subject,
        message: htmlContent
      };

      console.log('Contenido generado con template:', ramo);
      setEmailContent(emailContent);
      
      // Actualizar también el texto plano para edición
      const plainText = htmlToPlainText(htmlContent);
      setPlainTextMessage(plainText);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Error al generar el correo. Por favor, intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    // Validate file size (16MB limit)
    const maxSize = 16 * 1024 * 1024; // 16MB in bytes
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`El archivo "${file.name}" excede el límite de 16MB`);
        return false;
      }
      return true;
    });

    // Add files to attachments
    const newAttachments = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size,
      type: file.type
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (attachmentId) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadAttachmentsToDrive = async () => {
    if (!selectedFolder || attachments.length === 0) {
      console.log('❌ Drive upload skipped:', { selectedFolder: !!selectedFolder, attachmentsCount: attachments.length });
      return [];
    }

    console.log('🚀 Starting Drive upload to folder:', selectedFolder.id);
    setIsUploading(true);
    const uploadedFiles = [];

    try {
      // Upload all files in a single request
      const formData = new FormData();
      formData.append('folderId', selectedFolder.id);
      
      // Add all files to FormData
      attachments.forEach((attachment, index) => {
        console.log(`📎 Adding file ${index + 1}:`, attachment.name);
        formData.append('files', attachment.file);
      });

      const uploadUrl = `${API_URL.replace('/api', '')}/drive/upload`;
      console.log('📤 Sending request to:', uploadUrl);
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('📊 Drive response status:', response.status);

      if (!response.ok) {
        // If Drive upload is not available (503), continue without upload
        if (response.status === 503) {
          console.warn('⚠️ Google Drive upload not available, skipping upload');
          setSelectedFolder(null); // Clear folder selection
          return []; // Return empty array to continue without Drive links
        }
        throw new Error(`Error uploading files`);
      }

      const result = await response.json();
      console.log('📊 Drive upload result:', result);
      
      if (result.success && result.files) {
        console.log('✅ Drive upload successful, mapping files...');
        // Map uploaded files to original attachments
        result.files.forEach((driveFile, index) => {
          if (index < attachments.length) {
            uploadedFiles.push({
              ...attachments[index],
              driveFileId: driveFile.id,
              driveLink: driveFile.webViewLink
            });
          }
        });
        console.log('📎 Mapped uploaded files:', uploadedFiles);
      } else {
        console.log('❌ Drive upload failed or no files returned:', result);
      }
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      // For Drive-related errors, clear the selection and continue without upload
      if (error.message.includes('Drive') || error.message.includes('503')) {
        setSelectedFolder(null);
        setError('Google Drive no disponible, enviando email sin subir archivos a Drive');
        return []; // Continue without Drive upload
      }
      throw error;
    } finally {
      setIsUploading(false);
    }

    return uploadedFiles;
  };

  const handleSendEmail = async () => {
    const emailAddress = extractEmail(rowData);
    if (!emailAddress) {
      setError('❌ No se encontró una dirección de correo válida en los datos. Verifica que el campo "e_mail", "email", "correo" o "mail" contenga una dirección válida.');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      setError('❌ La dirección de correo no tiene un formato válido. Verifica que sea una dirección de correo correcta.');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      let uploadedFiles = [];
      
      // Upload attachments to Drive if folder is selected
      if (attachments.length > 0 && selectedFolder) {
        console.log('📤 Starting Drive upload process...');
        console.log('📂 Selected folder:', selectedFolder);
        console.log('📎 Attachments count:', attachments.length);
        setSuccess('Subiendo archivos a Drive...');
        uploadedFiles = await uploadAttachmentsToDrive();
        console.log('📤 Drive upload completed. Files:', uploadedFiles);
      }

      setSuccess('Enviando correo...');

      // If we have attachments, use FormData approach
      if (attachments.length > 0) {
        const formData = new FormData();
        
        // Add email data as JSON string
        formData.append('to', emailAddress);
        formData.append('subject', emailContent.subject);
        formData.append('htmlContent', emailContent.message);
        formData.append('from', sender.value);
        formData.append('fromName', sender.name);
        formData.append('fromPass', sender.pass);
        formData.append('sendBccToSender', sendBccToSender.toString());
        formData.append('cc', ccEmails);
        
        // Add drive links if any
        if (uploadedFiles.length > 0) {
          formData.append('driveLinks', JSON.stringify(uploadedFiles.map(file => ({
            name: file.name,
            link: file.driveLink
          }))));
        }

        // Add row data
        Object.keys(rowData).forEach(key => {
          if (rowData[key] !== null && rowData[key] !== undefined) {
            formData.append(key, String(rowData[key]));
          }
        });

        // Add attachments
        attachments.forEach((attachment, index) => {
          formData.append(`attachment`, attachment.file);
        });

        const response = await fetch(`${API_URL}/email/send-welcome`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al enviar el correo');
        }

        const result = await response.json();
        console.log('Email enviado exitosamente:', result);
        
        // Show BCC info if sent
        if (result.bccSent) {
          console.log('📧 Copia BCC enviada a:', result.bccSent);
        }
      } else {
        // No attachments, use JSON approach
        const emailData = {
          to: emailAddress,
          htmlContent: emailContent.message,
          subject: emailContent.subject,
          from: sender.value,
          fromName: sender.name,
          fromPass: sender.pass,
          sendBccToSender: sendBccToSender,
          cc: ccEmails,
          driveLinks: uploadedFiles.map(file => ({
            name: file.name,
            link: file.driveLink
          })),
          ...rowData
        };

        const response = await fetch(`${API_URL}/email/send-welcome`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al enviar el correo');
        }

        const result = await response.json();
        console.log('Email enviado exitosamente:', result);
        
        // Show BCC info if sent
        if (result.bccSent) {
          console.log('📧 Copia BCC enviada a:', result.bccSent);
        }
      }

      setSuccess(sendBccToSender ? '✅ ¡Correo enviado exitosamente! 📧 Copia BCC enviada al remitente para su archivo personal' : '¡Correo enviado exitosamente!');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      setError(error.message || 'Error al enviar el correo. Por favor, intenta de nuevo.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="mail-modal-overlay" onClick={onClose}>
      <div className="mail-modal-content" onClick={e => e.stopPropagation()}>
        <div className="mail-modal-header">
          <h3>📧 Enviar Correo Electrónico</h3>
          <button 
            className="close-modal-btn"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="mail-modal-body">
          {error && (
            <div className="mail-error">
              {error}
            </div>
          )}
          {success && (
            <div className="mail-success">
              {success}
            </div>
          )}
          <div className="mail-field">
            <label>Remitente:</label>
            <select
              className="mail-input"
              value={sender.value + '-' + sender.pass}
              onChange={e => {
                const [value, pass] = e.target.value.split('-');
                const found = SENDER_OPTIONS.find(opt => opt.value === value && opt.pass === pass);
                setSender(found || SENDER_OPTIONS[0]);
              }}
              disabled={isGenerating}
            >
              {SENDER_OPTIONS.map(opt => (
                <option key={opt.value + '-' + opt.pass} value={opt.value + '-' + opt.pass}>{opt.label}</option>
              ))}
            </select>
            <small className="email-type-help">Elige el remitente del correo</small>
          </div>
          <div className="mail-field">
            <label style={{ display: 'flex', alignItems: 'center', backgroundColor: '#e8f5e8', padding: '10px', borderRadius: '5px', border: '1px solid #4caf50' }}>
              <input
                type="checkbox"
                checked={sendBccToSender}
                onChange={(e) => setSendBccToSender(e.target.checked)}
                disabled={isGenerating}
                style={{ marginRight: '8px', transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>
                📧 Enviar copia oculta (BCC) al remitente
              </span>
            </label>
            <small className="email-type-help" style={{ color: '#2e7d32', fontWeight: '500' }}>
              ✅ RECOMENDADO: El remitente recibirá una copia oculta del correo enviado para su archivo personal
            </small>
          </div>
          <div className="mail-field">
            <label>Para:</label>
            <input 
              type="email" 
              value={extractEmail(rowData)} 
              readOnly 
              className="mail-input"
            />
          </div>
          
          <div className="mail-field">
            <label>CC (Copia):</label>
            <input 
              type="text" 
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              placeholder="email1@ejemplo.com, email2@ejemplo.com"
              className="mail-input"
              disabled={isGenerating}
            />
            <small className="email-type-help">
              Ingresa direcciones de correo separadas por comas para enviar copias
            </small>
          </div>
          
          {/* Selector de tipo de email */}
          <div className="mail-field">
            <label>Tipo de Correo:</label>
            <div className="email-type-container">
              <select 
                className="mail-input"
                value={emailType}
                onChange={(e) => setEmailType(e.target.value)}
                disabled={isGenerating}
              >
                <optgroup label="💰 Recibos">
                  <option value="recibo">💰 Enviar Recibo</option>
                </optgroup>
                <optgroup label="🚗 Autos">
                  <option value="nueva_autos">🆕 Nueva Póliza Auto</option>
                  <option value="renovacion_autos">🔄 Renovación Auto</option>
                </optgroup>
                <optgroup label="💙 Vida">
                  <option value="nueva_vida">🆕 Nueva Póliza Vida</option>
                  <option value="renovacion_vida">🔄 Renovación Vida</option>
                </optgroup>
                <optgroup label="🏥 GMM">
                  <option value="nueva_gmm">🆕 Nueva Póliza GMM</option>
                  <option value="renovacion_gmm">🔄 Renovación GMM</option>
                </optgroup>
                <optgroup label="🏠 Hogar">
                  <option value="nueva_hogar">🆕 Nueva Póliza Hogar</option>
                  <option value="renovacion_hogar">🔄 Renovación Hogar</option>
                </optgroup>
                <optgroup label="🐕 Mascotas">
                  <option value="nueva_mascotas">🆕 Nueva Póliza Mascotas</option>
                  <option value="renovacion_mascotas">🔄 Renovación Mascotas</option>
                </optgroup>
                <optgroup label="🏢 Negocio">
                  <option value="nueva_negocio">🆕 Nueva Póliza Negocio</option>
                  <option value="renovacion_negocio">🔄 Renovación Negocio</option>
                </optgroup>
                <optgroup label="🚛 RC">
                  <option value="nueva_rc">🆕 Nueva Póliza RC</option>
                  <option value="renovacion_rc">🔄 Renovación RC</option>
                </optgroup>
                <optgroup label="🚚 Transporte">
                  <option value="nueva_transporte">🆕 Nueva Póliza Transporte</option>
                  <option value="renovacion_transporte">🔄 Renovación Transporte</option>
                </optgroup>
                <optgroup label="📋 General">
                  <option value="nueva_general">🆕 Nueva Póliza General</option>
                  <option value="renovacion_general">🔄 Renovación General</option>
                </optgroup>
                <optgroup label="📧 Otros">
                  <option value="bienvenida">🎉 Bienvenida / Confirmación</option>
                  <option value="recordatorio">⚠️ Recordatorio de Pago</option>
                  <option value="informacion">📋 Información General</option>
                </optgroup>
              </select>
              {rowData && (
                <div className="auto-detection-indicator">
                  <span className="detection-badge">
                    🔍 Detectado automáticamente: {emailType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {tableType && (
                      <span className="table-type-info">
                        {' '}(Tabla: {tableType})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
            <small className="email-type-help">
              El tipo de póliza se detecta automáticamente basado en los datos. Puede cambiarlo manualmente si es necesario.
            </small>
          </div>
          
          <div className="mail-field">
            <label>Asunto:</label>
            <input 
              type="text" 
              className="mail-input"
              placeholder={isGenerating ? "Generando asunto..." : "Ingrese asunto..."}
              value={emailContent.subject}
              onChange={(e) => setEmailContent(prev => ({ ...prev, subject: e.target.value }))}
              disabled={isGenerating}
            />
          </div>
          <div className="mail-field">
            <label>Mensaje:</label>
            <textarea 
              className="mail-textarea"
              placeholder={isGenerating ? "Generando contenido..." : "Escriba su mensaje..."}
              value={plainTextMessage}
              onChange={(e) => {
                const plainText = e.target.value;
                setPlainTextMessage(plainText);
                
                // Convertir el texto plano a HTML para el envío
                const htmlContent = plainTextToHtml(plainText);
                setEmailContent(prev => ({ ...prev, message: htmlContent }));
              }}
              rows={12}
              disabled={isGenerating}
            />
            <small className="email-type-help">
              El mensaje se muestra en formato de texto plano para facilitar la edición. Los saltos de línea se convertirán automáticamente a HTML.
            </small>
          </div>

          {/* Attachments Section */}
          <div className="mail-field">
            <label>Adjuntos:</label>
            <div className="attachments-section">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                style={{ display: 'none' }}
                accept="*/*"
              />
              <div className="attachment-controls">
                <button 
                  type="button"
                  className="attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating || isUploading}
                >
                  📎 Adjuntar Archivos
                </button>
                <button 
                  type="button"
                  className="drive-folder-btn"
                  onClick={() => setShowDriveSelector(true)}
                  disabled={isGenerating || isUploading}
                >
                  📁 Seleccionar Carpeta Drive
                </button>
              </div>
              
              {selectedFolder && (
                <div className="selected-folder">
                  <span className="folder-info">
                    📁 Carpeta seleccionada: <strong>{selectedFolder.name}</strong>
                  </span>
                  <button 
                    type="button"
                    className="remove-folder-btn"
                    onClick={() => setSelectedFolder(null)}
                  >
                    ✕
                  </button>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="attachments-list">
                  {attachments.map(attachment => (
                    <div key={attachment.id} className="attachment-item">
                      <div className="attachment-info">
                        <span className="attachment-name">{attachment.name}</span>
                        <span className="attachment-size">({formatFileSize(attachment.size)})</span>
                      </div>
                      <button 
                        type="button"
                        className="remove-attachment-btn"
                        onClick={() => removeAttachment(attachment.id)}
                        disabled={isUploading}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="attachments-summary">
                    Total: {attachments.length} archivo(s) - {formatFileSize(attachments.reduce((sum, att) => sum + att.size, 0))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mail-actions">
            <button 
              className="regenerate-btn"
              onClick={generateEmailContent}
              disabled={isGenerating || isUploading}
            >
              {isGenerating ? 'Generando...' : 'Regenerar Contenido'}
            </button>
          </div>
        </div>
        <div className="mail-modal-footer">
          <button 
            className="cancel-btn"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="send-btn"
            onClick={handleSendEmail}
            disabled={isGenerating || isUploading || !emailContent.subject || !emailContent.message || !extractEmail(rowData)}
          >
            {isUploading ? 'Subiendo archivos...' : 'Enviar Correo'}
          </button>
        </div>

        {/* Drive Selector Modal */}
        <DriveSelector
          isOpen={showDriveSelector}
          onClose={() => setShowDriveSelector(false)}
          onFolderSelect={setSelectedFolder}
          selectedFolderId={selectedFolder?.id}
        />
      </div>
    </div>
  );
};

export default TableMail; 