/**
 * Script: Convierte nombres en formato "Apellidos Nombres" a "Nombres Apellidos"
 * en la colección clientes_metadata. Solo toca Firestore, no la UI.
 *
 * Uso: node scripts/normalize-client-names-apellidos-nombres.js
 * Opcional: DRY_RUN=1 para solo listar cambios sin escribir.
 */

const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '..', 'casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json');
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  } catch (e) {
    console.error('Error inicializando Firebase Admin. Asegúrate de tener el JSON de cuenta de servicio en la raíz.');
    process.exit(1);
  }
}

const db = admin.firestore();
const DRY_RUN = process.env.DRY_RUN === '1';

/**
 * Convierte "Apellidos Nombres" -> "Nombres Apellidos"
 * - 2 palabras: intercambia
 * - 3: última palabra (nombre) al inicio
 * - 4+: últimas 2 palabras (nombres) al inicio
 */
function apellidosNombresToNombresApellidos(fullName) {
  if (!fullName || typeof fullName !== 'string') return fullName;
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return fullName.trim();
  if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  const k = parts.length === 3 ? 1 : 2;
  const nombres = parts.slice(-k);
  const apellidos = parts.slice(0, -k);
  return [...nombres, ...apellidos].join(' ');
}

async function main() {
  const collName = 'clientes_metadata';
  console.log(`Leyendo colección: ${collName}${DRY_RUN ? ' (DRY_RUN, no se escribirá nada)' : ''}\n`);

  const snapshot = await db.collection(collName).get();
  let updated = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const current = (data.clientName || '').trim();
    if (!current) {
      skipped++;
      continue;
    }
    const converted = apellidosNombresToNombresApellidos(current);
    if (converted === current) {
      skipped++;
      continue;
    }
    console.log(`  "${current}"  →  "${converted}"  (id: ${docSnap.id})`);
    if (!DRY_RUN) {
      await docSnap.ref.update({ clientName: converted, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      updated++;
    } else {
      updated++;
    }
  }

  console.log(`\nResumen: ${updated} nombre(s) convertido(s), ${skipped} sin cambio o vacío.`);
  if (DRY_RUN && updated > 0) console.log('Ejecuta sin DRY_RUN=1 para aplicar los cambios.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
