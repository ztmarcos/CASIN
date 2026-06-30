import { parseDate } from './dateUtils';

/** Pólizas con vencimiento hace más de N meses van a "Archivo muerto" (no a vencidas recientes). */
export const ARCHIVE_DEAD_MONTHS = 4;

/** En reporte Vencimientos: vigentes con fin de vigencia dentro de esta ventana muestran «Por vencer». */
export const POR_VENCER_MESES = 2;

export function getArchiveCutoffDate() {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setMonth(cutoff.getMonth() - ARCHIVE_DEAD_MONTHS);
  return cutoff;
}

export function getExpiryDateRaw(policy) {
  if (!policy) return null;
  return policy.fecha_fin ?? policy.fecha_fin_raw ?? policy.vigencia_fin ?? null;
}

export function getPolicyEndDay(policy) {
  const raw = getExpiryDateRaw(policy);
  if (raw == null || raw === '') return null;
  const d = parseDate(raw);
  if (!d || isNaN(d.getTime())) return null;
  const endDay = new Date(d);
  endDay.setHours(0, 0, 0, 0);
  return endDay;
}

/** Igual que Reportes: overrides + fecha_fin vs hoy a medianoche. */
export function isPolicyExpired(policy) {
  if (!policy) return false;
  if (policy.expiration_override === 'activo') return false;
  if (policy.expiration_override === 'vencido') return true;

  const raw = getExpiryDateRaw(policy);
  if (!raw) return false;

  const policyEndDate = parseDate(raw);
  if (!policyEndDate || isNaN(policyEndDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDay = new Date(policyEndDate);
  endDay.setHours(0, 0, 0, 0);
  return endDay < today;
}

/**
 * Vencida hace poco: seguimiento operativo (vigente hace ≤ ARCHIVE_DEAD_MONTHS meses o sin fecha clara).
 */
export function isRecentlyExpiredPolicy(policy) {
  if (!isPolicyExpired(policy)) return false;
  const end = getPolicyEndDay(policy);
  if (!end) return true;
  const cutoff = getArchiveCutoffDate();
  return end >= cutoff;
}

/**
 * Archivo muerto: vencida y fecha de fin anterior al corte (más de ARCHIVE_DEAD_MONTHS meses).
 */
export function isArchiveDeadPolicy(policy) {
  if (!isPolicyExpired(policy)) return false;
  const end = getPolicyEndDay(policy);
  if (!end) return false;
  return end < getArchiveCutoffDate();
}

/**
 * Vigente (no vencida por reglas de negocio) con fecha_fin en los próximos `meses` meses (desde hoy a medianoche).
 */
export function isPorVencerProximosMeses(policy, meses = POR_VENCER_MESES) {
  if (!policy || isPolicyExpired(policy)) return false;
  const end = getPolicyEndDay(policy);
  if (!end) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (end < today) return false;
  const limite = new Date(today);
  limite.setMonth(limite.getMonth() + meses);
  return end <= limite;
}
