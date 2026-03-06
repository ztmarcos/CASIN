import React, { useState, useEffect, useRef } from 'react';
import { API_URL, FIREBASE_API } from '../../config/api.js';
import DriveSelector from '../Drive/DriveSelector.jsx';
import { getSenderOptions } from '../../config/users.js';
import { useTeam } from '../../context/TeamContext';
import './TableMail.css';
import activityLogger from '../../utils/activityLogger';
import firebaseService from '../../services/firebaseService.js';

const SENDER_OPTIONS = getSenderOptions();

// Default footer options base - NOTA: El logo siempre se incluye automáticamente
const DEFAULT_FOOTERS_BASE = [
  { id: 'navidad', name: 'Felices Fiestas', path: '/footers/casinnavidad.jpeg' },
  { id: 'none', name: 'Sin imagen adicional', path: null }
];

// Función para obtener footers por defecto filtrados
const getDefaultFooters = () => {
  const hiddenFooters = JSON.parse(localStorage.getItem('hiddenDefaultFooters') || '[]');
  return DEFAULT_FOOTERS_BASE.filter(footer => !hiddenFooters.includes(footer.id));
};

// Logo de CASIN que siempre se incluye
const CASIN_LOGO = {
  id: 'logo',
  name: 'Logo CASIN',
  path: '/footers/casin-logo.png'
};

