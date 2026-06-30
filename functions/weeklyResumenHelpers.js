/**
 * Single source of truth for weekly activity email metrics (Firestore policies + activity_logs).
 * Used by scheduledWeeklyResumen and server-mysql weekly-resumen HTTP/cron path.
 */

const policyReminder = require('./shared/policyPaymentReminder');
const policyPaymentStatus = require('./shared/policyPaymentStatus');

const SHORT_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/** Collections used when building weekly summary from Firestore (CASIN main / unprefixed). */
const POLICY_COLLECTIONS = [
  'autos',
  'hogar',
  'vida',
  'gmm',
  'rc',
  'transporte',
  'mascotas',
  'diversos',
  'negocio',
  'gruposgmm',
  'accidentes',
  'responsabilidad_civil',
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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

/**
 * Minimal date parse for policy strings (Timestamps handled by toJsDate first).
 */
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(str);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function policyEndDate(policy) {
  const raw = policy.fecha_fin ?? policy.vigencia_fin ?? policy.fecha_vencimiento ?? policy.vencimiento;
  return toJsDate(raw) || parsePolicyDate(raw);
}

/** Inicio de vigencia / póliza (para filtrar ruido en resumen semanal). */
function policyStartDate(policy) {
  const raw =
    policy.vigencia_inicio ??
    policy.fecha_inicio ??
    policy.fecha_inicio_poliza ??
    policy.fecha_inicio_vigencia ??
    policy.fecha_vigencia;
  return toJsDate(raw) || parsePolicyDate(raw);
}

function policyNextPaymentDate(policy) {
  return toJsDate(policy.fecha_proximo_pago) || parsePolicyDate(policy.fecha_proximo_pago);
}

/** Mensual, trimestral, semestral, etc. — excluye ANUAL y CONTADO (van a «por vencer»). */
function isPartialPaymentFormPolicy(policy) {
  return policyReminder.hasPartialPayments(policy.forma_de_pago || policy.forma_pago);
}

function isPolicyExpired(policy) {
  if (policy.expiration_override === 'activo') return false;
  if (policy.expiration_override === 'vencido') return true;
  const endDate = policyEndDate(policy);
  if (!endDate) return false;
  return endDate < startOfToday();
}

function isPolicyCancelled(policy) {
  return policy.estado_cap === 'Inactivo' && policy.estado_cfp === 'Inactivo';
}

/** Igual que Reports.jsx: ANUAL y CONTADO son pago único; el resto es fraccionado. */
function reportsStyleFraccionado(policy) {
  const f = (policy.forma_pago || '').toString().trim().toUpperCase();
  return f !== 'ANUAL' && f !== 'CONTADO' && f !== '';
}

/** Misma lectura que Reportes: Pagado explícito; legacy sin seguimiento no cuenta como pendiente. */
function isPolicyPaid(policy) {
  return policyPaymentStatus.resolvePolicyPaymentStatus(policy) === 'Pagado';
}

/**
 * ¿Sigue en “por cobrar” según reglas alineadas a Reportes?
 * - Legacy sin seguimiento: no pendiente.
 * - Fraccionados: cuota actual en pagos_realizados.
 * - ANUAL: primer_pago_realizado.
 */
function isPendingPorCobrar(policy) {
  if (policyPaymentStatus.isLegacyUntrackedPolicy(policy)) return false;
  return policyReminder.isCurrentInstallmentPending(policy);
}

async function fetchAllPolicies(db) {
  const all = [];
  for (const collectionName of POLICY_COLLECTIONS) {
    try {
      const snap = await db.collection(collectionName).get();
      snap.forEach((doc) => {
        const data = doc.data();
        all.push({
          id: doc.id,
          firebase_doc_id: doc.id,
          ...data,
          tabla: collectionName,
          sourceTable: collectionName,
          ramo: data.ramo || collectionName,
        });
      });
    } catch (err) {
      console.warn(`weeklyResumen: skip collection ${collectionName}:`, err.message);
    }
  }
  return all;
}

function getPreviousCalendarMonth(referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const d = new Date(ref.getFullYear(), ref.getMonth(), 1);
  d.setMonth(d.getMonth() - 1);
  return { monthIndex: d.getMonth(), year: d.getFullYear() };
}

function getCalendarMonthLabel(monthIndex, year) {
  return new Date(year, monthIndex, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });
}

