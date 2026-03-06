#!/usr/bin/env node
/**
 * Creates or updates Google Cloud Secret Manager secrets from the project .env.
 * Run from repo root: node scripts/setup-firebase-secrets.mjs
 * Requires: gcloud CLI, and .env with the variables set.
 *
 * Secrets created (names must match defineSecret in functions/index.js):
 *   OPENAI_API_KEY, NOTION_API_KEY, NOTION_DATABASE_ID,
 *   GOOGLE_DRIVE_PRIVATE_KEY, GMAIL_APP_PASSWORD, SMTP_PASS_CASIN,
 *   and optional: GOOGLE_DRIVE_*, SMTP_*
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function loadEnv() {
  const path = join(rootDir, '.env');
  try {
    const content = readFileSync(path, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) {
        const key = m[1];
        let val = m[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1).replace(/\\n/g, '\n');
        env[key] = val;
      }
    }
    return env;
  } catch (e) {
    console.error('Could not read .env:', e.message);
    process.exit(1);
  }
}

const SECRET_NAMES = [
  'OPENAI_API_KEY',
  'NOTION_API_KEY',
  'NOTION_DATABASE_ID',
  'GOOGLE_DRIVE_PRIVATE_KEY',
  'GMAIL_APP_PASSWORD',
  'SMTP_PASS_CASIN',
  'GOOGLE_DRIVE_CLIENT_EMAIL',
  'GOOGLE_DRIVE_PROJECT_ID',
  'GOOGLE_DRIVE_FOLDER_ID',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
];

function createOrUpdateSecret(project, name, value) {
  const tmpPath = join(rootDir, `.secret-${name}.tmp`);
  try {
    writeFileSync(tmpPath, value, 'utf8');
    try {
      execSync(`gcloud secrets describe ${name} --project=${project}`, { stdio: 'ignore' });
    } catch (_) {
      execSync(`gcloud secrets create ${name} --project=${project} --replication-policy=automatic`, {
        stdio: 'inherit',
      });
    }
    execSync(`gcloud secrets versions add ${name} --project=${project} --data-file=${tmpPath}`, {
      stdio: 'inherit',
    });
  } finally {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
  }
}

async function main() {
  const env = loadEnv();
  const project = process.env.GCLOUD_PROJECT || 'casinbbdd';

  console.log('Using project:', project);
  console.log('Secrets to create/update:', SECRET_NAMES.join(', '));

  for (const name of SECRET_NAMES) {
    const raw = env[name] ?? env[`VITE_${name}`];
    const value = typeof raw === 'string' ? raw.trim() : raw;
    if (!value) {
      console.warn(`  ⏭️  ${name}: not in .env, skipping`);
      continue;
    }

    try {
      createOrUpdateSecret(project, name, value);
      console.log(`  ✅ ${name}`);
    } catch (e) {
      console.error(`  ❌ ${name}:`, e.message);
    }
  }

  console.log('\nDone. Redeploy functions so they use the new secrets:');
  console.log('  firebase deploy --only functions');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
