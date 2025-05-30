# CASIN Seguros CRM - Guía de Navegación para Soporte

## Información General del Sistema

**CASIN Seguros CRM** es una aplicación web completa para gestión de seguros que incluye múltiples módulos especializados. La aplicación utiliza React con navegación por rutas y está optimizada para dispositivos móviles y de escritorio.

**URL Base**: `http://localhost:5173` (desarrollo)

---

## Estructura de Navegación Principal

### Barra de Navegación Superior
La aplicación cuenta con una barra superior fija que incluye:
- **Logo CASIN Seguros** (enlace al Dashboard)
- **Menú de navegación principal** con iconos
- **Sección de usuario** (email, contador de pólizas, logout, toggle tema)

### Módulos Principales Disponibles

#### 🏠 **Dashboard** (`/`)
**Propósito**: Panel principal con resumen ejecutivo
**Características**:
- **Clima**: Widget meteorológico en tiempo real
- **Cumpleaños de la Semana**: Lista de clientes/contactos con cumpleaños próximos
- **Vencimientos del Mes**: Pólizas que vencen en el mes actual
- **Actividad Reciente**: Log de acciones del sistema
- **Estadísticas Rápidas**: Contadores y métricas importantes

**Navegación**: Hacer clic en el logo o en el icono de casa

---

#### 📋 **Tareas** (`/tasks`)
**Propósito**: Gestión de tareas y actividades
**Características**:
- Lista de tareas pendientes
- Creación y edición de tareas
- Estados de progreso
- Asignación de responsables

---

#### 🗄️ **Data** (`/data`)
**Propósito**: Gestión central de datos y tablas
**Características**:
- **Vista de Tablas**: Listado de todas las tablas disponibles
- **Gestión de Datos**: CRUD completo para registros
- **Importación/Exportación**: Herramientas para manejo masivo de datos
- **Vista de Tarjetas**: Visualización alternativa de datos
- **Filtros Avanzados**: Búsqueda y filtrado por múltiples criterios

**Vistas Disponibles**:
- Vista de tabla tradicional
- Vista de tarjetas (cards)
- Vista de importación
- Gestión de columnas

---

#### 📊 **Reportes** (`/reports`)
**Propósito**: Análisis y reportería avanzada
**Características**:
- **Reportes de Vencimientos**: Análisis temporal de vencimientos de pólizas
- **Gráficos de Distribución**: Visualización por ramos y aseguradoras
- **Análisis Matricial**: Distribución cruzada de datos
- **Filtros Temporales**: 4 meses, 6 meses, año completo
- **Exportación**: Descarga de reportes en diferentes formatos

**Tipos de Gráficos**:
- Barras por período
- Distribución por ramo
- Análisis por aseguradora
- Tendencias temporales

---

#### 📁 **Drive** (`/drive`)
**Propósito**: Gestión de archivos y documentos
**Características**:
- Subida de archivos
- Organización por carpetas
- Compartir documentos
- Control de versiones
- Búsqueda de archivos

---

#### 🎂 **Cumpleaños** (`/birthdays`)
**Propósito**: Gestión de cumpleaños de clientes
**Características**:
- **Vista Semanal**: Cumpleaños de la semana actual
- **Vista Mensual**: Todos los cumpleaños del mes
- **Búsqueda**: Por nombre, fecha o rango
- **Detalles de Contacto**: Email, teléfono, edad
- **Exportación**: Lista para campañas de marketing

**Funcionalidades**:
- Filtro por semana/mes
- Búsqueda por nombre
- Información de contacto completa
- Cálculo automático de edad

---

#### 👥 **Directorio** (`/directorio`)
**Propósito**: Gestión completa de contactos y clientes
**Características Principales**:

##### **Vistas Disponibles**:
1. **Vista de Tarjetas** (`📋 Cards`):
   - Tarjetas visuales con información resumida
   - Foto/avatar del contacto
   - Información de contacto principal
   - Estado (Cliente/Prospecto)
   - Acciones rápidas

