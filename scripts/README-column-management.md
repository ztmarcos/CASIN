# 🛠️ Sistema de Gestión de Columnas en Firebase

## 📋 **Resumen del Sistema**

Tu aplicación utiliza un sistema híbrido de gestión de base de datos:

- **Local (MySQL)**: Modificaciones reales de esquema de base de datos
- **Producción (Firebase)**: Sistema de metadatos virtuales para gestión de columnas

## 🔧 **Cómo Funciona en Firebase**

### **Arquitectura de Metadatos:**

```javascript
// Colección: table_metadata
// Documento: {nombreTabla}
{
  customColumns: [
    {
      name: "pago_parcial",
      type: "DECIMAL", 
      addedAt: "2024-01-15T10:30:00Z",
      description: "Monto de pago parcial"
    }
  ],
  hiddenColumns: ["campo_obsoleto"],
  columnMappings: {
    "nombre_viejo": "nombre_nuevo"
  },
  columnOrder: ["id", "nombre", "pago_parcial"],
  updatedAt: "2024-01-15T10:30:00Z"
}
```

### **Flujo de Trabajo:**

1. **Agregar Columna**: Se guarda en `customColumns` del documento de metadatos
2. **Visualización**: El frontend lee metadatos y muestra columnas virtuales
3. **Edición**: Los valores se pueden editar normalmente en la interfaz
4. **Persistencia**: Los datos se guardan en los documentos de Firebase

## 🚀 **Script de Gestión: add-pago-parcial-firebase.js**

### **Comandos Disponibles:**

```bash
# Agregar columna "pago_parcial" a todas las tablas
node scripts/add-pago-parcial-firebase.js add

# Verificar estado actual
node scripts/add-pago-parcial-firebase.js check  

# Remover la columna (revertir)
node scripts/add-pago-parcial-firebase.js remove
```

### **Qué Hace el Script:**

1. **Conecta a Firebase** usando las credenciales de servicio
2. **Escanea todas las colecciones** de la base de datos
3. **Filtra colecciones relevantes** (seguros, contactos, etc.)
4. **Agrega metadatos** para la nueva columna en cada tabla
5. **Reporta resultados** con estadísticas completas

### **Ejemplo de Ejecución:**

```bash
$ node scripts/add-pago-parcial-firebase.js add

🚀 Iniciando proceso para agregar columna "pago_parcial" a todas las tablas...
📋 Colecciones encontradas: ['autos', 'vida', 'gmm', 'directorio_contactos']
🎯 Colecciones objetivo: ['autos', 'vida', 'gmm', 'directorio_contactos']

📊 Procesando colección: autos
✨ Creando nuevos metadatos para autos
✅ Columna "pago_parcial" agregada exitosamente a autos

📊 Procesando colección: vida  
✅ Columna "pago_parcial" agregada exitosamente a vida

🎉 Proceso completado!
✅ Exitosos: 4
❌ Errores: 0
```

## 🔍 **Sistema Actual de Administración**

### **Desde la Interfaz Web:**

1. **DataSection** → Seleccionar tabla → **ColumnManager**
2. **Botón "+"** → Agregar nueva columna
3. **Especificar nombre y tipo** → Confirmar
4. **Columna aparece inmediatamente** en la vista de tabla

### **Endpoints de API Disponibles:**

```javascript
// Agregar columna
POST /api/tables/:tableName/columns/add
{
  "name": "pago_parcial",
  "type": "DECIMAL"
}

// Renombrar columna  
PATCH /api/data/tables/:tableName/columns/:columnName/rename
{
  "newName": "nuevo_nombre"
}

// Eliminar columna (ocultar)
DELETE /api/tables/:tableName/columns/:columnName

// Establecer orden de columnas
PUT /api/tables/:tableName/columns/order
{
  "columnOrder": ["id", "nombre", "pago_parcial"]
}
```

## 📊 **Colecciones Afectadas por el Script**

El script agregará `pago_parcial` a estas colecciones:

- **autos** - Seguros de autos
- **vida** - Seguros de vida  
- **gmm** - Gastos médicos mayores
- **hogar** - Seguros de hogar
- **rc** - Responsabilidad civil
- **transporte** - Seguros de transporte
- **mascotas** - Seguros de mascotas
- **diversos** - Seguros diversos
- **negocio** - Seguros de negocio  
- **gruposgmm** - Grupos GMM
- **directorio_contactos** - Directorio de contactos

## ⚠️ **Consideraciones Importantes**

### **Para Firebase (Producción):**
- ✅ **Seguro**: Solo modifica metadatos, no altera documentos existentes
- ✅ **Reversible**: Se puede deshacer completamente
- ✅ **Inmediato**: Los cambios aparecen al instante en la interfaz
- ✅ **No destructivo**: No afecta datos existentes

### **Para MySQL (Local):**
- ⚠️ **Modifica esquema real** de la base de datos
- ⚠️ **Requiere respaldo** antes de ejecutar
- ⚠️ **Irreversible** sin restaurar respaldo

## 🎯 **Próximos Pasos Después del Script**

1. **Ejecutar el script** para agregar la columna
2. **Verificar en la interfaz** que aparece en todas las tablas
3. **Comenzar a usar** la columna en Reports para pagos parciales
4. **Entrenar usuarios** sobre el nuevo campo disponible

## 🔄 **Mantenimiento Futuro**

Para agregar más columnas globalmente:

1. **Duplicar y modificar** el script existente
2. **Cambiar el nombre** de la nueva columna  
3. **Ajustar el tipo** según necesidades
4. **Ejecutar y verificar** resultados

## 🆘 **Solución de Problemas**

### **Error de Conexión Firebase:**
```bash
# Verificar que existe el archivo de credenciales
ls frontend/firebase-service-account.json

# Verificar permisos
chmod 600 frontend/firebase-service-account.json
```

### **Error "Collection not found":**
```bash
# Ejecutar primero el comando check
node scripts/add-pago-parcial-firebase.js check
```

### **Revertir Cambios:**
```bash
# Usar el comando remove
node scripts/add-pago-parcial-firebase.js remove
``` 