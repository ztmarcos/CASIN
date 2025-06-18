# 📱 Guía de Funcionalidad Offline - CASIN Insurance CRM

## Descripción General

Este sistema implementa una funcionalidad **offline-first** completa que permite a la aplicación trabajar sin conexión a internet, manteniendo la sincronización automática cuando la conexión se restaura. Utiliza las mejores prácticas para aplicaciones web progresivas (PWA).

## 🏗️ Arquitectura del Sistema

### Componentes Principales

1. **OfflineStorageService** (`/services/offlineStorageService.js`)
   - Maneja IndexedDB para almacenamiento local
   - Gestiona la cola de sincronización
   - Monitorea estado online/offline

2. **HybridDataService** (`/services/hybridDataService.js`)
   - Integra operaciones online (Firebase/API) y offline (IndexedDB)
   - Maneja sincronización automática
   - Proporciona fallback automático

3. **useOfflineData Hook** (`/hooks/useOfflineData.js`)
   - Hook de React para fácil integración
   - Estado reactivo de conexión
   - Operaciones CRUD optimistas

4. **SyncStatus Component** (`/components/SyncStatus/`)
   - Indicador visual de estado
   - Panel de información detallada
   - Controles de sincronización manual

## 🚀 Funcionalidades

### ✅ Disponibles
- ✅ Almacenamiento local automático con IndexedDB
- ✅ Sincronización automática al restaurar conexión
- ✅ Cola de operaciones offline con reintentos
- ✅ Indicadores visuales de estado de conexión
- ✅ Búsqueda offline en todos los datos
- ✅ Operaciones CRUD optimistas
- ✅ Manejo de conflictos básico
- ✅ Integración con Firebase y APIs existentes
- ✅ Hooks React personalizados
- ✅ Componentes de estado visual

## 📋 Implementación

### 1. Configuración Básica

```javascript
// En tu componente principal
import { useDirectorioData } from '../hooks/useOfflineData';

const MyComponent = () => {
  const {
    data,
    loading,
    error,
    isOnline,
    createItem,
    updateItem,
    deleteItem,
    searchItems
  } = useDirectorioData();

  // Tu componente funciona automáticamente offline/online
};
```

### 2. Tipos de Datos Soportados

```javascript
// Hooks especializados disponibles
import {
  useDirectorioData,    // Contactos del directorio
  useTablesData,        // Tablas dinámicas
  useBirthdaysData,     // Cumpleaños
  useReportsData,       // Reportes
  useTableData,         // Datos de tabla específica
  useConnectionStatus   // Solo estado de conexión
} from '../hooks/useOfflineData';
```

### 3. Operaciones CRUD

```javascript
const ContactManager = () => {
  const { createItem, updateItem, deleteItem } = useDirectorioData();

  // Crear - funciona online y offline
  const handleCreate = async (contactData) => {
    try {
      await createItem(contactData);
      // Se guarda localmente y se sincroniza cuando hay conexión
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Actualizar - optimista, se actualiza UI inmediatamente
  const handleUpdate = async (id, changes) => {
    await updateItem(id, changes);
  };

  // Eliminar - soft delete local, hard delete en sync
  const handleDelete = async (id) => {
    await deleteItem(id);
  };
};
```

### 4. Búsqueda Offline

```javascript
const SearchComponent = () => {
  const { searchItems } = useDirectorioData();

  const handleSearch = async (searchTerm) => {
    const results = await searchItems(searchTerm);
    // Busca en datos locales, funciona offline
    return results;
  };
};
```

### 5. Indicadores de Estado

```javascript
import SyncStatus, { SyncStatusMini } from '../components/SyncStatus/SyncStatus';

// Indicador completo con dropdown
<SyncStatus showDetails={true} />

// Indicador mini para navbar
<SyncStatusMini />
```

## 📱 Demo y Pruebas

### Acceder al Demo
Visita `/offline-demo` en la aplicación para ver una demostración completa.

### Cómo Probar Offline

1. **Modo Online Normal:**
   - Usa la aplicación normalmente
   - Los datos se sincronizan automáticamente

