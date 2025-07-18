import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
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

async function main() {
  const snapshot = await db.collection('hogar').get();
  console.log(`\n📋 Documentos en la colección 'hogar': (${snapshot.size})`);
  snapshot.forEach(doc => {
    console.log(`- ID: ${doc.id}`);
    console.log(doc.data());
  });
}

main().catch(console.error); 