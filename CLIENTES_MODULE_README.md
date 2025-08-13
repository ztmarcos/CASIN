# 📋 Módulo de Clientes - CASIN CRM

## Descripción

El módulo de **Clientes** es un directorio unificado que extrae y consolida todos los nombres de contratante de todas las tablas de Firebase, agrupando las pólizas de un mismo cliente en una sola vista.

## 🎯 Funcionalidades Principales

### 1. **Extracción Unificada de Clientes**
- Extrae nombres de contratante de todas las colecciones de seguros
- Consolida duplicados basándose en normalización de nombres
- Agrupa todas las pólizas de un mismo cliente

### 2. **Normalización Inteligente de Nombres**
- Elimina acentos y caracteres especiales
- Normaliza espacios múltiples
- Remueve puntos y comas
- Permite identificar duplicados con variaciones menores

### 3. **Gestión de Pólizas por Cliente**
- Muestra todas las pólizas de cada cliente
- Calcula estadísticas por cliente (total de pólizas, primas, etc.)
- Identifica pólizas activas vs expiradas

### 4. **Búsqueda y Filtrado Avanzado**
- Búsqueda por nombre, número de póliza o aseguradora
- Filtrado por estado de pólizas (activas, expiradas, mixtas)
- Filtrado por ramo de seguro
- Ordenamiento por múltiples criterios

## 🏗️ Arquitectura

### Servicios

#### `firebaseClientesService.js`
Servicio principal que maneja toda la lógica de negocio:

```javascript
// Métodos principales
- getAllClients(forceRefresh = false)
- searchClients(searchTerm, limit = 50)
- getClientById(clientId)
- getClientStats()
- refreshCache()
```

#### `Clientes.jsx`
Componente React que proporciona la interfaz de usuario:

```javascript
// Características principales
- Vista de estadísticas generales
- Búsqueda y filtrado en tiempo real
- Vista expandible de detalles por cliente
- Diseño responsive
```

### Estructura de Datos

#### Cliente Consolidado
```javascript
{
  id: "nombre_normalizado",
  clientName: "Nombre Original del Cliente",
  normalizedName: "nombre normalizado del cliente",
  totalPolicies: 5,
  policies: [...], // Array de todas las pólizas
  collections: ["autos", "vida", "gmm"], // Tablas donde aparece
  activePolicies: 3,
  expiredPolicies: 2
}
```

#### Póliza Individual
```javascript
{
  id: "firebase_doc_id",
  tableName: "autos",
  clientName: "Nombre del Cliente",
  numero_poliza: "123456",
  aseguradora: "Qualitas",
  vigencia_inicio: "2024-01-01",
  vigencia_fin: "2025-01-01",
  prima_total: "5000.00",
  ramo: "Autos",
  // ... otros campos
}
```

## 🔧 Configuración

### Colecciones Soportadas
El módulo extrae datos de las siguientes colecciones:

- **autos**: `nombre_contratante`
- **vida**: `contratante`
- **gmm**: `contratante`, `nombre_del_asegurado`
- **hogar**: `contratante`
- **negocio**: `contratante`
- **diversos**: `contratante`
- **mascotas**: `contratante`
- **transporte**: `contratante`
- **rc**: `asegurado`
- **emant_caratula**: `contratante`
- **gruposvida**: `contratante`
- **gruposautos**: `contratante`

### Soporte Multi-Equipo
- **Equipo CASIN**: Usa colecciones directas
- **Otros equipos**: Usa prefijos `team_{teamId}_{collectionName}`

## 🚀 Uso

### Acceso al Módulo
1. Navegar a `/clientes` en la aplicación
2. El módulo se carga automáticamente con todos los clientes
3. Usar los filtros para buscar clientes específicos

### Funcionalidades de Usuario

#### Búsqueda
- Escribir en el campo de búsqueda para filtrar por nombre, póliza o aseguradora
- Los resultados se actualizan en tiempo real

#### Filtros
- **Estado**: Filtrar por pólizas activas, expiradas o mixtas
- **Ramo**: Filtrar por tipo de seguro específico
- **Ordenamiento**: Ordenar por nombre, número de pólizas, prima total, etc.

#### Vista de Cliente
- Hacer clic en un cliente para expandir sus detalles
- Ver todas las pólizas del cliente en tarjetas individuales
- Acceder a PDFs de pólizas si están disponibles

## 📊 Estadísticas

El módulo proporciona estadísticas generales:

- **Total de Clientes**: Número de clientes únicos
- **Total de Pólizas**: Suma de todas las pólizas
- **Pólizas Activas**: Pólizas vigentes
- **Pólizas Expiradas**: Pólizas vencidas

## 🔄 Cache y Rendimiento

### Sistema de Cache
- Cache de 5 minutos para evitar consultas repetidas
- Actualización manual disponible con botón "Actualizar"
- Cache automático por sesión

### Optimizaciones
- Consultas paginadas para grandes volúmenes
- Normalización de nombres para comparaciones eficientes
- Agrupación inteligente de duplicados

## 🧪 Testing

### Script de Prueba
Ejecutar `test-clientes-module.js` para verificar:

1. Extracción de clientes
2. Estadísticas generales
3. Búsqueda de clientes
4. Normalización de nombres
5. Resolución de nombres de colecciones

## 🔮 Futuras Mejoras

### Funcionalidades Planificadas
- [ ] Exportación a Excel/CSV
- [ ] Notificaciones de renovación
- [ ] Historial de cambios por cliente
- [ ] Integración con sistema de recordatorios
- [ ] Dashboard de analytics por cliente

### Optimizaciones Técnicas
- [ ] Cache distribuido
- [ ] Indexación avanzada
- [ ] Búsqueda fuzzy
- [ ] Sincronización en tiempo real

## 🐛 Solución de Problemas

### Problemas Comunes

#### No se cargan los clientes
- Verificar conexión a Firebase
- Revisar permisos de usuario
- Comprobar que las colecciones existan

#### Duplicados no se consolidan
- Verificar normalización de nombres
- Revisar campos de contratante en las colecciones
- Comprobar configuración de equipos

#### Rendimiento lento
- Verificar cache activo
- Revisar tamaño de las colecciones
- Considerar paginación para grandes volúmenes

## 📝 Notas de Desarrollo

### Convenciones de Código
- Usar camelCase para variables y métodos
- Comentarios en español para documentación
- Logs con emojis para fácil identificación
- Manejo de errores consistente

### Dependencias
- Firebase Firestore
- React Router
- React Hot Toast
- CSS Grid/Flexbox para layout

---

**Desarrollado para CASIN CRM v2.0.0**