function mapAndSortPaymentsPendingRows(entries) {
  return entries
    .map(({ policy, duePeriod, mesCuota }) => {
      const dueDate = policyReminder.getDueDateForPolicy(policy);
      const fechaPago =
        dueDate && !Number.isNaN(dueDate.getTime())
          ? dueDate.toLocaleDateString('es-MX')
          : policy.fecha_proximo_pago || '-';
      return {
        id: policy.id || policy.firebase_doc_id,
        numero_poliza: policy.numero_poliza,
        contratante: policy.nombre_contratante || policy.contratante || '-',
        aseguradora: policy.aseguradora || '-',
        ramo: policy.ramo || policy.tabla || policy.sourceTable || '-',
        forma_pago: policy.forma_pago || '-',
        pago_parcial: policy.pago_parcial,
        fecha_proximo_pago: policy.fecha_proximo_pago,
        fecha_pago: fechaPago,
        mes_cuota: mesCuota,
        duePeriod,
        fecha_inicio:
          policy.vigencia_inicio ||
          policy.fecha_inicio ||
          policy.fecha_inicio_poliza ||
          policy.fecha_inicio_vigencia ||
          policy.fecha_vigencia ||
          'N/A',
        fecha_fin: policy.fecha_fin || policy.vigencia_fin || 'N/A',
      };
    })
    .sort((a, b) => {
      const dateA =
        toJsDate(a.fecha_proximo_pago) ||
        parsePolicyDate(a.fecha_proximo_pago) ||
        parsePolicyDate(a.fecha_inicio) ||
        policyEndDate({ fecha_fin: a.fecha_fin }) ||
        new Date(0);
      const dateB =
        toJsDate(b.fecha_proximo_pago) ||
        parsePolicyDate(b.fecha_proximo_pago) ||
        parsePolicyDate(b.fecha_inicio) ||
        policyEndDate({ fecha_fin: b.fecha_fin }) ||
        new Date(0);
      return dateB - dateA;
    });
}

function isDueInCalendarMonth(policy, monthIndex, year) {
  const dueDate = policyReminder.getDueDateForPolicy(policy);
  if (!dueDate || Number.isNaN(dueDate.getTime())) return false;
  return dueDate.getMonth() === monthIndex && dueDate.getFullYear() === year;
}

function isDueInCurrentOrPreviousMonth(policy, referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const current = { monthIndex: ref.getMonth(), year: ref.getFullYear() };
  const previous = getPreviousCalendarMonth(ref);
  if (isDueInCalendarMonth(policy, current.monthIndex, current.year)) return 'current';
  if (isDueInCalendarMonth(policy, previous.monthIndex, previous.year)) return 'previous';
  return null;
}

function buildPaymentsPendingMonthNote(referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const currentLabel = getCalendarMonthLabel(ref.getMonth(), ref.getFullYear());
  const previous = getPreviousCalendarMonth(ref);
  const previousLabel = getCalendarMonthLabel(previous.monthIndex, previous.year);
  return `Pólizas fraccionadas no pagadas con cuota en ${previousLabel} o ${currentLabel}.`;
}

/**
 * Pagos parciales no pagados: mes en curso + mes anterior (solo fraccionadas).
 * Anuales y contado no entran aquí — se reportan en computeExpiringPolicies.
 */
