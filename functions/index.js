const {onRequest} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const OpenAI = require('openai');
const Busboy = require('busboy');

// Initialize Firebase Admin (must be before requiring server-mysql-app so it reuses this instance)
admin.initializeApp();
const db = admin.firestore();

// Secrets for the Express API (create with scripts/setup-firebase-secrets.mjs)
const apiSecrets = [
  'OPENAI_API_KEY',
  'NOTION_API_KEY',
  'NOTION_DATABASE_ID',
  'GOOGLE_DRIVE_PRIVATE_KEY',
  'GMAIL_APP_PASSWORD',
  'SMTP_PASS_CASIN',
  'GOOGLE_DRIVE_CLIENT_EMAIL',
  'GOOGLE_DRIVE_PROJECT_ID',
  'GOOGLE_DRIVE_FOLDER_ID',
].map((name) => defineSecret(name));

let apiApp = null;
function getApiApp() {
  if (apiApp) return apiApp;
  apiApp = require('./server-mysql-app');
  return apiApp;
}

exports.api = onRequest(
  {
    cors: true,
    timeoutSeconds: 60,
    memory: '512MiB',
    secrets: apiSecrets,
  },
  (req, res) => {
    if (!apiApp) {
      for (const ref of apiSecrets) {
        try {
          const val = ref.value();
          if (val != null && val !== '') process.env[ref.name] = val;
        } catch (_) {}
      }
    }
    getApiApp()(req, res);
  }
);

// Initialize OpenAI (lazy: set by ensureOpenAI() when function has secrets)
let openai;
function ensureOpenAI() {
  if (openai) return;
  // Same as rest of app: OPENAI_API_KEY or VITE_OPENAI_API_KEY, trimmed
  const openaiKey = (process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '').trim();
  if (openaiKey) {
    openai = new OpenAI({ apiKey: openaiKey });
    console.log('✅ OpenAI client initialized (key present)');
  } else {
    console.warn('⚠️ OpenAI not configured: OPENAI_API_KEY (or VITE_OPENAI_API_KEY) missing or empty in this function. Upload secret with: node scripts/setup-firebase-secrets.mjs then redeploy.');
  }
}

// SMTP Configuration - Uses environment variables
function getSMTPConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'casinseguros@gmail.com',
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
    }
  };
}

/**
 * Test Function - Send test email
 * HTTP Trigger: https://us-central1-casinbbdd.cloudfunctions.net/testEmail
 */
