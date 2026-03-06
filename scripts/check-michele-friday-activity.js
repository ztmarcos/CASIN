#!/usr/bin/env node
/**
 * Consulta activity_logs en Firestore para la usuaria Michele el viernes.
 * Busca capturas de póliza (data_captured) y cualquier actividad para diagnosticar
 * "insert no agregó a la tabla".
 *
 * Uso: node scripts/check-michele-friday-activity.js [días_atrás]
 * Ejemplo: node scripts/check-michele-friday-activity.js 7
 */

const path = require('path');
const dotenv = require('dotenv');
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

function isFriday(isoDateStr) {
  if (!isoDateStr) return false;
  const d = new Date(isoDateStr);
  return d.getDay() === 5; // 5 = viernes
}

function isMichele(userName, userEmail) {
  const name = (userName || '').toLowerCase();
  const email = (userEmail || '').toLowerCase();
  return name.includes('michele') || name.includes('michelle') || name.includes('michell') || email.includes('michell') || email.includes('michele') || email.includes('michelle');
}

async function main() {
  const daysBack = parseInt(process.argv[2] || '7', 10);
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const sinceISO = since.toISOString();

  console.log(`\n📋 Actividad de Michele (viernes) en activity_logs (últimos ${daysBack} días, desde ${sinceISO})\n`);

  const db = initFirebase();
  let snapshot;
  try {
    snapshot = await db.collection('activity_logs')
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();
  } catch (e) {
    console.log('orderBy timestamp falló, intentando sin orden:', e.message);
    snapshot = await db.collection('activity_logs').limit(300).get();
  }

  const all = [];
  snapshot.forEach((doc) => {
    const d = doc.data();
    const ts = d.timestamp || d.createdAt || '';
    if (ts && ts >= sinceISO) {
      all.push({ id: doc.id, ...d });
    }
  });

  const micheleLogs = all.filter((d) => isMichele(d.userName, d.userEmail));
  const micheleFriday = micheleLogs.filter((d) => isFriday(d.timestamp || d.createdAt));

  console.log(`Total documentos en el rango: ${all.length}`);
  console.log(`Actividad de Michele (cualquier día): ${micheleLogs.length}`);
  console.log(`Actividad de Michele el VIERNES: ${micheleFriday.length}\n`);

  if (micheleFriday.length === 0 && micheleLogs.length === 0) {
    console.log('No hay registros de Michele en el rango. Mostrando últimos logs de cualquier usuario (por si el nombre viene distinto):\n');
    const recent = all.slice(0, 15);
    recent.forEach((d, i) => {
      console.log(`${i + 1}. ${d.timestamp} | ${d.userName || '-'} (${d.userEmail || '-'}) | ${d.action} | ${d.tableName || '-'}`);
    });
    return;
  }

  if (micheleFriday.length > 0) {
    console.log('--- Actividad de Michele el VIERNES ---\n');
    micheleFriday.forEach((d, i) => {
      console.log(`${i + 1}. ${d.timestamp}`);
      console.log(`   user: ${d.userName} (${d.userEmail})`);
      console.log(`   action: ${d.action} | table: ${d.tableName || '-'}`);
      console.log(`   details: ${JSON.stringify(d.details || {}).slice(0, 200)}`);
      console.log('');
    });
  }

  if (micheleLogs.length > 0 && micheleFriday.length !== micheleLogs.length) {
    console.log('--- Resto de actividad de Michele (otros días) ---\n');
    micheleLogs.filter((d) => !isFriday(d.timestamp)).slice(0, 10).forEach((d, i) => {
      console.log(`${i + 1}. ${d.timestamp} | ${d.action} | ${d.tableName || '-'}`);
    });
  }

  const dataCaptured = micheleFriday.filter((d) => d.action === 'data_captured');
  if (micheleFriday.length > 0 && dataCaptured.length === 0) {
    console.log('\n⚠️  Michele tiene actividad el viernes pero NINGUNA con action "data_captured".');
    console.log('   Si intentó insertar una póliza, el insert pudo fallar antes de registrar el log (ej. 403 o error de API).');
    console.log('   Revisar logs de Cloud Functions (api) para ese día: firebase functions:log');
  }
  if (dataCaptured.length > 0) {
    console.log(`\n✅ data_captured el viernes: ${dataCaptured.length} — el insert sí se registró en activity_logs.`);
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