function computePaymentsPendingWithStats(allPolicies, referenceDate = new Date()) {
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const currentMonth = { monthIndex: ref.getMonth(), year: ref.getFullYear() };
  const previousMonth = getPreviousCalendarMonth(ref);
  const currentLabel = getCalendarMonthLabel(currentMonth.monthIndex, currentMonth.year);
  const previousLabel = getCalendarMonthLabel(previousMonth.monthIndex, previousMonth.year);
  const today = startOfToday();

  const stats = {
    totalPolicies: allPolicies.length,
    excludedCancelled: 0,
    excludedPaid: 0,
    excludedExpired: 0,
    excludedEndBeforeToday: 0,
    excludedNonPartialForm: 0,
    excludedNotPendingPorCobrar: 0,
    excludedNotDueInWindow: 0,
    includedFinal: 0,
    includedCurrentMonth: 0,
    includedPreviousMonth: 0,
    currentMonth: currentLabel,
    previousMonth: previousLabel,
    samplesExcludedNonPartial: [],
  };

  const filtered = [];
  for (const policy of allPolicies) {
    if (isPolicyCancelled(policy)) {
      stats.excludedCancelled++;
      continue;
    }
    if (isPolicyPaid(policy)) {
      stats.excludedPaid++;
      continue;
    }
    if (isPolicyExpired(policy)) {
      stats.excludedExpired++;
      continue;
    }
    const endDate = policyEndDate(policy);
    if (endDate && endDate < today) {
      stats.excludedEndBeforeToday++;
      continue;
    }
    if (!isPartialPaymentFormPolicy(policy)) {
      stats.excludedNonPartialForm++;
      if (stats.samplesExcludedNonPartial.length < 5) {
        stats.samplesExcludedNonPartial.push({
          numero_poliza: policy.numero_poliza || policy.id || '-',
          forma_pago: policy.forma_pago || '-',
          motivo: 'Excluida: forma de pago única (ANUAL/CONTADO) — ver sección Pólizas por vencer',
        });
      }
      continue;
    }
    if (!isPendingPorCobrar(policy)) {
      stats.excludedNotPendingPorCobrar++;
      continue;
    }
    const duePeriod = isDueInCurrentOrPreviousMonth(policy, ref);
    if (!duePeriod) {
      stats.excludedNotDueInWindow++;
      continue;
    }
    const mesCuota = duePeriod === 'current' ? currentLabel : previousLabel;
    filtered.push({ policy, duePeriod, mesCuota });
    stats.includedFinal++;
    if (duePeriod === 'current') stats.includedCurrentMonth++;
    else stats.includedPreviousMonth++;
  }

  const policies = mapAndSortPaymentsPendingRows(filtered);
  return {
    policies,
    stats,
    currentMonth: {
      label: currentLabel,
      total: stats.includedCurrentMonth,
      policies: policies.filter((p) => p.duePeriod === 'current'),
    },
    previousMonth: {
      label: previousLabel,
      total: stats.includedPreviousMonth,
      policies: policies.filter((p) => p.duePeriod === 'previous'),
    },
  };
}

function computePaymentsPending(allPolicies, referenceDate = new Date()) {
  return computePaymentsPendingWithStats(allPolicies, referenceDate).policies;
}

function computePartialPaymentsDue(allPolicies, rangeStart, rangeEnd) {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  return allPolicies
    .filter((policy) => {
      if (isPolicyCancelled(policy)) return false;
      if (isPolicyPaid(policy)) return false;
      if (isPolicyExpired(policy)) return false;
      if (!reportsStyleFraccionado(policy)) return false;
      const nextRaw = policy.fecha_proximo_pago;
      const nextPayment = toJsDate(nextRaw) || parsePolicyDate(nextRaw);
      if (!nextPayment) return false;
      return nextPayment >= start && nextPayment <= end;
    })
    .map((policy) => ({
      ...policy,
      tabla: policy.tabla || policy.sourceTable || policy.ramo || 'General',
    }));
}

