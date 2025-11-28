# Configuración de Heroku Scheduler para Cumpleaños

## ✅ Sistema de Cumpleaños Automático

El sistema de cumpleaños automático está completamente implementado y funcional.

## 📅 Configuración del Job de Cumpleaños

### En el Dashboard de Heroku Scheduler:

1. **Haz clic en "Create job"** o **"Add Job"**

2. **Configura el segundo job:**
   - **Command**: `node cron.js`
   - **Frequency**: **Every day at 16:00 UTC**
   
   > **Nota**: 16:00 UTC = 10:00 AM CST (hora ideal para enviar felicitaciones durante la mañana)

3. **Haz clic en "Save"**

## 🎂 Cómo Funciona

### Sistema Automático:

1. **Todos los días a las 10:00 AM CST**:
   - Heroku Scheduler ejecuta `node cron.js`
   - El script llama al endpoint `/api/cron/birthday-emails`

2. **El endpoint**:
   - Busca en todas las colecciones de Firebase
   - Extrae fechas de nacimiento de los RFC (personas físicas)
   - Filtra cumpleaños del día actual
   - Envía emails automáticos a quienes tengan email registrado

3. **Email de cumpleaños**:
   - Diseño profesional con gradiente morado
   - Incluye nombre, edad y mensaje personalizado
   - Firmado por "Equipo CASIN Seguros"

## 📧 Contenido del Email

```html
🎂 ¡Feliz Cumpleaños! 🎂

[Nombre del Cliente]

¡Que tengas un día maravilloso lleno de alegría y éxito!

¡Felicidades por tus [edad] años!

🎉 🎈 🎁

Con cariño,
Equipo CASIN Seguros
```

## 🔍 Filtros Aplicados

- **Solo personas físicas**: RFC de 13 caracteres
- **Solo con email**: No se envía si no hay email registrado
- **Solo cumpleaños del día**: Verifica mes y día exactos

## 📊 Monitoreo

### Probar manualmente:
```bash
# Desde local
HEROKU_APP_URL=https://sis-casin-216c74c28e12.herokuapp.com node test-birthday-emails.js

# Desde Heroku
heroku run node test-birthday-emails.js --app sis-casin
```

### Ver logs:
```bash
heroku logs --tail --app sis-casin | grep "birthday\|🎂"
```

### Ver ejecuciones:
```bash
heroku addons:open scheduler --app sis-casin
```

## 📝 Logs en Firebase

Cada ejecución se registra en:
- **Colección**: `activity_logs`
- **Action**: `birthday_emails_sent`
- **Details**: Incluye total de cumpleaños, emails enviados, y resultados

## 🔧 Troubleshooting

### Si no se envían emails:

1. **Verificar que hay cumpleaños hoy**:
   ```bash
   node test-birthday-emails.js
   ```

2. **Verificar logs de Heroku**:
   ```bash
   heroku logs --tail --app sis-casin
   ```

3. **Verificar que el job existe**:
   ```bash
   heroku addons:open scheduler --app sis-casin
   ```

4. **Verificar configuración de Gmail**:
   - Variable: `GMAIL_APP_PASSWORD`
   - Debe estar configurada en Heroku

## ⚙️ Variables de Entorno Necesarias

- `GMAIL_APP_PASSWORD`: Contraseña de aplicación de Gmail
- `VITE_FIREBASE_PROJECT_ID`: ID del proyecto Firebase
- `FIREBASE_PRIVATE_KEY`: Clave privada de Firebase

## 🎯 Jobs Configurados en Heroku Scheduler

### Job 1: Resumen Semanal
- **Command**: `node cron-weekly-resumen.js`
- **Frequency**: Daily at 23:00 UTC (solo se ejecuta viernes)
- **Destinatarios**: ztmarcos@gmail.com, marcoszavala09@gmail.com

### Job 2: Cumpleaños (ESTE)
- **Command**: `node cron.js`
- **Frequency**: Daily at 16:00 UTC (todos los días)
- **Destinatarios**: Clientes con cumpleaños del día

## 🎉 ¡Listo!

El sistema enviará automáticamente felicitaciones de cumpleaños todos los días a las 10:00 AM CST a los clientes que cumplan años ese día.