exports.testEmail = onRequest({cors: true}, async (req, res) => {
  try {
    console.log('📧 Test Email Function triggered');
    
    // Create transporter
    const transporter = nodemailer.createTransport(getSMTPConfig());
    
    // Email content
    const mailOptions = {
      from: {
        name: 'CASIN Seguros - Test',
        address: 'casinseguros@gmail.com'
      },
      to: 'ztmarcos@gmail.com',
      subject: '🧪 Test Email from Firebase Cloud Functions',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f5f7fa; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🧪 Test Email</h1>
              <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Firebase Cloud Functions</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a202c; margin: 0 0 20px 0;">✅ ¡Funciona Correctamente!</h2>
              
              <p style="color: #4a5568; line-height: 1.6; margin: 0 0 15px 0;">
                Este es un email de prueba enviado desde <strong>Firebase Cloud Functions</strong>.
              </p>
              
              <div style="background-color: #f7fafc; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #2d3748; font-size: 14px;">
                  <strong>📅 Fecha:</strong> ${new Date().toLocaleString('es-MX', { 
                    timeZone: 'America/Mexico_City',
                    dateStyle: 'full',
                    timeStyle: 'long'
                  })}
                </p>
                <p style="margin: 10px 0 0 0; color: #2d3748; font-size: 14px;">
                  <strong>🌐 Proyecto:</strong> CASIN CRM
                </p>
                <p style="margin: 10px 0 0 0; color: #2d3748; font-size: 14px;">
                  <strong>🔧 Función:</strong> testEmail
                </p>
              </div>
              
              <p style="color: #718096; font-size: 14px; margin: 20px 0 0 0; font-style: italic;">
                Si recibes este email, significa que Firebase Cloud Functions está configurado correctamente y puede enviar correos. 🎉
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f7fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; margin: 0; font-size: 12px;">
                CASIN Seguros CRM - Firebase Cloud Functions
              </p>
              <p style="color: #a0aec0; margin: 5px 0 0 0; font-size: 11px;">
                Powered by Firebase & Google Cloud
              </p>
            </div>
            
          </div>
        </body>
        </html>
      `
    };
    
    // Send email
    console.log('📤 Sending test email to ztmarcos@gmail.com...');
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Test email sent successfully:', info.messageId);
    
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Base collection names for birthday extraction (used for CASIN and as suffix for team_xxx_*)
const BIRTHDAY_COLLECTIONS = ['directorio_contactos', 'autos', 'rc', 'vida', 'gmm', 'transporte', 'mascotas', 'diversos', 'negocio', 'gruposgmm'];

function normalizeClientName(name) {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isCorporateEmail(email) {
  if (!email || typeof email !== 'string') return true;
  const e = String(email).toLowerCase().trim();
  return e.includes('@gnp') || e.includes('@qualitas');
}

function pickBestEmail(personal, other) {
  const p = (personal && String(personal).trim()) || '';
  const o = (other && String(other).trim()) || '';
  if (p && !isCorporateEmail(p)) return p;
  if (o && !isCorporateEmail(o)) return o;
  return '';
}

/**
 * Get birthdays from collections for a specific team.
 * Uses email personal from clientes_metadata (directorio de clientes), fallback to doc email; excludes @gnp / @qualitas.
 * @param {string} teamId - Team document ID
 * @param {object} teamData - Team document data (for isMainTeam)
 * @returns {Promise<Array>} Array of birthday objects
 */
async function getBirthdaysForTeam(teamId, teamData) {
  const isCASIN = teamData?.isMainTeam === true || teamId === '4JlUqhAvfJMlCDhQ4vgH';
  const collectionNames = isCASIN
    ? BIRTHDAY_COLLECTIONS
    : BIRTHDAY_COLLECTIONS.map(c => `team_${teamId}_${c}`);
  const metadataCollName = isCASIN ? 'clientes_metadata' : `team_${teamId}_clientes_metadata`;
  const metadataMap = new Map();
  try {
    const metaSnap = await db.collection(metadataCollName).get();
    metaSnap.forEach(doc => {
      const d = doc.data();
      const emailPersonal = (d.emailPersonal || '').trim();
      if (doc.id && emailPersonal) metadataMap.set(doc.id, emailPersonal);
    });
  } catch (err) {
    console.log(`⚠️  Could not load clientes_metadata for birthdays:`, err.message);
  }

  const birthdays = [];

  for (const collectionName of collectionNames) {
    try {
      const snapshot = await db.collection(collectionName).get();
      snapshot.forEach(doc => {
        const data = doc.data();
        let birthdayDate = null;
        let birthdaySource = 'unknown';

        if (data.fecha_nacimiento) {
          try {
            birthdayDate = new Date(data.fecha_nacimiento);
            if (!isNaN(birthdayDate.getTime())) birthdaySource = 'fecha_nacimiento';
            else birthdayDate = null;
          } catch (err) {}
        }
        if (!birthdayDate) {
          const rfc = data.rfc || data.RFC;
          if (rfc && typeof rfc === 'string') {
            const cleanRFC = rfc.trim().toUpperCase();
            if (cleanRFC.length === 13 && /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/.test(cleanRFC)) {
              const yearDigits = cleanRFC.substring(4, 6);
              const month = cleanRFC.substring(6, 8);
              const day = cleanRFC.substring(8, 10);
              const year = (parseInt(yearDigits) <= 30 ? 2000 : 1900) + parseInt(yearDigits);
              try {
                birthdayDate = new Date(year, parseInt(month) - 1, parseInt(day));
                if (!isNaN(birthdayDate.getTime())) birthdaySource = 'RFC';
                else birthdayDate = null;
              } catch (err) {}
            }
          }
        }
        if (birthdayDate && !isNaN(birthdayDate.getTime())) {
          const currentYear = new Date().getFullYear();
          const name = data.nombre_contratante || data.contratante || data.nombre || data.nombre_completo || data.nombre_asegurado || 'Sin nombre';
          const normalizedName = normalizeClientName(name);
          const emailPersonal = metadataMap.get(normalizedName) || '';
          const otherEmail = data.email || data.correo || data.e_mail || data.E_mail || data['E-mail'] ||
            data.email_contratante || data.email_asegurado || data.correo_electronico || '';
          const email = pickBestEmail(emailPersonal, otherEmail) || null;
          birthdays.push({
            id: doc.id,
            name,
            rfc: data.rfc || data.RFC || '',
            email: email,
            date: birthdayDate.toISOString(),
            age: currentYear - birthdayDate.getFullYear(),
            source: collectionName,
            details: `${collectionName} - ${data.numero_poliza || 'Sin póliza'}`,
            birthdaySource: birthdaySource,
            teamId: teamId
          });
        }
      });
    } catch (error) {
      console.log(`⚠️  Error fetching ${collectionName}:`, error.message);
    }
  }
  return birthdays;
}

/**
 * Get nodemailer transporter for a team (uses team's emailConfig or env)
 */
function getTransporterForTeam(teamId, teamData) {
  const senderEmail = teamData?.emailConfig?.senderEmail || 'casinseguros@gmail.com';
  const senderName = teamData?.emailConfig?.senderName || teamData?.name || 'CASIN Seguros';
  const isCASIN = teamData?.isMainTeam === true || teamId === '4JlUqhAvfJMlCDhQ4vgH';
  const envKey = 'SMTP_PASS_TEAM_' + teamId.toUpperCase().replace(/-/g, '_');
  const pass = isCASIN
    ? (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD)
    : process.env[envKey];
  if (!pass && !isCASIN) {
    console.log(`⚠️  No SMTP password for team ${teamId} (set ${envKey}). Skipping send.`);
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: senderEmail, pass: pass || process.env.SMTP_PASS }
  });
}

/**
 * Scheduled Birthday Emails - Runs daily at 9:00 AM CST
 * Iterates all teams and sends birthday emails per team (data and sender isolated per team)
 */
exports.scheduledBirthdayEmails = onSchedule({
  schedule: '0 9 * * *', // 9:00 AM daily
  timeZone: 'America/Mexico_City',
  region: 'us-central1',
  secrets: apiSecrets
}, async (event) => {
  console.log('🎂 Scheduled Birthday Emails Function triggered');
  
  // Inject secrets into process.env so OpenAI is available
  for (const ref of apiSecrets) {
    try {
      const val = ref.value();
      if (val != null && val !== '') process.env[ref.name] = val;
    } catch (_) {}
  }
  ensureOpenAI();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayEnd = tomorrow.toISOString();

  try {
    const existingLogsSnapshot = await db.collection('activity_logs')
      .where('action', '==', 'birthday_emails_sent')
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();
    const todayLogs = [];
    existingLogsSnapshot.forEach(doc => {
      const logData = doc.data();
      const logTimestamp = logData.timestamp;
      if (logTimestamp >= todayStart && logTimestamp < todayEnd) {
        todayLogs.push(logData);
      }
    });
    if (todayLogs.length > 0) {
      console.log('⚠️  Birthday emails already sent today. Skipping.');
      return { status: 'skipped', message: 'Birthday emails already sent today', lastSent: todayLogs[0].timestamp };
    }

    const teamsSnapshot = await db.collection('teams').get();
    let totalEmailsSent = 0;
    const allEmailResults = [];

    for (const teamDoc of teamsSnapshot.docs) {
      const teamId = teamDoc.id;
      const teamData = teamDoc.data();
      const teamName = teamData.name || teamId;
      console.log(`🎂 Processing team: ${teamName} (${teamId})`);

      const birthdays = await getBirthdaysForTeam(teamId, teamData);
      const todaysBirthdays = birthdays.filter(b => {
        const d = new Date(b.date);
        return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      });
      console.log(`📧 Team ${teamName}: ${todaysBirthdays.length} birthdays for today`);

      const transporter = getTransporterForTeam(teamId, teamData);
      const senderEmail = teamData?.emailConfig?.senderEmail || 'casinseguros@gmail.com';
      const senderName = teamData?.emailConfig?.senderName || teamData?.name || 'CASIN Seguros';
      const sentTodayByEmail = new Map();
      const sentTodayByName = new Map();
      let emailsSent = 0;
      const emailResults = [];
    
      if (!transporter) {
        if (todaysBirthdays.length > 0) {
          console.log(`⏭️  Skipping send for team ${teamName} (no SMTP config). Set SMTP_PASS_TEAM_${teamId.toUpperCase().replace(/-/g, '_')} for scheduled emails.`);
        }
        continue;
      }

      for (const birthday of todaysBirthdays) {
        const nameKey = birthday.name.toLowerCase();
        const emailKey = birthday.email ? birthday.email.toLowerCase() : null;
        if (emailKey && sentTodayByEmail.has(emailKey)) continue;
        if (sentTodayByName.has(nameKey)) continue;

        // Extract first name and generate personalized message with GPT-4o-mini
        let firstName = birthday.name;
        let personalizedMessage = '¡Que tengas un día maravilloso lleno de alegría y éxito!';
        
        try {
          if (openai) {
            console.log(`🤖 Generating personalized birthday message for ${birthday.name}...`);
            const gptResponse = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "Eres un asistente que analiza nombres completos mexicanos y genera mensajes de cumpleaños personalizados. Extrae SOLO el primer nombre (sin apellidos) y crea un mensaje cálido y profesional de cumpleaños."
                },
                {
                  role: "user",
                  content: `Nombre completo: "${birthday.name}"\n\nResponde en formato JSON con:\n1. "firstName": Solo el primer nombre (sin apellidos)\n2. "message": Un mensaje de cumpleaños cálido, profesional y personalizado (2-3 oraciones, en tono cercano pero profesional de una correduría de seguros)`
                }
              ],
              max_tokens: 200,
              temperature: 0.7,
              response_format: { type: "json_object" }
            });
            
            const gptResult = JSON.parse(gptResponse.choices[0].message.content);
            firstName = gptResult.firstName || birthday.name.split(' ')[0];
            personalizedMessage = gptResult.message || personalizedMessage;
            console.log(`✅ GPT analyzed: "${birthday.name}" → First name: "${firstName}"`);
          } else {
            // Fallback: just take first word if GPT not available
            firstName = birthday.name.split(' ')[0];
          }
        } catch (gptError) {
          console.warn(`⚠️  GPT error for ${birthday.name}, using fallback:`, gptError.message);
          firstName = birthday.name.split(' ')[0];
        }

        const emailHTML = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 10px 0;">🎂 ¡Feliz Cumpleaños! 🎂</h1>
              </div>
              <div style="text-align: center; margin-bottom: 30px; background-color: rgba(255,255,255,0.15); border-radius: 8px; padding: 20px;">
                <h2 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">${firstName}</h2>
              </div>
              <div style="text-align: center; margin-bottom: 30px;">
                <p style="color: #ffffff; font-size: 18px; line-height: 1.6; margin: 0;">${personalizedMessage}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;"><span style="font-size: 48px;">🎉 🎈 🎁</span></div>
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid rgba(255,255,255,0.3);">
                <p style="color: #ffffff; font-size: 16px; margin: 0;">Con cariño,</p>
                <p style="color: #ffffff; font-size: 18px; font-weight: 600; margin: 10px 0 0 0;">${senderName}</p>
              </div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #95a5a6; font-size: 12px; margin: 0;">Este mensaje fue enviado automáticamente por el sistema</p>
            </div>
          </div>
        `;

        if (birthday.email) {
          try {
            console.log(`📧 [${teamName}] Sending birthday email to ${birthday.name} (${birthday.email})`);
            const bccList = [...new Set([senderEmail, 'ztmarcos@gmail.com', 'casinseguros@gmail.com'])];
            await transporter.sendMail({
              from: { name: `${senderName} - Felicitaciones`, address: senderEmail },
              to: birthday.email,
              bcc: bccList,
              subject: `🎂 ¡Feliz Cumpleaños ${firstName}!`,
              html: emailHTML
            });
            emailsSent++;
            totalEmailsSent++;
            emailResults.push({ teamId, name: birthday.name, firstName, email: birthday.email, status: 'sent', gptUsed: !!openai });
            sentTodayByEmail.set(emailKey, true);
            sentTodayByName.set(nameKey, true);
            console.log(`✅ Birthday email sent to ${birthday.name} (${firstName}) (BCC: ztmarcos, casinseguros)`);
          } catch (error) {
            emailResults.push({ teamId, name: birthday.name, email: birthday.email, status: 'error', error: error.message });
            console.error(`❌ Error sending birthday email to ${birthday.name}:`, error.message);
          }
        } else {
          try {
            console.log(`⚠️  [${teamName}] ${birthday.name} has no email. Sending notification to ${senderEmail}`);
            await transporter.sendMail({
              from: { name: `${senderName} - Notificación`, address: senderEmail },
              to: senderEmail,
              subject: `🎂 Cumpleaños de hoy: ${birthday.name} (sin email)`,
              html: `<div><h1>🎂 Cumpleaños de Hoy</h1><p>${birthday.name} - No tiene email registrado</p></div>`
            });
            emailsSent++;
            totalEmailsSent++;
            emailResults.push({ teamId, name: birthday.name, email: null, status: 'notification_sent' });
            sentTodayByName.set(nameKey, true);
          } catch (err) {
            emailResults.push({ teamId, name: birthday.name, email: null, status: 'error', error: err.message });
          }
        }
      }
      allEmailResults.push({ teamId, teamName, emailsSent, results: emailResults });
    }

    await db.collection('activity_logs').add({
      timestamp: new Date().toISOString(),
      userId: 'system',
      userEmail: 'system',
      userName: 'Automated System',
      action: 'birthday_emails_sent',
      tableName: null,
      details: {
        teamsProcessed: teamsSnapshot.size,
        totalEmailsSent,
        automated: true,
        emailResults: allEmailResults
      },
      metadata: { scheduledExecution: true, executionTime: new Date().toISOString() }
    });

    console.log('✅ Birthday emails processed successfully');
    return {
      status: 'success',
      teamsProcessed: teamsSnapshot.size,
      totalEmailsSent
    };
    
  } catch (error) {
    console.error('❌ Error processing birthday emails:', error);
    throw error;
  }
});