// Templates de email por ramo y tipo (nueva póliza o renovación)
const EMAIL_TEMPLATES = {
  // ===== AUTOS =====
  autos: {
    nueva: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurada (o), buen día</strong></p>
        
        <p>Tenemos el gusto de enviar la emisión del seguro de Hogar con no. de póliza <strong>${data.numero_poliza || 'N/A'}</strong> a su nombre, que inicia la vigencia del <strong>${data.vigencia_inicio || 'N/A'}</strong> al <strong>${data.vigencia_fin || 'N/A'}</strong>, con un costo anual de <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} pesos</strong>, asegurados en la compañía de seguros <strong>${data.aseguradora || 'Grupo Nacional Provincial S.A.B'}</strong>.</p>
        
        <p>Se adjunta carátula, condiciones generales y el aviso de cobro para la amable programación del pago; el plazo vence el día <strong>${data.vigencia_fin ? new Date(data.vigencia_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</strong> a las 12:00 del día, puede ser liquidado mediante tarjeta de crédito a 3 o 6 MSI, pagando con cheque o efectivo en ventanilla bancaria o transferencia como pago de servicios.</p>
        
        <p>Agradecemos nos informe qué forma de pago utilizará para poder apoyarle.</p>
        
        <p><strong>Importante:</strong> Favor de revisar factura anexa.</p>
        
        <p>En caso de requerir algún cambio de uso del CFDI o cambie de domicilio fiscal o régimen, favor de enviarnos la constancia de identificación fiscal no mayor a 2 meses de antigüedad para actualizar sus datos y emitir su factura con sus datos vigentes, una vez emitida, ya no podrán hacer cambios.</p>
        
        <p>Para dar cumplimiento a las disposiciones legales agradecemos, nos dé acuse de recibido de este correo.</p>
        
        <p>Cordialmente,<br>
        <strong>CASIN Seguros</strong></p>
      </div>
    `,
    renovacion: (data) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || data.asegurado || 'Cliente'}</strong></p>
        
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
        <p><strong>Apreciable Asegurado ${data.contratante || data.nombre_contratante || data.asegurado || 'Cliente'}</strong></p>
        
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
        <p><strong>Estimada ${data.contratante || data.nombre_contratante || data.asegurado || 'Cliente'}</strong>, buen día</p>
        
        <p>Por este medio, deseo informar de la renovación del seguro de ${data.ramo || 'Vida'} del Sr. ${data.contratante || data.nombre_contratante || data.asegurado || 'Cliente'} de la vigencia ${data.vigencia_inicio || 'N/A'}-${data.vigencia_fin ? new Date(data.vigencia_fin).getFullYear() : 'N/A'}, asegurado en <strong>${data.aseguradora || 'AXA Seguros'}</strong>.</p>
        
        <p>Adjunto el recibo de cobro por <strong>$${data.pago_total_o_prima_total || data.prima_neta || 'N/A'} ${data.moneda || 'dls'}</strong> de la póliza de ${data.ramo || 'vida'} no. <strong>${data.numero_poliza || 'N/A'}</strong> para su revisión y amable programación del pago con fecha límite ${data.vigencia_fin ? new Date(data.vigencia_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}.</p>
        
        <p>Quedo al pendiente de su amable confirmación de recibido.</p>
        
        <p>Saludos cordiales!!</p>
      </div>
    `
  }
};

const TableMail = ({ isOpen, onClose, rowData, tableType }) => {
  const { userTeam } = useTeam();
  
  // Función para obtener el sender por defecto basado en el equipo
  const getDefaultSender = () => {
    // Si es Test Team, usar ztmarcos@gmail.com
    if (userTeam?.emailConfig?.senderEmail) {
      const teamSender = SENDER_OPTIONS.find(s => s.email === userTeam.emailConfig.senderEmail);
      if (teamSender) {
        console.log('📧 Using team email config:', userTeam.emailConfig.senderEmail);
        return teamSender;
      }
    }
    // Por defecto, usar CASIN Seguros
    return SENDER_OPTIONS[0];
  };
  
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
  const [sender, setSender] = useState(getDefaultSender());
  const [sendBccToSender, setSendBccToSender] = useState(true); // Por defecto activado
  const [ccEmails, setCcEmails] = useState(''); // Campo CC manual
  const [autoBccToCasin, setAutoBccToCasin] = useState(true); // BCC automático a casinseguros@gmail.com
  const [plainTextMessage, setPlainTextMessage] = useState(''); // Mensaje en texto plano para edición
  const [isMinimized, setIsMinimized] = useState(false); // Estado de minimización
  // Initialize selected footers with all available by default (except 'none')
  const [selectedFooters, setSelectedFooters] = useState(() => {
    // Try to load from localStorage first
    const saved = localStorage.getItem('selectedFooters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved footers:', e);
      }
    }
    // Default: all footers except 'none'
    return DEFAULT_FOOTERS_BASE.filter(f => f.id !== 'none').map(f => f.id);
  }); // Footers seleccionados (array para múltiples)
  const [customFooters, setCustomFooters] = useState([]); // Footers personalizados subidos
  const [defaultFooters, setDefaultFooters] = useState(getDefaultFooters()); // Footers por defecto filtrados
  const footerInputRef = useRef(null); // Ref para input de footer
  const [isSending, setIsSending] = useState(false); // Estado para animación de "Enviando..."
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false); // Estado para animación de "Mail enviado!"
  const [isLoadingFooters, setIsLoadingFooters] = useState(false); // Estado para cargar footers desde Firestore
  const [pendingFooter, setPendingFooter] = useState(null); // Footer pendiente de confirmación

  // Actualizar sender cuando cambia el equipo o se abre el modal
  useEffect(() => {
    if (isOpen) {
      const defaultSender = getDefaultSender();
      setSender(defaultSender);
      console.log('📧 TableMail opened, setting sender to:', defaultSender.email);
    }
  }, [isOpen, userTeam?.id]);

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
    if (data.nombre_contratante && !hasAutoFields && !data.ramo && !data.tipo_poliza) {
      console.log('✅ Detectando como vida por lógica de exclusión (tiene contratante, no tiene auto/ramo/tipo_poliza)');
      return prefix + 'vida';
    }
    
    // Por defecto: general
    console.log('🔄 No se pudo detectar tipo específico, usando general');
    return prefix + 'general';
  };

  // Cargar footers personalizados desde Firestore al montar el componente
  useEffect(() => {
    loadCustomFooters();
  }, []);

  // Save selected footers to localStorage whenever they change
  useEffect(() => {
    if (selectedFooters.length > 0) {
      localStorage.setItem('selectedFooters', JSON.stringify(selectedFooters));
      console.log('💾 Saved selected footers to localStorage:', selectedFooters);
    }
  }, [selectedFooters]);

  // Función para cargar footers personalizados desde Firestore
  const loadCustomFooters = async () => {
    setIsLoadingFooters(true);
    try {
      console.log('📥 Cargando footers personalizados desde Firestore...');
      // Usar getAll con nocache=true para obtener datos frescos
      // Este método devuelve un array directamente
      const footersArray = await firebaseService.getAll('email_footers', 100, false, true);
      console.log('✅ Footers cargados:', footersArray);
      console.log('📋 Footers count:', footersArray.length);
      
      // Convertir los footers de Firestore al formato esperado
      const formattedFooters = footersArray.map(footer => ({
        id: footer.firebase_doc_id || footer.id,
        name: footer.name,
        base64: footer.base64,
        type: footer.type,
        createdAt: footer.createdAt
      }));
      
      console.log('✅ Footers formateados:', formattedFooters);
      setCustomFooters(formattedFooters);
      
      // Auto-select all new custom footers that aren't already selected
      const newFooterIds = formattedFooters
        .map(f => f.id)
        .filter(id => !selectedFooters.includes(id));
      
      if (newFooterIds.length > 0) {
        console.log('🎯 Auto-selecting new custom footers:', newFooterIds);
        setSelectedFooters(prev => [...prev, ...newFooterIds]);
      }
    } catch (error) {
      console.error('❌ Error al cargar footers personalizados:', error);
      console.error('❌ Error details:', error.message, error.stack);
      // No mostrar error al usuario, simplemente continuar sin footers personalizados
    } finally {
      setIsLoadingFooters(false);
    }
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
      setAutoBccToCasin(true); // Reset BCC automático a CASIN - SIEMPRE activado por defecto
      setCcEmails(''); // Reset CC field
      setPlainTextMessage(''); // Reset plain text message
      setIsMinimized(false); // Reset minimized state
      // Don't reset selectedFooters - they should persist
      setSubjectManuallyEdited(false); // Reset subject edit flag
      // NO resetear customFooters aquí - deben persistir entre aperturas del modal
      setIsSending(false); // Reset sending animation
      setShowSuccessAnimation(false); // Reset success animation
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
      // Recargar footers cuando se abre el modal para obtener los más recientes
      loadCustomFooters();
      
      // Detectar automáticamente el tipo de póliza cuando se abre el modal
      const detectedType = detectPolicyType(rowData);
      console.log('🔍 Tipo de póliza detectado automáticamente:', detectedType);
      console.log('📋 Datos analizados:', {
        tableType,
        hasAutoFields: ['descripcion_del_vehiculo', 'modelo', 'placas', 'marca', 'serie', 'anio', 'color', 'numero_motor', 'numero_serie', 'tipo_vehiculo'].some(field => rowData[field] && rowData[field].toString().trim() !== ''),
        ramo: rowData.ramo,
        tipo_poliza: rowData.tipo_poliza,
        aseguradora: rowData.aseguradora,
        nombre_contratante: rowData.nombre_contratante,
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

  // Track if user manually edited the subject
  const [subjectManuallyEdited, setSubjectManuallyEdited] = useState(false);

  // Regenerar contenido cuando cambian los footers seleccionados
  useEffect(() => {
    if (isOpen && rowData && emailType && emailContent.message) {
      console.log('🔄 Footers cambiaron, regenerando contenido del email...');
      generateEmailContent(true); // Pass true to indicate footer change only
    }
  }, [selectedFooters]);

  const generateEmailContent = async (footerChangeOnly = false) => {
    setIsGenerating(true);
    setError(null);

    try {
      const emailAddress = extractEmail(rowData);
      if (!emailAddress) {
        throw new Error('No se encontró una dirección de correo válida');
      }

      console.log('Generando correo tipo:', emailType, 'para:', { ...rowData, email: emailAddress });
      console.log('🔄 Footer change only:', footerChangeOnly, 'Subject manually edited:', subjectManuallyEdited);

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
        } else if (rowData.nombre_contratante && rowData.numero_poliza) {
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
      let htmlContent = template(rowData);
      
      // Add footer to HTML content
      const footerHTML = getFooterHTML();
      if (footerHTML) {
        // Insert footer before the last closing div tag (main container)
        const lastDivIndex = htmlContent.lastIndexOf('</div>');
        if (lastDivIndex !== -1) {
          htmlContent = htmlContent.slice(0, lastDivIndex) + footerHTML + htmlContent.slice(lastDivIndex);
        } else {
          // If no closing div found, append at the end
          htmlContent = htmlContent + footerHTML;
        }
      }
      
      // Generar asunto basado en el tipo de email, ramo y tipo de póliza
      let subject = 'Póliza de Seguro - CASIN Seguros';
      
      if (emailType === 'nueva_autos' || (ramo === 'autos' && tipo === 'nueva')) {
        subject = `Nueva Póliza Seguro Auto - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_autos' || (ramo === 'autos' && tipo === 'renovacion')) {
        subject = `Renovación Seguro Auto - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_vida' || (ramo === 'vida' && tipo === 'nueva')) {
        subject = `Nueva Póliza Seguro Vida - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_vida' || (ramo === 'vida' && tipo === 'renovacion')) {
        subject = `Renovación Seguro Vida - ${rowData.nombre_contratante || rowData.contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_gmm' || (ramo === 'gmm' && tipo === 'nueva')) {
        subject = `Nueva Póliza GMM - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_gmm' || (ramo === 'gmm' && tipo === 'renovacion')) {
        subject = `Renovación GMM - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_hogar' || (ramo === 'hogar' && tipo === 'nueva')) {
        subject = `Nueva Póliza Seguro Hogar - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_hogar' || (ramo === 'hogar' && tipo === 'renovacion')) {
        subject = `Renovación Seguro Hogar - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_mascotas' || (ramo === 'mascotas' && tipo === 'nueva')) {
        subject = `Nueva Póliza Mascotas - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_mascotas' || (ramo === 'mascotas' && tipo === 'renovacion')) {
        subject = `Renovación Mascotas - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_negocio' || (ramo === 'negocio' && tipo === 'nueva')) {
        subject = `Nueva Póliza Negocio - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_negocio' || (ramo === 'negocio' && tipo === 'renovacion')) {
        subject = `Renovación Negocio - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_rc' || (ramo === 'rc' && tipo === 'nueva')) {
        subject = `Nueva Póliza RC - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_rc' || (ramo === 'rc' && tipo === 'renovacion')) {
        subject = `Renovación RC - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_transporte' || (ramo === 'transporte' && tipo === 'nueva')) {
        subject = `Nueva Póliza Transporte - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_transporte' || (ramo === 'transporte' && tipo === 'renovacion')) {
        subject = `Renovación Transporte - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'nueva_general' || (ramo === 'default' && tipo === 'nueva')) {
        subject = `Nueva Póliza - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'renovacion_general' || (ramo === 'default' && tipo === 'renovacion')) {
        subject = `Renovación de Póliza - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'} - Póliza ${rowData.numero_poliza || 'N/A'}`;
      } else if (emailType === 'bienvenida') {
        subject = `Bienvenida - Confirmación de Póliza - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'}`;
      } else if (emailType === 'recordatorio') {
        subject = `Recordatorio de Pago - Póliza ${rowData.numero_poliza || 'N/A'} - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'}`;
      } else if (emailType === 'informacion') {
        subject = `Información de Póliza - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'}`;
      } else if (emailType === 'recibo') {
        subject = `Recibo de Cobro - Póliza ${rowData.numero_poliza || 'N/A'} - ${rowData.contratante || rowData.nombre_contratante || 'Cliente'}`;
      }

      // If this is a footer change only and subject was manually edited, preserve the current subject
      const finalSubject = (footerChangeOnly && subjectManuallyEdited) ? emailContent.subject : subject;
      
      const newEmailContent = {
        subject: finalSubject,
        message: htmlContent
      };

      console.log('Contenido generado con template:', ramo);
      console.log('📧 Subject preserved:', footerChangeOnly && subjectManuallyEdited, 'Final subject:', finalSubject);
      setEmailContent(newEmailContent);
      
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

  // Convert image file to base64 for email embedding
  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle footer image upload
  const handleFooterUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    // Validate file size (5MB limit for footers)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('La imagen del pie de página no debe exceder 5MB');
      return;
    }

    try {
      setIsLoadingFooters(true);
      const base64 = await imageToBase64(file);
      
      // Crear objeto de footer pendiente para vista previa
      const pendingFooterData = {
        name: file.name,
        base64: base64,
        type: file.type,
        isNew: true
      };
      
      setPendingFooter(pendingFooterData);
      setError(null);
      console.log('📸 Vista previa de imagen lista, esperando confirmación...');
    } catch (error) {
      console.error('❌ Error al procesar imagen:', error);
      setError('Error al procesar la imagen del pie de página');
    } finally {
      setIsLoadingFooters(false);
    }

    // Clear the input
    if (footerInputRef.current) {
      footerInputRef.current.value = '';
    }
  };

  // Confirmar y guardar el footer pendiente
  const confirmPendingFooter = async () => {
    if (!pendingFooter) return;

    try {
      setIsLoadingFooters(true);
      
      // Guardar en Firestore
      const footerData = {
        name: pendingFooter.name,
        base64: pendingFooter.base64,
        type: pendingFooter.type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('💾 Guardando footer en Firestore...');
      const result = await firebaseService.create('email_footers', footerData);
      console.log('✅ Footer guardado en Firestore:', result);
      
      // Agregar al estado local
      const customFooter = {
        id: result.id,
        name: pendingFooter.name,
        base64: pendingFooter.base64,
        type: pendingFooter.type,
        createdAt: footerData.createdAt
      };
      
      setCustomFooters(prev => [...prev, customFooter]);
      // Agregar a la selección si no está ya
      setSelectedFooters(prev => prev.includes(customFooter.id) ? prev : [...prev, customFooter.id]);
      setPendingFooter(null);
      setError(null);
      setSuccess('✅ Imagen guardada y agregada a la selección');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('❌ Error al guardar footer:', error);
      setError('Error al guardar la imagen del pie de página');
    } finally {
      setIsLoadingFooters(false);
    }
  };

  // Cancelar footer pendiente
  const cancelPendingFooter = () => {
    setPendingFooter(null);
    console.log('❌ Vista previa cancelada');
  };

  // Get footer HTML based on selection
  const getFooterHTML = () => {
    console.log('🎨 getFooterHTML called with selectedFooters:', selectedFooters);
    console.log('📋 Available customFooters:', customFooters);
    
    // SIEMPRE incluir el logo de CASIN
    const baseUrl = window.location.origin;
    const logoSrc = `${baseUrl}${CASIN_LOGO.path}`;
    
    let footerHTML = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <img src="${logoSrc}" alt="CASIN Seguros - Logo" style="max-width: 105px; height: auto; display: block; margin: 0 auto;" />
    `;

    // Agregar todas las imágenes seleccionadas (excepto 'none')
    const validFooters = selectedFooters.filter(id => id !== 'none');
    
    if (validFooters.length > 0) {
      console.log('🔍 Procesando footers:', validFooters);
      
      validFooters.forEach(footerId => {
        // Find footer
        let footer = defaultFooters.find(f => f.id === footerId);
        
        if (!footer) {
          footer = customFooters.find(f => f.id === footerId);
        }

        if (footer && (footer.path || footer.base64)) {
          console.log('✅ Footer encontrado:', footer.name);
          
          // Build image source
          let imageSrc = '';
          if (footer.base64) {
            imageSrc = footer.base64;
            console.log('🖼️ Usando base64 para:', footer.name);
          } else if (footer.path) {
            imageSrc = `${baseUrl}${footer.path}`;
            console.log('🖼️ Usando path para:', footer.name);
          }

          if (imageSrc) {
            footerHTML += `
        <div style="margin-top: 20px;">
          <img src="${imageSrc}" alt="${footer.name}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
        </div>
            `;
            console.log('✅ Imagen agregada:', footer.name);
          }
        }
      });
    } else {
      console.log('ℹ️ No hay imágenes adicionales seleccionadas, solo logo');
    }

    // Cerrar el div del footer
    footerHTML += `
      </div>
    `;

    console.log('📧 Footer HTML generado (primeros 200 chars):', footerHTML.substring(0, 200));
    return footerHTML;
  };

  // Helper function to get selected footers data (multiple)
  const getSelectedFootersData = () => {
    const validFooters = selectedFooters.filter(id => id !== 'none');
    
    return validFooters.map(footerId => {
      let footer = defaultFooters.find(f => f.id === footerId);
      if (!footer) {
        footer = customFooters.find(f => f.id === footerId);
      }
      
      if (footer) {
        return {
          id: footer.id,
          name: footer.name,
          path: footer.path || null,
          base64: footer.base64 || null,
          type: footer.type || 'image/jpeg'
        };
      }
      return null;
    }).filter(f => f !== null);
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

  // Función para minimizar el modal
  const handleMinimize = () => {
    setIsMinimized(true);
  };

  // Función para restaurar el modal desde minimizado
  const handleRestore = () => {
    setIsMinimized(false);
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
    setIsSending(true); // Activar animación de "Enviando..."
    setShowSuccessAnimation(false); // Asegurar que la animación de éxito esté oculta

    try {
      let uploadedFiles = [];
      
      // Upload attachments to Drive if folder is selected
      if (attachments.length > 0 && selectedFolder) {
        console.log('📤 Starting Drive upload process...');
        console.log('📂 Selected folder:', selectedFolder);
        console.log('📎 Attachments count:', attachments.length);
        uploadedFiles = await uploadAttachmentsToDrive();
        console.log('📤 Drive upload completed. Files:', uploadedFiles);
      }

      // Prepare footer data (múltiples imágenes)
      const footerData = {
        selectedFooterIds: selectedFooters,
        logoPath: CASIN_LOGO.path,
        footerImages: getSelectedFootersData() // Array de imágenes
      };
      console.log('🖼️ Footer data to send:', footerData);
      console.log('📧 DEBUG - Email content at send time:', {
        subject: emailContent.subject,
        messageLength: emailContent.message?.length,
        messagePreview: emailContent.message?.substring(0, 200)
      });
      console.log('📧 DEBUG - Selected footers:', selectedFooters);
      console.log('📧 DEBUG - Footer images:', getSelectedFootersData());

      // IMPORTANTE: Asegurarse de que el footer esté incluido en el HTML final
      let finalHtmlContent = emailContent.message;
      const footerHTML = getFooterHTML();
      
      // Verificar si el footer ya está en el HTML (buscar el logo de CASIN)
      const hasFooter = finalHtmlContent.includes('casin-logo.png') || finalHtmlContent.includes('Logo CASIN');
      
      if (!hasFooter && footerHTML) {
        console.log('⚠️ Footer not found in HTML, adding it now...');
        // El footer no está en el HTML, agregarlo
        const lastDivIndex = finalHtmlContent.lastIndexOf('</div>');
        if (lastDivIndex !== -1) {
          finalHtmlContent = finalHtmlContent.slice(0, lastDivIndex) + footerHTML + finalHtmlContent.slice(lastDivIndex);
        } else {
          finalHtmlContent = finalHtmlContent + footerHTML;
        }
        console.log('✅ Footer added to HTML');
      } else {
        console.log('✅ Footer already present in HTML');
      }

      // Validar App Password cuando no es CASIN por defecto
      const isDefaultCASINSender = sender.email === 'casinseguros@gmail.com';
      if (!isDefaultCASINSender && (!sender.pass || String(sender.pass).trim() === '')) {
        throw new Error('Falta la contraseña de aplicación para este remitente. Configura la variable de entorno del equipo (ej. VITE_SMTP_PASS_MARCOS) en el entorno de build y vuelve a desplegar.');
      }

      // If we have attachments, use FormData approach
      if (attachments.length > 0) {
        const formData = new FormData();
        
        // Para FormData, usar HTML sin imágenes base64 embebidas (solo URLs)
        // y enviar footerData por separado para que el backend las procese
        let htmlForFormData = emailContent.message;
        
        // Regenerar el footer HTML pero solo con URLs (sin base64)
        const baseUrl = window.location.origin;
        const logoSrc = `${baseUrl}${CASIN_LOGO.path}`;
        let footerHTMLForFormData = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <img src="${logoSrc}" alt="CASIN Seguros - Logo" style="max-width: 105px; height: auto; display: block; margin: 0 auto;" />
    `;
        
        // Solo agregar footers que tengan path (no base64)
        const validFooters = selectedFooters.filter(id => id !== 'none');
        validFooters.forEach(footerId => {
          let footer = defaultFooters.find(f => f.id === footerId);
          if (footer && footer.path) {
            const imageSrc = `${baseUrl}${footer.path}`;
            footerHTMLForFormData += `
        <div style="margin-top: 20px;">
          <img src="${imageSrc}" alt="${footer.name}" style="max-width: 100%; height: auto; display: block; margin: 0 auto;" />
        </div>
            `;
          }
        });
        
        footerHTMLForFormData += `</div>`;
        
        // Reemplazar el footer en el HTML
        const hasFooter = htmlForFormData.includes('casin-logo.png');
        if (hasFooter) {
          // Remover el footer existente y agregar el nuevo (sin base64)
          const footerStart = htmlForFormData.indexOf('<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;');
          if (footerStart !== -1) {
            const footerEnd = htmlForFormData.indexOf('</div>', footerStart) + 6;
            htmlForFormData = htmlForFormData.substring(0, footerStart) + footerHTMLForFormData + htmlForFormData.substring(footerEnd);
          }
        }
        
        // Add email data
        formData.append('to', emailAddress);
        formData.append('subject', emailContent.subject);
        formData.append('htmlContent', htmlForFormData);
        formData.append('from', sender.value);
        formData.append('fromName', sender.name);
        if (sender.pass) {
          formData.append('fromPass', sender.pass);
        }
        
        console.log('📧 Sending email with sender:', {
          from: sender.value,
          name: sender.name,
          fromPassPresent: !!sender.pass
        });
        formData.append('sendBccToSender', sendBccToSender.toString());
        formData.append('autoBccToCasin', autoBccToCasin.toString());
        formData.append('cc', ccEmails);
        
        // NO enviar footerData en FormData - las imágenes ya están en el HTML
        // Si hay imágenes base64, ya están embebidas en htmlForFormData
        // El backend las procesará directamente del HTML
        console.log('📦 NOT sending footerData in FormData - images already in HTML');
        
        // Add drive links if any
        if (uploadedFiles.length > 0) {
          formData.append('driveLinks', JSON.stringify(uploadedFiles.map(file => ({
            name: file.name,
            link: file.driveLink
          }))));
        }

        // Add row data (solo campos esenciales para reducir tamaño)
        const essentialFields = ['numero_poliza', 'contratante', 'aseguradora', 'e_mail', 'email'];
        Object.keys(rowData).forEach(key => {
          if (rowData[key] !== null && rowData[key] !== undefined) {
            const value = String(rowData[key]);
            // Solo agregar campos esenciales o campos pequeños
            if (essentialFields.includes(key) || value.length < 500) {
              formData.append(key, value);
            }
          }
        });

        // Add attachments
        attachments.forEach((attachment, index) => {
          formData.append(`attachment`, attachment.file);
        });

        console.log('📦 FormData size estimate:', {
          htmlLength: htmlForFormData.length,
          attachmentsCount: attachments.length,
          rowDataFields: Object.keys(rowData).length
        });

        const response = await fetch(FIREBASE_API.sendEmail, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al enviar el correo');
        }

        const result = await response.json();
        console.log('Email enviado exitosamente:', result);
        
        // Log email activity
        await activityLogger.logEmailSent(
          emailAddress,
          emailContent.subject,
          rowData.sourceTable || rowData.table || 'unknown',
          {
            hasAttachments: true,
            attachmentCount: attachments.length,
            hasDriveLinks: uploadedFiles.length > 0,
            messageId: result.messageId
          }
        );
        
        // Show BCC info if sent
        if (result.bccSent) {
          console.log('📧 Copia BCC enviada a:', result.bccSent);
        }
      } else {
        // No attachments, use JSON approach
        const emailData = {
          to: emailAddress,
          htmlContent: finalHtmlContent,
          subject: emailContent.subject,
          from: sender.value,
          fromName: sender.name,
          fromPass: sender.pass,
          sendBccToSender: sendBccToSender,
          autoBccToCasin: autoBccToCasin,
          cc: ccEmails,
          driveLinks: uploadedFiles.map(file => ({
            name: file.name,
            link: file.driveLink
          })),
          footerData: footerData,
          ...rowData
        };
        
        console.log('📧 Sending email with footer data:', footerData);

        const response = await fetch(FIREBASE_API.sendEmail, {
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
        
        // Log email activity
        await activityLogger.logEmailSent(
          emailAddress,
          emailContent.subject,
          rowData.sourceTable || rowData.table || 'unknown',
          {
            hasAttachments: false,
            messageId: result.messageId
          }
        );
        
        // Show BCC info if sent
        if (result.bccSent) {
          console.log('📧 Copia BCC enviada a:', result.bccSent);
        }
      }

      const bccInfo = [];
      if (sendBccToSender) bccInfo.push('remitente');
      if (autoBccToCasin) bccInfo.push('casinseguros@gmail.com');
      
      const bccMessage = bccInfo.length > 0 
        ? ` 📧 Copias BCC enviadas a: ${bccInfo.join(' y ')}`
        : '';
      
      // Desactivar animación de "Enviando..." y activar animación de éxito
      setIsSending(false);
      setShowSuccessAnimation(true);
      setSuccess(`✅ ¡Correo enviado exitosamente!${bccMessage}`);
      
      // Cerrar modal después de mostrar la animación de éxito
      setTimeout(() => {
        setShowSuccessAnimation(false);
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      setIsSending(false); // Desactivar animación de "Enviando..." en caso de error
      setShowSuccessAnimation(false); // Asegurar que la animación de éxito esté oculta
      setError(error.message || 'Error al enviar el correo. Por favor, intenta de nuevo.');
    }
  };

  console.log('🎨 TableMail render check:', { isOpen, hasRowData: !!rowData, isMinimized, tableType });
  
  if (!isOpen) {
    console.log('❌ TableMail not rendering: isOpen is false');
    return null;
  }

  const emailAddress = extractEmail(rowData);
  console.log('📧 Email address extracted:', emailAddress);
  
  if (!emailAddress) {
    console.warn('⚠️ No email address found in rowData - modal will show but user needs to enter email manually');
  }

  // Si está minimizado, mostrar solo el indicador flotante
  if (isMinimized) {
    return (
      <div className="mail-minimized-indicator" onClick={handleRestore}>
        <div className="minimized-content">
          <span className="minimized-icon">📧</span>
          <span className="minimized-text">Borrador de Email</span>
          <span className="minimized-recipient">{extractEmail(rowData) || 'Sin destinatario'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mail-modal-overlay">
      {/* Modal de confirmación de imagen */}
      {pendingFooter && (
        <div className="footer-confirmation-overlay">
          <div className="footer-confirmation-modal">
            <h3>📸 Vista Previa de Nueva Imagen</h3>
            <div className="footer-confirmation-preview">
              <img 
                src={pendingFooter.base64} 
                alt={pendingFooter.name}
                className="footer-confirmation-image"
              />
              <p className="footer-confirmation-name">{pendingFooter.name}</p>
            </div>
            <div className="footer-confirmation-info">
              <p>Esta imagen se guardará permanentemente y estará disponible para futuros correos.</p>
              <p><strong>¿Deseas guardar y usar esta imagen?</strong></p>
            </div>
            <div className="footer-confirmation-actions">
              <button
                className="footer-confirm-btn"
                onClick={confirmPendingFooter}
                disabled={isLoadingFooters}
              >
                {isLoadingFooters ? 'Guardando...' : '✅ Confirmar y Guardar'}
              </button>
              <button
                className="footer-cancel-btn"
                onClick={cancelPendingFooter}
                disabled={isLoadingFooters}
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mail-modal-content" onClick={e => e.stopPropagation()}>
        <button 
          className="close-modal-btn"
          onClick={onClose}
          title="Cerrar"
        >
          ×
        </button>
        <div className="mail-modal-header">
          <h3>📧 Enviar Correo Electrónico</h3>
          <div className="mail-modal-header-actions">
            <button 
              className="minimize-modal-btn"
              onClick={handleMinimize}
              title="Minimizar"
            >
              −
            </button>
          </div>
        </div>
        <div className="mail-modal-body">
          {/* Animación de "Enviando..." */}
          {isSending && (
            <div className="sending-animation-overlay">
              <div className="sending-animation">
                <div className="sending-spinner"></div>
                <div className="sending-text">Enviando correo...</div>
                <div className="sending-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {/* Animación de "Mail enviado!" */}
          {showSuccessAnimation && (
            <div className="success-animation-overlay">
              <div className="success-animation">
                <div className="success-checkmark">
                  <div className="checkmark-circle"></div>
                  <div className="checkmark-stem"></div>
                  <div className="checkmark-kick"></div>
                </div>
                <div className="success-text">¡Correo enviado exitosamente!</div>
                <div className="success-icon">✉️</div>
              </div>
            </div>
          )}

          {error && (
            <div className="mail-error">
              {error}
            </div>
          )}
          {success && !isSending && !showSuccessAnimation && (
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
            <label style={{ display: 'flex', alignItems: 'center', backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '5px', border: '1px solid #2196f3' }}>
              <input
                type="checkbox"
                checked={autoBccToCasin}
                onChange={(e) => setAutoBccToCasin(e.target.checked)}
                disabled={isGenerating}
                style={{ marginRight: '8px', transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: 'bold', color: '#1565c0' }}>
                🏢 Enviar copia oculta (BCC) a casinseguros@gmail.com
              </span>
            </label>
            <small className="email-type-help" style={{ color: '#1565c0', fontWeight: '500' }}>
              ✅ OBLIGATORIO: Todos los correos se envían con copia oculta a la empresa para archivo
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
              onChange={(e) => {
                setEmailContent(prev => ({ ...prev, subject: e.target.value }));
                setSubjectManuallyEdited(true); // Mark as manually edited
                console.log('📧 Subject manually edited:', e.target.value);
              }}
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
                let htmlContent = plainTextToHtml(plainText);
                
                // IMPORTANTE: Agregar el footer al HTML después de la conversión
                const footerHTML = getFooterHTML();
                if (footerHTML) {
                  // Insert footer before the last closing p tag
                  const lastPIndex = htmlContent.lastIndexOf('</p>');
                  if (lastPIndex !== -1) {
                    htmlContent = htmlContent.slice(0, lastPIndex) + footerHTML + htmlContent.slice(lastPIndex);
                  } else {
                    // If no closing p found, append at the end
                    htmlContent = htmlContent + footerHTML;
                  }
                }
                
                setEmailContent(prev => ({ ...prev, message: htmlContent }));
              }}
              rows={12}
              disabled={isGenerating}
            />
            <small className="email-type-help">
              El mensaje se muestra en formato de texto plano para facilitar la edición. Los saltos de línea se convertirán automáticamente a HTML. El pie de página se agregará automáticamente al enviar.
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

          {/* Footer Section */}
          <div className="mail-field footer-section">
            <label>Pie de Página del Email:</label>
            <div className="footer-info-banner">
              <span className="footer-info-icon">ℹ️</span>
              <span className="footer-info-text">
                Puedes subir una imagen y seleccionar más de una. El logo de CASIN siempre se incluye.
              </span>
            </div>
            <div className="footer-selector">
              <input
                type="file"
                ref={footerInputRef}
                onChange={handleFooterUpload}
                style={{ display: 'none' }}
                accept="image/*"
              />
              
              {isLoadingFooters && (
                <div className="footer-loading">
                  <div className="footer-loading-spinner"></div>
                  <span>Cargando imágenes...</span>
                </div>
              )}
              
              <div className="footer-options">
                {/* Logo CASIN - Siempre seleccionado, no deseleccionable */}
                <label className="footer-option selected logo-option">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    style={{ display: 'none' }}
                  />
                  <div className="footer-preview">
                    <img 
                      src={CASIN_LOGO.path}
                      alt="Logo CASIN"
                      className="footer-preview-image"
                    />
                    <span className="footer-name">Logo CASIN</span>
                    <div className="checkmark">✓</div>
                  </div>
                </label>
                
                {defaultFooters.map(footer => (
                  <label key={footer.id} className={`footer-option ${selectedFooters.includes(footer.id) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      name="footer"
                      value={footer.id}
                      checked={selectedFooters.includes(footer.id)}
                      onChange={(e) => {
                        const footerId = e.target.value;
                        console.log('🎯 Footer toggled (DEFAULT):', footerId);
                        
                        if (selectedFooters.includes(footerId)) {
                          // Deseleccionar - pedir confirmación
                          const confirmDeselect = window.confirm(
                            `¿Estás seguro de que deseas deseleccionar "${footer.name}"?\n\nEsta imagen ya no se incluirá en los emails.`
                          );
                          
                          if (confirmDeselect) {
                            setSelectedFooters(prev => prev.filter(id => id !== footerId));
                            console.log('✅ Footer deseleccionado:', footerId);
                          } else {
                            console.log('❌ Deselección cancelada');
                            // Keep checkbox checked
                            e.preventDefault();
                          }
                        } else {
                          // Agregar a la selección (sin confirmación)
                          setSelectedFooters(prev => [...prev, footerId]);
                          console.log('✅ Footer seleccionado:', footerId);
                        }
                      }}
                      disabled={isGenerating || isLoadingFooters}
                    />
                    <div className="footer-preview">
                      {footer.path ? (
                        <>
                          <img 
                            src={footer.path} 
                            alt={footer.name}
                            className="footer-preview-image"
                          />
                          {selectedFooters.includes(footer.id) && (
                            <div className="checkmark">✓</div>
                          )}
                          {footer.id !== 'none' && (
                            <button
                              type="button"
                              className="remove-footer-btn"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const confirmDelete = window.confirm(
                                  `¿Estás seguro de que deseas ocultar la imagen "${footer.name}"?\n\nEsta imagen dejará de aparecer en la lista de opciones.`
                                );
                                if (confirmDelete) {
                                  // Remover de DEFAULT_FOOTERS agregándolo a una lista de ocultos
                                  const hiddenFooters = JSON.parse(localStorage.getItem('hiddenDefaultFooters') || '[]');
                                  hiddenFooters.push(footer.id);
                                  localStorage.setItem('hiddenDefaultFooters', JSON.stringify(hiddenFooters));
                                  
                                  // Si estaba seleccionado, removerlo de la selección
                                  setSelectedFooters(prev => prev.filter(id => id !== footer.id));
                                  
                                  // Actualizar el estado para re-render
                                  setDefaultFooters(getDefaultFooters());
                                  setSuccess('✅ Imagen ocultada correctamente');
                                  setTimeout(() => setSuccess(null), 3000);
                                }
                              }}
                              disabled={isGenerating || isLoadingFooters}
                              title="Ocultar esta imagen de la lista"
                            >
                              ✕
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="footer-preview-placeholder">
                          <span>Sin imagen adicional</span>
                        </div>
                      )}
                      <span className="footer-name">{footer.name}</span>
                    </div>
                  </label>
                ))}
                
                {customFooters.map(footer => (
                  <label key={footer.id} className={`footer-option ${selectedFooters.includes(footer.id) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      name="footer"
                      value={footer.id}
                      checked={selectedFooters.includes(footer.id)}
                      onChange={(e) => {
                        const footerId = e.target.value;
                        console.log('🎯 Footer toggled (CUSTOM):', footerId, footer);
                        
                        if (selectedFooters.includes(footerId)) {
                          // Deseleccionar - pedir confirmación
                          const confirmDeselect = window.confirm(
                            `¿Estás seguro de que deseas deseleccionar "${footer.name}"?\n\nEsta imagen ya no se incluirá en los emails.`
                          );
                          
                          if (confirmDeselect) {
                            setSelectedFooters(prev => prev.filter(id => id !== footerId));
                            console.log('✅ Footer deseleccionado:', footerId);
                          } else {
                            console.log('❌ Deselección cancelada');
                            // Keep checkbox checked
                            e.preventDefault();
                          }
                        } else {
                          // Agregar a la selección (sin confirmación)
                          setSelectedFooters(prev => [...prev, footerId]);
                          console.log('✅ Footer seleccionado:', footerId);
                        }
                      }}
                      disabled={isGenerating || isLoadingFooters}
                    />
                    <div className="footer-preview">
                      <img 
                        src={footer.base64} 
                        alt={footer.name}
                        className="footer-preview-image"
                      />
                      {selectedFooters.includes(footer.id) && (
                        <div className="checkmark">✓</div>
                      )}
                      <span className="footer-name">{footer.name}</span>
                      <button
                        type="button"
                        className="remove-footer-btn"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Confirmar antes de eliminar
                          const confirmDelete = window.confirm(
                            `¿Estás seguro de que deseas eliminar el pie de página "${footer.name}"?\n\nEsta acción es permanente y no se puede deshacer.`
                          );
                          if (confirmDelete) {
                            try {
                              setIsLoadingFooters(true);
                              console.log('🗑️ Eliminando footer de Firestore:', footer.id);
                              await firebaseService.delete('email_footers', footer.id);
                              console.log('✅ Footer eliminado de Firestore');
                              
                              // Eliminar del estado local
                              setCustomFooters(prev => prev.filter(f => f.id !== footer.id));
                              
                              // Si el footer eliminado estaba seleccionado, removerlo
                              setSelectedFooters(prev => prev.filter(id => id !== footer.id));
                              
                              setSuccess('✅ Pie de página eliminado correctamente');
                              setTimeout(() => setSuccess(null), 3000);
                            } catch (error) {
                              console.error('❌ Error al eliminar footer:', error);
                              setError('Error al eliminar el pie de página. Por favor, intenta de nuevo.');
                              setTimeout(() => setError(null), 5000);
                            } finally {
                              setIsLoadingFooters(false);
                            }
                          }
                        }}
                        disabled={isGenerating || isLoadingFooters}
                        title="Eliminar pie de página personalizado"
                      >
                        ✕
                      </button>
                    </div>
                  </label>
                ))}
              </div>
              
              <div className="footer-actions">
                <button 
                  type="button"
                  className="upload-footer-btn"
                  onClick={() => footerInputRef.current?.click()}
                  disabled={isGenerating || isLoadingFooters}
                >
                  📤 Subir Nueva Imagen Personalizada
                </button>
                
                {(() => {
                  const hiddenFooters = JSON.parse(localStorage.getItem('hiddenDefaultFooters') || '[]');
                  return hiddenFooters.length > 0 && (
                    <button 
                      type="button"
                      className="restore-footers-btn"
                      onClick={() => {
                        const confirmRestore = window.confirm(
                          `¿Deseas restaurar todas las imágenes ocultas?\n\nSe restaurarán ${hiddenFooters.length} imagen(es).`
                        );
                        if (confirmRestore) {
                          localStorage.removeItem('hiddenDefaultFooters');
                          setDefaultFooters(getDefaultFooters());
                          setSuccess('✅ Imágenes restauradas correctamente');
                          setTimeout(() => setSuccess(null), 3000);
                        }
                      }}
                      disabled={isGenerating || isLoadingFooters}
                    >
                      🔄 Restaurar Imágenes Ocultas ({hiddenFooters.length})
                    </button>
                  );
                })()}
              </div>
              
              <small className="email-type-help">
                Las imágenes personalizadas se guardan permanentemente y estarán disponibles para futuros correos. El logo de CASIN siempre se incluye automáticamente.
              </small>
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
            className="send-btn"
            onClick={handleSendEmail}
            disabled={isGenerating || isUploading || isSending || !emailContent.subject || !emailContent.message || !extractEmail(rowData)}
          >
            {isUploading ? 'Subiendo archivos...' : isSending ? 'Enviando...' : 'Enviar Correo'}
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