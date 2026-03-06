#!/usr/bin/env node

/**
 * Verificación de Firebase Functions relacionadas con schedulers.
 * - Comprueba que los endpoints HTTP de Firebase respondan.
 * - El índice de activity_logs ya está desplegado (firestore.indexes.json).
 * - Los schedulers (scheduledBirthdayEmails, scheduledWeeklyResumen) se ejecutan
 *   por Cloud Scheduler; para probarlos manualmente usa "Run now" en la consola de GCP.
 */

const https = require('https');

const FIREBASE_FUNCTIONS_URL = 'https://us-central1-casinbbdd.cloudfunctions.net';

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function main() {
  console.log('Firebase Schedulers – Verificación\n');

  // 1. getResumenConfig (usado por el resumen semanal y por el frontend)
  try {
    const r = await get(`${FIREBASE_FUNCTIONS_URL}/getResumenConfig`);
    if (r.status === 200) {
      console.log('  getResumenConfig: OK', r.data.enabled !== undefined ? `(enabled: ${r.data.enabled})` : '');
    } else {
      console.log('  getResumenConfig: ERROR', r.status, r.data);
    }
  } catch (e) {
    console.log('  getResumenConfig: FAIL', e.message);
  }

  // 2. testEmail (opcional, para comprobar que el envío de correo desde Firebase funciona)
  try {
    const r = await get(`${FIREBASE_FUNCTIONS_URL}/testEmail`);
    if (r.status === 200 && r.data && r.data.success) {
      console.log('  testEmail: OK (email de prueba enviado)');
    } else {
      console.log('  testEmail: respuesta inesperada', r.status, r.data && r.data.error ? r.data.error : '');
    }
  } catch (e) {
    console.log('  testEmail: FAIL', e.message);
  }

  console.log('\n--- Schedulers (Cloud Scheduler) ---');
  console.log('  scheduledBirthdayEmails: 9:00 AM CST diario');
  console.log('  scheduledWeeklyResumen: Viernes 5:00 PM CST');
  console.log('\nPara ejecutar manualmente (después del fix del índice):');
  console.log('  1. https://console.cloud.google.com/cloudscheduler?project=casinbbdd');
  console.log('  2. Abre cada job y pulsa "Run now"');
  console.log('  3. Logs: https://console.firebase.google.com/project/casinbbdd/functions/logs');
  console.log('\nÍndice activity_logs: desplegado en firestore.indexes.json (action ASC, timestamp DESC).');
  console.log('Si el índice está en estado "Building", espera unos minutos antes de "Run now".');
}

main().catch((e) => { console.error(e); process.exit(1); });
