#!/usr/bin/env node
/**
 * Consulta activity_logs en Firestore para ver actividad reciente (últimos 30 min).
 * Útil para revisar qué hizo Michelle u otro usuario sin pedirle logs.
 *
 * Uso: node scripts/check-recent-activity.js [minutos]
 * Ejemplo: node scripts/check-recent-activity.js 20
 */

const path = require('path');
const dotenv = require('dotenv');

// Cargar .env desde la raíz del proyecto
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const admin = require('firebase-admin');

function initFirebase() {
  if (admin.apps.length) return admin.firestore();
  if (!process.env.VITE_FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Falta VITE_FIREBASE_PROJECT_ID o FIREBASE_PRIVATE_KEY en .env');
  }
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.VITE_FIREBASE_PROJECT_ID,
    private_key: privateKey,
    client_email: `firebase-adminsdk-hnwk0@${process.env.VITE_FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
  };
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  return admin.firestore();
}

async function main() {
  const minutes = parseInt(process.argv[2] || '30', 10);
  const since = new Date(Date.now() - minutes * 60 * 1000);
  const sinceISO = since.toISOString();

  console.log(`\n📋 Actividad en Firebase (últimos ${minutes} minutos, desde ${sinceISO})\n`);

  const db = initFirebase();
  let snapshot;
  try {
    snapshot = await db.collection('activity_logs')
      .orderBy('timestamp', 'desc')
      .limit(200)
      .get();
  } catch (e) {
    // Si no hay índice en timestamp, intentar solo limit
    console.log('orderBy timestamp falló, intentando sin orden:', e.message);
    snapshot = await db.collection('activity_logs').limit(50).get();
  }

  const logs = [];
  const allRecent = [];
  snapshot.forEach((doc) => {
    const d = doc.data();
    const ts = d.timestamp || d.createdAt || '';
    allRecent.push({ id: doc.id, ...d });
    if (ts && ts >= sinceISO) {
      logs.push({
        id: doc.id,
        timestamp: d.timestamp,
        userName: d.userName,
        userEmail: d.userEmail,
        action: d.action,
        tableName: d.tableName || '-',
        details: d.details ? JSON.stringify(d.details).slice(0, 80) : '-',
      });
    }
  });

  if (logs.length === 0) {
    console.log('No hay registros en activity_logs en ese rango.');
    if (allRecent.length > 0) {
      console.log(`\nÚltimos ${Math.min(5, allRecent.length)} documentos en activity_logs (para ver estructura):`);
      allRecent.slice(0, 5).forEach((d, i) => {
        console.log(`${i + 1}.`, JSON.stringify({ timestamp: d.timestamp, userName: d.userName, userEmail: d.userEmail, action: d.action }, null, 2));
      });
    } else {
      console.log('La colección activity_logs está vacía o no existe.');
    }
    console.log('\n(El login no se registra actualmente en la app; solo email_sent, data_captured, daily_activity, etc.)\n');
    return;
  }

  console.log(`Encontrados ${logs.length} registros:\n`);
  logs.forEach((l, i) => {
    console.log(`${i + 1}. ${l.timestamp} | ${l.userName || '-'} (${l.userEmail || '-'})`);
    console.log(`   action: ${l.action} | table: ${l.tableName} | ${l.details}`);
    console.log('');
  });
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
