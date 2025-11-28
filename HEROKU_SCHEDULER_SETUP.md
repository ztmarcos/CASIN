# Configuración de Heroku Scheduler para Resumen Semanal

## ✅ Heroku Scheduler Instalado

El addon `scheduler:standard` ha sido instalado en la app `sis-casin`.

## 📅 Configuración del Job de Resumen Semanal

### Paso 1: Acceder al Dashboard
Se ha abierto automáticamente el dashboard de Heroku Scheduler.
También puedes acceder manualmente en:
https://dashboard.heroku.com/apps/sis-casin/scheduler

### Paso 2: Crear Nuevo Job

Haz clic en **"Create job"** o **"Add Job"** y configura:

#### Configuración del Job:

**Comando a ejecutar:**
```bash
node cron-weekly-resumen.js
```

**Frecuencia:**
- Selecciona: **Weekly**
- Día: **Friday** (Viernes)
- Hora: **23:00 UTC**

> **Nota**: 23:00 UTC = 5:00 PM CST (Central Standard Time)
> Durante horario de verano (CDT), usar 22:00 UTC = 5:00 PM CDT

#### Configuración Alternativa (usando Dyno Size):
- **Dyno Size**: Standard-1X (o el que tengas disponible)
- **Next Run**: Se calculará automáticamente

### Paso 3: Guardar

Haz clic en **"Save"** o **"Create Job"**

## 🔍 Verificación

Después de guardar, deberías ver:
- ✅ Job creado: `node cron-weekly-resumen.js`
- ✅ Frecuencia: Weekly on Friday at 23:00 UTC
- ✅ Next Run: [Próximo viernes a las 23:00 UTC]

## 📧 Destinatarios del Email

El resumen semanal se enviará automáticamente a:
- ztmarcos@gmail.com
- marcoszavala09@gmail.com

## 🎯 Contenido del Email

El email incluirá:
- Análisis inteligente generado por GPT
- Pólizas por vencer (próximos 7 días)
- Pagos parciales pendientes
- Actividades diarias del equipo
- Pólizas capturadas en la semana
- Pólizas canceladas
- Estadísticas por usuario

## ⚙️ Configuración Adicional

### Activar/Desactivar Auto-generación

Desde el frontend (componente Resumen):
- Toggle: "Generar automáticamente los viernes"

O manualmente con el script:
```bash
# Activar
HEROKU_APP_URL=https://sis-casin-216c74c28e12.herokuapp.com node enable-resumen-auto.js

# Desactivar (modificar el script para enabled: false)
```

### Probar Manualmente

```bash
# Desde local
HEROKU_APP_URL=https://sis-casin-216c74c28e12.herokuapp.com node test-weekly-resumen.js

# Desde Heroku
heroku run node test-weekly-resumen.js --app sis-casin
```

## 📊 Monitoreo

### Ver logs del scheduler:
```bash
heroku logs --tail --app sis-casin | grep "weekly-resumen\|Cron job"
```

### Ver próximas ejecuciones:
```bash
heroku addons:open scheduler --app sis-casin
```

## 🔧 Troubleshooting

### Si el email no se envía:

1. **Verificar configuración en Firebase:**
   ```bash
   # Debe estar enabled: true
   curl https://sis-casin-216c74c28e12.herokuapp.com/api/app-config/resumen-auto-generate
   ```

2. **Verificar logs de Heroku:**
   ```bash
   heroku logs --tail --app sis-casin
   ```

3. **Probar manualmente:**
   ```bash
   node test-weekly-resumen.js
   ```

4. **Verificar que el job existe:**
   ```bash
   heroku addons:open scheduler --app sis-casin
   ```

## 📝 Notas Importantes

- El scheduler interno del servidor también está activo como respaldo
- Ambos sistemas verifican la configuración en Firebase antes de enviar
- Si la configuración está desactivada, no se enviará el email
- Los logs de cada ejecución se guardan en Firebase (collection: activity_logs)

## 🎉 ¡Listo!

El sistema está completamente configurado. El próximo viernes a las 5:00 PM CST se enviará automáticamente el resumen semanal.

