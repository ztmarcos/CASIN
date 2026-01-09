# 🚀 Quick Start - Deploy a Firebase Hosting

## ⚡ Deploy Rápido (3 pasos)

### 1️⃣ Instalar Firebase CLI (solo primera vez)

```bash
npm install -g firebase-tools
firebase login
```

### 2️⃣ Verificar que todo está listo

```bash
./pre-deploy-check.sh
```

### 3️⃣ Hacer Deploy

```bash
./deploy-firebase.sh
```

O usando npm:

```bash
npm run deploy:firebase
```

**¡Listo!** Tu app estará en: **https://casin.web.app** 🎉

---

## 📝 Comandos Disponibles

### Deploy

```bash
# Deploy solo hosting (recomendado)
npm run deploy:firebase

# Deploy hosting + reglas de Firestore + Storage
npm run deploy:firebase:all

# Deploy solo reglas (sin rebuild del frontend)
npm run deploy:rules
```

### Build Local

```bash
# Build del frontend
npm run build

# O desde la carpeta frontend
cd frontend && npm run build
```

### Desarrollo Local

```bash
# Frontend (puerto 5174)
npm run dev:frontend

# Backend (puerto 3001)
npm run dev:backend

# Ambos en terminales separadas
npm run dev:frontend
npm run dev:backend
```

---

## 🔧 Troubleshooting Rápido

### Error: "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Error: "Not authenticated"
```bash
firebase login
```

### Error: "Build failed"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Error: "Wrong project"
```bash
firebase use casinbbdd
```

### Ver logs de deploy
```bash
firebase hosting:releases:list
```

---

## 🌐 URLs de la Aplicación

- **Producción**: https://casin.web.app
- **Alternativa**: https://casinbbdd.web.app
- **Firebase Console**: https://console.firebase.google.com/project/casinbbdd

---

## 📚 Documentación Completa

Para más detalles, consulta: **[FIREBASE_HOSTING_DEPLOY.md](./FIREBASE_HOSTING_DEPLOY.md)**

---

## ✅ Checklist Pre-Deploy

- [ ] Firebase CLI instalado y autenticado
- [ ] Build del frontend exitoso
- [ ] Variables de entorno configuradas
- [ ] Backend en Heroku funcionando (para APIs)
- [ ] Probar localmente antes de deploy

---

## 🎯 Flujo de Trabajo Recomendado

1. **Desarrollo Local**
   ```bash
   npm run dev:frontend  # Terminal 1
   npm run dev:backend   # Terminal 2
   ```

2. **Verificar Cambios**
   ```bash
   ./pre-deploy-check.sh
   ```

3. **Deploy a Producción**
   ```bash
   npm run deploy:firebase
   ```

4. **Verificar en Producción**
   - Abrir https://casin.web.app
   - Probar funcionalidades principales
   - Verificar consola del navegador

---

## 🔐 Seguridad

- ✅ Las credenciales de Firebase (client-side) son públicas y seguras
- ✅ La seguridad se maneja con reglas de Firestore y Storage
- ✅ Las credenciales del backend (service account) están en Heroku
- ✅ Los archivos `.env` están en `.gitignore`

---

## 💡 Tips

- El build del frontend tarda ~30-60 segundos
- El deploy a Firebase tarda ~1-2 minutos
- Los cambios son instantáneos (CDN de Firebase)
- Puedes hacer rollback desde Firebase Console
- El backend sigue en Heroku (no cambia)

---

**¿Preguntas?** Revisa [FIREBASE_HOSTING_DEPLOY.md](./FIREBASE_HOSTING_DEPLOY.md) para documentación completa.

