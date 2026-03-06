# 🏗️ Arquitectura Actual del Sistema

**Fecha**: 21 de Enero, 2026  
**Estado**: ✅ Funcionando

---

## 📊 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│                  https://casin-crm.web.app                       │
│                  (Firebase Hosting)                          │
└────────┬────────────────────────────────┬───────────────────┘
         │                                │
         │ /api/data/*                    │ Email, GPT, Config
         │ (tablas, CRUD)                 │
         │                                │
         ▼                                ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│   HEROKU BACKEND    │      │   FIREBASE FUNCTIONS         │
│  (Node.js/Express)  │      │   (Serverless)               │
│                     │      │                              │
│ • /api/data/*       │      │ • sendEmail                  │
│ • CRUD operations   │      │ • gptAnalyzeActivity         │
│ • Table management  │      │ • getResumenConfig           │
│                     │      │ • updateResumenConfig        │
│                     │      │ • scheduledBirthdayEmails    │
│                     │      │ • scheduledWeeklyResumen     │
└──────────┬──────────┘      └──────────────┬───────────────┘
           │                                │
           │                                │
           └────────────┬───────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   FIRESTORE DB   │
              │   (NoSQL)        │
              │                  │
              │ • autos          │
              │ • vida           │
              │ • gmm            │
              │ • rc             │
              │ • directorio     │
              │ • activity_logs  │
              │ • etc...         │
              └──────────────────┘
```

---

## 🎯 Responsabilidades por Servicio

### 1. Firebase Hosting
**URL**: https://casin-crm.web.app  
**Función**: Servir el frontend React

**Contenido**:
- Aplicación React compilada (build estático)
- Assets (CSS, JS, imágenes)
- Configuración de routing (SPA)

---

### 2. Heroku Backend
**URL**: https://sis-casin-216c74c28e12.herokuapp.com  
**Función**: API REST para operaciones de datos

**Endpoints activos**:
- `GET /api/data/:tableName` - Obtener datos de una tabla
- `POST /api/data/:tableName` - Crear nuevo registro
- `PUT /api/data/:tableName/:id` - Actualizar registro
- `DELETE /api/data/:tableName/:id` - Eliminar registro
- `GET /api/data/tables` - Listar tablas disponibles
- `GET /api/data/table-types` - Obtener tipos de tablas
- `GET /api/data/tables/:tableName/structure` - Estructura de tabla
- `GET /api/data/tables/:tableName/children` - Tablas hijas
- `GET /api/data/crud_db` - Operaciones CRUD genéricas
- `POST /api/data/crud_db` - Operaciones CRUD genéricas

**¿Por qué sigue en Heroku?**
- Ya estaba funcionando correctamente
- Maneja la lógica compleja de relaciones entre tablas
- Caché y optimizaciones específicas
- No es crítico migrarlo ahora (funciona bien)

**Costo**: $7/mes (o $0 si usas free tier con dyno activo)

---

### 3. Firebase Functions
**URL Base**: https://us-central1-casinbbdd.cloudfunctions.net  
**Función**: Funciones serverless para email, GPT y triggers automáticos

#### HTTP Functions (llamadas desde frontend)

**sendEmail**
- **URL**: `/sendEmail`
- **Método**: POST
- **Uso**: Envío de emails con Nodemailer
- **Llamado desde**: 
  - `TableMail.jsx` (emails desde tablas)
  - `Resumen.jsx` (resumen semanal)
  - `emailService.js` (emails genéricos)
  - `Reports.jsx` (recordatorios)
  - `Cotiza.jsx` (cotizaciones)

**gptAnalyzeActivity**
- **URL**: `/gptAnalyzeActivity`
- **Método**: POST
- **Uso**: Análisis inteligente con GPT-4
- **Llamado desde**: `Resumen.jsx`

**getResumenConfig**
- **URL**: `/getResumenConfig`
- **Método**: GET
- **Uso**: Obtener configuración de auto-generación
- **Llamado desde**: `Resumen.jsx`

**updateResumenConfig**
- **URL**: `/updateResumenConfig`
- **Método**: POST
- **Uso**: Actualizar configuración de auto-generación
- **Llamado desde**: `Resumen.jsx`

**testEmail**
- **URL**: `/testEmail`
- **Método**: POST
- **Uso**: Prueba de conectividad SMTP
- **Llamado desde**: Testing manual

#### Scheduled Functions (triggers automáticos)

**scheduledBirthdayEmails**
- **Schedule**: `0 9 * * *` (9:00 AM diario, CST)
- **Función**: Envía emails de cumpleaños automáticamente
- **Cloud Scheduler**: `firebase-schedule-scheduledBirthdayEmails-us-central1`

**scheduledWeeklyResumen**
- **Schedule**: `0 17 * * 5` (5:00 PM viernes, CST)
- **Función**: Genera y envía resumen semanal con GPT
- **Cloud Scheduler**: `firebase-schedule-scheduledWeeklyResumen-us-central1`

**Costo**: $0/mes (dentro del free tier)

---

### 4. Firestore Database
**Tipo**: NoSQL (documentos y colecciones)  
**Función**: Base de datos principal

**Colecciones principales**:
- `autos` - Pólizas de autos
- `vida` - Seguros de vida
- `gmm` - Gastos médicos mayores
- `rc` - Responsabilidad civil
- `transporte` - Seguros de transporte
- `mascotas` - Seguros de mascotas
- `diversos` - Seguros diversos
- `negocio` - Seguros de negocio
- `directorio_contactos` - Contactos
- `activity_logs` - Logs de actividad
- `app_config` - Configuración de la app
- `emant_caratula` - Emant carátula
- `emant_listado` - Emant listado
- `gruposvida` - Grupos vida
- `listadovida` - Listado vida
- `gruposautos` - Grupos autos
- `listadoautos` - Listado autos

**Acceso**:
- Heroku backend: Acceso directo vía Firebase Admin SDK
- Firebase Functions: Acceso directo vía Firebase Admin SDK
- Frontend: NO accede directamente (usa APIs)

**Costo**: $0/mes (dentro del free tier)

---

## 🔄 Flujos de Datos

### Flujo 1: Leer/Escribir Datos de Tablas
```
Frontend → Heroku /api/data/* → Firestore
```

**Ejemplo**: Usuario abre tabla de Autos
1. Frontend llama: `GET https://sis-casin-216c74c28e12.herokuapp.com/api/data/autos`
2. Heroku lee Firestore collection `autos`
3. Heroku devuelve JSON al frontend
4. Frontend muestra los datos en DataTable

### Flujo 2: Enviar Email
```
Frontend → Firebase Functions /sendEmail → SMTP → Email
```

**Ejemplo**: Usuario envía email desde tabla
1. Frontend llama: `POST https://us-central1-casinbbdd.cloudfunctions.net/sendEmail`
2. Firebase Function usa Nodemailer
3. Email se envía vía SMTP (Gmail)
4. Function devuelve confirmación

### Flujo 3: Trigger Automático de Cumpleaños
```
Cloud Scheduler → Firebase Function → Firestore → SMTP → Email
```

**Ejemplo**: Cada día a las 9 AM
1. Cloud Scheduler activa `scheduledBirthdayEmails`
2. Function lee todas las colecciones de Firestore
3. Extrae cumpleaños del día
4. Envía emails vía Nodemailer
5. Registra en `activity_logs`

### Flujo 4: Resumen Semanal con GPT
```
Cloud Scheduler → Firebase Function → Firestore → OpenAI → Email
```

**Ejemplo**: Cada viernes a las 5 PM
1. Cloud Scheduler activa `scheduledWeeklyResumen`
2. Function lee datos de la semana de Firestore
3. Envía datos a OpenAI GPT-4 para análisis
4. Genera HTML con el análisis
5. Envía email vía Nodemailer
6. Registra en `activity_logs`

---

## 📝 Configuración del Frontend

### `frontend/src/config/api.js`

```javascript
// Heroku para endpoints de datos (/api/data/*)
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001'
  : 'https://sis-casin-216c74c28e12.herokuapp.com';

export const API_URL = `${API_BASE_URL}/api`;

// Firebase Functions para email, GPT, config
export const FIREBASE_API = {
  sendEmail: 'https://us-central1-casinbbdd.cloudfunctions.net/sendEmail',
  gptAnalyzeActivity: 'https://us-central1-casinbbdd.cloudfunctions.net/gptAnalyzeActivity',
  getResumenConfig: 'https://us-central1-casinbbdd.cloudfunctions.net/getResumenConfig',
  updateResumenConfig: 'https://us-central1-casinbbdd.cloudfunctions.net/updateResumenConfig'
};
```

**Regla simple**:
- ¿Es operación de datos (CRUD, tablas)? → Usa `API_URL` (Heroku)
- ¿Es email, GPT o config? → Usa `FIREBASE_API` (Firebase Functions)

---

## 💰 Costos Mensuales

| Servicio | Costo | Notas |
|----------|-------|-------|
| Firebase Hosting | $0 | Free tier (10 GB storage, 360 MB/day transfer) |
| Firebase Functions | $0 | Free tier (2M invocations/month, 400K GB-sec) |
| Cloud Scheduler | $0 | Free tier (3 jobs/month) |
| Firestore | $0 | Free tier (1 GB storage, 50K reads/day) |
| Heroku Dyno | $7 | Hobby dyno (o $0 si usas free tier) |
| **TOTAL** | **$7/mes** | **($0 si Heroku en free tier)** |

---

## 🎯 Plan de Migración Futura (Opcional)

Si quieres eliminar Heroku completamente y ahorrar $7/mes:

### Opción 1: Migrar endpoints de datos a Firebase Functions
**Esfuerzo**: Alto (2-3 días)  
**Beneficio**: $7/mes de ahorro  
**Riesgo**: Medio (requiere testing extensivo)

**Pasos**:
1. Crear Firebase Functions para cada endpoint `/api/data/*`
2. Implementar lógica de CRUD en Functions
3. Actualizar frontend para usar nuevas URLs
4. Testing exhaustivo
5. Deploy y monitoreo
6. Desactivar Heroku

### Opción 2: Acceso directo a Firestore desde Frontend
**Esfuerzo**: Medio (1-2 días)  
**Beneficio**: $7/mes de ahorro + mejor performance  
**Riesgo**: Bajo  
**Consideración**: Requiere configurar Security Rules correctamente

**Pasos**:
1. Configurar Firestore Security Rules
2. Actualizar `firebaseTableService.js` para usar Firebase SDK directamente
3. Eliminar llamadas a `API_URL`
4. Testing
5. Deploy
6. Desactivar Heroku

### Recomendación
**Por ahora: MANTENER Heroku**
- Ya funciona correctamente
- No es crítico migrarlo
- $7/mes es costo aceptable
- Enfocarse en otras prioridades

**Migrar cuando**:
- Tengas tiempo para testing exhaustivo
- Quieras optimizar costos al máximo
- Necesites mejor performance

---

## 🔍 Monitoreo

### Heroku
```bash
heroku logs --tail --app=sis-casin
```

### Firebase Functions
```bash
gcloud logging tail "resource.type=cloud_function" --project=casinbbdd
```

### Cloud Scheduler
```bash
gcloud scheduler jobs list --project=casinbbdd --location=us-central1
```

---

## ✅ Estado Actual

- ✅ Frontend en Firebase Hosting
- ✅ Datos (CRUD) en Heroku + Firestore
- ✅ Emails en Firebase Functions
- ✅ GPT en Firebase Functions
- ✅ Triggers automáticos en Firebase Functions
- ✅ Todo funcionando correctamente

**Última actualización**: 21 de Enero, 2026  
**Autor**: Documentación de arquitectura  
**Proyecto**: CASIN Seguros CRM
