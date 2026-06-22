#!/usr/bin/env node
/**
 * Publica un feed estático de pólizas de autos para otra app (fetch o scraping).
 * Escribe en frontend/public/sync/ → tras `npm run build` queda en Firebase Hosting.
 *
 * URLs (producción):
 *   https://casin-crm.web.app/sync/autos.json
 *   https://casin-crm.web.app/sync/autos.html
 *
 * Con token (recomendado, env AUTOS_SYNC_TOKEN):
 *   https://casin-crm.web.app/sync/autos-<token>.json
 *
 * Uso:
 *   node scripts/publish-autos-sync-feed.js
 *   AUTOS_SYNC_TOKEN=mi-secreto node scripts/publish-autos-sync-feed.js
 *   npm run publish:autos-sync
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'sync');
const COLLECTION = 'autos';

const VEHICLE_FIELDS = [
  'nombre_contratante',
  'rfc',
  'e_mail',
  'domicilio_o_direccion',
  'numero_poliza',
  'aseguradora',
  'vigencia_inicio',
  'vigencia_fin',
  'forma_de_pago',
  'tipo_de_vehiculo',
  'descripcion_del_vehiculo',
  'serie',
  'modelo',
  'placas',
  'motor',
  'uso',
];

function initFirebase() {
  if (!admin.apps.length) {
    const jsonFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    let serviceAccount;
    if (jsonFromEnv) {
      serviceAccount = JSON.parse(jsonFromEnv);
    } else {
      const serviceAccountPath = path.join(ROOT, 'casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json');
      serviceAccount = require(serviceAccountPath);
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }
  return admin.firestore();
}

function pickFields(data) {
  const row = {};
  for (const key of VEHICLE_FIELDS) {
    const val = data[key];
    row[key] = val == null ? '' : val;
  }
  return row;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml(payload, jsonFileName) {
  const headers = ['id', ...VEHICLE_FIELDS];
  const headCells = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const bodyRows = payload.data
    .map((row) => {
      const cells = headers.map((h) => `<td>${escapeHtml(row[h])}</td>`).join('');
      return `<tr data-id="${escapeHtml(row.id)}">${cells}</tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CASIN — sync autos</title>
  <meta name="robots" content="noindex, nofollow" />
  <style>
    body { font-family: system-ui, sans-serif; margin: 1rem; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; position: sticky; top: 0; }
    .meta { color: #555; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <p class="meta">
    Generado: <time id="generated-at">${escapeHtml(payload.generatedAt)}</time>
    · Registros: <strong id="record-count">${payload.count}</strong>
    · JSON: <a id="json-link" href="./${escapeHtml(jsonFileName)}">${escapeHtml(jsonFileName)}</a>
  </p>
  <table id="x4-autos-sync">
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>
`;
}

async function main() {
  const token = (process.env.AUTOS_SYNC_TOKEN || '').trim();
  const baseName = token ? `autos-${token}` : 'autos';
  const jsonFileName = `${baseName}.json`;
  const htmlFileName = `${baseName}.html`;

  const db = initFirebase();
  const snap = await db.collection(COLLECTION).get();

  const data = snap.docs.map((doc) => ({
    id: doc.id,
    ...pickFields(doc.data()),
  }));

  const payload = {
    source: 'casin-x4',
    collection: COLLECTION,
    generatedAt: new Date().toISOString(),
    count: data.length,
    data,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const jsonPath = path.join(OUT_DIR, jsonFileName);
  const htmlPath = path.join(OUT_DIR, htmlFileName);

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
  fs.writeFileSync(htmlPath, buildHtml(payload, jsonFileName), 'utf-8');

  console.log(`✅ JSON: ${path.relative(ROOT, jsonPath)} (${data.length} registros)`);
  console.log(`✅ HTML: ${path.relative(ROOT, htmlPath)}`);
  console.log('');
  console.log('Tras build + deploy en Firebase Hosting:');
  console.log(`  https://casin-crm.web.app/sync/${jsonFileName}`);
  console.log(`  https://casin-crm.web.app/sync/${htmlFileName}`);
  if (!token) {
    console.log('');
    console.log('⚠️  Sin AUTOS_SYNC_TOKEN — el feed es público. Para URL privada:');
    console.log('   AUTOS_SYNC_TOKEN=tu-secreto npm run publish:autos-sync');
  }
}

main().catch((err) => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});
