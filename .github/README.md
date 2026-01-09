# GitHub Actions - Firebase Hosting

Este directorio contiene los workflows de GitHub Actions para el deploy automático a Firebase Hosting.

## 📁 Archivos

### Workflows

1. **`firebase-hosting-merge.yml`**
   - Deploy automático a producción
   - Trigger: Push a `main` o `master`
   - Destino: https://casin.web.app

2. **`firebase-hosting-pull-request.yml`**
   - Deploy de preview para Pull Requests
   - Trigger: Creación de PR
   - Destino: URL temporal de preview

### Documentación

- **`FIREBASE_DEPLOY_SETUP.md`**: Instrucciones para configurar el secret en GitHub

## 🔐 Configuración Requerida

Para que los workflows funcionen, necesitas agregar un secret:

**Nombre**: `FIREBASE_SERVICE_ACCOUNT_CASINBBDD`  
**Valor**: Contenido completo del archivo `casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json`

### Pasos:

1. Ve a: **Settings → Secrets and variables → Actions**
2. Click en: **New repository secret**
3. Name: `FIREBASE_SERVICE_ACCOUNT_CASINBBDD`
4. Value: Copia el contenido del service account JSON
5. Click en: **Add secret**

Ver instrucciones detalladas en: [`FIREBASE_DEPLOY_SETUP.md`](./FIREBASE_DEPLOY_SETUP.md)

## ✅ Verificación

Una vez configurado:

1. Haz un commit y push a `main`
2. Ve a la pestaña **Actions** en GitHub
3. Verifica que el workflow se ejecute correctamente
4. La app estará disponible en: https://casin.web.app

## 🔄 Flujo de Trabajo

```
Push to main/master
    ↓
GitHub Actions Trigger
    ↓
Install Dependencies
    ↓
Build Frontend
    ↓
Deploy to Firebase Hosting
    ↓
✅ Live at casin.web.app
```

## 📚 Más Información

- [Documentación Completa](../FIREBASE_HOSTING_DEPLOY.md)
- [Quick Start](../QUICK_START_FIREBASE.md)
- [Resumen de Deploy](../DEPLOY_SUMMARY.md)

