# 🧪 Guía de Pruebas - Columna "pago_parcial"

## 📋 **Resumen de Cambios Implementados**

### 1. **Script Firebase Ejecutado ✅**
- ✅ Script `add-pago-parcial-firebase.js` creado y ejecutado
- ✅ Columna `pago_parcial` agregada a **27 colecciones** en Firebase
- ✅ Metadatos almacenados en `table_metadata` collection

### 2. **Reports.jsx Corregido ✅**
- ✅ Error `nextPaymentDate.getMonth is not a function` arreglado
- ✅ Columna `pago_parcial` aparece **solo en sección "Pagos Parciales"**
- ✅ Integrada en tabla y tarjetas expandidas de Reports

### 3. **DataSection.jsx Actualizado ✅**
- ✅ Ahora obtiene estructura completa desde API (incluye columnas custom)
- ✅ Fallback a inferencia si API falla
- ✅ Compatible con sistema de metadatos de Firebase

## 🔧 **Cómo Probar**

### **Paso 1: Verificar Reports**
1. **Abrir** `http://localhost:5174`
2. **Navegar** a "Reports" 
3. **Cambiar** tipo de reporte a **"Pagos Parciales"**
4. **Verificar** que aparece columna "Pago Parcial" en la tabla
5. **Expandir** una tarjeta → debe mostrar "Pago Parcial" en sección de pagos

### **Paso 2: Verificar DataSection**
1. **Navegar** a "DataSection"
2. **Seleccionar** tabla "autos" 
3. **Verificar** que columna "pago_parcial" aparece al final
4. **Hacer scroll horizontal** si es necesario
5. **Doble clic** en celda para editar

### **Paso 3: Verificar API**
```bash
# Verificar estructura de tabla
curl -s "http://localhost:3001/api/data/tables/autos/structure" | grep pago_parcial

# Respuesta esperada:
# {"name":"pago_parcial","type":"DECIMAL","nullable":true,"key":"","default":null,"isCustom":true}
```

### **Paso 4: Verificar ColumnManager**
1. En **DataSection** con tabla seleccionada
2. **Clic** en botón ⚙️ (ColumnManager)
3. **Verificar** que "pago_parcial" aparece en la lista
4. **Configurar** orden, etiquetas, etc.

## 🐛 **Troubleshooting**

### **Problema: Columna no aparece en DataSection**
```bash
# 1. Verificar que el script se ejecutó correctamente
node scripts/add-pago-parcial-firebase.js check

# 2. Verificar API response
curl "http://localhost:3001/api/data/tables/autos/structure"

# 3. Verificar logs en consola del navegador
# Buscar: "🔧 Got table structure from API"
```

### **Problema: Error en Reports**
```bash
# Verificar que no hay errores de JavaScript
# Buscar en consola: "nextPaymentDate.getMonth is not a function"
```

### **Problema: Columna aparece en todas las secciones de Reports**
- **Verificación**: La columna debe aparecer SOLO en "Pagos Parciales"
- **Solución**: Verificar que las condiciones `selectedType === 'Pagos Parciales'` estén funcionando

## 📊 **Estados Esperados**

### **Reports - Sección "Vencimientos":**
```
┌─────────────────────────────────────────────┐
│ Ramo │ Póliza │ Contratante │ Prima Total │
├─────────────────────────────────────────────┤
│ Auto │ 12345  │ Juan Pérez  │ $12,000     │
└─────────────────────────────────────────────┘
```

### **Reports - Sección "Pagos Parciales":**
```
┌──────────────────────────────────────────────────────────┐
│ Ramo │ Póliza │ Contratante │ Prima Total │ Pago Parcial │
├──────────────────────────────────────────────────────────┤
│ Auto │ 12345  │ Juan Pérez  │ $12,000     │ $6,000       │
└──────────────────────────────────────────────────────────┘
```

### **DataSection - Tabla "autos":**
```
┌─────────────────────────────────────────────────────────────┐
│ id │ nombre │ poliza │ ... │ test_column │ pago_parcial    │
├─────────────────────────────────────────────────────────────┤
│ 1  │ Juan   │ 12345  │ ... │ test        │ [editable cell] │
└─────────────────────────────────────────────────────────────┘
```

## ✅ **Checklist de Verificación**

- [ ] Script ejecutado sin errores
- [ ] Reports funciona sin errores JavaScript  
- [ ] Columna aparece solo en "Pagos Parciales" en Reports
- [ ] Columna aparece en DataSection para tabla "autos"
- [ ] Columna es editable en DataSection
- [ ] ColumnManager muestra la columna
- [ ] API devuelve columna con `"isCustom": true`

## 🚀 **Próximos Pasos**

1. **Entrenar usuarios** sobre la nueva columna
2. **Comenzar a capturar** datos de pagos parciales
3. **Crear reportes** específicos si se necesitan
4. **Considerar validaciones** (pago_parcial ≤ prima_total)

---

**✅ Implementación completada**  
**📅 Fecha:** 10/07/2024  
**🎯 Objetivo:** Columna pago_parcial funcional en Reports y DataSection 