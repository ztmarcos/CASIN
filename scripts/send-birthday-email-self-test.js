#!/usr/bin/env node
/**
 * Prueba del layout de correo de cumpleaños (naranja/azul + logo).
 * Por defecto: desde z.t.marcos@gmail.com hacia z.t.marcos@gmail.com, sin BCC ni CC.
 * (Sobrescribe con BIRTHDAY_TEST_EMAIL si hace falta.)
 *
 * Contraseña de aplicación de esa cuenta Gmail:
 *   GMAIL_APP_PASSWORD_ZTMARCOS   (preferido)
 *   o ZTMARCOS_GMAIL_APP_PASSWORD
 *
 * Uso:
 *   GMAIL_APP_PASSWORD_ZTMARCOS=xxxx node scripts/send-birthday-email-self-test.js
 *
 * API (por defecto producción):
 *   API_BASE_URL=https://api-d7zlm7v4qa-uc.a.run.app
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {}

const fetch = require('node-fetch');

const EMAIL =
  process.env.BIRTHDAY_TEST_EMAIL || 'z.t.marcos@gmail.com';
const API_BASE =
  process.env.API_BASE_URL ||
  process.env.VITE_FIREBASE_API_BASE ||
  'https://api-d7zlm7v4qa-uc.a.run.app';
const API_URL = `${API_BASE.replace(/\/$/, '')}/api`;

const casinLogoUrl = `${(process.env.PUBLIC_CRM_URL || 'https://casin-crm.web.app').replace(/\/$/, '')}/logo.png`;

const SAMPLE_NAME = 'Marcos (prueba de diseño)';

function buildBirthdayHtml(displayName) {
  return `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#e8edf3;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#e8edf3;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(15,40,64,0.12);border:1px solid #dbe2ea;">
      <tr><td style="padding:28px 32px 12px;text-align:center;background-color:#ffffff;">
        <img src="${casinLogoUrl}" alt="CASIN Seguros" width="80" height="80" style="display:block;margin:0 auto;border:0;"/>
      </td></tr>
      <tr><td style="height:4px;line-height:4px;background-color:#ea580c;background-image:linear-gradient(90deg,#fb923c,#ea580c);font-size:0;">&nbsp;</td></tr>
      <tr><td style="padding:26px 32px;background-color:#123b66;background-image:linear-gradient(160deg,#1a4d7a 0%,#0c2847 100%);">
        <h1 style="margin:0;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;font-size:26px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.02em;">¡Feliz cumpleaños!</h1>
        <p style="margin:10px 0 0;font-family:Segoe UI,Tahoma,sans-serif;font-size:15px;color:#fde68a;text-align:center;">Un mensaje especial para ti</p>
      </td></tr>
      <tr><td style="padding:32px 32px 28px;font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#ea580c;text-transform:uppercase;letter-spacing:0.06em;">Para</p>
        <h2 style="margin:0 0 20px;font-size:24px;font-weight:600;color:#0f2840;line-height:1.3;">${displayName}</h2>
        <p style="margin:0 0 16px;font-size:17px;line-height:1.65;color:#475569;">¡Que tengas un día maravilloso lleno de alegría y éxito!</p>
        <p style="margin:0;font-size:44px;line-height:1.2;text-align:center;">🎉&nbsp;&nbsp;🎈&nbsp;&nbsp;🎁</p>
        <div style="margin-top:28px;padding-top:24px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:15px;color:#64748b;">Con cariño,</p>
          <p style="margin:8px 0 0;font-size:17px;font-weight:600;color:#0f2840;">Equipo CASIN Seguros</p>
        </div>
      </td></tr>
      <tr><td style="padding:18px 32px 24px;background-color:#f1f5f9;text-align:center;font-family:Segoe UI,Tahoma,sans-serif;font-size:12px;color:#64748b;line-height:1.5;">
        <p style="margin:0;">Este mensaje fue enviado automáticamente por el sistema de CASIN Seguros.</p>
        <p style="margin:8px 0 0;">Prueba de diseño · ${new Date().toISOString()}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>
`;
}

function normalizeGmailAppPassword(p) {
  if (!p || typeof p !== 'string') return p;
  return p.replace(/\s+/g, '');
}

async function main() {
  const fromPass = normalizeGmailAppPassword(
    process.env.GMAIL_APP_PASSWORD_ZTMARCOS ||
      process.env.ZTMARCOS_GMAIL_APP_PASSWORD ||
      process.env.SMTP_PASS_MARCOS
  );

  if (!fromPass) {
    console.error(
      '❌ Define contraseña de aplicación (p. ej. SMTP_PASS_MARCOS o GMAIL_APP_PASSWORD_ZTMARCOS para z.t.marcos@gmail.com).'
    );
    process.exit(1);
  }

  const url = `${API_URL}/email/send-welcome`;
  console.log('📧 POST', url);
  console.log('📧 From / To:', EMAIL, '(sin BCC)');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: EMAIL,
      subject: '🎂 Prueba diseño · cumpleaños CASIN',
      htmlContent: buildBirthdayHtml(SAMPLE_NAME),
      from: EMAIL,
      fromPass,
      fromName: 'CASIN Seguros · prueba',
      // explícito: sin copias
      sendBccToSender: false,
      autoBccToCasin: false
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('❌ Error', res.status, data);
    process.exit(1);
  }
  console.log('✅ Enviado:', data.messageId || data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
