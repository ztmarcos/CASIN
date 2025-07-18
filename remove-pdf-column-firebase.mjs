#!/usr/bin/env node

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import serviceAccount from './casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json' assert { type: 'json' };

// Inicializa Firebase Admin con el archivo de credenciales
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Lista de tablas relevantes (ajusta si tienes una lista específica)
const TABLES = [
  'autos',
  'hogar',
  'gmm',
  'vida',
  'emant_caratula',
  'emant_listado',
  'directorio_contactos',
  // Agrega aquí otras tablas del dropdown si es necesario
];

async function removePdfColumn() {
  for (const table of TABLES) {
    const snapshot = await db.collection(table).get();
    let updated = 0;
    let skipped = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if ('PDF' in data || 'pdf' in data) {
        const update = {};
        if ('PDF' in data) update['PDF'] = FieldValue.delete();
        if ('pdf' in data) update['pdf'] = FieldValue.delete();
        await db.collection(table).doc(doc.id).update(update);
        updated++;
      } else {
        skipped++;
      }
    }
    console.log(`Tabla ${table}: ${updated} documentos actualizados, ${skipped} sin PDF.`);
  }
  console.log('✅ Proceso terminado.');
}

removePdfColumn().catch(console.error); 