/**
 * Scheduled Weekly Resumen - Runs every Friday at 5:00 PM CST
 * Generates and sends weekly activity summary with GPT analysis
 */
exports.scheduledWeeklyResumen = onSchedule({
  schedule: '0 17 * * 5', // 5:00 PM every Friday
  timeZone: 'America/Mexico_City',
  region: 'us-central1',
  secrets: apiSecrets
}, async (event) => {
  console.log('📊 Scheduled Weekly Resumen Function triggered');
  // Inject secrets into process.env so OpenAI is available (lazy init uses it)
  for (const ref of apiSecrets) {
    try {
      const val = ref.value();
      if (val != null && val !== '') process.env[ref.name] = val;
    } catch (_) {}
  }
  ensureOpenAI();

  try {
    // Check if auto-generate is enabled
    const configSnapshot = await db.collection('app_config').doc('resumen-auto-generate').get();
    const config = configSnapshot.exists ? configSnapshot.data() : {};
    
    console.log('⚙️  Auto-generate config:', config);
    
    if (!config.enabled) {
      console.log('⏭️  Auto-generate disabled, skipping report');
      return {
        status: 'skipped',
        message: 'Auto-generate is disabled'
      };
    }
    
    // Calculate last 7 days date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    console.log('📊 Generating weekly report for date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    // Get activity logs from Firebase
    const activityLogsSnapshot = await db.collection('activity_logs')
      .where('timestamp', '>=', startDate.toISOString())
      .where('timestamp', '<=', endDate.toISOString())
      .orderBy('timestamp', 'desc')
      .limit(1000)
      .get();
    
    const activities = [];
    activityLogsSnapshot.forEach(doc => {
      activities.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`📊 Found ${activities.length} activities in date range`);
    
    // Get expiring policies (next 7 days)
    const expiringEndDate = new Date();
    expiringEndDate.setDate(expiringEndDate.getDate() + 7);
    
    // Get all insurance collections
    const insuranceCollections = ['autos', 'hogar', 'vida', 'gmm', 'accidentes', 'responsabilidad_civil'];
    const expiringPolicies = [];
    const partialPayments = [];
    const capturedPolicies = [];
    const cancelledPolicies = [];
    
    for (const collectionName of insuranceCollections) {
      try {
        const collectionData = await db.collection(collectionName).get();
        collectionData.forEach(doc => {
          const policy = { id: doc.id, ...doc.data(), tabla: collectionName };
          
          // Check for expiring policies (exclude cancelled)
          if (policy.fecha_fin) {
            const isCancelled = policy.estado_cap === 'Inactivo' || policy.estado_cfp === 'Inactivo';
            if (!isCancelled) {
              const expirationDate = policy.fecha_fin.toDate ? policy.fecha_fin.toDate() : new Date(policy.fecha_fin);
              if (expirationDate >= new Date() && expirationDate <= expiringEndDate) {
                expiringPolicies.push(policy);
              }
            }
          }
          
          // Check for partial payments
          if (policy.pago_parcial && policy.pago_parcial > 0) {
            const isCancelled = policy.estado_cap === 'Inactivo' || policy.estado_cfp === 'Inactivo';
            if (!isCancelled) {
              partialPayments.push(policy);
            }
          }
          
          // Check for captured policies
          if (policy.createdAt) {
            const createdDate = policy.createdAt.toDate ? policy.createdAt.toDate() : new Date(policy.createdAt);
            if (createdDate >= startDate && createdDate <= endDate) {
              capturedPolicies.push(policy);
            }
          }
          
          // Check for cancelled policies
          if (policy.estado_cap === 'Inactivo' || policy.estado_cfp === 'Inactivo') {
            cancelledPolicies.push(policy);
          }
        });
      } catch (error) {
        console.log(`⚠️  Error fetching ${collectionName}:`, error.message);
      }
    }
    
    // Get team activities (daily activities)
    const teamActivitiesSnapshot = await db.collection('daily_activities')
      .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const teamActivities = [];
    teamActivitiesSnapshot.forEach(doc => {
      const activity = { id: doc.id, ...doc.data() };
      if (activity.createdAt && activity.createdAt.toDate) {
        activity.createdAt = activity.createdAt.toDate().toISOString();
      }
      teamActivities.push(activity);
    });
    
    // Calculate user activity stats
    const userActivity = {};
    activities.forEach(act => {
      const userName = act.userName || 'Unknown';
      if (!userActivity[userName]) {
        userActivity[userName] = {
          email_sent: 0,
          data_captured: 0,
          data_updated: 0,
          daily_activity: 0,
          total: 0
        };
      }
      
      if (act.action === 'email_sent') userActivity[userName].email_sent++;
      if (act.action === 'data_captured') userActivity[userName].data_captured++;
      if (act.action === 'data_updated') userActivity[userName].data_updated++;
      if (act.action === 'daily_activity') userActivity[userName].daily_activity++;
      userActivity[userName].total++;
    });
    
    // Count metrics
    const policiesCaptured = activities.filter(act => act.action === 'data_captured').length;
    const policiesPaid = activities.filter(act => 
      act.action === 'data_updated' && 
      act.details && 
      act.details.field === 'estado_pago' && 
      act.details.newValue === 'Pagado'
    ).length;
    const emailsSent = activities.filter(act => act.action === 'email_sent').length;
    const dataUpdates = activities.filter(act => act.action === 'data_updated').length;
    const systemUpdates = activities.filter(act => 
      act.action === 'system_deployment' || 
      (act.action === 'system_update' && act.details?.type === 'firebase_deploy')
    ).length;
    
    // Calculate partial payments total
    const totalPartialAmount = partialPayments.reduce((sum, p) => sum + (parseFloat(p.pago_parcial) || 0), 0);
    
    // Count pending payments (policies without first payment)
    const policiesPending = capturedPolicies.filter(p => !p.primer_pago_realizado).length;
    
    // Build summary data object
    const summaryData = {
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      summary: {
        policiesCaptured,
        policiesPaid,
        policiesPending,
        totalExpiring: expiringPolicies.length,
        totalPartialPayments: partialPayments.length,
        emailsSent,
        dataUpdates,
        systemUpdates,
        activeUsers: Object.keys(userActivity).length
      },
      expiringPolicies: {
        total: expiringPolicies.length,
        policies: expiringPolicies.slice(0, 10)
      },
      partialPayments: {
        total: partialPayments.length,
        totalAmount: totalPartialAmount,
        payments: partialPayments.slice(0, 10)
      },
      capturedPolicies: {
        total: capturedPolicies.length,
        policies: capturedPolicies.slice(0, 10).map(p => ({
          numero_poliza: p.numero_poliza || '-',
          contratante: p.contratante || p.nombre_contratante || '-',
          ramo: p.tabla || '-',
          fecha_inicio: p.fecha_inicio || 'N/A',
          capturedBy: p.createdBy || '-'
        }))
      },
      cancelledPolicies: {
        total: cancelledPolicies.length,
        policies: cancelledPolicies.slice(0, 10).map(p => ({
          numero_poliza: p.numero_poliza || '-',
          contratante: p.contratante || p.nombre_contratante || '-',
          ramo: p.tabla || '-',
          estado_cap: p.estado_cap || '-',
          estado_cfp: p.estado_cfp || '-'
        }))
      },
      teamActivities: teamActivities.slice(0, 20),
      userActivity
    };
    
    console.log('📊 Summary data generated');
    
    // Generate detailed descriptions for GPT
    const capturedDetails = capturedPolicies.slice(0, 5).map(p => 
      `${p.numero_poliza} (${p.tabla}) - ${p.contratante || p.nombre_contratante}`
    ).join(', ') || 'Ninguna';
    
    const expiringDetails = expiringPolicies.slice(0, 5).map(p =>
      `${p.numero_poliza} (${p.tabla}) - ${p.contratante || p.nombre_contratante} - Vence: ${new Date(p.fecha_fin).toLocaleDateString('es-MX')}`
    ).join(', ') || 'Ninguno';
    
    // Call GPT for analysis
    const fallbackSummary = `Resumen del período ${startDate.toLocaleDateString('es-MX')} - ${endDate.toLocaleDateString('es-MX')}:\n\n• Pólizas capturadas: ${policiesCaptured}\n  → ${capturedDetails}\n• Pólizas por vencer (próximos 7 días): ${expiringPolicies.length}\n  → ${expiringDetails}\n• Pagos realizados: ${policiesPaid} | Pagos pendientes: ${policiesPending}\n• Pagos parciales pendientes: ${partialPayments.length} (total $${totalPartialAmount.toLocaleString('es-MX')})\n• Emails enviados: ${emailsSent}\n• Actualizaciones de datos: ${dataUpdates}\n• Actualizaciones del sistema: ${systemUpdates}\n• Usuarios activos: ${Object.keys(userActivity).length}\n\n(Análisis GPT no disponible: configurar OPENAI_API_KEY en Firebase y volver a desplegar las functions.)`;
    let gptSummary = { summary: fallbackSummary };

    if (openai) {
      try {
        console.log('🤖 Calling OpenAI for analysis...');
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "Eres un analista de seguros que crea resúmenes ejecutivos concisos, profesionales y detallados en español. Incluyes nombres de clientes y detalles relevantes cuando aportan contexto importante."
            },
            {
              role: "user",
              content: `Analiza esta actividad semanal de la correduría de seguros CASIN y crea un resumen ejecutivo conciso y profesional:

Período: ${startDate.toLocaleDateString('es-MX')} - ${endDate.toLocaleDateString('es-MX')}

MÉTRICAS CLAVE:
- Pólizas capturadas: ${policiesCaptured}
  → Detalles: ${capturedDetails}
- Pólizas por vencer (próximos 7 días): ${expiringPolicies.length}
  → Detalles: ${expiringDetails}
- Pagos parciales pendientes: ${partialPayments.length} ($${totalPartialAmount.toLocaleString('es-MX')})
- Pagos realizados en el período: ${policiesPaid}
- Pagos pendientes de primer pago: ${policiesPending}
- Emails enviados: ${emailsSent}
- Actualizaciones de datos: ${dataUpdates}
- Actualizaciones del sistema (deployments): ${systemUpdates}
- Usuarios activos: ${Object.keys(userActivity).length}
- Actividades diarias registradas: ${teamActivities.length}

Proporciona un análisis ejecutivo (máximo 250 palabras) que incluya:
1. Resumen general de la actividad del período (menciona las pólizas capturadas con nombres si las hay)
2. Puntos de atención prioritarios (vencimientos próximos con nombres y fechas, pagos pendientes específicos)
3. Estado de pagos (cuántos se realizaron vs cuántos están pendientes)
4. Recomendaciones clave para la siguiente semana
5. Si hubo actualizaciones del sistema, menciónalas brevemente

Escribe en tono profesional pero cercano, usa nombres de clientes cuando sea relevante para dar contexto.`
            }
          ],
          max_tokens: 600,
          temperature: 0.7
        });
        
        gptSummary = {
          summary: completion.choices[0].message.content
        };
        
        console.log('✅ GPT analysis completed');
      } catch (error) {
        console.error('❌ Error calling OpenAI:', error);
        gptSummary = {
          summary: `Resumen de la semana:\n\nSe capturaron ${policiesCaptured} pólizas nuevas (${capturedDetails}).\n\n${expiringPolicies.length} pólizas vencen en los próximos 7 días (${expiringDetails}).\n\nHay ${partialPayments.length} pagos parciales pendientes por un total de $${totalPartialAmount.toLocaleString('es-MX')}.\n\nSe realizaron ${policiesPaid} pagos y quedan ${policiesPending} pagos pendientes.\n\nEl equipo realizó ${emailsSent} envíos de email y ${dataUpdates} actualizaciones de datos.${systemUpdates > 0 ? `\n\nSe realizaron ${systemUpdates} actualizaciones del sistema.` : ''}`
        };
      }
    }
    
    // Generate email HTML
    const dateRangeText = `${startDate.toLocaleDateString('es-MX')} - ${endDate.toLocaleDateString('es-MX')}`;
    const emailHTML = generateResumenEmailHTML(gptSummary, summaryData, dateRangeText);
    
    // Send email
    const recipients = ['ztmarcos@gmail.com', 'marcoszavala09@gmail.com'];
    const transporter = nodemailer.createTransport(getSMTPConfig());
    
    const mailOptions = {
      from: {
        name: 'CASIN Seguros - Resumen Automático',
        address: 'casinseguros@gmail.com'
      },
      to: recipients.join(','),
      subject: `Resumen Semanal de Actividad - ${dateRangeText}`,
      html: emailHTML
    };
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');
    
    // Log successful execution
    await db.collection('activity_logs').add({
      timestamp: new Date().toISOString(),
      userId: 'system',
      userEmail: 'system',
      userName: 'Automated System',
      action: 'report_generated',
      tableName: null,
      details: {
        reportType: 'weekly_summary',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        automated: true,
        emailSent: true,
        recipients: recipients
      },
      metadata: {
        scheduledExecution: true,
        executionTime: new Date().toISOString()
      }
    });
    
    return {
      status: 'success',
      message: 'Weekly resumen generated and sent successfully',
      activitiesCount: activities.length,
      emailSent: true,
      recipients: recipients
    };
    
  } catch (error) {
    console.error('❌ Error generating weekly resumen:', error);
    throw error;
  }
});

