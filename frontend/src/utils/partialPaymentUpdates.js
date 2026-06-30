import { parseDate, toDDMMMYYYY } from './dateUtils';
import {
  hasPartialPayments,
  calculateTotalPayments,
  getPartialPaymentNumber,
  resolvePaymentFormKey,
} from './policyPaymentReminder';
import { isLegacyUntrackedPolicy } from './policyPaymentStatus';

const PAYMENT_INTERVAL_MONTHS = {
  MENSUAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  CUATRIMESTRAL: 4,
  SEMESTRAL: 6,
  ANUAL: 12,
  CONTADO: 12,
};

export function isInstallmentPaid(pagosRealizados, paymentNumber) {
  const entry = (pagosRealizados || []).find(
    (p) => Number(p.numero) === Number(paymentNumber),
  );
  return Boolean(entry?.pagado);
}

export function computeInstallmentDueDate(policy, installmentNumber) {
  const start = parseDate(
    policy.fecha_inicio || policy.vigencia_inicio || policy.fecha_emision,
  );
  if (!start || Number.isNaN(start.getTime())) return null;

  const interval =
    PAYMENT_INTERVAL_MONTHS[resolvePaymentFormKey(policy.forma_pago)] || 1;
  const due = new Date(start);
  due.setMonth(due.getMonth() + interval * (installmentNumber - 1));
  return toDDMMMYYYY(due);
}

/**
 * Calcula campos de Firebase al marcar/desmarcar una cuota.
 * Fuente de verdad: pagos_realizados[].
 */
export function buildPartialPaymentUpdate(policy, paymentNumber, markAsPaid) {
  const pagosRealizados = (policy.pagos_realizados || []).map((p) => ({ ...p }));
  const num = Number(paymentNumber);
  const existing = pagosRealizados.find((p) => Number(p.numero) === num);

  if (existing) {
    existing.pagado = markAsPaid;
    existing.fecha = markAsPaid ? toDDMMMYYYY(new Date()) : null;
  } else {
    pagosRealizados.push({
      numero: num,
      fecha: markAsPaid ? toDDMMMYYYY(new Date()) : null,
      pagado: markAsPaid,
    });
  }

  const total = policy.total_pagos || calculateTotalPayments(policy.forma_pago);
  let firstUnpaid = null;
  for (let i = 1; i <= total; i += 1) {
    if (!isInstallmentPaid(pagosRealizados, i)) {
      firstUnpaid = i;
      break;
    }
  }

  const allPaid = firstUnpaid === null;
  const pago_actual = allPaid ? total : firstUnpaid;
  const fecha_proximo_pago = allPaid
    ? null
    : computeInstallmentDueDate(policy, pago_actual);

  return {
    pagos_realizados: pagosRealizados,
    pago_actual,
    fecha_proximo_pago,
    primer_pago_realizado: isInstallmentPaid(pagosRealizados, 1),
    estado_pago: allPaid ? 'Pagado' : 'No Pagado',
  };
}

export function countPaidInstallments(policy) {
  const total = policy.total_pagos || calculateTotalPayments(policy.forma_pago);
  let paid = 0;
  for (let i = 1; i <= total; i += 1) {
    if (isInstallmentPaid(policy.pagos_realizados, i)) paid += 1;
  }
  return paid;
}

export function getPartialPaymentProgress(policy) {
  const total = policy.total_pagos || calculateTotalPayments(policy.forma_pago);
  const paid = countPaidInstallments(policy);
  return { paid, total };
}

export function getPartialPaymentProgressLabel(policy) {
  const { paid, total } = getPartialPaymentProgress(policy);
  return `${paid}/${total}`;
}

/** completo = todas pagadas, parcial = algunas, pendiente = ninguna */
export function getPartialPaymentProgressStyle(policy) {
  const { paid, total } = getPartialPaymentProgress(policy);
  if (paid >= total) return 'completo';
  if (paid > 0) return 'parcial';
  return 'pendiente';
}

export function isCurrentInstallmentPending(policy) {
  if (isLegacyUntrackedPolicy(policy)) return false;
  if (!hasPartialPayments(policy.forma_pago)) {
    return !policy.primer_pago_realizado;
  }
  const current = getPartialPaymentNumber(policy);
  return !isInstallmentPaid(policy.pagos_realizados, current);
}
