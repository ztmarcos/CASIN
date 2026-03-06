# Roadmap: Migración del Backend Heroku → Firebase

Este documento describe los pasos necesarios para migrar el resto del backend (actualmente en Heroku) a Firebase, de modo que se pueda eliminar la app de Heroku.

## Estado actual

- **Ya en Firebase**: Schedulers (cumpleaños, resumen semanal), sendEmail, gptAnalyzeActivity, getResumenConfig, updateResumenConfig.
- **Sigue en Heroku**: Todo lo demás (CRUD de datos, directorio, Drive, Notion, parse-pdf, GPT analyze, activity-logs, etc.). El frontend en producción usa `HEROKU_BACKEND_URL` para `API_BASE_URL` ([`frontend/src/config/api.js`](frontend/src/config/api.js)).

Referencia: [`server-mysql.js`](server-mysql.js) (~7,600 líneas) contiene todos los endpoints.

---

## Fase 1: Endpoints críticos (datos y tablas)

Objetivo: que el CRUD y la gestión de tablas/columnas funcionen vía Firebase Functions (y opcionalmente llamadas directas a Firestore desde el cliente donde aplique).

### 1.1 `/api/data/*` (CRUD de tablas)

- **Endpoints**:  
  - `GET /api/data/tables`  
  - `GET /api/data/table-types`  
  - `GET /api/data/:tableName` (con validación de equipo)  
  - `POST /api/data/:tableName`  
  - `PUT /api/data/:tableName/:id`  
  - `DELETE /api/data/:tableName/:id`  
  - `GET /api/count/:tableName`  
  - `GET /api/policies/count`  
  - `GET /api/data/tables/:tableName/structure`  
  - `GET /api/data/tables/:tableName/children`
- **Lógica**: Lectura/escritura en Firestore, respetando equipos (`validateTeamAccess`, colecciones `team_xxx_*` o raíz según equipo).
- **Opciones**:  
  - Implementar Cloud Functions que llamen a Firestore Admin SDK, o  
  - Migrar el frontend a Firebase SDK (Firestore) para leer/escribir directamente con reglas de seguridad bien definidas; en ese caso las Functions solo harían lo que no se pueda hacer desde el cliente (validaciones complejas, agregaciones).

### 1.2 `/api/tables/*` (columnas y estructura)

- **Endpoints**:  
  - `PUT /api/tables/:tableName/columns/order`  
  - `GET /api/tables/:tableName/columns/order`  
  - `DELETE /api/tables/:tableName/columns/:columnName`  
  - `POST /api/tables/:tableName/columns/add`  
  - `PUT /api/tables/:tableName/columns/:columnName/tag`
- **Datos**: Metadatos de columnas (orden, etiquetas) pueden vivir en Firestore (p. ej. colección `table_metadata` o doc por tabla).
- **Implementación**: Functions HTTP que lean/actualicen esos metadatos y/o delegar parte al cliente con Firestore rules.

### 1.3 `/api/directorio/*` (contactos y relaciones)

- **Endpoints**:  
  - `GET /api/directorio`, `GET /api/directorio/stats`  
  - `GET /api/directorio/:id`, `POST /api/directorio`, `PUT /api/directorio/:id`, `DELETE /api/directorio/:id`  
  - `GET /api/directorio/:id/policies`  
  - `POST /api/directorio/:id/link-cliente`, `POST /api/directorio/:id/link-policy`  
  - `GET /api/directorio/:contactId/linked-policies`  
  - `GET /api/directorio-relationships`  
  - `PUT /api/directorio/update-client-status`
- **Lógica**: Mucha lógica de negocio y joins; conviene replicar en Functions (Firestore Admin) o refactorizar a consultas Firestore + algo de lógica en el cliente.

### 1.4 `/api/birthday/*` (cumpleaños)

- **Endpoints**:  
  - `GET /api/birthday`, `GET /api/birthdays`, `GET /api/birthdays/today`, `GET /api/birthdays/upcoming`  
  - `POST /api/birthday/check-and-send`
- **Nota**: El envío programado ya está en Firebase (`scheduledBirthdayEmails`). Solo falta exponer estos GET/POST para el frontend (listados y “enviar ahora”). Pueden ser Functions que lean las mismas colecciones que usa la scheduled function.

---

## Fase 2: Integraciones externas

Estos endpoints usan credenciales y SDKs de terceros; hay que mover la lógica a Cloud Functions y exponerlas como HTTP.

### 2.1 Google Drive (`/api/drive/*`)

- **Endpoints**:  
  - `GET /api/drive/files`, `GET /api/drive/test`  
  - `GET /api/drive/download/:fileId`  
  - `POST /api/drive/upload`, `POST /drive/upload`  
  - `GET /api/drive/client-folder/:clientId`, `POST /api/drive/client-folder`
