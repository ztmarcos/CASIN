# 🔍 Sistema de Auditoría de Esquemas

## Descripción

Este sistema analiza automáticamente la estructura de tus bases de datos Firebase, identifica patrones de uso, inconsistencias y proporciona recomendaciones para estandarizar esquemas entre equipos.

## 🎯 Características Principales

- ✅ **Análisis Automático**: Examina todas las colecciones existentes
- ✅ **Detección de Patrones**: Identifica campos comunes entre equipos
- ✅ **Recomendaciones Inteligentes**: Sugiere campos para estandarización
- ✅ **Reportes Exportables**: JSON y Markdown
- ✅ **Dashboard Visual**: Interface web intuitiva
- ✅ **CLI Tool**: Herramienta de línea de comandos
- ✅ **Multi-tenant**: Soporte para equipos aislados

## 🚀 Acceso Rápido

### 1. Dashboard Web
```
URL: http://localhost:5173/schema-audit
Requisito: Admin access
```

### 2. Línea de Comandos
```bash
# Auditoría básica
node scripts/run-schema-audit.js

# Con formato específico
node scripts/run-schema-audit.js --format=markdown

# Especificar archivo de salida
node scripts/run-schema-audit.js --format=json --output=mi-reporte.json
```

## 📊 Qué Analiza

### Tipos de Colecciones
- `contactos` - Datos de contactos/clientes
- `polizas` - Información de pólizas
- `tareas` - Sistema de tareas
- `reportes` - Reportes generados
- `configuracion` - Configuraciones del equipo
- `directorio` - Directorio de usuarios
- `autos`, `vida`, `gmm` - Seguros específicos
- `birthdays` - Cumpleaños

### Métricas por Colección
- **Documentos totales**
- **Campos únicos**
- **Frecuencia de uso** por campo
- **Tipos de datos** utilizados
- **Ejemplos de valores**

### Análisis de Equipos
- **Esquemas por equipo**
- **Campos comunes** (candidatos a obligatorios)
- **Campos frecuentes** (candidatos a opcionales)
- **Campos únicos** (específicos del equipo)

## 🛠️ Instalación y Configuración

### Prerrequisitos
```bash
# Variables de entorno requeridas en .env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### Dependencias
```bash
# Instaladas automáticamente con el proyecto
npm install firebase
npm install react-hot-toast
```

## 📋 Estructura de Reportes

### Formato JSON
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalTeams": 5,
  "totalCollections": 25,
  "fieldAnalysis": {
    "contactos": {
      "collections": 5,
      "totalDocuments": 1250,
      "commonFields": {
        "nombre": 5,
        "email": 5,
        "telefono": 4
      }
    }
  },
  "recommendations": [
    {
      "type": "standardize_required",
      "collectionType": "contactos",
      "priority": "high",
      "fields": ["nombre", "email"],
      "description": "Campos obligatorios candidatos"
    }
  ]
}
```

### Recomendaciones Típicas

#### 🔴 Alta Prioridad
- **Campos Obligatorios**: Aparecen en 100% de equipos
- **Inconsistencias de Tipos**: Mismo campo, tipos diferentes

#### 🟡 Media Prioridad
- **Campos Opcionales**: Aparecen en 70%+ de equipos
- **Normalización de Nombres**: Campos similares con nombres diferentes

#### 🟢 Baja Prioridad
- **Optimizaciones**: Campos poco utilizados
- **Documentación**: Campos sin descripción

## 🎨 Dashboard Features

### Tabs Disponibles

#### 📊 Resumen
- Métricas generales del sistema
- Estadísticas de equipos y colecciones
- Problemas identificados

#### 📋 Colecciones
- Análisis detallado por tipo
- Campos más comunes
- Porcentajes de uso

#### 💡 Recomendaciones
- Sugerencias priorizadas
- Campos candidatos a estandarización
- Acciones recomendadas

#### 🏢 Equipos
- Vista por equipo
- Colecciones por equipo
- Información de propietarios

#### ⚠️ Problemas
- Errores de conexión
- Colecciones inaccesibles
- Inconsistencias detectadas

## 🔧 Integración con Sistema Existente

### En el Contexto de Equipos
```javascript
// El auditor respeta el sistema de equipos existente
- Colecciones globales: Para admins CASIN
- Colecciones con prefijo: team_{teamId}_{collection}
- Aislamiento automático de datos
```

### Permisos de Acceso
```javascript
// Solo administradores pueden ejecutar auditorías
requireAdminAccess: true

// Verificación en ProtectedRoute
canAccessTeamData() && isAdmin()
```

## 📈 Roadmap Futuro

### Fase 2: Sistema de Plantillas
- [ ] **Schema Templates**: Plantillas reutilizables
- [ ] **Version Control**: Control de versiones de esquemas
- [ ] **Migration Tools**: Herramientas de migración automática

### Fase 3: Validación en Tiempo Real
- [ ] **Runtime Validation**: Validación al crear documentos
- [ ] **Schema Enforcement**: Aplicar esquemas obligatorios
- [ ] **Auto-migration**: Migración automática de campos

### Fase 4: Analytics Avanzado
- [ ] **Usage Analytics**: Análisis de uso de campos
- [ ] **Performance Impact**: Impacto en rendimiento
- [ ] **Cost Analysis**: Análisis de costos por esquema

## 🚨 Consideraciones de Seguridad

### Datos Sensibles
- ✅ **Sanitización**: Los datos se sanitizan en reportes
- ✅ **Sampling**: Solo muestra primeros 50 documentos
- ✅ **Truncado**: Valores largos se truncan
- ✅ **Admin Only**: Solo administradores tienen acceso

### Permisos Firebase
```javascript
// Requiere permisos de lectura en:
- /teams/{teamId}
- /team_members/{memberId}
- /team_{teamId}_{collection}/{docId}
- /{globalCollection}/{docId}
```

## 🐛 Troubleshooting

### Problemas Comunes

#### "Firebase not connected"
```bash
# Verificar variables de entorno
echo $VITE_FIREBASE_PROJECT_ID

# Verificar conexión
curl -I https://${PROJECT_ID}.firebaseio.com/
```

#### "No collections found"
```bash
# Verificar permisos en Firestore Rules
// Asegurar que admin puede leer todas las colecciones
```

#### "CLI script fails"
```bash
# Instalar dependencias faltantes
npm install dotenv

# Verificar Node.js version
node --version  # Requiere Node 16+
```

## 📞 Soporte

### Logs de Debug
```javascript
// Habilitar logs detallados
localStorage.setItem('debug-schema-audit', 'true');
```

### Información de Sistema
```bash
# Generar reporte de diagnóstico
node scripts/run-schema-audit.js --format=markdown > diagnostic.md
```

---

## 🎯 Próximos Pasos Recomendados

1. **Ejecutar Primera Auditoría**: Usar el dashboard para análisis inicial
2. **Revisar Recomendaciones**: Identificar campos candidatos a estandarización
3. **Documentar Decisiones**: Crear plan de migración
4. **Implementar Gradualmente**: Aplicar cambios por fases
5. **Monitorear Impacto**: Seguimiento continuo

¿Listo para comenzar? 🚀

```bash
# Acceder al dashboard
open http://localhost:5173/schema-audit

# O ejecutar desde CLI
node scripts/run-schema-audit.js
``` 