/**
 * Helper function to generate email HTML for resumen
 */
function generateResumenEmailHTML(gptSummary, summaryData, dateRangeText) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resumen Semanal de Actividad</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f7fa; margin: 0; padding: 0;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: #000000; padding: 40px 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 700;">Resumen de Actividad</h1>
          <p style="color: #cccccc; margin: 0; font-size: 18px;">${dateRangeText}</p>
        </div>
        
        <!-- Summary Stats -->
        <div style="padding: 30px;">
          
          <!-- GPT Analysis -->
          <div style="background-color: #ffffff; border-radius: 8px; padding: 25px; margin-bottom: 30px; border: 1px solid #e5e5e5;">
            <h2 style="color: #000000; margin: 0 0 15px 0; font-size: 22px;">Análisis</h2>
            <div style="color: #333333; line-height: 1.8; font-size: 15px;">
              ${gptSummary.summary ? gptSummary.summary.replace(/\n/g, '<br>') : 'No hay análisis disponible'}
            </div>
          </div>
          
          <!-- Expiring Policies -->
          ${summaryData.expiringPolicies.total > 0 ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #000000; margin: 0 0 15px 0; font-size: 22px;">Pólizas por Vencer (Próximos 7 días)</h2>
            <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; border: 1px solid #e5e5e5;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f5f5f5; border-bottom: 2px solid #000000;">
                    <th style="padding: 10px; text-align: left; font-size: 14px; font-weight: bold;">Contratante</th>
                    <th style="padding: 10px; text-align: left; font-size: 14px; font-weight: bold;">Póliza</th>
                    <th style="padding: 10px; text-align: left; font-size: 14px; font-weight: bold;">Ramo</th>
                    <th style="padding: 10px; text-align: left; font-size: 14px; font-weight: bold;">Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  ${summaryData.expiringPolicies.policies.slice(0, 5).map(policy => {
                    const fechaFin = policy.fecha_fin?.toDate ? policy.fecha_fin.toDate() : new Date(policy.fecha_fin);
                    return `
                      <tr style="border-bottom: 1px solid #e5e5e5;">
                        <td style="padding: 10px; font-size: 13px;">${policy.nombre_contratante || policy.contratante || '-'}</td>
                        <td style="padding: 10px; font-size: 13px;">${policy.numero_poliza || '-'}</td>
                        <td style="padding: 10px; font-size: 13px;">${policy.tabla || '-'}</td>
                        <td style="padding: 10px; font-size: 13px;">${fechaFin.toLocaleDateString('es-MX')}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
          ` : ''}
          
          <!-- Partial Payments -->
          ${summaryData.partialPayments.total > 0 ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #000000; margin: 0 0 15px 0; font-size: 22px;">Pagos Parciales Pendientes</h2>
            <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; border: 1px solid #e5e5e5;">
              <p style="margin: 0 0 15px 0; color: #000000; font-weight: bold;">
                Total estimado: $${summaryData.partialPayments.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          ` : ''}
          
          <!-- Team Activities -->
          ${summaryData.teamActivities && summaryData.teamActivities.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #000000; margin: 0 0 15px 0; font-size: 22px;">Actividades Diarias del Equipo (${summaryData.teamActivities.length})</h2>
          </div>
          ` : ''}
          
          <!-- User Activity Stats -->
          <div style="margin-bottom: 30px;">
            <h2 style="color: #000000; margin: 0 0 15px 0; font-size: 22px;">Estadísticas por Usuario</h2>
            <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; border: 1px solid #e5e5e5;">
              ${Object.entries(summaryData.userActivity).map(([user, stats]) => `
                <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e5e5e5;">
                  <div style="font-weight: bold; color: #000000; margin-bottom: 8px;">${user}</div>
                  <div style="font-size: 13px; color: #666666;">
                    Emails: ${stats.email_sent || 0} | 
                    Capturas: ${stats.data_captured || 0} | 
                    Actualizaciones: ${stats.data_updated || 0}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
          <p style="color: #666666; margin: 0 0 10px 0; font-size: 14px;">Generado por CASIN Seguros CRM</p>
          <p style="color: #999999; margin: 0; font-size: 12px;">${new Date().toLocaleString('es-MX')}</p>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

/**
 * Send Email HTTP Function
 * Replaces Heroku endpoint: /api/email/send-welcome
 * Handles both JSON and FormData requests with file attachments
 */
const ALLOWED_ORIGINS = [
  'https://casin-crm.web.app',
  'https://casin.web.app',
  'https://casinbbdd.web.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

exports.sendEmail = onRequest({
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  const origin = req.get('Origin') || req.get('Referer');
  const allowOrigin = ALLOWED_ORIGINS.some(o => origin?.startsWith(o)) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  try {
    console.log('📧 Send Email Function triggered');
    console.log('📧 Method:', req.method);
    console.log('📧 Content-Type:', req.get('Content-Type'));
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST.'
      });
    }
    
    // Parse request body
    let to, subject, htmlContent, from, fromName, fromPass, cc, bcc, sendBccToSender, autoBccToCasin, driveLinks, footerData;
    let attachments = [];
    
    const contentType = req.get('Content-Type') || '';
    
    // Handle FormData request (with file attachments)
    if (contentType.includes('multipart/form-data')) {
      console.log('📦 Processing FormData request');
      console.log('📦 Content-Type:', contentType);
      console.log('📦 Content-Length:', req.get('Content-Length') || 'unknown');
      
      return new Promise((resolve, reject) => {
        try {
          // Use rawBody directly (already available in Cloud Functions 2nd Gen)
          const buffer = req.rawBody || Buffer.from('');
          console.log('📦 Raw body size:', buffer.length, 'bytes');
          
          const busboy = Busboy({ 
            headers: req.headers,
            limits: {
              fieldSize: 25 * 1024 * 1024, // 25MB por campo (para campos grandes como HTML)
              fields: 200, // Más campos para rowData
              files: 20, // Más archivos
              fileSize: 16 * 1024 * 1024 // 16MB por archivo
            }
          });
          const fields = {};
          const files = [];
        
        busboy.on('field', (fieldname, val) => {
          fields[fieldname] = val;
          // Log field sizes for debugging (only for large fields)
          if (val && val.length > 10000) {
            console.log(`📦 Large field received: ${fieldname} (${(val.length / 1024).toFixed(2)} KB)`);
          }
        });
        
        busboy.on('file', (fieldname, file, info) => {
          const { filename, encoding, mimeType } = info;
          console.log(`📎 File received: ${filename} (${mimeType})`);
          const chunks = [];
          
          file.on('data', (data) => {
            chunks.push(data);
          });
          
          file.on('end', () => {
            files.push({
              fieldname,
              filename,
              mimetype: mimeType,
              buffer: Buffer.concat(chunks)
            });
          });
        });
        
        busboy.on('finish', async () => {
          try {
            // Extract fields
            to = fields.to;
            subject = fields.subject;
            htmlContent = fields.htmlContent;
            from = fields.from;
            fromName = fields.fromName;
            fromPass = fields.fromPass;
            cc = fields.cc || '';
            bcc = fields.bcc || '';
            sendBccToSender = fields.sendBccToSender === 'true';
            autoBccToCasin = fields.autoBccToCasin === 'true';
            
            // Parse driveLinks if provided
            if (fields.driveLinks) {
              try {
                driveLinks = JSON.parse(fields.driveLinks);
              } catch (e) {
                driveLinks = [];
              }
            } else {
              driveLinks = [];
            }
            
            // Parse footerData if provided (opcional en FormData)
            // Para FormData, las imágenes ya están embebidas en el HTML
            if (fields.footerData) {
              try {
                footerData = JSON.parse(fields.footerData);
                console.log('📦 Footer data parsed from FormData');
              } catch (e) {
                console.warn('⚠️ Failed to parse footerData:', e);
                footerData = null;
              }
            } else {
              // Para FormData, las imágenes ya están en el HTML
              console.log('ℹ️ No footerData in FormData - images already in HTML');
              footerData = null;
            }
            
            // Store attachments
            attachments = files;
            
            // Continue with email sending logic
            await sendEmailLogic(req, res, {
              to, subject, htmlContent, from, fromName, fromPass,
              cc, bcc, sendBccToSender, autoBccToCasin, driveLinks, attachments, footerData
            });
            
            resolve();
          } catch (error) {
            console.error('❌ Error processing FormData:', error);
            res.status(500).json({
              success: false,
              error: 'Error processing request',
              details: error.message
            });
            resolve();
          }
        });
        
          busboy.on('error', (error) => {
            console.error('❌ Busboy error:', error);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Request headers:', req.headers);
            res.status(400).json({
              success: false,
              error: 'Error parsing FormData',
              details: error.message
            });
            resolve();
          });
          
          // Create a readable stream from the buffer
          const { Readable } = require('stream');
          const stream = Readable.from(buffer);
          stream.pipe(busboy);
          
        } catch (error) {
          console.error('❌ Error processing raw body:', error);
          res.status(500).json({
            success: false,
            error: 'Error processing request body',
            details: error.message
          });
          resolve();
        }
      });
    } else {
      // Handle JSON request (no file attachments)
      console.log('📄 Processing JSON request');
      const body = req.body;
      to = body.to;
      subject = body.subject;
      htmlContent = body.htmlContent;
      from = body.from;
      fromName = body.fromName;
      fromPass = body.fromPass;
      cc = body.cc || '';
      bcc = body.bcc || '';
      sendBccToSender = body.sendBccToSender === true;
      autoBccToCasin = body.autoBccToCasin === true;
      driveLinks = body.driveLinks || [];
      footerData = body.footerData || null;
      attachments = [];
      
      if (footerData) {
        console.log('📄 Footer data received in JSON request');
      }
      
      // Continue with email sending logic
      return sendEmailLogic(req, res, {
        to, subject, htmlContent, from, fromName, fromPass,
        cc, bcc, sendBccToSender, autoBccToCasin, driveLinks, attachments, footerData
      });
    }
    
  } catch (error) {
    console.error('❌ Error in sendEmail function:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar correo',
      details: error.message
    });
  }
});

/**
 * Helper function to send email (shared logic for JSON and FormData)
 */
async function sendEmailLogic(req, res, {
  to, subject, htmlContent, from, fromName, fromPass,
  cc, bcc, sendBccToSender, autoBccToCasin, driveLinks, attachments, footerData
}) {
  try {
    // Validate required fields
    if (!to || !subject || !htmlContent) {
      console.log('❌ Missing fields:', { to: !!to, subject: !!subject, htmlContent: !!htmlContent });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject, htmlContent'
      });
    }
    
    // Configure SMTP transporter
    const smtpUser = from || process.env.SMTP_USER || 'casinseguros@gmail.com';
    const smtpPass = fromPass || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    const senderName = fromName || 'CASIN Seguros';
    
    console.log('📧 SMTP User:', smtpUser);
    console.log('📧 Sender Name:', senderName);
    console.log('🔑 fromPass received:', fromPass ? `Yes (${fromPass.substring(0, 4)}...)` : 'No');
    console.log('🔑 Using password:', smtpPass ? `Yes (${smtpPass.substring(0, 4)}...)` : 'No');
    console.log('📎 Attachments:', attachments.length);
    console.log('🖼️ Footer Data:', footerData ? 'Present' : 'None');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    
    // Build email body
    let emailBody = htmlContent;
    
    // Prepare CID attachments for footer images
    const cidAttachments = [];
    
    // Process footer data if provided
    if (footerData) {
      console.log('🖼️ Processing footer images for CID embedding...');
      
      // Replace logo URL with CID
      const logoUrl = 'https://casin-crm.web.app/footers/casin-logo.png';
      emailBody = emailBody.replace(new RegExp(logoUrl, 'g'), 'cid:logo@casin');
      
      // Add logo as CID attachment (using base64 from public folder)
      // For Cloud Functions, we'll use a base64 encoded version
      cidAttachments.push({
        filename: 'casin-logo.png',
        path: 'https://casin-crm.web.app/footers/casin-logo.png',
        cid: 'logo@casin'
      });
      
      // Process footer images if present (múltiples imágenes)
      if (footerData.footerImages && Array.isArray(footerData.footerImages)) {
        console.log('🖼️ Processing multiple footer images:', footerData.footerImages.length);
        
        footerData.footerImages.forEach((footer, index) => {
          const cidName = `footer${index}@casin`;
          console.log(`🖼️ Footer ${index + 1} type:`, footer.base64 ? 'base64' : 'url');
          
          if (footer.base64) {
            // Footer is base64 - extract and add as CID
            const base64Data = footer.base64.split('base64,')[1];
            const extension = footer.type ? footer.type.split('/')[1] : 'jpg';
            
            cidAttachments.push({
              filename: `footer${index}.${extension}`,
              content: base64Data,
              encoding: 'base64',
              cid: cidName,
              contentType: footer.type || 'image/jpeg'
            });
            
            // Replace base64 in HTML with CID
            const escapedBase64 = footer.base64.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            emailBody = emailBody.replace(new RegExp(escapedBase64, 'g'), `cid:${cidName}`);
          } else if (footer.path) {
            // Footer is URL - add as CID
            const footerUrl = `https://casin-crm.web.app${footer.path}`;
            cidAttachments.push({
              filename: footer.name || `footer${index}.jpg`,
              path: footerUrl,
              cid: cidName
            });
            
            // Replace URL with CID
            emailBody = emailBody.replace(new RegExp(footerUrl, 'g'), `cid:${cidName}`);
          }
        });
      }
      
      console.log('✅ CID attachments prepared:', cidAttachments.length);
    }
    
    // Add Drive links if provided
    if (driveLinks && driveLinks.length > 0) {
      console.log('📎 Adding Drive links:', driveLinks.length);
      emailBody += `<br><br><h3>📁 Archivos adjuntos en Google Drive:</h3><ul>`;
      driveLinks.forEach(link => {
        emailBody += `<li><a href="${link.link}" target="_blank">${link.name}</a></li>`;
      });
      emailBody += `</ul>`;
    }
    
    // Configure mail options
    const mailOptions = {
      from: `"${senderName}" <${smtpUser}>`,
      to: to,
      subject: subject,
      html: emailBody,
      text: emailBody.replace(/<[^>]*>/g, '') // Plain text version
    };
    
    // Add file attachments if available
    const allAttachments = [...cidAttachments];
    
    if (attachments && attachments.length > 0) {
      console.log('📎 Adding file attachments:', attachments.length);
      const fileAttachments = attachments.map(file => ({
        filename: file.filename,
        content: file.buffer,
        contentType: file.mimetype
      }));
      allAttachments.push(...fileAttachments);
    }
    
    if (allAttachments.length > 0) {
      mailOptions.attachments = allAttachments;
      console.log('📎 Total attachments (including CID):', allAttachments.length);
    }
    
    // Add CC if provided
    if (cc && cc.trim()) {
      const ccEmails = cc.split(',').map(email => email.trim()).filter(email => email);
      if (ccEmails.length > 0) {
        mailOptions.cc = ccEmails;
        console.log('📧 Adding CC recipients:', ccEmails);
      }
    }
    
    // Add BCC recipients
    const bccRecipients = [];
    
    // Add custom BCC if provided
    if (bcc) {
      const bccList = bcc.split(',').map(email => email.trim()).filter(email => email);
      bccRecipients.push(...bccList);
      console.log('📧 Adding custom BCC recipients:', bccList);
    }
    
    // Add BCC to sender if requested
    if (sendBccToSender && smtpUser) {
      bccRecipients.push(smtpUser);
      console.log('📧 Adding BCC to sender:', smtpUser);
    }
    
    // Add BCC to casinseguros@gmail.com if requested
    if (autoBccToCasin) {
      bccRecipients.push('casinseguros@gmail.com');
      console.log('📧 Adding BCC to casinseguros@gmail.com');
    }
    
    if (bccRecipients.length > 0) {
      mailOptions.bcc = bccRecipients;
      console.log('📧 BCC recipients:', bccRecipients);
    }
    
    // Send email
    console.log('📤 Sending email to:', to);
    console.log('📋 Subject:', subject);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    
    res.status(200).json({
      success: true,
      message: 'Correo enviado exitosamente',
      messageId: info.messageId,
      recipient: to,
      subject: subject,
      attachmentsCount: attachments.length,
      bccSent: bccRecipients.length > 0 ? bccRecipients : null
    });
    
  } catch (error) {
    console.error('❌ Error in sendEmailLogic:', error);
    res.status(500).json({
      success: false,
      error: 'Error al enviar correo',
      details: error.message
    });
  }
}

