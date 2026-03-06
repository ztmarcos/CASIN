# 🚀 Deploy de CASIN CRM en Firebase Hosting

## 📋 Descripción

Este documento describe cómo hacer deploy de la aplicación CASIN CRM en Firebase Hosting usando el dominio `casin-crm.web.app`.

## 🏗️ Arquitectura

- **Frontend**: React + Vite → Firebase Hosting (`casin-crm.web.app`)
- **Backend**: Node.js + Express → Heroku (APIs)
- **Base de datos**: Firestore (Firebase)
- **Storage**: Firebase Storage

## 📦 Configuración Actual

### Firebase Project
- **Project ID**: `casinbbdd`
- **Hosting URL**: `https://casin-crm.web.app` y `https://casinbbdd.web.app`
- **Firestore Database**: `(default)` en región `nam5`

### Archivos de Configuración

1. **firebase.json** - Configuración principal
2. **.firebaserc** - Proyecto por defecto
3. **firestore.rules** - Reglas de seguridad de Firestore
4. **storage.rules** - Reglas de seguridad de Storage

## 🚀 Deploy Manual

### Prerequisitos

```bash
# Instalar Firebase CLI globalmente
npm install -g firebase-tools

# Login en Firebase
firebase login
```

### Pasos para Deploy

```bash
# 1. Instalar dependencias del frontend
cd frontend
npm install

# 2. Build del frontend
npm run build

# 3. Volver al directorio raíz
cd ..

# 4. Deploy a Firebase Hosting
firebase deploy --only hosting

# O deploy completo (hosting + firestore rules + storage rules)
firebase deploy
```

### Deploy Solo de Reglas

```bash
# Solo Firestore rules
firebase deploy --only firestore:rules

# Solo Storage rules
firebase deploy --only storage

# Ambos
firebase deploy --only firestore:rules,storage
```

## 🤖 Deploy Automático con GitHub Actions

Se han configurado dos workflows de GitHub Actions:

### 1. Deploy en Producción (merge a main/master)
- **Archivo**: `.github/workflows/firebase-hosting-merge.yml`
- **Trigger**: Push a `main` o `master`
- **Acción**: Build y deploy automático a producción

### 2. Preview en Pull Requests
- **Archivo**: `.github/workflows/firebase-hosting-pull-request.yml`
- **Trigger**: Creación de Pull Request
- **Acción**: Build y deploy a canal preview temporal

### Configuración de Secrets en GitHub

Para que funcionen los workflows automáticos, necesitas agregar este secret en GitHub:

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Agrega: `FIREBASE_SERVICE_ACCOUNT_CASINBBDD`
4. Valor: El contenido completo del archivo `casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json`

## 🔧 Scripts Disponibles

En el `package.json` raíz:

```json
{
  "scripts": {
    "build": "cd frontend && npm run build",
    "deploy:firebase": "npm run build && firebase deploy --only hosting",
    "deploy:all": "npm run build && firebase deploy"
  }
}
```

Uso:

```bash
# Build y deploy solo hosting
npm run deploy:firebase

# Build y deploy todo (hosting + rules)
npm run deploy:all
```

## 🌐 URLs de la Aplicación

- **Producción**: https://casin-crm.web.app
- **Alternativa**: https://casinbbdd.web.app
- **Backend API**: Tu URL de Heroku (mantener actual)

## 🔐 Variables de Entorno

### Frontend (.env en frontend/)

El frontend ya tiene configurado Firebase en `src/config/firebase.js` y `src/firebase/config.js`.

**Importante**: Las credenciales de Firebase para el cliente (frontend) son públicas y seguras. La seguridad se maneja con las reglas de Firestore y Storage.

### Backend (Heroku)

El backend en Heroku debe mantener:
- Variables de entorno actuales
- Service Account JSON para Firebase Admin SDK
- Credenciales de bases de datos y servicios externos

## 📊 Monitoreo

### Firebase Console
- **URL**: https://console.firebase.google.com/project/casinbbdd
- **Hosting**: Métricas de uso, tráfico y performance
- **Firestore**: Uso de base de datos
- **Storage**: Uso de almacenamiento

### Comandos Útiles

```bash
# Ver logs de hosting
firebase hosting:channel:list

# Ver información del proyecto
firebase projects:list

# Ver uso actual
firebase use

# Cambiar proyecto (si tienes múltiples)
firebase use casinbbdd
```

## 🔄 Rollback

Si necesitas hacer rollback a una versión anterior:

```bash
# Listar versiones anteriores
firebase hosting:releases:list

# Hacer rollback (desde Firebase Console)
# Hosting → Release history → Rollback
```

## 🐛 Troubleshooting

### Error: "Firebase project not found"
```bash
firebase use casinbbdd
```

### Error: "Build failed"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Error: "Permission denied"
```bash
firebase login --reauth
```

### Error en Firestore Rules
```bash
# Validar reglas antes de deploy
firebase deploy --only firestore:rules --debug
```

## 📝 Checklist de Deploy

- [ ] Build del frontend exitoso (`cd frontend && npm run build`)
- [ ] Verificar que `frontend/dist` existe y tiene contenido
- [ ] Login en Firebase CLI (`firebase login`)
- [ ] Proyecto correcto seleccionado (`firebase use casinbbdd`)
- [ ] Deploy (`firebase deploy --only hosting`)
- [ ] Verificar en https://casin-crm.web.app
- [ ] Probar funcionalidades principales
- [ ] Verificar conexión con backend de Heroku
- [ ] Verificar acceso a Firestore y Storage

## 🎯 Próximos Pasos

1. **Dominio Personalizado** (Opcional)
   - Configurar dominio custom en Firebase Hosting
   - Ejemplo: `app.casin.com` o `crm.casin.com`

2. **Performance**
   - Habilitar CDN de Firebase (ya incluido)
   - Configurar caché headers (ya configurado)

3. **Monitoring**
   - Configurar alertas en Firebase Console
   - Integrar con Google Analytics

4. **CI/CD**
   - Configurar GitHub Actions (ya incluido)
   - Agregar tests antes del deploy

## 📞 Soporte

- **Firebase Docs**: https://firebase.google.com/docs/hosting
- **Firebase CLI**: https://firebase.google.com/docs/cli
- **Status**: https://status.firebase.google.com/

---

**Última actualización**: Enero 2025
**Versión**: 1.0.0

