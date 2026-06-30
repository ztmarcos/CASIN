/**
 * Shared payment reminder logic (frontend + Cloud Functions).
 * CommonJS — frontend re-exports via frontend/src/utils/policyPaymentReminder.js
 */

const SHORT_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

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

const RAMO_LABELS = {
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

const RAMO_DISPLAY = {
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

function toJsDate(val) {
  if (val == null || val === '') return null;
  if (val instanceof Date) return Number.isNaN(val.getTime()) ? null : val;
  if (typeof val.toDate === 'function') {
    const d = val.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'number' && !Number.isNaN(val)) {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const d = new Date(val.trim());
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function parsePolicyDate(dateStr) {
  if (dateStr == null || dateStr === '') return null;
  if (typeof dateStr !== 'string') return toJsDate(dateStr);

  let str = dateStr.toString().trim();
  str = str.replace(/\s+\d{1,2}:\d{2}\s*(A\.?M\.?|P\.?M\.?)?$/i, '').trim();

  if (str.includes('/')) {
    const parts = str.split('/').map((p) => p.trim());
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      const monthIndex = SHORT_MONTHS.findIndex((m) => m === monthStr);
      if (monthIndex !== -1 && !Number.isNaN(day) && !Number.isNaN(year) && year > 1900) {
        const date = new Date(year, monthIndex, day);
        if (
          !Number.isNaN(date.getTime()) &&
          date.getFullYear() === year &&
          date.getMonth() === monthIndex &&
          date.getDate() === day
        ) {
          return date;
        }
      }
      const month = parseInt(parts[1], 10);
      if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year) && month >= 1 && month <= 12) {
        const date = new Date(year, month - 1, day);
        if (
          !Number.isNaN(date.getTime()) &&
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day
        ) {
          return date;
        }
      }
    }
  }

  if (str.includes('-') && !/^\d+$/.test(str)) {
    const parts = str.split('-').map((p) => p.trim());
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      const monthMap = {
        ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
        jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
      };
      const monthIndex = monthMap[monthStr.slice(0, 3)];
      if (monthIndex != null && !Number.isNaN(day) && !Number.isNaN(year)) {
        const date = new Date(year, monthIndex, day);
        if (!Number.isNaN(date.getTime())) return date;
      }
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(str);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseDate(dateStr) {
  return toJsDate(dateStr) || parsePolicyDate(dateStr);
}

function toDDMMMYYYY(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = SHORT_MONTHS[date.getMonth()];
  return `${day}/${month}/${date.getFullYear()}`;
}

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSinglePaymentForm(formaPago) {
  const upper = (formaPago || '').toString().trim().toUpperCase();
  return upper === 'ANUAL' || upper === 'CONTADO';
}

function hasPartialPayments(formaPago) {
  const upper = (formaPago || '').toString().trim().toUpperCase();
  return upper !== '' && !isSinglePaymentForm(formaPago);
}

function calculateTotalPayments(formaPago) {
  const upper = (formaPago || '').toString().trim().toUpperCase();
  return TOTAL_PAYMENTS_MAP[upper] || 12;
}

function calculateNextPaymentDate(startDate, paymentForm) {
  if (!startDate || !paymentForm) return null;

  const start = parseDate(startDate);
  if (!start || Number.isNaN(start.getTime())) return null;

  const today = startOfDay(new Date());
  const upperPaymentForm = paymentForm.toUpperCase().trim();
  const monthsInterval = PAYMENT_INTERVAL_MONTHS[upperPaymentForm] || 12;
  const nextPayment = startOfDay(start);

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
    policy.fecha_inicio || policy.vigencia_inicio || policy.fecha_emision,
  );
  if (!start || Number.isNaN(start.getTime())) return policy.pago_actual || 1;

  let anchor = parseDate(policy.fecha_proximo_pago);
  if (!anchor || Number.isNaN(anchor.getTime())) {
    const computed = calculateNextPaymentDate(
      policy.fecha_inicio || policy.vigencia_inicio,
      formaPago,
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
  if (!d || Number.isNaN(d.getTime())) return dateStr || 'N/A';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(dateStr) {
  const d = parseDate(dateStr);
  if (!d || Number.isNaN(d.getTime())) return null;
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function parseAmountRaw(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  if (typeof value === 'number') {
    return !Number.isNaN(value) && value > 0 ? value : null;
  }
  const cleaned = String(value)
    .replace(/[\s,$"]/g, '')
    .replace(/DLS|USD|MXN|dls|usd|mxn/gi, '')
    .trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return Number.isNaN(num) || num <= 0 ? null : num;
}

function getTotalAmount(doc) {
  const fields = [
    'pago_total_o_prima_total',
    'importe_a_pagar_mxn',
    'importe_a_pagar',
    'importe_total',
    'importe_total_a_pagar',
    'pago_total',
    'prima_total',
    'prima',
  ];
  for (const f of fields) {
    const v = parseAmountRaw(doc[f]);
    if (v != null) return v;
  }
  return null;
}

function formatAmount(value) {
  if (value == null || value === '') return 'N/A';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Solo el campo pago_parcial capturado en la póliza (sin derivar). */
function readPagoParcialOnly(rowData) {
  return parseAmountRaw(rowData.pago_parcial);
}

function normalizeFormaPago(policy) {
  return (policy.forma_de_pago || policy.forma_pago || 'ANUAL').toString().trim();
}

/**
 * Fecha límite operativa del ciclo de cobro actual.
 * @returns {Date|null}
 */
function getDueDateForPolicy(policy) {
  if (!policy) return null;
  const formaPago = normalizeFormaPago(policy);
  const isPartial = hasPartialPayments(formaPago);

  if (isPartial) {
    const raw =
      policy.fecha_proximo_pago ||
      calculateNextPaymentDate(
        policy.vigencia_inicio || policy.fecha_inicio || policy.fecha_emision,
        formaPago,
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

/** Calendario de recordatorios: tercer slot siempre a 5 días. */
function getReminderDaysForFormaPago(formaPago) {
  const upper = (formaPago || '').toString().trim().toUpperCase();
  if (upper === 'SEMESTRAL' || upper === 'ANUAL' || upper === 'CONTADO') {
    return [30, 15, 5];
  }
  return [15, 10, 5];
}

function getReminderSlotKey(dueDate, daysBefore) {
  return `${formatDateISO(dueDate)}_${daysBefore}`;
}

function getReminderTypeLabel(daysBefore, allDays) {
  const sorted = [...allDays].sort((a, b) => b - a);
  const idx = sorted.indexOf(daysBefore);
  if (idx === 0) return 'Primer Recordatorio';
  if (idx === sorted.length - 1) return 'Recordatorio Final';
  return 'Segundo Recordatorio';
}

/**
 * Si hoy corresponde a un slot de recordatorio, lo devuelve.
 * @returns {{ daysBefore: number, dueDate: Date, slotKey: string, reminderType: string }|null}
 */
function getTodayReminderSlot(policy, todayInput) {
  const dueDate = getDueDateForPolicy(policy);
  if (!dueDate || Number.isNaN(dueDate.getTime())) return null;

  const today = startOfDay(todayInput || new Date());
  const dueDay = startOfDay(dueDate);
  const formaPago = normalizeFormaPago(policy);
  const reminderDays = getReminderDaysForFormaPago(formaPago);

  for (const daysBefore of reminderDays) {
    const reminderDate = new Date(dueDay);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    if (formatDateISO(reminderDate) === formatDateISO(today)) {
      return {
        daysBefore,
        dueDate: dueDay,
        slotKey: getReminderSlotKey(dueDay, daysBefore),
        reminderType: getReminderTypeLabel(daysBefore, reminderDays),
      };
    }
  }
  return null;
}

function resolveAseguradora(policy) {
  return (
    policy.aseguradora ||
    policy.compañia ||
    policy.compania ||
    policy.compañía ||
    'Su aseguradora'
  ).toString().trim();
}

function resolveRamoLabel(policy) {
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

function resolveClientName(policy) {
  return (
    policy.nombre_contratante ||
    policy.contratante ||
    policy.nombre ||
    'Cliente'
  ).toString().trim();
}

function buildPaymentReminderContext(rowData) {
  const formaPago = normalizeFormaPago(rowData);
  const isPartial = hasPartialPayments(formaPago);
  const dueDateObj = getDueDateForPolicy(rowData);
  const dueDateRaw = dueDateObj ? toDDMMMYYYY(dueDateObj) : null;

  let currentPayment = null;
  let totalPayments = null;

  if (isPartial) {
    currentPayment = derivePartialPaymentNumber(rowData) ?? rowData.pago_actual ?? 1;
    totalPayments = rowData.total_pagos || calculateTotalPayments(formaPago);
  } else {
    currentPayment = 1;
    totalPayments = 1;
  }

  // Monto en el correo: solo el campo pago_parcial capturado en la póliza (nunca prima total).
  const amountRaw = readPagoParcialOnly(rowData);

  const daysUntilDue = dueDateObj ? daysUntil(dueDateObj) : null;

  return {
    isPartial,
    formaPago,
    dueDate: dueDateRaw || 'N/A',
    dueDateLong: dueDateObj ? formatDateLong(dueDateObj) : 'N/A',
    amount: amountRaw != null ? formatAmount(amountRaw) : null,
    amountRaw,
    hasAmount: amountRaw != null && amountRaw > 0,
    currentPayment,
    totalPayments,
    daysUntilDue: daysUntilDue != null ? daysUntilDue : null,
    aseguradora: resolveAseguradora(rowData),
    ramoLabel: resolveRamoLabel(rowData),
    clientName: resolveClientName(rowData),
    policyNumber: rowData.numero_poliza || rowData.poliza || 'N/A',
    paymentLabel: isPartial
      ? `pago parcial ${currentPayment}/${totalPayments}`
      : 'pago anual',
  };
}

function wasReminderAlreadySent(policy, slotKey) {
  const log = policy.payment_reminders_log;
  if (!Array.isArray(log)) return false;
  return log.some((entry) => entry && entry.slotKey === slotKey);
}

function getPartialPaymentNumber(policy) {
  return derivePartialPaymentNumber(policy);
}

function isInstallmentPaid(pagosRealizados, paymentNumber) {
  const entry = (pagosRealizados || []).find(
    (p) => Number(p.numero) === Number(paymentNumber),
  );
  return Boolean(entry?.pagado);
}

function isCurrentInstallmentPending(policy) {
  const policyPaymentStatus = require('./policyPaymentStatus');
  if (policyPaymentStatus.isLegacyUntrackedPolicy(policy)) return false;
  if (!hasPartialPayments(policy.forma_de_pago || policy.forma_pago)) {
    return policy.primer_pago_realizado === false || !policy.primer_pago_realizado;
  }
  const current = derivePartialPaymentNumber(policy) ?? policy.pago_actual ?? 1;
  return !isInstallmentPaid(policy.pagos_realizados, current);
}

module.exports = {
  SHORT_MONTHS,
  PAYMENT_INTERVAL_MONTHS,
  RAMO_LABELS,
  RAMO_DISPLAY,
  parseDate,
  parsePolicyDate,
  toJsDate,
  toDDMMMYYYY,
  formatDateISO,
  startOfDay,
  isSinglePaymentForm,
  hasPartialPayments,
  calculateTotalPayments,
  calculateNextPaymentDate,
  derivePartialPaymentNumber,
  getPartialPaymentNumber,
  isInstallmentPaid,
  isCurrentInstallmentPending,
  getDueDateForPolicy,
  getReminderDaysForFormaPago,
  getReminderSlotKey,
  getReminderTypeLabel,
  getTodayReminderSlot,
  buildPaymentReminderContext,
  resolveAseguradora,
  resolveRamoLabel,
  resolveClientName,
  wasReminderAlreadySent,
  readPagoParcialOnly,
  parseAmountRaw,
  formatDateLong,
};
