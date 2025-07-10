# 🔧 Fix DataTable - Columnas Personalizadas

## 🎯 **Problema Identificado**

DataTable no mostraba la columna `pago_parcial` aunque ColumnManager sí la detectaba correctamente.

### **Causa Raíz:**
DataTable estaba inferiendo las columnas solo desde los datos (`Object.keys(data[0])`) en lugar de obtener la estructura completa desde la API que incluye las columnas personalizadas.

## ✅ **Solución Implementada**

### **1. Actualización de Detección de Columnas**
```javascript
// ANTES - Solo desde datos
const newColumns = Object.keys(data[0]);

// DESPUÉS - API completa con fallback
const updateTableColumns = async () => {
  try {
    // Obtener estructura completa desde API
    const response = await fetch(`${API_URL}/data/tables/${tableName}/structure`);
    const structure = await response.json();
    const allColumns = structure.columns.map(col => col.name);
    setTableColumns(allColumns);
  } catch (error) {
    // Fallback a columnas de datos
    setTableColumns(Object.keys(data[0]));
  }
};
```

### **2. Listener para Actualizaciones de Estructura**
```javascript
// Escuchar cambios desde ColumnManager
window.addEventListener('tableStructureUpdated', handleTableStructureUpdate);
```

### **3. Dependencias del useEffect**
```javascript
// Agregar tableName como dependencia
}, [data, forceHighlightNext, tableName]);
```

## 🔄 **Flujo de Actualización**

1. **ColumnManager** agrega/modifica columna → Firebase metadata
2. **ColumnManager** dispara evento `tableStructureUpdated`
3. **DataTable** escucha evento y re-obtiene estructura desde API
4. **DataTable** actualiza `tableColumns` con estructura completa
5. **Columna aparece** en la tabla inmediatamente

## 🧪 **Cómo Verificar**

### **Paso 1: Verificar API**
```bash
curl "http://localhost:3001/api/data/tables/autos/structure" | grep "pago_parcial"
```

### **Paso 2: Verificar en UI**
1. Abrir DataSection → Seleccionar tabla "autos"
2. **ColumnManager**: Debe mostrar columna `pago_parcial`
3. **DataTable**: Debe mostrar columna `pago_parcial` en headers
4. Columna debe ser editable con doble-click

### **Paso 3: Agregar Nueva Columna**
1. ColumnManager → Botón `+` → Agregar nueva columna
2. **Resultado esperado**: Aparece inmediatamente en DataTable

## 📊 **Estado Actual**

- ✅ **ColumnManager**: Detecta todas las columnas (custom + normales)
- ✅ **DataTable**: Detecta todas las columnas (custom + normales)  
- ✅ **Sincronización**: Actualizaciones automáticas entre componentes
- ✅ **Fallback**: Si API falla, usa columnas de datos
- ✅ **Performance**: Solo actualiza cuando cambian las columnas

## 🔮 **Próximos Pasos**

1. **Probar** agregando nuevas columnas personalizadas
2. **Verificar** que aparezcan en Reports (solo en sección Pagos Parciales)
3. **Confirmar** que funcione en todas las tablas de seguros 