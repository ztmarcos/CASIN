import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.VITE_FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: `firebase-adminsdk-hnwk0@${process.env.VITE_FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`,
};

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Mapeo de campos alternativos a estándar
const FIELD_MAP = {
  numero_de_poliza: 'numero_poliza',
  column_4: 'fecha_inicio',
  column_5: 'fecha_fin',
  forma_de_pago: 'forma_pago',
  derecho_de_poliza: 'derecho_poliza',
  recargo_por_pago_fraccionado: 'recargo_pago_fraccionado',
  fecha_de_expedicion: 'fecha_expedicion',
  derecho_poliza: 'derecho_poliza',
  recargo_pago_fraccionado: 'recargo_pago_fraccionado',
};

async function migrateHogarFields() {
  const snapshot = await db.collection('hogar').get();
  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let needsUpdate = false;
    const newData = { ...data };
    for (const [oldKey, newKey] of Object.entries(FIELD_MAP)) {
      if (oldKey in newData && !(newKey in newData)) {
        newData[newKey] = newData[oldKey];
        needsUpdate = true;
      }
    }
    // Opcional: eliminar los campos viejos
    for (const oldKey of Object.keys(FIELD_MAP)) {
      if (oldKey in newData && FIELD_MAP[oldKey] !== oldKey) {
        delete newData[oldKey];
      }
    }
    if (needsUpdate) {
      await db.collection('hogar').doc(doc.id).update(newData);
      updated++;
      console.log(`✅ Documento ${doc.id} migrado.`);
    }
  }
  console.log(`\n🚀 Migración completada. Documentos actualizados: ${updated}`);
}

migrateHogarFields().catch(console.error); 