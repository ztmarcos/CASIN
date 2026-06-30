import { parseDate, toDDMMMYYYY } from './dateUtils.js';
import {
  isPolicyExpired,
  isPorVencerProximosMeses,
  getPolicyEndDay,
} from './policyExpiryBuckets.js';

const PAYMENT_INTERVAL_MONTHS = {
  MENSUAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  CUATRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
  CONTADO: 12,
};

const TOTAL_PAYMENTS_MAP = {
  MENSUAL: 12,
  BIMESTRAL: 6,
  TRIMESTRAL: 4,
  CUATRIMESTRAL: 3,
  SEMESTRAL: 2,
  ANUAL: 1,
  CONTADO: 1,
};

/** Normaliza forma de pago: trim, mayúsculas, sin acentos. */
export function normalizeFormaPago(formaPago) {
  return (formaPago || '')
    .toString()
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '');
}

const SINGLE_PAYMENT_REGEXES = [
  /^ANUAL$/,
  /^CONTADO$/,
  /^PAGO CONTADO$/,
  /^PAGO UNICO$/,
  /^UNICO PAGO$/,
  /^UN PAGO$/,
  /^1 PAGO$/,
  /^UN SOLO PAGO$/,
  /\bUNICO PAGO\b/,
  /\bPAGO UNICO\b/,
  /\bPAGO CONTADO\b/,
];

export function isSinglePaymentForm(formaPago) {
  const normalized = normalizeFormaPago(formaPago);
  if (!normalized) return false;
  return SINGLE_PAYMENT_REGEXES.some((pattern) => pattern.test(normalized));
}

/** Clave canónica para intervalos / total de pagos. */
export function resolvePaymentFormKey(formaPago) {
  const normalized = normalizeFormaPago(formaPago);
  if (!normalized) return '';
  if (isSinglePaymentForm(formaPago)) return 'ANUAL';

  const directKeys = [
    'MENSUAL',
    'BIMESTRAL',
    'TRIMESTRAL',
    'CUATRIMESTRAL',
    'SEMESTRAL',
    'ANUAL',
    'CONTADO',
  ];
  const found = directKeys.find((key) => normalized === key || normalized.startsWith(`${key} `));
  return found || normalized.split(' ')[0];
}

export function hasPartialPayments(formaPago) {
  const normalized = normalizeFormaPago(formaPago);
  return normalized !== '' && !isSinglePaymentForm(formaPago);
}

export function calculateTotalPayments(formaPago) {
  const key = resolvePaymentFormKey(formaPago);
  return TOTAL_PAYMENTS_MAP[key] || 12;
}

