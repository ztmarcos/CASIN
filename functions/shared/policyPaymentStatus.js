/**
 * Shared payment status / legacy policy detection (frontend + Cloud Functions).
 */

const POR_VENCER_MESES = 12;
const PAYMENT_TRACKING_START_MS = new Date('2025-01-01T00:00:00').getTime();

const SHORT_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function parsePolicyDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return Number.isNaN(dateStr.getTime()) ? null : dateStr;
  if (typeof dateStr === 'object' && typeof dateStr.toDate === 'function') {
    const d = dateStr.toDate();
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = dateStr.toString().trim();
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    const monthIndex = SHORT_MONTHS.indexOf(monthStr.slice(0, 3));
    if (monthIndex >= 0 && !Number.isNaN(day) && !Number.isNaN(year)) {
      const date = new Date(year, monthIndex, day);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  const fallback = new Date(str);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function getPolicyEndDay(policy) {
  const raw = policy?.fecha_fin ?? policy?.vigencia_fin ?? policy?.fecha_vencimiento ?? null;
  if (raw == null || raw === '') return null;
  const d = parsePolicyDate(raw);
  if (!d) return null;
  const endDay = new Date(d);
  endDay.setHours(0, 0, 0, 0);
  return endDay;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isPolicyExpired(policy) {
  if (!policy) return false;
  if (policy.expiration_override === 'activo') return false;
  if (policy.expiration_override === 'vencido') return true;
  const end = getPolicyEndDay(policy);
  if (!end) return false;
  return end < startOfToday();
}

function isPorVencerProximosMeses(policy, meses = POR_VENCER_MESES) {
  if (!policy || isPolicyExpired(policy)) return false;
  const end = getPolicyEndDay(policy);
  if (!end) return false;
  const today = startOfToday();
  if (end < today) return false;
  const limite = new Date(today);
  limite.setMonth(limite.getMonth() + meses);
  return end <= limite;
}

function parseFirestoreTimestamp(value) {
  if (!value) return null;
  if (value._seconds) return value._seconds * 1000;
  if (value.seconds) return value.seconds * 1000;
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function getPolicyEntryTimestamp(policy) {
  const candidates = [
    policy?.createdAt,
    policy?.created_at,
    policy?.updatedAt,
    policy?.updated_at,
  ];
  for (const value of candidates) {
    const timestamp = parseFirestoreTimestamp(value);
    if (timestamp) return timestamp;
  }
  return 0;
}

function hasPartialPayments(formaPago) {
  const upper = (formaPago || '').toString().trim().toUpperCase();
  return upper !== '' && upper !== 'ANUAL' && upper !== 'CONTADO';
}

function hasExplicitPaymentTracking(policy) {
  if (!policy) return false;
  const estadoPago = (policy.estado_pago || '').toString().trim();
  if (/^pagado$/i.test(estadoPago) || /^no pagado$/i.test(estadoPago)) return true;
  if (policy.primer_pago_realizado === true) return true;
  if ((policy.pagos_realizados || []).some((entry) => entry?.pagado === true)) return true;
  if (Array.isArray(policy.payment_reminders_log) && policy.payment_reminders_log.length > 0) {
    return true;
  }
  return false;
}

function isLegacyUntrackedPolicy(policy) {
  if (!policy || hasExplicitPaymentTracking(policy)) return false;
  if (isPolicyExpired(policy) || isPorVencerProximosMeses(policy)) return true;
  const entryTimestamp = getPolicyEntryTimestamp(policy);
  if (entryTimestamp > 0 && entryTimestamp < PAYMENT_TRACKING_START_MS) return true;
  return false;
}

function resolvePolicyPaymentStatus(policy) {
  if (!policy) return null;
  if (hasExplicitPaymentTracking(policy)) {
    const estadoPago = (policy.estado_pago || '').toString().trim();
    if (/^pagado$/i.test(estadoPago)) return 'Pagado';
    if (/^no pagado$/i.test(estadoPago)) return 'No Pagado';
    if (policy.primer_pago_realizado === true) return 'Pagado';
    return 'No Pagado';
  }
  if (isLegacyUntrackedPolicy(policy)) return null;
  return 'No Pagado';
}

module.exports = {
  PAYMENT_TRACKING_START_MS,
  hasExplicitPaymentTracking,
  isLegacyUntrackedPolicy,
  resolvePolicyPaymentStatus,
  getPolicyEntryTimestamp,
};
