# Firebase API Key Configuration Guide

## Problem: API Key HTTP Referrer Restrictions

If you're seeing errors like:
```
Firebase: Error (auth/requests-from-referer-https://your-domain.com-are-blocked.)
API_KEY_HTTP_REFERRER_BLOCKED
```

This means your Firebase API key has HTTP referrer restrictions that are blocking requests from your deployed domains.

## Solution: Add Domains to API Key Restrictions

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project: **casinbbdd** (Project ID: 812853971334)

### Step 2: Navigate to API Credentials

1. In the left sidebar, go to **APIs & Services** → **Credentials**
2. Find your API key: `AIzaSyAbpUOH4D4Q_GyJBV-fgDEo3khkbIMNvZs`
3. Click on the API key to edit it

### Step 3: Configure HTTP Referrer Restrictions

1. Under **Application restrictions**, select **HTTP referrers (web sites)**
2. Click **Add an item** and add the following domains (one per line):

```
https://sis-casin-216c74c28e12.herokuapp.com/*
https://*.herokuapp.com/*
https://casinbbdd.firebaseapp.com/*
https://*.firebaseapp.com/*
http://localhost:*
http://127.0.0.1:*
```

**Important patterns:**
- Use `/*` at the end to allow all paths on that domain
- Use `*` wildcard for subdomains (e.g., `*.herokuapp.com/*`)
- Include both `http://` and `https://` for local development
- Include `localhost` and `127.0.0.1` with `:*` for any port

### Step 4: Configure API Restrictions (RECOMMENDED)

Under **API restrictions**:
- **Restrict key**: Select this option
- Select the following APIs (estas son las que tu aplicación CASIN CRM usa):

**APIs REQUERIDAS:**
1. **Identity Toolkit API** - Para autenticación con Google (login)
2. **Cloud Firestore API** - Para la base de datos de Firebase
3. **Firebase Storage API** - Para almacenar archivos y documentos

**APIs Opcionales (si las usas):**
4. **Firebase Installations API** - Usada internamente por Firebase SDK
5. **Firebase Remote Config API** - Solo si usas Remote Config

**Cómo encontrarlas:**
- Busca en la lista de APIs usando el buscador
- O filtra por "Firebase" para ver todas las APIs de Firebase
- Asegúrate de que todas las APIs necesarias estén habilitadas en tu proyecto

### Paso 4.5: Verificar que las APIs estén habilitadas

Antes de configurar las restricciones, asegúrate de que las APIs estén habilitadas en tu proyecto:

1. En Google Cloud Console, ve a **APIs & Services** → **Enabled APIs** (o **Library**)
2. Busca y verifica que estas APIs estén habilitadas:
   - ✅ **Identity Toolkit API** (`identitytoolkit.googleapis.com`)
   - ✅ **Cloud Firestore API** (`firestore.googleapis.com`)
   - ✅ **Firebase Storage API** (`storage-component.googleapis.com` o `storage-api.googleapis.com`)
3. Si alguna no está habilitada, haz clic en ella y presiona **Enable**

### Step 5: Save Changes

1. Click **Save** at the bottom
2. Wait a few minutes for changes to propagate (usually 1-5 minutes)

## Current Domains That Need to Be Added

Based on the error messages, add these domains:

1. **Heroku Production**: `https://sis-casin-216c74c28e12.herokuapp.com/*`
2. **Firebase Hosting**: `https://casinbbdd.firebaseapp.com/*`
3. **Local Development**: `http://localhost:*` and `http://127.0.0.1:*`

## Alternative: Remove Restrictions (NOT RECOMMENDED)

⚠️ **Security Warning**: Only use this for development/testing. Never remove restrictions in production.

If you want to temporarily remove restrictions:
1. Under **Application restrictions**, select **None**
2. Click **Save**

**Note**: Removing restrictions makes your API key accessible from any domain, which is a security risk.

## Verification

After updating the restrictions:

1. Wait 5-10 minutes for changes to propagate
2. Try logging in again from your deployed application
3. Check browser console - you should no longer see 403 errors

## Troubleshooting

### Changes not taking effect
- Wait up to 10 minutes for propagation
- Clear browser cache
- Try in incognito/private mode
- Check if you're using the correct API key

### Still seeing errors
- Verify the exact domain in the error message matches what you added
- Check for typos in the domain patterns
- Ensure you're using the correct API key
- Check Firebase project settings match your configuration

## Additional Resources

- [Firebase API Key Best Practices](https://firebase.google.com/docs/projects/api-keys)
- [Google Cloud API Key Restrictions](https://cloud.google.com/docs/authentication/api-keys#restricting_apis)
- [Firebase Authentication Setup](https://firebase.google.com/docs/auth/web/start)