2. **Simular Modo Offline:**
   - Abre DevTools (F12)
   - Ve a la pestaña "Network"
   - Marca la casilla "Offline"

3. **Operaciones Offline:**
   - Crea, edita, elimina datos
   - Los cambios se guardan localmente
   - Verás indicadores de "pendiente de sync"

4. **Restaurar Conexión:**
   - Desmarca "Offline" en DevTools
   - Los cambios se sincronizan automáticamente
   - Los indicadores se actualizan

## 🔧 Configuración Avanzada

### Personalizar Stores de IndexedDB

```javascript
// En offlineStorageService.js, modifica el array stores:
this.stores = [
  'tables',
  'directorio',
  'birthdays',
  'policies',
  'reports',
  'tasks',
  'mi_nuevo_store',  // Agregar nuevo store
  'sync_queue',
  'metadata'
];
```

### Integrar con Nuevos Endpoints

```javascript
// En hybridDataService.js, agregar nueva función:
async getMiNuevosDatos() {
  try {
    if (this.isOnline) {
      const onlineData = await this.miApiService.getData();
      await this.updateLocalStorageFromOnlineData('mi_store', onlineData);
      return onlineData;
    } else {
      return await this.offlineStorage.read('mi_store');
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

### Crear Hook Personalizado

```javascript
// En useOfflineData.js:
export const useMisDatos = () => useOfflineData('mi_store');
```

## 📊 Monitoreo y Debug

### Información de Conexión

```javascript
const { connectionInfo } = useConnectionStatus();

console.log({
  isOnline: connectionInfo.isOnline,
  lastSync: connectionInfo.storageInfo.lastSyncTime,
  pendingOps: connectionInfo.storageInfo.queuedOperations,
  stores: connectionInfo.storageInfo.stores
});
```

### Estados de Sincronización

- **`synced`**: Datos sincronizados con el servidor
- **`syncing`**: Sincronización en progreso
- **`offline`**: Datos guardados localmente, pendientes de sync
- **`error`**: Error en la sincronización
- **`pending`**: Operación en cola para sincronizar

## 🛠️ Resolución de Problemas

### Problemas Comunes

1. **IndexedDB no funciona:**
   - Verifica que el navegador soporte IndexedDB
   - Revisa permisos de almacenamiento

2. **Sincronización falló:**
   - Verifica conexión a internet
   - Revisa logs de la consola
   - Usa el botón "Force Sync"

3. **Datos inconsistentes:**
   - Limpia el almacenamiento local
   - Usa `hybridDataService.clearAllLocalData()`

### Comandos de Debug

```javascript
// En la consola del navegador:

// Ver estado completo
hybridDataService.getConnectionStatus()

// Forzar sincronización
hybridDataService.forceSyncAll()

// Limpiar datos locales
hybridDataService.clearAllLocalData()

// Ver información de almacenamiento
offlineStorage.getStorageInfo()
```

## 🔮 Próximas Mejoras

### Funcionalidades Planeadas
- [ ] Resolución de conflictos avanzada
- [ ] Sincronización diferencial (solo cambios)
- [ ] Compresión de datos locales
- [ ] Exportación de datos offline
- [ ] Configuración de políticas de almacenamiento
- [ ] Sincronización en background con Service Workers
- [ ] Notificaciones push para cambios importantes

### Optimizaciones
- [ ] Lazy loading de datos
- [ ] Paginación offline
- [ ] Cache inteligente con TTL
- [ ] Compresión de cola de sincronización

## 📚 Referencias

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Best Practices](https://web.dev/pwa/)
- [Offline First Design](https://offlinefirst.org/)

## 🤝 Contribuir

Para agregar nuevas funcionalidades offline:

1. Identifica el tipo de datos
2. Agrega el store en `OfflineStorageService`
3. Implementa métodos en `HybridDataService`
4. Crea hook específico en `useOfflineData`
5. Actualiza componentes existentes
6. Agrega tests y documentación

---

**Nota:** Esta implementación sigue las mejores prácticas para aplicaciones offline-first y está diseñada para ser escalable y mantenible. 