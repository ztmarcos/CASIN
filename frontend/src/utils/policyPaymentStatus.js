import { parseDate } from './dateUtils.js';
import {
  isPolicyExpired,
  isPorVencerProximosMeses,
} from './policyExpiryBuckets.js';
import { hasPartialPayments } from './policyPaymentReminder.js';

/** Aproximación: capturas anteriores a esta fecha no tenían seguimiento Pagado/No Pagado. */
export const PAYMENT_TRACKING_START_MS = new Date('2025-01-01T00:00:00').getTime();

/** Pólizas por vencer dentro de esta ventana se tratan como legacy si nunca tuvieron seguimiento de pago. */
export const LEGACY_POR_VENCER_MESES = 12;

export const LEGACY_PAYMENT_STATUS = null;

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

export function getPolicyEntryTimestamp(policy) {
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

export function hasExplicitPaymentTracking(policy) {
  if (!policy) return false;

  const estadoPago = (policy.estado_pago || '').toString().trim();
  if (/^pagado$/i.test(estadoPago) || /^no pagado$/i.test(estadoPago)) {
    return true;
  }
  if (policy.primer_pago_realizado === true) return true;
  if ((policy.pagos_realizados || []).some((entry) => entry?.pagado === true)) {
    return true;
  }
  if (Array.isArray(policy.payment_reminders_log) && policy.payment_reminders_log.length > 0) {
    return true;
  }
  return false;
}

/**
 * Pólizas capturadas antes del seguimiento de pagos, sin estado explícito.
 * No deben mostrarse como "No Pagado" ni recibir recordatorios automáticos.
 */
export function isLegacyUntrackedPolicy(policy) {
  if (!policy || hasExplicitPaymentTracking(policy)) return false;

  if (isPolicyExpired(policy) || isPorVencerProximosMeses(policy, LEGACY_POR_VENCER_MESES)) {
    return true;
  }

  const entryTimestamp = getPolicyEntryTimestamp(policy);
  if (entryTimestamp > 0 && entryTimestamp < PAYMENT_TRACKING_START_MS) {
    return true;
  }

  return false;
}

/**
 * @returns {'Pagado'|'No Pagado'|null} null = sin seguimiento (legacy)
 */
export function resolvePolicyPaymentStatus(policy) {
  if (!policy) return LEGACY_PAYMENT_STATUS;

  if (hasExplicitPaymentTracking(policy)) {
    const estadoPago = (policy.estado_pago || '').toString().trim();
    if (/^pagado$/i.test(estadoPago)) return 'Pagado';
    if (/^no pagado$/i.test(estadoPago)) return 'No Pagado';

    const formaPago = policy.forma_pago || policy.forma_de_pago;
    if (hasPartialPayments(formaPago)) {
      const total = policy.total_pagos || 12;
      let allPaid = true;
      for (let i = 1; i <= total; i += 1) {
        const entry = (policy.pagos_realizados || []).find(
          (p) => Number(p.numero) === i,
        );
        if (!entry?.pagado) {
          allPaid = false;
          break;
        }
      }
      return allPaid ? 'Pagado' : 'No Pagado';
    }

    if (policy.primer_pago_realizado === true) return 'Pagado';
    return 'No Pagado';
  }

  if (isLegacyUntrackedPolicy(policy)) return LEGACY_PAYMENT_STATUS;

  return 'No Pagado';
}

export function isPolicyPaidResolved(policy) {
  return resolvePolicyPaymentStatus(policy) === 'Pagado';
}

export function shouldExcludeFromPaymentReminders(policy) {
  return isLegacyUntrackedPolicy(policy) || isPolicyPaidResolved(policy);
}
