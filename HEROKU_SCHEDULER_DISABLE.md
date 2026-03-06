# Desactivar Schedulers de Heroku (Duplicados con Firebase)

Los mismos trabajos programados ya corren en **Firebase Cloud Scheduler**. Para evitar ejecuciones duplicadas (doble envío de cumpleaños o resumen semanal), desactiva los jobs en Heroku.

## Estado actual

| Job | Heroku (duplicado) | Firebase (canónico) |
|-----|--------------------|---------------------|
| Cumpleaños | `node cron.js` (Daily 16:00 UTC) | `scheduledBirthdayEmails` (9:00 AM CST) |
| Resumen semanal | `node cron-weekly-resumen.js` (Weekly Friday 23:00 UTC) | `scheduledWeeklyResumen` (5:00 PM CST viernes) |

## Pasos para desactivar en Heroku

1. Abre el Scheduler de Heroku:
   - https://dashboard.heroku.com/apps/sis-casin/scheduler
   - O: `heroku addons:open scheduler --app sis-casin`

2. **Eliminar o desactivar** estos dos jobs:
   - Job cuyo comando es: `node cron.js` (cumpleaños)
   - Job cuyo comando es: `node cron-weekly-resumen.js` (resumen semanal)

3. En la interfaz de Heroku Scheduler:
   - Cada job tiene un botón de eliminar (icono de papelera) o opción para editar y desactivar.
   - Elimina ambos jobs para que solo Firebase ejecute los envíos.

4. Verificación:
   - Tras guardar, la lista de jobs debe quedar vacía (o sin estos dos).
   - Los envíos seguirán ocurriendo desde Firebase a la misma hora (cumpleaños 9:00 AM, resumen viernes 5:00 PM CST).

## Notas

- El backend en Heroku (`server-mysql.js`) **sigue siendo necesario** para el resto del CRM (datos, directorio, Drive, etc.).
- Solo se desactivan los **scheduler jobs** que disparan cumpleaños y resumen semanal, ya migrados a Firebase.