2. **Vista de Tabla** (`📊 Tabla`):
   - Tabla completa con todas las columnas
   - Paginación avanzada (25, 50, 100, 200 registros)
   - Ordenamiento por columnas
   - Filtros en tiempo real

3. **Vista de Relaciones** (`🔗 Relaciones`):
   - Análisis de relaciones entre contactos y pólizas
   - Estadísticas de matches
   - Distribución por tablas de pólizas

##### **Funcionalidades de Búsqueda y Filtros**:
- **Búsqueda General**: Por nombre, email, teléfono
- **Filtros por Estado**: Cliente, Prospecto, Todos
- **Filtros por Origen**: Fuente de adquisición
- **Filtros por Género**: Masculino, Femenino, Otros
- **Stats Cards Clickeables**: Funcionan como filtros rápidos

##### **Gestión de Contactos**:
- **Crear Nuevo Contacto**: Botón `+ Nuevo Contacto`
- **Editar Contacto**: Botón ✏️ en cada registro
- **Eliminar Contacto**: Botón 🗑️ con confirmación
- **Ver Pólizas**: Botón 📋 (solo para clientes)

##### **Modal de Pólizas**:
- **Nube de Texto**: Visualización de tipos de pólizas
- **Tarjetas Detalladas**: Información completa de cada póliza
- **Información Incluida**:
  - Número de póliza
  - Aseguradora
  - Fechas de vigencia
  - Montos (prima neta, total)
  - Forma de pago
  - RFC
  - Tipo de póliza

##### **Paginación Avanzada**:
- **Controles de Navegación**: Primera, Anterior, Siguiente, Última
- **Números de Página**: Con elipsis para rangos grandes
- **Salto Directo**: Campo para ir a página específica
- **Items por Página**: Selector de cantidad de registros
- **Información de Estado**: "Mostrando X-Y de Z contactos"

---

#### 🔍 **Prospección** (`/prospeccion`)
**Propósito**: Herramientas para prospección de clientes
**Características**:
- Identificación de prospectos
- Seguimiento de leads
- Conversión a clientes
- Análisis de oportunidades

---

#### 🏊 **Datapool** (`/datapool`)
**Propósito**: Pool central de datos
**Características**:
- Consolidación de información
- Limpieza de datos
- Normalización
- Validación de información

---

#### 📄 **PDF Parser** (`/pdf-parser`)
**Propósito**: Procesamiento de documentos PDF
**Características**:
- Extracción automática de datos
- Reconocimiento de pólizas
- Procesamiento de formularios
- Validación de información extraída

---

#### 🔗 **SharePoint** (`/sharepoint`)
**Propósito**: Integración con Microsoft SharePoint
**Características**:
- Sincronización de documentos
- Acceso a bibliotecas compartidas
- Colaboración en documentos
- Control de versiones

---

#### 🔥 **Firebase** (`/firebase`)
**Propósito**: Visualización de datos de Firebase
**Características**:
- Monitoreo de base de datos
- Visualización de colecciones
- Análisis de uso
- Gestión de usuarios

---

#### 🤖 **Test GPT** (`/test-gpt`)
**Propósito**: Herramientas de IA y testing
**Características**:
- Pruebas de funcionalidades de IA
- Procesamiento de lenguaje natural
- Automatización de tareas
- Análisis inteligente de datos

---

## Funcionalidades Transversales

### **Temas (Dark/Light Mode)**
- **Toggle**: Botón en la esquina superior derecha
- **Persistencia**: Se mantiene la preferencia entre sesiones
- **Iconos**: Sol (light) / Luna (dark)

### **Autenticación**
- **Login**: Sistema de autenticación (temporalmente desactivado)
- **Usuario Actual**: Se muestra el email en la barra superior
- **Logout**: Botón de salida en la barra superior

### **Responsive Design**
- **Mobile First**: Optimizado para dispositivos móviles
- **Breakpoints**: 768px (tablet), 1200px (desktop)
- **Navegación Móvil**: Menús colapsables en pantallas pequeñas

