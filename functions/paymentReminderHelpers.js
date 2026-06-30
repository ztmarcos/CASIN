/**
 * Payment reminder cron helpers — eligibility, policy fetch, email build.
 */

const weeklyResumenHelpers = require('./weeklyResumenHelpers');
const policyReminder = require('./shared/policyPaymentReminder');
const emailTemplate = require('./shared/paymentReminderEmailTemplate');
const policyPaymentStatus = require('./shared/policyPaymentStatus');

const ARCHIVE_DEAD_MONTHS = 4;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CASIN_TEAM_ID = '4JlUqhAvfJMlCDhQ4vgH';

function startOfToday() {
  return policyReminder.startOfDay(new Date());
}

function policyEndDate(policy) {
  return weeklyResumenHelpers.policyEndDate(policy);
}

function isPolicyExpired(policy) {
  if (policy.expiration_override === 'activo') return false;
  if (policy.expiration_override === 'vencido') return true;
  const endDate = policyEndDate(policy);
  if (!endDate) return false;
  return endDate < startOfToday();
}

function isArchiveDeadPolicy(policy) {
  if (!isPolicyExpired(policy)) return false;
  const end = policyEndDate(policy);
  if (!end) return false;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setMonth(cutoff.getMonth() - ARCHIVE_DEAD_MONTHS);
  return end < cutoff;
}

function isPolicyCancelled(policy) {
  const status = (policy.estado || policy.estatus || '').toString().toLowerCase();
  if (status.includes('cancel')) return true;
  return policy.estado_cap === 'Inactivo' && policy.estado_cfp === 'Inactivo';
}

function isPolicyPaid(policy) {
  return policyPaymentStatus.resolvePolicyPaymentStatus(policy) === 'Pagado';
}

function isLegacyUntrackedPolicy(policy) {
  return policyPaymentStatus.isLegacyUntrackedPolicy(policy);
}

function normalizeFormaPago(policy) {
  return (policy.forma_pago || policy.forma_de_pago || '').toString().trim().toUpperCase();
}

/** Anuales/contado: no reciben recordatorios automáticos (se asume pagadas al cargarse). */
function isAnnualOrContadoPolicy(policy) {
  const forma = normalizeFormaPago(policy);
  return forma === 'ANUAL' || forma === 'CONTADO';
}

function reportsStyleFraccionado(policy) {
  const f = normalizeFormaPago(policy);
  return f !== 'ANUAL' && f !== 'CONTADO' && f !== '';
}

function isPendingPorCobrar(policy) {
  return policyReminder.isCurrentInstallmentPending(policy);
}

function resolvePolicyEmail(policy) {
  const email =
    policy.email ||
    policy.e_mail ||
    policy.correo ||
    policy.email_contratante ||
    '';
  const trimmed = email.toString().trim();
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
}

function isEligibleForPaymentReminder(policy) {
  if (isLegacyUntrackedPolicy(policy)) return { ok: false, reason: 'legacy_untracked' };
  if (isAnnualOrContadoPolicy(policy)) return { ok: false, reason: 'annual_excluded' };
  if (reportsStyleFraccionado(policy) && policyReminder.readPagoParcialOnly(policy) == null) {
    return { ok: false, reason: 'no_pago_parcial' };
  }
  if (isPolicyPaid(policy)) return { ok: false, reason: 'paid' };
  if (isPolicyCancelled(policy)) return { ok: false, reason: 'cancelled' };
  if (isPolicyExpired(policy)) return { ok: false, reason: 'expired' };
  if (isArchiveDeadPolicy(policy)) return { ok: false, reason: 'archive_dead' };
  if (!resolvePolicyEmail(policy)) return { ok: false, reason: 'no_email' };
  if (!isPendingPorCobrar(policy)) return { ok: false, reason: 'not_pending' };
  if (!policyReminder.getDueDateForPolicy(policy)) return { ok: false, reason: 'no_due_date' };
  return { ok: true };
}

function getCollectionNamesForTeam(teamId, teamData) {
  const isCASIN = teamData?.isMainTeam === true || teamId === CASIN_TEAM_ID;
  const base = weeklyResumenHelpers.POLICY_COLLECTIONS;
  return isCASIN ? base : base.map((c) => `team_${teamId}_${c}`);
}

