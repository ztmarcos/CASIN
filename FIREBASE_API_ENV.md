# Firebase API – Variables de entorno

La API Express se sirve desde la Cloud Function `api` (`server-mysql.js` montado en `functions`). En Cloud Functions **no** se usa el `.env` del repo; hay que configurar las variables en **Secret Manager** (y opcionalmente `functions/.env`).

## Configuración recomendada: Secret Manager

1. **Crear/actualizar secretos** desde tu `.env` local (en la raíz del repo):

   ```bash
   node scripts/setup-firebase-secrets.mjs
   ```

   Requiere `gcloud` instalado y autenticado. El script lee el `.env` y crea o actualiza estos secretos en el proyecto `casinbbdd`:

   - `OPENAI_API_KEY`, `NOTION_API_KEY`, `NOTION_DATABASE_ID`
   - `GOOGLE_DRIVE_PRIVATE_KEY`, `GMAIL_APP_PASSWORD`, `SMTP_PASS_CASIN`
   - Opcionales: `GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_PROJECT_ID`, `GOOGLE_DRIVE_FOLDER_ID`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`

2. **Redesplegar** para que las functions usen los secretos:

   ```bash
   firebase deploy --only functions
   ```

Las funciones que usan estos secretos son: `api`, **`scheduledWeeklyResumen`** (resumen del viernes) y **`gptAnalyzeActivity`** (análisis GPT del resumen). Si `OPENAI_API_KEY` no está en Secret Manager o no se ha redesplegado tras subir el secret, el resumen del viernes mostrará "GPT no disponible" y el análisis será un resumen numérico de fallback. Para que el análisis lo redacte GPT: tener `OPENAI_API_KEY` en el `.env`, ejecutar `node scripts/setup-firebase-secrets.mjs` y luego `firebase deploy --only functions`.

**Verificar que la key llegue a las functions**

- En el `.env` puede estar como `OPENAI_API_KEY=sk-...` o `VITE_OPENAI_API_KEY=sk-...` (el script sube cualquiera de las dos como secret `OPENAI_API_KEY`).
- Comprobar que el secret existe en GCP:  
  `gcloud secrets describe OPENAI_API_KEY --project=casinbbdd`
- Tras un deploy, en Cloud Logging (Firebase Console → Functions → Logs) al generar un resumen o al ejecutar el cron del viernes deberías ver "OpenAI client initialized (key present)". Si ves "OpenAI not configured: OPENAI_API_KEY ... missing or empty", el secret no se está inyectando: vuelve a ejecutar `node scripts/setup-firebase-secrets.mjs` y `firebase deploy --only functions`.

## Variables que usa la API (server-mysql.js)

| Variable | Uso | Sensible |
|---------|-----|----------|
| `OPENAI_API_KEY` / `VITE_OPENAI_API_KEY` | GPT / análisis | Sí |
| `NOTION_API_KEY` / `VITE_NOTION_API_KEY` | Notion | Sí |
| `NOTION_DATABASE_ID` / `VITE_NOTION_DATABASE_ID` | Notion | No |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin (solo si no usa CF por defecto) | Sí |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Admin | No |
| `GOOGLE_DRIVE_CLIENT_EMAIL` | Drive | No |
| `GOOGLE_DRIVE_PROJECT_ID` | Drive | No |
| `GOOGLE_DRIVE_PRIVATE_KEY` | Drive | Sí |
| `GOOGLE_DRIVE_FOLDER_ID` | Drive | No |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Correo | Parcial |
| `GMAIL_USERNAME`, `GMAIL_APP_PASSWORD` | Correo CASIN | Sí |
| `HEROKU_APP_URL` | URLs de callback/email (sustituir por URL de la función `api`) | No |

En Cloud Functions, **Firebase Admin ya está inicializado**; no hace falta `VITE_FIREBASE_PROJECT_ID` ni `FIREBASE_PRIVATE_KEY` para la conexión a Firestore. Sí pueden hacer falta para otras partes del código que los comprueben.

## Ejemplo con Firebase config (no secretos)

```bash
firebase functions:config:set \
  app.smtp_host="smtp.gmail.com" \
  app.smtp_port="587" \
  app.notion_database_id="xxx"
```

Luego en la función, leer con `functions.config().app.smtp_host` y asignar a `process.env.SMTP_HOST` antes de cargar la app Express, o usar [defineString](https://firebase.google.com/docs/functions/config-env#define_string) en la definición de la función.

## Ejemplo con Secret Manager (recomendado para secretos)

1. Crear secretos en Google Cloud Console (Secret Manager) o con `gcloud`.
2. En la definición de la función, usar `defineSecret("OPENAI_API_KEY")` y pasarlos al contexto de la función.
3. Asignar a `process.env.OPENAI_API_KEY` antes de que se cargue `server-mysql-app.js`, o que la API lea de `process.env` una vez inyectados.

Tras cambiar config o secretos, redesplegar: `firebase deploy --only functions`.

## URLs (2nd gen = Cloud Run) y frontend

Las funciones 2nd gen usan URLs tipo `https://FUNCION-HASH.region.a.run.app`. El frontend toma la URL base desde **variables de entorno en build time** para no tener que tocar código en cada redeploy:

- `VITE_FIREBASE_API_BASE`: URL completa de la función `api` (p. ej. `https://api-d7zlm7v4qa-uc.a.run.app`).
- `VITE_RUN_APP_HASH`: Sufijo común (p. ej. `d7zlm7v4qa-uc.a.run.app`) para el resto de funciones.

**Después de un redeploy de functions**, actualizar y volver a construir el frontend:

```bash
./scripts/update-frontend-api-url.sh --deploy
# Luego en frontend: npm run build
```

O sin redesplegar (si ya tienes la salida del último deploy): `./scripts/update-frontend-api-url.sh` (usa `/tmp/firebase-deploy-out.txt` si existe). El script puede crear o actualizar `frontend/.env.production` con las dos variables.

Para que el frontend (sin login) pueda llamar a las funciones, hay que permitir invocación no autenticada en cada servicio Cloud Run, por ejemplo:

```bash
gcloud run services add-iam-policy-binding api --region=us-central1 --member="allUsers" --role="roles/run.invoker" --project=casinbbdd
```

(Repetir para `sendemail`, `gptanalyzeactivity`, `getresumenconfig`, `updateresumenconfig` si el frontend las llama directamente.)
