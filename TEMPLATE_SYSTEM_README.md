# 🎨 Sistema de Plantillas de Esquemas

## Resumen

El Sistema de Plantillas de Esquemas permite a los administradores de equipos configurar qué tipos de colecciones de datos estarán disponibles para su equipo, basándose en plantillas predefinidas del sistema de seguros.

## 🏗️ Arquitectura

### Componentes Principales

1. **SchemaTemplateManager** (`frontend/src/services/schemaTemplateManager.js`)
   - Gestiona las plantillas predefinidas
   - Maneja la configuración por equipo
   - Crea colecciones desde plantillas

2. **TeamTemplateConfig** (`frontend/src/components/TeamTemplateConfig/`)
   - Interfaz de usuario para configurar plantillas
   - Solo accesible para administradores
   - Permite activar/desactivar tipos de colecciones

## 📋 Tipos de Plantillas

### 1. Obligatorias (Required)
**Siempre se crean para todos los equipos:**
- `polizas` - Pólizas principales del sistema
- `contactos` - Base de datos de contactos y clientes
- `tareas` - Sistema de gestión de tareas
- `reportes` - Generación de reportes y análisis
- `configuracion` - Configuraciones del equipo

### 2. Recomendadas (Recommended)
**Se sugieren para un mejor control:**
- `policy_status` - Control de estados de pólizas
- `policy_links` - Relaciones entre pólizas

### 3. Opcionales Simples (Optional Simple)
**Tipos específicos de seguros:**
- `autos` - Seguros vehiculares
- `vida` - Seguros de vida
- `gmm` - Gastos médicos mayores
- `hogar` - Seguros de hogar
- `diversos` - Seguros diversos
- `mascotas` - Seguros de mascotas
- `rc` - Responsabilidad civil
- `negocio` - Seguros empresariales

### 4. Opcionales Combinadas (Optional Combined)
**Sistemas avanzados:**
- `emant` - Emisión y mantenimiento
- `emant_listado` - Listados de emisión
- `emant_caratula` - Carátulas de pólizas

## 🔧 Configuración por Equipo

### Estructura de Configuración

```javascript
{
  version: "1.0.0",
  enabledCollections: {
    required: ["polizas", "contactos", "tareas", "reportes", "configuracion"],
    recommended: ["policy_status", "policy_links"],
    optional_simple: ["autos", "vida", "gmm"],
    optional_combined: ["emant"],
    custom: [] // Para futuras extensiones
  },
  lastUpdated: "2024-01-23T10:30:00Z",
  updatedBy: "admin@empresa.com"
}
```

### Almacenamiento en Firebase

**Colección:** `team_template_configs`
**Documento ID:** `{teamId}`

## 🎯 Flujo de Uso

### 1. Configuración Inicial
1. Administrador accede a `/template-config`
2. Selecciona qué tipos de colecciones necesita su equipo
3. Guarda la configuración
4. Crea las colecciones desde las plantillas

### 2. Creación de Colecciones
Cada colección se crea con:
- **Ruta:** `team_{teamId}_{collectionName}`
- **Configuración:** En `collection_configs/{collectionPath}`
- **Datos de ejemplo:** Si la plantilla los incluye

### 3. Gestión Continua
- Los administradores pueden activar/desactivar colecciones
- Las configuraciones se versionan
- Se mantiene historial de cambios

## 📊 Estructura de Plantillas

### Definición de Plantilla

```javascript
{
  category: 'polizas',           // Categoría principal
  type: 'optional_simple',       // Tipo de plantilla
  name: 'Seguros de Autos',      // Nombre descriptivo
  description: 'Pólizas específicas de seguros vehiculares',
  fields: {
    numeroPoliza: { 
      type: 'string', 
      required: true, 
      description: 'Número único de póliza' 
    },
    marca: { 
      type: 'string', 
      required: true, 
      description: 'Marca del vehículo' 
    }
    // ... más campos
  },
  sampleData: [
    {
      numeroPoliza: 'AUTO-001-2024',
      marca: 'Toyota',
      modelo: 'Corolla'
      // ... datos de ejemplo
    }
  ]
}
```

### Tipos de Campos Soportados