export function calculateNextPaymentDate(startDate, paymentForm) {
  if (!startDate || !paymentForm) return null;
  if (isSinglePaymentForm(paymentForm)) return null;

  const start = parseDate(startDate);
  if (!start || isNaN(start.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upperPaymentForm = resolvePaymentFormKey(paymentForm);
  const monthsInterval = PAYMENT_INTERVAL_MONTHS[upperPaymentForm] || 12;
  const nextPayment = new Date(start);
  nextPayment.setHours(0, 0, 0, 0);

  while (nextPayment <= today) {
    nextPayment.setMonth(nextPayment.getMonth() + monthsInterval);
  }

  return toDDMMMYYYY(nextPayment);
}

function countPaidInstallmentsOnPolicy(policy) {
  const forma = policy.forma_pago || policy.forma_de_pago;
  if (!hasPartialPayments(forma)) return 0;
  const total = policy.total_pagos || calculateTotalPayments(forma);
  let paid = 0;
  for (let i = 1; i <= total; i += 1) {
    const entry = (policy.pagos_realizados || []).find((p) => Number(p.numero) === i);
    if (entry?.pagado) paid += 1;
  }
  return paid;
}

export function areAllInstallmentsPaid(policy) {
  const forma = policy.forma_pago || policy.forma_de_pago;
  if (!hasPartialPayments(forma)) return false;
  const total = policy.total_pagos || calculateTotalPayments(forma);
  return countPaidInstallmentsOnPolicy(policy) >= total;
}

/**
 * Vigencia terminada, por vencer, pago único o todas las cuotas pagadas → no hay próximo pago.
 */
export function shouldTrackProximoPago(policy) {
  if (!policy) return false;

  const forma = policy.forma_pago || policy.forma_de_pago;
  if (isSinglePaymentForm(forma)) return false;
  if (isPolicyExpired(policy)) return false;
  if (isPorVencerProximosMeses(policy)) return false;
  if (areAllInstallmentsPaid(policy)) return false;

  const endDay = getPolicyEndDay(policy);
  const next = parseDate(policy.fecha_proximo_pago);
  if (endDay && next && !isNaN(next.getTime())) {
    const nextDay = new Date(next);
    nextDay.setHours(0, 0, 0, 0);
    if (nextDay > endDay) return false;
  }

  return true;
}

export function getProximoPagoRaw(policy) {
  if (!shouldTrackProximoPago(policy)) return null;
  const parsed = parseDate(policy.fecha_proximo_pago);
  return parsed ? policy.fecha_proximo_pago : null;
}

export function getPartialPaymentNumber(policy) {
  if (!policy || !hasPartialPayments(policy.forma_de_pago || policy.forma_pago)) return null;

  const formaPago = policy.forma_de_pago || policy.forma_pago;
  const total = policy.total_pagos || calculateTotalPayments(formaPago);
  const interval = PAYMENT_INTERVAL_MONTHS[resolvePaymentFormKey(formaPago)] || 1;

  const start = parseDate(
    policy.fecha_inicio || policy.vigencia_inicio || policy.fecha_emision
  );
  if (!start || isNaN(start.getTime())) return policy.pago_actual || 1;

  let anchor = parseDate(policy.fecha_proximo_pago);
  if (!anchor || isNaN(anchor.getTime())) {
    const computed = calculateNextPaymentDate(
      policy.fecha_inicio || policy.vigencia_inicio,
      formaPago
    );
    anchor = computed ? parseDate(computed) : null;
  }
  if (!anchor) return policy.pago_actual || 1;

  let elapsedMonths =
    (anchor.getFullYear() - start.getFullYear()) * 12 + (anchor.getMonth() - start.getMonth());
  if (anchor.getDate() < start.getDate()) elapsedMonths -= 1;

  const idx = Math.floor(elapsedMonths / interval) + 1;
  return Math.min(Math.max(1, idx), total);
}

function formatDateLong(dateStr) {
  const d = parseDate(dateStr);
  if (!d || isNaN(d.getTime())) return dateStr || 'N/A';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(dateStr) {
  const d = parseDate(dateStr);
  if (!d || isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function formatAmount(value) {
  if (value == null || value === '') return 'N/A';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function readPagoParcialOnly(rowData) {
  const v = rowData?.pago_parcial;
  if (v == null || v === '') return null;
  const num = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''));
  return Number.isNaN(num) || num <= 0 ? null : num;
}

/** Fecha límite operativa del ciclo de cobro (alineado con cron automático). */
export function getDueDateForPolicy(policy) {
  if (!policy) return null;
  const formaPago = normalizeFormaPago(policy);
  const isPartial = hasPartialPayments(formaPago);

  if (isPartial) {
    const raw =
      policy.fecha_proximo_pago ||
      calculateNextPaymentDate(
        policy.vigencia_inicio || policy.fecha_inicio || policy.fecha_emision,
        formaPago
      );
    return parseDate(raw);
  }

  const raw =
    policy.fecha_limite_pago ||
    policy.vigencia_fin ||
    policy.fecha_fin ||
    policy.fecha_vencimiento;
  return parseDate(raw);
}

/** Calendario automático: tercer recordatorio siempre a 5 días. */
export function getReminderDaysForFormaPago(formaPago) {
  if (isSinglePaymentForm(formaPago) || resolvePaymentFormKey(formaPago) === 'SEMESTRAL') {
    return [30, 15, 5];
  }
  return [15, 10, 5];
}

export function resolveAseguradora(policy) {
  return (
    policy.aseguradora ||
    policy.compañia ||
    policy.compania ||
    policy.compañía ||
    'Su aseguradora'
  ).toString().trim();
}

export function resolveRamoLabel(policy) {
  const key = (
    policy.ramo ||
    policy.sourceTable ||
    policy.tabla ||
    policy.table ||
    'default'
  )
    .toString()
    .trim()
    .toLowerCase();
  return RAMO_LABELS[key] || RAMO_LABELS.default;
}

/**
 * Contexto de recordatorio de pago para el prompt IA y mails manuales.
 * @param {Object} rowData
 * @returns {Object}
 */
export function buildPaymentReminderContext(rowData) {
  const formaPago = normalizeFormaPago(rowData);
  const isPartial = hasPartialPayments(formaPago);
  const dueDateObj = getDueDateForPolicy(rowData);
  const dueDateRaw = dueDateObj ? toDDMMMYYYY(dueDateObj) : null;

  let currentPayment = null;
  let totalPayments = null;

  if (isPartial) {
    currentPayment = getPartialPaymentNumber(rowData) ?? rowData.pago_actual ?? 1;
    totalPayments = rowData.total_pagos || calculateTotalPayments(formaPago);
  } else {
    currentPayment = 1;
    totalPayments = 1;
  }

  // Monto en el correo: solo pago_parcial capturado por el usuario (nunca prima total calculada).
  const amountRaw = readPagoParcialOnly(rowData);

  const daysUntilDue = dueDateObj ? daysUntil(dueDateObj) : daysUntil(dueDateRaw);

  return {
    isPartial,
    formaPago,
    dueDate: dueDateRaw || 'N/A',
    dueDateLong: dueDateObj ? formatDateLong(dueDateObj) : formatDateLong(dueDateRaw),
    amount: amountRaw != null ? formatAmount(amountRaw) : null,
    amountRaw,
    hasAmount: amountRaw != null && amountRaw > 0,
    currentPayment,
    totalPayments,
    daysUntilDue: daysUntilDue != null ? daysUntilDue : null,
    aseguradora: resolveAseguradora(rowData),
    ramoLabel: resolveRamoLabel(rowData),
    clientName:
      rowData.nombre_contratante || rowData.contratante || rowData.nombre || 'Cliente',
    policyNumber: rowData.numero_poliza || rowData.poliza || 'N/A',
    paymentLabel: isPartial
      ? `pago parcial ${currentPayment}/${totalPayments}`
      : 'pago anual',
  };
}

export const RAMO_LABELS = {
  autos: 'seguro de auto',
  vida: 'seguro de vida',
  gmm: 'Gastos Médicos Mayores',
  hogar: 'seguro de hogar',
  mascotas: 'seguro de mascotas',
  negocio: 'seguro de negocio',
  rc: 'Responsabilidad Civil',
  transporte: 'seguro de transporte',
  default: 'póliza de seguro',
};

export const RAMO_DISPLAY = {
  autos: 'Autos',
  vida: 'Vida',
  gmm: 'GMM',
  hogar: 'Hogar',
  mascotas: 'Mascotas',
  negocio: 'Negocio',
  rc: 'RC',
  transporte: 'Transporte',
  default: 'General',
};