/**
 * GPT Analysis HTTP Function
 * Replaces Heroku endpoint: /api/gpt/analyze-activity
 */
exports.gptAnalyzeActivity = onRequest({
  cors: true,
  maxInstances: 5,
  secrets: apiSecrets
}, async (req, res) => {
  for (const ref of apiSecrets) {
    try {
      const val = ref.value();
      if (val != null && val !== '') process.env[ref.name] = val;
    } catch (_) {}
  }
  ensureOpenAI();

  try {
    console.log('🤖 GPT Analyze Activity Function triggered');
    
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST.'
      });
    }
    
    if (!openai) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI not configured'
      });
    }
    
    const summaryData = req.body;
    
    // Generate prompt for GPT
    const startDate = summaryData.dateRange?.startDate || summaryData.dateRange?.start || 'N/A';
    const endDate = summaryData.dateRange?.endDate || summaryData.dateRange?.end || 'N/A';
    const summary = summaryData.summary || {};
    
    // Extraer detalles de pólizas capturadas para el prompt
    const capturedDetails = summaryData.capturedPolicies?.policies?.slice(0, 5).map(p => 
      `${p.numero_poliza} (${p.ramo || p.tableName}) - ${p.contratante}`
    ).join(', ') || 'Ninguna';
    
    // Extraer detalles de pagos pendientes
    const pendingDetails = summaryData.paymentsPending?.payments?.slice(0, 5).map(p =>
      `${p.numero_poliza} (${p.ramo}) - ${p.contratante}`
    ).join(', ') || 'Ninguno';
    
    // Extraer detalles de vencimientos
    const expiringDetails = summaryData.expiringPolicies?.policies?.slice(0, 5).map(p =>
      `${p.numero_poliza} (${p.ramo || p.tabla}) - ${p.contratante || p.nombre_contratante} - Vence: ${p.fecha_fin}`
    ).join(', ') || 'Ninguno';
    
    const prompt = `Analiza esta actividad semanal de la correduría de seguros CASIN y crea un resumen ejecutivo conciso y profesional:

Período: ${new Date(startDate).toLocaleDateString('es-MX')} - ${new Date(endDate).toLocaleDateString('es-MX')}

MÉTRICAS CLAVE:
- Pólizas capturadas: ${summary.policiesCaptured || 0}
  → Detalles: ${capturedDetails}
- Pólizas por vencer (próximos 7 días): ${summary.totalExpiring || 0}
  → Detalles: ${expiringDetails}
- Pagos parciales pendientes: ${summary.totalPartialPayments || 0}
- Pagos pendientes de primer pago: ${summary.policiesPending || 0}
  → Detalles: ${pendingDetails}
- Pagos realizados en el período: ${summary.policiesPaid || 0}
- Emails enviados: ${summary.emailsSent || 0}
- Actualizaciones de datos: ${summary.dataUpdates || 0}
- Actualizaciones del sistema (deployments): ${summary.systemUpdates || 0}
- Usuarios activos: ${summary.activeUsers || 0}
- Actividades diarias registradas: ${summary.totalDailyActivities || 0}

Proporciona un análisis ejecutivo (máximo 250 palabras) que incluya:
1. Resumen general de la actividad del período (menciona las pólizas capturadas con nombres si las hay)
2. Puntos de atención prioritarios (vencimientos próximos con nombres y fechas, pagos pendientes específicos)
3. Estado de pagos (cuántos se realizaron vs cuántos están pendientes)
4. Recomendaciones clave para la siguiente semana
5. Si hubo actualizaciones del sistema, menciónalas brevemente

Escribe en tono profesional pero cercano, usa nombres de clientes cuando sea relevante para dar contexto.`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Eres un analista de seguros que crea resúmenes ejecutivos concisos, profesionales y detallados en español. Incluyes nombres de clientes y detalles relevantes cuando aportan contexto importante."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.7
    });
    
    const analysis = completion.choices[0].message.content;
    
    console.log('✅ GPT analysis completed');
    
    res.status(200).json({
      success: true,
      summary: analysis
    });
    
  } catch (error) {
    console.error('❌ Error in GPT analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Error analyzing activity',
      details: error.message
    });
  }
});

/**
 * App Config HTTP Functions
 * Replaces Heroku endpoints: /api/app-config/resumen-auto-generate
 */
exports.getResumenConfig = onRequest({
  cors: true
}, async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const configSnapshot = await db.collection('app_config').doc('resumen-auto-generate').get();
    const config = configSnapshot.exists ? configSnapshot.data() : { enabled: false };
    
    res.status(200).json(config);
  } catch (error) {
    console.error('❌ Error getting resumen config:', error);
    res.status(500).json({ error: error.message });
  }
});

exports.updateResumenConfig = onRequest({
  cors: true
}, async (req, res) => {
  try {
    if (req.method !== 'PUT' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { enabled } = req.body;
    
    await db.collection('app_config').doc('resumen-auto-generate').set({
      enabled: enabled === true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    console.log(`⚙️  Resumen auto-generate ${enabled ? 'enabled' : 'disabled'}`);
    
    res.status(200).json({
      success: true,
      enabled: enabled === true,
      message: `Auto-generate ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('❌ Error updating resumen config:', error);
    res.status(500).json({ error: error.message });
  }
});