### **Notificaciones**
- **Toast Messages**: Notificaciones temporales en esquina superior derecha
- **Tipos**: Success (verde), Error (rojo), Warning (amarillo), Info (azul)
- **Duración**: 3-4 segundos automático

---

## Guía de Resolución de Problemas Comunes

### **Problemas de Navegación**
1. **Página no carga**: Verificar URL, refrescar navegador
2. **Menú no responde**: Verificar JavaScript habilitado
3. **Vista móvil incorrecta**: Verificar viewport y zoom del navegador

### **Problemas de Datos**
1. **Datos no aparecen**: Verificar conexión a internet y estado del servidor
2. **Filtros no funcionan**: Limpiar filtros y recargar página
3. **Búsqueda sin resultados**: Verificar términos de búsqueda y filtros activos

### **Problemas de Rendimiento**
1. **Carga lenta**: Reducir items por página en tablas grandes
2. **Navegación lenta**: Cerrar pestañas innecesarias del navegador
3. **Memoria alta**: Refrescar página periódicamente

### **Problemas de Visualización**
1. **Gráficos no aparecen**: Verificar JavaScript y refrescar
2. **Tablas desalineadas**: Ajustar zoom del navegador al 100%
3. **Modales no abren**: Verificar bloqueadores de pop-ups

---

## Atajos de Teclado y Navegación Rápida

### **Navegación General**
- **Ctrl + R**: Refrescar página actual
- **Ctrl + F**: Buscar en página
- **Esc**: Cerrar modales abiertos
- **Tab**: Navegar entre elementos

### **Directorio Específico**
- **Enter**: Confirmar búsqueda
- **Esc**: Limpiar filtros de búsqueda
- **Flechas**: Navegar en paginación

---

## Mejores Prácticas para Usuarios

### **Gestión de Datos**
1. **Siempre hacer backup** antes de operaciones masivas
2. **Usar filtros** para reducir carga de datos
3. **Verificar información** antes de guardar cambios
4. **Mantener datos actualizados** regularmente

### **Navegación Eficiente**
1. **Usar bookmarks** para secciones frecuentes
2. **Aprovechar filtros rápidos** en stats cards
3. **Utilizar búsqueda global** antes que filtros específicos
4. **Mantener sesión activa** para mejor rendimiento

### **Resolución de Problemas**
1. **Refrescar página** como primer paso
2. **Verificar filtros activos** si no aparecen datos esperados
3. **Usar vista de tabla** para datos detallados
4. **Usar vista de cards** para navegación visual

---

## Información Técnica para Soporte

### **Tecnologías Utilizadas**
- **Frontend**: React 18+ con React Router
- **Estilos**: CSS Modules + CSS Variables
- **Estado**: React Hooks (useState, useEffect)
- **Navegación**: React Router DOM
- **Notificaciones**: React Hot Toast
- **Temas**: Context API

### **Estructura de URLs**
- Base: `http://localhost:5173`
- Patrón: `/[modulo]`
- Parámetros: Query strings para filtros y paginación

### **Compatibilidad de Navegadores**
- **Chrome**: 90+ (Recomendado)
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### **Requisitos del Sistema**
- **RAM**: Mínimo 4GB
- **Conexión**: Banda ancha estable
- **JavaScript**: Habilitado obligatorio
- **Cookies**: Habilitadas para persistencia

---

## Contacto y Escalación

Para problemas que no puedan resolverse con esta guía:

1. **Nivel 1**: Reiniciar navegador y limpiar caché
2. **Nivel 2**: Verificar conectividad y estado del servidor
3. **Nivel 3**: Contactar al equipo de desarrollo con:
   - URL específica del problema
   - Pasos para reproducir
   - Navegador y versión
   - Capturas de pantalla si es posible

---

*Última actualización: Diciembre 2024*
*Versión del documento: 1.0* 