# ✅ Checklist de Deploy - Firebase Hosting

## 📋 Pre-Deploy (Primera Vez)

### Instalación y Setup

- [ ] **Instalar Firebase CLI**
  ```bash
  npm install -g firebase-tools
  ```

- [ ] **Login en Firebase**
  ```bash
  firebase login
  ```

- [ ] **Verificar proyecto**
  ```bash
  firebase use casinbbdd
  ```

- [ ] **Verificar que estás en el proyecto correcto**
  ```bash
  firebase projects:list
  ```

### Verificación de Archivos

- [ ] `firebase.json` existe y está configurado
- [ ] `.firebaserc` existe con proyecto `casinbbdd`
- [ ] `firestore.rules` existe
- [ ] `storage.rules` existe
- [ ] `frontend/.env` existe con variables de Firebase
- [ ] `frontend/package.json` existe

---

## 🔨 Build y Verificación

### Build del Frontend

- [ ] **Instalar dependencias del frontend**
  ```bash
  cd frontend && npm install
  ```

- [ ] **Hacer build del frontend**
  ```bash
  npm run build
  ```

- [ ] **Verificar que `frontend/dist` fue creado**
  ```bash
  ls -la frontend/dist
  ```

- [ ] **Verificar que `frontend/dist/index.html` existe**
  ```bash
  cat frontend/dist/index.html | head -n 5
  ```

### Verificación Automática

- [ ] **Ejecutar script de verificación**
  ```bash
  ./pre-deploy-check.sh
  ```

- [ ] **Todas las verificaciones pasaron** ✅

---

## 🚀 Deploy

### Deploy Manual

- [ ] **Ejecutar script de deploy**
  ```bash
  ./deploy-firebase.sh
  ```
  
  O con npm:
  ```bash
  npm run deploy:firebase
  ```

- [ ] **Deploy completado sin errores** ✅

- [ ] **Anotar la URL del deploy**
  - URL: https://casin.web.app

---

## ✅ Verificación Post-Deploy

### Verificación Básica

- [ ] **Abrir la aplicación en el navegador**
  - URL: https://casin.web.app

- [ ] **La página carga correctamente**

- [ ] **No hay errores en la consola del navegador**
  - Abrir DevTools (F12) → Console

- [ ] **Los estilos se cargan correctamente**

- [ ] **Las imágenes/logos se muestran**

### Verificación de Funcionalidades

- [ ] **Login funciona**
  - Probar login con Google

- [ ] **Dashboard carga**
  - Ver datos principales

- [ ] **Firestore funciona**
  - Verificar que se cargan datos

- [ ] **Firebase Storage funciona**
  - Verificar que se cargan archivos/PDFs

- [ ] **Navegación funciona**
  - Probar diferentes rutas

### Verificación de APIs (Backend Heroku)

- [ ] **Las APIs del backend responden**
  - Verificar llamadas a Heroku

- [ ] **Los emails funcionan**
  - Probar envío de emails

- [ ] **Los cron jobs funcionan**
  - Verificar en Heroku

---

## 🤖 GitHub Actions (Opcional)

### Configuración del Secret

- [ ] **Ir a GitHub → Settings → Secrets → Actions**

- [ ] **Crear secret: `FIREBASE_SERVICE_ACCOUNT_CASINBBDD`**

- [ ] **Copiar contenido del service account JSON**
  ```bash
  cat casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json
  ```

- [ ] **Pegar en el campo Value**

- [ ] **Guardar secret**

### Verificación del Workflow

- [ ] **Hacer commit y push de prueba**
  ```bash
  git add .
  git commit -m "test: Firebase deploy setup"
  git push origin main
  ```

- [ ] **Ir a GitHub → Actions**

- [ ] **Verificar que el workflow se ejecuta**

- [ ] **Workflow completa exitosamente** ✅

- [ ] **Verificar deploy en https://casin.web.app**

---

## 📊 Monitoreo

### Firebase Console

- [ ] **Abrir Firebase Console**
  - URL: https://console.firebase.google.com/project/casinbbdd

- [ ] **Verificar Hosting**
  - Ver métricas de tráfico
  - Ver uso de recursos

- [ ] **Verificar Firestore**
  - Ver operaciones de lectura/escritura
  - Ver uso de almacenamiento

- [ ] **Verificar Storage**
  - Ver archivos subidos
  - Ver uso de almacenamiento

### Heroku (Backend)

- [ ] **Verificar que el backend sigue funcionando**
  - URL de Heroku

- [ ] **Verificar logs del backend**
  ```bash
  heroku logs --tail -a tu-app-heroku
  ```

---

## 🐛 Troubleshooting

### Si algo falla...

- [ ] **Revisar logs del deploy**
  ```bash
  firebase deploy --only hosting --debug
  ```

- [ ] **Revisar consola del navegador**
  - F12 → Console
  - Buscar errores

- [ ] **Verificar variables de entorno**
  - Revisar `frontend/.env`

- [ ] **Limpiar y rebuild**
  ```bash
  cd frontend
  rm -rf node_modules dist
  npm install
  npm run build
  cd ..
  firebase deploy --only hosting
  ```

- [ ] **Verificar reglas de Firestore/Storage**
  ```bash
  firebase deploy --only firestore:rules,storage
  ```

---

## 📝 Notas Post-Deploy

### Información del Deploy

- **Fecha del deploy**: _______________
- **Versión**: _______________
- **URL de producción**: https://casin.web.app
- **URL alternativa**: https://casinbbdd.web.app
- **Tiempo de build**: _______________
- **Tiempo de deploy**: _______________

### Issues Encontrados

- [ ] Ninguno ✅
- [ ] _______________________________________________
- [ ] _______________________________________________
- [ ] _______________________________________________

### Próximos Pasos

- [ ] _______________________________________________
- [ ] _______________________________________________
- [ ] _______________________________________________

---

## 🎉 Deploy Completado

Si todos los checks están marcados, ¡felicidades! 🎉

Tu aplicación está desplegada en:
- **https://casin.web.app**
- **https://casinbbdd.web.app**

---

## 📞 Recursos

- [Documentación Completa](./FIREBASE_HOSTING_DEPLOY.md)
- [Quick Start](./QUICK_START_FIREBASE.md)
- [Resumen](./DEPLOY_SUMMARY.md)
- [Comandos](./firebase-deploy-commands.txt)

---

**Última actualización**: Enero 2025  
**Versión**: 1.0.0