- **Requisitos**: Service account (JSON o env vars) en Firebase (env de Cloud Functions). Misma lógica que en `server-mysql.js`, pero dentro de una Function (y manejo de multipart si aplica).

### 2.2 Notion (`/api/notion/*`)

- **Endpoints**: Varios (databases, users, raw-table, tasks, create-task, update-cell, delete-task, debug, database-schema).
- **Requisitos**: API key de Notion en env de Functions. Reutilizar la lógica actual del servidor dentro de Functions.

### 2.3 PDF y análisis (`/api/parse-pdf`, `/api/gpt/*`)

- **Endpoints**:  
  - `POST /api/parse-pdf`  
  - `POST /api/gpt/analyze`, `POST /api/gpt/analyze-list`, `POST /api/gpt/generate`  
  - `POST /api/analyze-image`, `POST /api/generate-quote`
- **Requisitos**: OpenAI API key y posiblemente almacenamiento de archivos (Cloud Storage) para PDFs. Functions con timeout y memoria suficientes para PDFs y respuestas largas.

### 2.4 Otros

- **Activity logs**: `POST /api/activity-logs`, `GET /api/activity-logs` → pueden ser Functions que escriban/lean la colección `activity_logs` en Firestore.
- **Email**: `POST /api/email/send-welcome`, `POST /api/email/send-task-notification` → ya existe `sendEmail` en Firebase; el frontend puede usar solo Firebase para envíos; si hace falta, crear wrappers que llamen a `sendEmail`.
- **Prosperación, support chat, etc.**: Migrar según uso real.

---

## Fase 3: Frontend y corte con Heroku

1. **Configuración de API**  
   - En producción, dejar de usar `HEROKU_BACKEND_URL` como `API_BASE_URL`.  
   - Definir una URL base de Firebase (p. ej. `https://us-central1-casinbbdd.cloudfunctions.net`) y/o rutas por función (ej. `apiData`, `apiDirectorio`, etc.) en [`frontend/src/config/api.js`](frontend/src/config/api.js).

2. **Actualizar llamadas**  
   - Revisar todos los usos de `API_URL`, `BASE_URL` y rutas `/api/...` en el frontend (DataTable, Directorio, Drive, Notion, Resumen, etc.) para que apunten a las nuevas Cloud Functions o a Firestore cuando la lectura/escritura sea directa.

3. **Autenticación y CORS**  
   - Las Functions deben aceptar requests del dominio del frontend (y/o Firebase Auth). Configurar CORS y, si aplica, validar token en cada Function.

4. **Variables de entorno**  
   - Eliminar o marcar como obsoletas las variables relacionadas con Heroku en el frontend y en el repo. Documentar las necesarias para Firebase (ya documentadas en `HEROKU_TO_FIREBASE_MIGRATION_COMPLETE.md` para las Functions actuales).

5. **Pruebas**  
   - Flujos completos: login, CRUD por tabla, directorio, Drive, Notion, resumen, cumpleaños, envío de correos, parse de PDF.  
   - Comprobar que los schedulers de Firebase (cumpleaños y resumen) siguen funcionando tras el cambio.

6. **Apagado de Heroku**  
   - Cuando todo esté estable en producción: desactivar dynos y, si ya no se usa, eliminar la app en Heroku. Mantener documentación de rollback (volver a apuntar a Heroku) por si hace falta.

---

## Orden sugerido de implementación

1. Fase 1.1 y 1.2 (datos + tablas) — núcleo del CRM.  
2. Fase 1.4 (birthday API) — poco volumen, ya hay lógica en Firebase.  
3. Activity logs (Fase 2.4).  
4. Fase 1.3 (directorio) — más complejo.  
5. Fase 2.1 (Drive), 2.2 (Notion), 2.3 (PDF/GPT).  
6. Fase 3 (cambio de URLs en frontend, pruebas, retirada de Heroku).

---

## Estimación y riesgos

- **Esfuerzo**: En el orden de 40–60 horas (diseño, implementación, pruebas, ajustes).  
- **Riesgos**: Timeouts y límites de Cloud Functions (memoria, tiempo), coste de invocaciones y tráfico, reglas de Firestore y permisos por equipo.  
- **Recomendación**: Mantener Heroku hasta tener al menos Fase 1 y 2 migradas y probadas en un entorno de staging o rama de producción paralela.

---

## Referencias

- Backend actual: [`server-mysql.js`](server-mysql.js)  
- Firebase Functions actuales: [`functions/index.js`](functions/index.js)  
- Config frontend: [`frontend/src/config/api.js`](frontend/src/config/api.js)  
- Migración ya hecha: [`HEROKU_TO_FIREBASE_MIGRATION_COMPLETE.md`](HEROKU_TO_FIREBASE_MIGRATION_COMPLETE.md)  
- Desactivar schedulers en Heroku: [`HEROKU_SCHEDULER_DISABLE.md`](HEROKU_SCHEDULER_DISABLE.md)