function computeExpiringPolicies(allPolicies, daysAhead = 7) {
  const today = startOfToday();
  const futureDate = startOfToday();
  futureDate.setDate(today.getDate() + daysAhead);

  return allPolicies.filter((policy) => {
    if (isPolicyCancelled(policy)) return false;
    // NO excluir pagadas: vencimientos debe incluir todas (pagadas o no)
    const endDate = policyEndDate(policy);
    if (!endDate) return false;
    return endDate >= today && endDate <= futureDate;
  });
}

function computeCancelledPolicies(allPolicies) {
  return allPolicies.filter(isPolicyCancelled).map((policy) => ({
    numero_poliza: policy.numero_poliza || '-',
    contratante: policy.nombre_contratante || policy.contratante || '-',
    ramo: policy.ramo || policy.tabla || '-',
    estado_cap: policy.estado_cap || '-',
    estado_cfp: policy.estado_cfp || '-',
  }));
}

function calculateTotalPartialAmount(policies) {
  return policies.reduce((sum, policy) => {
    const amount = policy.pago_parcial || 0;
    return sum + (typeof amount === 'number' ? amount : parseFloat(amount) || 0);
  }, 0);
}

function mapSystemUpdateToUserMessage(act) {
  const type = act?.details?.type || act?.details?.event || act?.metadata?.type || 'general';
  const desc = (
    act?.details?.description ||
    act?.details?.message ||
    act?.details?.systemChangeSummary ||
    act?.details?.summary ||
    act?.metadata?.weeklySystemNote ||
    ''
  )
    .toString()
    .trim();
  if (desc) return desc;

  switch (type) {
    case 'resumen_semanal':
    case 'weekly_summary':
      return 'Se actualizó el resumen semanal.';
    case 'google_drive':
    case 'drive_sync':
      return 'Se sincronizó información con Google Drive.';
    case 'firebase_deploy':
    case 'system_deploy':
    case 'deploy':
      return 'Se publicaron mejoras del sistema (Firebase).';
    case 'pdf_parser':
    case 'pdf_processing':
      return 'Se mejoró el procesamiento de PDFs.';
    case 'contacts_csv':
    case 'contacts_import':
      return 'Se actualizó el flujo de contactos (CSV).';
    default:
      if (act?.userName && act.userName !== 'Unknown User') {
        return `Se aplicaron ajustes del sistema (${act.userName}).`;
      }
      return 'Se aplicaron ajustes del sistema.';
  }
}

function buildSystemUpdateItems(activities) {
  return activities
    .filter((act) => {
      const a = act.action;
      if (a === 'system_deployment' || a === 'system_update') return true;
      const d = act.details || {};
      if (typeof d.systemChangeSummary === 'string' && d.systemChangeSummary.trim()) return true;
      if (d.notifyWeeklySummary && (d.summary || d.description || d.message)) return true;
      return false;
    })
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .map((act) => ({
      timestamp: act.timestamp,
      type: act?.details?.type || act?.metadata?.type || 'general',
      message: mapSystemUpdateToUserMessage(act),
    }))
    .filter((item, idx, arr) => {
      const key = `${item.type}::${item.message}`;
      return arr.findIndex((x) => `${x.type}::${x.message}` === key) === idx;
    })
    .slice(0, 8);
}

function computeCapturedInRange(allPolicies, startDate, endDate) {
  return allPolicies.filter((policy) => {
    const created = policy.createdAt;
    const createdDate = toJsDate(created);
    if (!createdDate) return false;
    return createdDate >= startDate && createdDate <= endDate;
  });
}

module.exports = {
  POLICY_COLLECTIONS,
  fetchAllPolicies,
  computePaymentsPending,
  computePaymentsPendingWithStats,
  buildPaymentsPendingMonthNote,
  getCalendarMonthLabel,
  getPreviousCalendarMonth,
  computePartialPaymentsDue,
  computeExpiringPolicies,
  computeCancelledPolicies,
  calculateTotalPartialAmount,
  buildSystemUpdateItems,
  computeCapturedInRange,
  policyEndDate,
  toJsDate,
  parsePolicyDate,
};