async function fetchAllPoliciesForTeam(db, teamId, teamData) {
  const collectionNames = getCollectionNamesForTeam(teamId, teamData);
  const all = [];

  for (const collectionName of collectionNames) {
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
          table: collectionName,
          ramo: data.ramo || collectionName,
          teamId,
        });
      });
    } catch (err) {
      console.warn(`paymentReminders: skip collection ${collectionName}:`, err.message);
    }
  }
  return all;
}

function buildReminderEmail(policy, ctx, senderName) {
  const publicCrmBase = (process.env.PUBLIC_CRM_URL || 'https://casin-crm.web.app').replace(/\/$/, '');
  return emailTemplate.renderPaymentReminderEmail({
    clientName: ctx.clientName,
    policyNumber: ctx.policyNumber,
    aseguradora: ctx.aseguradora,
    ramoLabel: ctx.ramoLabel,
    dueDateLong: ctx.dueDateLong,
    amount: ctx.hasAmount ? ctx.amount : null,
    hasAmount: ctx.hasAmount,
    logoUrl: `${publicCrmBase}/logo.png`,
    isPartial: ctx.isPartial,
    currentPayment: ctx.currentPayment,
    totalPayments: ctx.totalPayments,
  });
}

async function appendPaymentReminderLog(db, policy, entry) {
  const collectionName = policy.sourceTable || policy.tabla || policy.table;
  if (!collectionName || !policy.id) {
    throw new Error('Missing collection or policy id for reminder log');
  }
  const ref = db.collection(collectionName).doc(policy.id);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data().payment_reminders_log || [] : [];
  const nextLog = [...existing, entry].slice(-20);
  await ref.update({ payment_reminders_log: nextLog });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core job used by scheduledPaymentReminders (and optional HTTP trigger).
 * @param {FirebaseFirestore.Firestore} db
 * @param {{ getTransporterForTeam: Function }} deps
 */
async function runPaymentRemindersJob(db, deps = {}) {
  const getTransporterForTeam = deps.getTransporterForTeam;
  if (typeof getTransporterForTeam !== 'function') {
    throw new Error('runPaymentRemindersJob requires getTransporterForTeam');
  }

  const today = policyReminder.startOfDay(new Date());
  const runTimestamp = new Date().toISOString();

  const configSnap = await db.collection('app_config').doc('payment-reminders-auto').get();
  const config = configSnap.exists ? configSnap.data() : {};
  const enabled = config.enabled === true;
  const dryRun = config.dryRun === true;
  const maxEmailsPerRun = Number(config.maxEmailsPerRun) || 100;
  const redirectAllTo = (config.redirectAllTo || '').toString().trim() || null;

  if (!enabled) {
    return { status: 'skipped', message: 'Payment reminders disabled' };
  }

  const teamsSnapshot = await db.collection('teams').get();
  let totalSent = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const results = [];

  for (const teamDoc of teamsSnapshot.docs) {
    if (totalSent >= maxEmailsPerRun) break;

    const teamId = teamDoc.id;
    const teamData = teamDoc.data();
    const teamName = teamData.name || teamId;
    const senderEmail = teamData?.emailConfig?.senderEmail || 'casinseguros@gmail.com';
    const senderName = teamData?.emailConfig?.senderName || teamData?.name || 'CASIN Seguros';
    const transporter = getTransporterForTeam(teamId, teamData);

    const policies = await fetchAllPoliciesForTeam(db, teamId, teamData);
    console.log(`💳 Team ${teamName}: scanning ${policies.length} policies`);

    for (const policy of policies) {
      if (totalSent >= maxEmailsPerRun) break;

      const eligibility = isEligibleForPaymentReminder(policy);
      if (!eligibility.ok) {
        totalSkipped++;
        continue;
      }

      const slot = policyReminder.getTodayReminderSlot(policy, today);
      if (!slot) continue;

      if (policyReminder.wasReminderAlreadySent(policy, slot.slotKey)) {
        totalSkipped++;
        continue;
      }

      const ctx = policyReminder.buildPaymentReminderContext(policy);
      const intendedTo = resolvePolicyEmail(policy);
      const sendTo = redirectAllTo || intendedTo;
      let { subject, html } = buildReminderEmail(policy, ctx, senderName);
      if (redirectAllTo && sendTo !== intendedTo) {
        subject = `[PRUEBA CRM] ${subject}`;
        html =
          `<p style="font-family:sans-serif;font-size:13px;color:#64748b;"><em>Correo de prueba. Destinatario real sería: ${intendedTo || 'sin email'}. Póliza ${policy.numero_poliza || 'N/A'}.</em></p>` +
          html;
      }

      if (dryRun) {
        console.log(`[dryRun] Would send to ${sendTo} (client: ${intendedTo}): ${subject} (${slot.slotKey})`);
        totalSent++;
        results.push({
          teamId,
          policyNumber: policy.numero_poliza,
          to: sendTo,
          intendedTo,
          slotKey: slot.slotKey,
          dryRun: true,
        });
        continue;
      }

      if (!transporter) {
        console.log(`⏭️  No SMTP for team ${teamName}; skip ${policy.numero_poliza}`);
        totalErrors++;
        continue;
      }

      try {
        const mailResult = await transporter.sendMail({
          from: { name: `${senderName} - Recordatorio de pago`, address: senderEmail },
          to: sendTo,
          bcc: ['casinseguros@gmail.com', senderEmail].filter((v, i, a) => a.indexOf(v) === i),
          subject,
          html,
        });

        const logEntry = {
          slotKey: slot.slotKey,
          daysBefore: slot.daysBefore,
          dueDate: policyReminder.formatDateISO(slot.dueDate),
          sentAt: runTimestamp,
          reminderType: slot.reminderType,
          to: sendTo,
          intendedTo,
          testRedirect: Boolean(redirectAllTo),
          messageId: mailResult.messageId || null,
        };

        await appendPaymentReminderLog(db, policy, logEntry);

        totalSent++;
        results.push({
          teamId,
          policyNumber: policy.numero_poliza,
          to: sendTo,
          intendedTo,
          slotKey: slot.slotKey,
          messageId: mailResult.messageId,
        });

        console.log(`✅ Reminder sent: ${policy.numero_poliza} → ${sendTo} (${slot.slotKey})`);
        await sleep(1500);
      } catch (sendErr) {
        totalErrors++;
        console.error(`❌ Failed reminder for ${policy.numero_poliza}:`, sendErr.message);
      }
    }
  }

  await db.collection('activity_logs').add({
    action: 'payment_reminders_sent',
    timestamp: runTimestamp,
    summary: {
      sent: totalSent,
      skipped: totalSkipped,
      errors: totalErrors,
      dryRun,
    },
    results: results.slice(0, 50),
  });

  return {
    status: 'success',
    sent: totalSent,
    skipped: totalSkipped,
    errors: totalErrors,
    dryRun,
    redirectAllTo,
    timestamp: runTimestamp,
  };
}

/**
 * Elige póliza fraccionada con fecha límite más cercana (ideal: slot de recordatorio hoy).
 */
function pickBestPolicyForTestReminder(policies, today) {
  const candidates = [];

  for (const policy of policies) {
    if (isAnnualOrContadoPolicy(policy)) continue;
    if (!policy.numero_poliza) continue;
    if (!(policy.nombre_contratante || policy.contratante)) continue;
    if (policyReminder.readPagoParcialOnly(policy) == null) continue;

    const dueDate = policyReminder.getDueDateForPolicy(policy);
    if (!dueDate || Number.isNaN(dueDate.getTime())) continue;

    const dueDay = policyReminder.startOfDay(dueDate);
    const diffDays = Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays > 45) continue;

    const slot = policyReminder.getTodayReminderSlot(policy, today);
    candidates.push({
      policy,
      dueDate: policyReminder.formatDateISO(dueDay),
      daysUntil: diffDays,
      hasSlotToday: Boolean(slot),
      slotDaysBefore: slot?.daysBefore ?? null,
    });
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.hasSlotToday !== b.hasSlotToday) return a.hasSlotToday ? -1 : 1;
    return a.daysUntil - b.daysUntil;
  });

  return candidates[0];
}

