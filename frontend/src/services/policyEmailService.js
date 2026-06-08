import { gptService } from './gptService.js';
import { parseDate } from '../utils/dateUtils.js';
import {
  buildPaymentReminderContext,
  RAMO_LABELS,
} from '../utils/policyPaymentReminder.js';

const TABLE_RAMO_MAP = {
  autos: 'autos',
  auto: 'autos',
  vida: 'vida',
  life: 'vida',
  gmm: 'gmm',
  hogar: 'hogar',
  casa: 'hogar',
  vivienda: 'hogar',
  mascotas: 'mascotas',
  mascota: 'mascotas',
  negocio: 'negocio',
  empresa: 'negocio',
  rc: 'rc',
  transporte: 'transporte',
  carga: 'transporte',
};

export const EMAIL_TYPE_OPTIONS = [
  { value: 'nueva_poliza', label: 'Nueva póliza' },
  { value: 'renovacion_poliza', label: 'Renovación de póliza' },
  { value: 'comprobante_completo', label: 'Enviar recibo y factura' },
  { value: 'enviar_recibo', label: 'Enviar recibo' },
  { value: 'enviar_factura', label: 'Enviar factura' },
  { value: 'recordatorio_pago', label: 'Recordatorio de pago' },
];

export const ATTACHMENT_HINTS = {
  comprobante_completo: 'Adjunte factura PDF, XML y comprobante de pago',
  enviar_recibo: 'Adjunte comprobante de pago o recibo de cobro',
  enviar_factura: 'Adjunte factura PDF y XML (CFDI)',
};

function formatDateLong(dateStr) {
  const d = parseDate(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr || 'N/A';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatAmount(value) {
  if (value == null || value === '') return 'N/A';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildVehiculoLinea(data) {
  return [data.descripcion_del_vehiculo, data.modelo, data.serie]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function detectRamoFromRowData(data) {
  if (!data) return 'default';

  const autoFields = [
    'descripcion_del_vehiculo',
    'modelo',
    'placas',
    'marca',
    'serie',
    'tipo_vehiculo',
  ];
  if (autoFields.some((f) => data[f] && String(data[f]).trim() !== '')) return 'autos';

  const ramoRaw = (data.ramo || data.tipo_poliza || '').toString().toLowerCase().trim();
  const ramoKeys = Object.keys(TABLE_RAMO_MAP);
  for (const key of ramoKeys) {
    if (ramoRaw.includes(key)) return TABLE_RAMO_MAP[key];
  }

  return 'default';
}

/**
 * @param {string|null} tableType - nombre de colección Firebase
 * @param {Object} rowData
 * @returns {string}
 */
export function resolveRamoFromContext(tableType, rowData) {
  if (tableType) {
    const key = tableType.toLowerCase().trim();
    if (TABLE_RAMO_MAP[key]) return TABLE_RAMO_MAP[key];
    for (const [mapKey, ramo] of Object.entries(TABLE_RAMO_MAP)) {
      if (key.includes(mapKey)) return ramo;
    }
  }
  return detectRamoFromRowData(rowData);
}

function buildBasePayload(rowData, tableType, sender) {
  const ramo = resolveRamoFromContext(tableType, rowData);
  const clientName =
    rowData.contratante ||
    rowData.nombre_contratante ||
    rowData.asegurado ||
    'Cliente';

  return {
    ramo,
    ramoLabel: RAMO_LABELS[ramo] || RAMO_LABELS.default,
    destinatarioDisplay: clientName,
    destinatario: clientName,
    numeroPoliza: rowData.numero_poliza || 'N/A',
    aseguradora: rowData.aseguradora || 'N/A',
    vigenciaInicio: rowData.vigencia_inicio || rowData.fecha_inicio || 'N/A',
    vigenciaFin: rowData.vigencia_fin || rowData.fecha_fin || 'N/A',
    vigenciaFinLong: formatDateLong(rowData.vigencia_fin || rowData.fecha_fin),
    montoFormateado: formatAmount(
      rowData.pago_total_o_prima_total || rowData.prima_neta || rowData.prima_total
    ),
    moneda: rowData.moneda || 'MXN',
    vehiculoLinea: buildVehiculoLinea(rowData),
    modelo: rowData.modelo || '',
    direccion: rowData.domicilio_o_direccion || rowData.direccion || '',
    formaPago: rowData.forma_de_pago || rowData.forma_pago || 'ANUAL',
    senderName: sender?.name || 'Michell Díaz',
    facturaAnio:
      rowData.anio_factura ||
      (parseDate(rowData.vigencia_inicio)?.getFullYear?.() ?? new Date().getFullYear()),
  };
}

function mapEmailTypeToApi(emailType, basePayload, rowData) {
  switch (emailType) {
    case 'nueva_poliza':
      return {
        apiType: 'policy_email',
        data: { ...basePayload, tipo: 'nueva' },
      };
    case 'renovacion_poliza':
      return {
        apiType: 'policy_email',
        data: { ...basePayload, tipo: 'renovacion' },
      };
    case 'comprobante_completo':
      return {
        apiType: 'payment_confirmation_email',
        data: { ...basePayload, variant: 'completo' },
      };
    case 'enviar_recibo':
      return {
        apiType: 'payment_confirmation_email',
        data: { ...basePayload, variant: 'recibo' },
      };
    case 'enviar_factura':
      return {
        apiType: 'payment_confirmation_email',
        data: { ...basePayload, variant: 'factura' },
      };
    case 'recordatorio_pago':
      return {
        apiType: 'payment_reminder_email',
        data: {
          ...basePayload,
          paymentReminderContext: buildPaymentReminderContext(rowData),
        },
      };
    default:
      return {
        apiType: 'policy_email',
        data: { ...basePayload, tipo: 'renovacion' },
      };
  }
}

export function buildPolicyEmailPayload(emailType, rowData, tableType, sender) {
  const base = buildBasePayload(rowData, tableType, sender);
  return mapEmailTypeToApi(emailType, base, rowData);
}

/**
 * @returns {Promise<{ subject: string, message: string }>}
 */
export async function generatePolicyEmail(emailType, rowData, tableType, sender) {
  const { apiType, data } = buildPolicyEmailPayload(emailType, rowData, tableType, sender);
  const result = await gptService.generatePolicyEmail(apiType, data);
  const content = result?.emailContent || result;
  if (!content?.subject || !content?.message) {
    throw new Error('Respuesta de IA incompleta');
  }
  return content;
}

/**
 * Detecta si la póliza es nueva o renovación al abrir el modal.
 * @returns {'nueva_poliza'|'renovacion_poliza'}
 */
export function detectInitialEmailType(rowData) {
  if (!rowData) return 'renovacion_poliza';

  if (rowData.vigencia_inicio) {
    const startDate = parseDate(rowData.vigencia_inicio);
    const today = new Date();
    if (startDate && !isNaN(startDate.getTime())) {
      const isNew =
        startDate > today || today - startDate < 30 * 24 * 60 * 60 * 1000;
      return isNew ? 'nueva_poliza' : 'renovacion_poliza';
    }
  }

  return 'renovacion_poliza';
}
