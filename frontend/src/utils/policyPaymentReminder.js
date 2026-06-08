import { parseDate, toDDMMMYYYY } from './dateUtils.js';

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

export function hasPartialPayments(formaPago) {
  const upper = (formaPago || '').toString().trim().toUpperCase();
  return upper !== '' && upper !== 'ANUAL' && upper !== 'CONTADO';
}

export function calculateTotalPayments(formaPago) {
  const upper = (formaPago || '').toString().trim().toUpperCase();
  return TOTAL_PAYMENTS_MAP[upper] || 12;
}

export function calculateNextPaymentDate(startDate, paymentForm) {
  if (!startDate || !paymentForm) return null;

  const start = parseDate(startDate);
  if (!start || isNaN(start.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upperPaymentForm = paymentForm.toUpperCase().trim();
  const monthsInterval = PAYMENT_INTERVAL_MONTHS[upperPaymentForm] || 12;
  const nextPayment = new Date(start);
  nextPayment.setHours(0, 0, 0, 0);

  while (nextPayment <= today) {
    nextPayment.setMonth(nextPayment.getMonth() + monthsInterval);
  }

  return toDDMMMYYYY(nextPayment);
}

function derivePartialPaymentNumber(policy) {
  if (!policy || !hasPartialPayments(policy.forma_de_pago || policy.forma_pago)) return null;

  const formaPago = policy.forma_de_pago || policy.forma_pago;
  const total = policy.total_pagos || calculateTotalPayments(formaPago);
  const interval = PAYMENT_INTERVAL_MONTHS[formaPago?.toUpperCase()] || 1;

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

/**
 * Contexto de recordatorio de pago para el prompt IA.
 * @param {Object} rowData
 * @returns {Object}
 */
export function buildPaymentReminderContext(rowData) {
  const formaPago = (rowData.forma_de_pago || rowData.forma_pago || 'ANUAL').toString().trim();
  const isPartial = hasPartialPayments(formaPago);

  let dueDateRaw;
  let amountRaw;
  let currentPayment = null;
  let totalPayments = null;

  if (isPartial) {
    dueDateRaw =
      rowData.fecha_proximo_pago ||
      calculateNextPaymentDate(
        rowData.vigencia_inicio || rowData.fecha_inicio,
        formaPago
      );
    amountRaw = rowData.pago_parcial || rowData.primer_pago;
    currentPayment = derivePartialPaymentNumber(rowData) ?? rowData.pago_actual ?? 1;
    totalPayments = rowData.total_pagos || calculateTotalPayments(formaPago);
  } else {
    dueDateRaw = rowData.vigencia_fin || rowData.fecha_fin;
    amountRaw =
      rowData.pago_total_o_prima_total || rowData.prima_neta || rowData.prima_total;
    currentPayment = 1;
    totalPayments = 1;
  }

  const daysUntilDue = daysUntil(dueDateRaw);

  return {
    isPartial,
    formaPago,
    dueDate: dueDateRaw || 'N/A',
    dueDateLong: formatDateLong(dueDateRaw),
    amount: formatAmount(amountRaw),
    amountRaw,
    currentPayment,
    totalPayments,
    daysUntilDue: daysUntilDue != null ? daysUntilDue : null,
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