/**
 * Envía UN correo de prueba con datos reales de una póliza con vencimiento cercano.
 * No escribe payment_reminders_log (no afecta cron real).
 */
async function sendOneTestPaymentReminder(db, deps = {}, options = {}) {
  const getTransporterForTeam = deps.getTransporterForTeam;
  if (typeof getTransporterForTeam !== 'function') {
    throw new Error('sendOneTestPaymentReminder requires getTransporterForTeam');
  }

  const toEmail = (options.toEmail || 'ztmarcos@gmail.com').toString().trim();
  const today = policyReminder.startOfDay(new Date());
  const teamsSnapshot = await db.collection('teams').get();
  let picked = null;
  let teamId = null;
  let teamData = null;

  for (const teamDoc of teamsSnapshot.docs) {
    const policies = await fetchAllPoliciesForTeam(db, teamDoc.id, teamDoc.data());
    const best = pickBestPolicyForTestReminder(policies, today);
    if (best && (!picked || best.daysUntil < picked.daysUntil || best.hasSlotToday)) {
      picked = best;
      teamId = teamDoc.id;
      teamData = teamDoc.data();
    }
  }

  if (!picked) {
    throw new Error('No se encontró póliza fraccionada con pago en los próximos 45 días');
  }

  const samplePolicy = picked.policy;

  const senderEmail = teamData?.emailConfig?.senderEmail || 'casinseguros@gmail.com';
  const senderName = teamData?.emailConfig?.senderName || teamData?.name || 'CASIN Seguros';
  const transporter = getTransporterForTeam(teamId, teamData);
  if (!transporter) {
    throw new Error(`No SMTP configurado para el equipo ${teamId}`);
  }

  const ctx = policyReminder.buildPaymentReminderContext(samplePolicy);
  const intendedTo = resolvePolicyEmail(samplePolicy);
  let { subject, html } = buildReminderEmail(samplePolicy, ctx, senderName);
  subject = `[PRUEBA CRM] ${subject}`;
  html =
    `<p style="font-family:sans-serif;font-size:13px;color:#64748b;"><em>Correo de prueba. Destinatario real sería: ${intendedTo || 'sin email'}. Fecha límite: ${ctx.dueDateLong} (${picked.daysUntil} días).${picked.hasSlotToday ? ` Slot de hoy: ${picked.slotDaysBefore} días antes.` : ''} No se registró en payment_reminders_log.</em></p>` +
    html;

  const mailResult = await transporter.sendMail({
    from: { name: `${senderName} - Recordatorio de pago (prueba)`, address: senderEmail },
    to: toEmail,
    bcc: ['casinseguros@gmail.com'].filter((e) => e !== toEmail),
    subject,
    html,
  });

  await db.collection('activity_logs').add({
    action: 'payment_reminder_test_sent',
    timestamp: new Date().toISOString(),
    details: {
      policyNumber: samplePolicy.numero_poliza,
      collection: samplePolicy.sourceTable || samplePolicy.tabla,
      intendedTo,
      sentTo: toEmail,
      messageId: mailResult.messageId || null,
    },
  });

  return {
    status: 'success',
    policyNumber: samplePolicy.numero_poliza,
    contratante: samplePolicy.nombre_contratante || samplePolicy.contratante,
    intendedTo,
    sentTo: toEmail,
    dueDate: picked.dueDate,
    daysUntil: picked.daysUntil,
    slotToday: picked.hasSlotToday,
    slotDaysBefore: picked.slotDaysBefore,
    messageId: mailResult.messageId,
  };
}

module.exports = {
  isEligibleForPaymentReminder,
  isAnnualOrContadoPolicy,
  isPolicyPaid,
  fetchAllPoliciesForTeam,
  buildReminderEmail,
  appendPaymentReminderLog,
  resolvePolicyEmail,
  sleep,
  runPaymentRemindersJob,
  pickBestPolicyForTestReminder,
  sendOneTestPaymentReminder,
  policyReminder,
  emailTemplate,
};
