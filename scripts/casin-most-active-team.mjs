#!/usr/bin/env node
/**
 * Identifica el equipo CASIN más activo (por miembros y documentos en colecciones).
 * Uso: node scripts/casin-most-active-team.mjs
 * Imprime el teamId que debes usar como único CASIN.
 */
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!privateKey) {
  console.error('FIREBASE_PRIVATE_KEY no encontrada en .env');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: 'service_account',
      project_id: process.env.VITE_FIREBASE_PROJECT_ID || 'casinbbdd',
      private_key: privateKey,
      client_email: `firebase-adminsdk-hnwk0@${process.env.VITE_FIREBASE_PROJECT_ID || 'casinbbdd'}.iam.gserviceaccount.com`,
    }),
  });
}

const db = admin.firestore();

const CASIN_NAMES = ['CASIN', 'CASIN Seguros', 'casin'];
function isCasinTeam(team) {
  const name = (team.name || '').toLowerCase();
  return CASIN_NAMES.some(n => name.includes(n.toLowerCase())) || team.id === '4JlUqhAvfJMlCDhQ4vgH' || team.id === 'ngXzjqxlBy8Bsv8ks3vc';
}

const KEY_COLLECTIONS = ['directorio_contactos', 'autos', 'vida', 'gmm', 'hogar', 'rc', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];

async function countTeamDocs(teamId) {
  let total = 0;
  for (const col of KEY_COLLECTIONS) {
    const teamCol = `team_${teamId}_${col}`;
    try {
      const snap = await db.collection(teamCol).count().get();
      total += snap.data().count;
    } catch (_) {}
  }
  return total;
}

async function main() {
  const teamsSnap = await db.collection('teams').get();
  const teams = [];
  teamsSnap.forEach(doc => {
    teams.push({ id: doc.id, ...doc.data() });
  });

  const casinTeams = teams.filter(isCasinTeam);
  if (casinTeams.length === 0) {
    console.log('No hay equipos CASIN en Firestore.');
    process.exit(0);
  }
  if (casinTeams.length === 1) {
    console.log('Solo hay un equipo CASIN. Úsalo como único:');
    console.log('ID:', casinTeams[0].id);
    console.log('Nombre:', casinTeams[0].name);
    process.exit(0);
  }

  const membersSnap = await db.collection('team_members').get();
  const membersByTeam = {};
  membersSnap.forEach(doc => {
    const d = doc.data();
    const tid = d.teamId;
    if (!membersByTeam[tid]) membersByTeam[tid] = 0;
    membersByTeam[tid]++;
  });

  console.log('Equipos CASIN encontrados:\n');
  const scores = [];
  for (const team of casinTeams) {
    const members = membersByTeam[team.id] || 0;
    const docs = await countTeamDocs(team.id);
    const score = members * 10 + docs;
    scores.push({ team, members, docs, score });
    console.log(`  ${team.name} (${team.id})`);
    console.log(`    Miembros: ${members} | Docs (directorio + team_*): ${docs} | Score: ${score}`);
  }

  const winner = scores.sort((a, b) => b.score - a.score)[0];
  console.log('\n--- Equipo CASIN más activo (usar este como único) ---');
  console.log('ID:', winner.team.id);
  console.log('Nombre:', winner.team.name);
  console.log('Miembros:', winner.members, '| Docs:', winner.docs);
  console.log('\nUsa este ID en la app como único CASIN.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