- `string` - Texto
- `number` - Números
- `date` - Fechas
- `boolean` - Verdadero/Falso
- `array` - Listas
- `object` - Objetos complejos
- `timestamp` - Marcas de tiempo automáticas

## 🔐 Permisos y Seguridad

### Restricciones de Acceso
- Solo **administradores** pueden configurar plantillas
- Solo **administradores** pueden crear colecciones
- Los **miembros** pueden ver pero no modificar

### Validaciones
- Las colecciones obligatorias no se pueden desactivar
- Se valida la estructura de las plantillas
- Se verifica la existencia del equipo

## 🎨 Interfaz de Usuario

### Características Principales
1. **Vista por pestañas:** Pólizas vs Otras configuraciones
2. **Tarjetas interactivas:** Cada plantilla como una tarjeta
3. **Switches de activación:** Fácil activar/desactivar
4. **Vista previa de campos:** Muestra campos principales
5. **Estados visuales:** Obligatorio, activado, desactivado

### Indicadores Visuales
- 🟢 **Verde:** Obligatorias (siempre activas)
- 🔵 **Azul:** Activadas por el usuario
- ⚫ **Gris:** Desactivadas
- 🔒 **Candado:** Solo para administradores

## 📈 Estadísticas y Monitoreo

### Métricas Disponibles
- Número total de equipos usando el sistema
- Plantillas más populares
- Uso por categoría y tipo
- Tendencias de adopción

### Función de Estadísticas

```javascript
const stats = await templateManager.getTemplateUsageStats();
console.log(stats);
// {
//   totalTeams: 15,
//   templateUsage: { autos: 10, vida: 8, gmm: 12 },
//   categoryUsage: { polizas: 45, contacts: 15 },
//   typeUsage: { optional_simple: 30, required: 75 }
// }
```

## 🚀 Extensibilidad

### Agregar Nuevas Plantillas
1. Definir en `initializeTemplates()` del SchemaTemplateManager
2. Asignar categoría y tipo apropiados
3. Definir estructura de campos
4. Opcionalmente incluir datos de ejemplo

### Nuevos Tipos de Plantillas
- `experimental` - Para funciones en prueba
- `industry_specific` - Específicas por industria
- `custom_enterprise` - Para clientes empresariales

## 🔄 Versionado

### Control de Versiones
- Cada plantilla tiene versión (`templateVersion`)
- Las configuraciones incluyen número de versión
- Se puede migrar entre versiones

### Compatibilidad
- Las versiones anteriores siguen funcionando
- Se notifica cuando hay actualizaciones disponibles
- Migración asistida entre versiones

## 🛠️ Troubleshooting

### Problemas Comunes

1. **Error al crear colecciones**
   - Verificar permisos de Firebase
   - Comprobar que el usuario es administrador
   - Revisar la configuración del equipo

2. **Plantillas no se cargan**
   - Verificar conexión a Firebase
   - Comprobar configuración de Firebase
   - Revisar logs del navegador

3. **Configuración no se guarda**
   - Verificar permisos de escritura
   - Comprobar estructura de datos
   - Verificar autenticación del usuario

### Logs y Debugging

```javascript
// Habilitar logs detallados
console.log('🎨 Template Config:', templateConfig);
console.log('📋 Selected Collections:', selectedCollections);
console.log('✅ Creation Results:', results);
```

## 📱 Responsive Design

### Adaptabilidad
- **Desktop:** Vista completa con sidebar
- **Tablet:** Vista adaptada con navegación colapsible
- **Mobile:** Vista de tarjetas apiladas

### Breakpoints
- `768px` - Cambio a vista móvil
- `480px` - Optimizaciones adicionales para móviles pequeños

---

## 🎯 Próximos Pasos

### Mejoras Planificadas
1. **Editor visual de esquemas** - Crear plantillas personalizadas
2. **Importación/Exportación** - Compartir configuraciones entre equipos
3. **Plantillas dinámicas** - Campos calculados y dependientes
4. **Validaciones avanzadas** - Reglas de negocio complejas
5. **Análisis de uso** - Dashboard de métricas avanzadas

### Integraciones Futuras
- Conexión con sistemas externos
- Sincronización con Notion
- Integración con Google Sheets
- API REST para terceros

---

**Desarrollado para CASIN Seguros - Sistema de Gestión Integral** 