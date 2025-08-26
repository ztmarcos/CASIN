# Detección Automática de Tipo de Póliza en TableMail - V2

## 🎯 Funcionalidad Mejorada

El componente `TableMail` ahora incluye una **detección automática mejorada** del tipo de póliza con logging detallado para debugging.

## 🔍 Criterios de Detección (Prioridades)

### 🥇 **Prioridad 1: Tipo de Tabla** (Más Confiable)
Si se proporciona `tableType`, se usa como prioridad principal:
```javascript
const tableTypeMap = {
  'vida': 'vida',
  'life': 'vida',
  'gmm': 'gmm',
  'gastos médicos': 'gmm',
  'médicos': 'gmm',
  'hogar': 'hogar',
  'casa': 'hogar',
  'vivienda': 'hogar',
  'mascotas': 'mascotas',
  'mascota': 'mascotas',
  'pet': 'mascotas',
  'negocio': 'negocio',
  'empresa': 'negocio',
  'comercial': 'negocio',
  'rc': 'rc',
  'responsabilidad civil': 'rc',
  'transporte': 'transporte',
  'carga': 'transporte',
  'autos': 'autos',
  'auto': 'autos',
  'vehículo': 'autos',
  'carro': 'autos'
};
```

### 🥈 **Prioridad 2: Campos Específicos de Autos** (Muy Confiable)
```javascript
const autoFields = [
  'descripcion_del_vehiculo', 'modelo', 'placas', 'marca', 'serie',
  'anio', 'color', 'numero_motor', 'numero_serie', 'tipo_vehiculo'
];
```

### 🥉 **Prioridad 3: Campo Ramo** (Muy Confiable)
Análisis del campo `ramo` con mapeo específico.

### 4️⃣ **Prioridad 4: Campo Tipo Póliza** (Confiable)
Análisis del campo `tipo_poliza` con mapeo específico.

### 5️⃣ **Prioridad 5: Aseguradora** (Menos Confiable)
Solo palabras muy específicas para evitar falsos positivos:
- `gastos médicos mayores` o `gmm` → GMM
- `mascotas` o `pet` → Mascotas
- `transporte` o `carga` → Transporte
- `responsabilidad civil` o `rc` → RC

### 6️⃣ **Prioridad 6: Lógica de Vida** (Último Recurso)
Solo si tiene `contratante` Y NO tiene campos de auto, ramo o tipo_poliza.

## 📅 Detección Nueva vs Renovación

Se basa en las fechas de vigencia:
- **Nueva**: Vigencia inicia en el futuro o en los últimos 30 días
- **Renovación**: Vigencia inició hace más de 30 días

## 🐛 Logging Detallado

Ahora incluye logging completo para debugging:

```javascript
console.log('🔍 Iniciando detección de tipo de póliza...');
console.log('📊 Datos recibidos:', data);
console.log('🏷️ Tipo de tabla:', tableType);
console.log('📅 Análisis de fechas:', { vigencia_inicio, startDate, today, isNew });
console.log('🚗 Analizando campos de auto:', { foundAutoFields, hasAutoFields });
console.log('📋 Analizando campo ramo:', data.ramo);
console.log('🏷️ Analizando campo tipo_poliza:', data.tipo_poliza);
console.log('🏢 Analizando aseguradora:', data.aseguradora);
```

## 🎨 Indicador Visual

El modal muestra un badge verde con animación que indica:
- 🔍 Tipo detectado automáticamente
- 📋 Tipo de tabla (si está disponible)
- ✨ Animación pulsante para llamar la atención

## 🚀 Uso

```jsx
<TableMail 
  isOpen={mailModal.isOpen}
  onClose={handleCloseMailModal}
  rowData={mailModal.rowData}
  tableType={tableName} // Nuevo: tipo de tabla actual
/>
```

## 📊 Ejemplos de Detección Mejorada

### Ejemplo 1: Tabla de Vida
```javascript
// tableType = "vida"
// rowData = { contratante: "Juan Pérez", numero_poliza: "12345" }
// Resultado: "nueva_vida" o "renovacion_vida"
// Log: ✅ Coincidencia encontrada en tipo de tabla: vida → vida
```

### Ejemplo 2: Datos de Auto
```javascript
// rowData = { 
//   descripcion_del_vehiculo: "Toyota Corolla",
//   modelo: "2023",
//   vigencia_inicio: "2024-01-01"
// }
// Resultado: "nueva_autos"
// Log: ✅ Campos de auto encontrados, detectando como autos
```

### Ejemplo 3: Campo Ramo Específico
```javascript
// rowData = { 
//   ramo: "Gastos Médicos Mayores",
//   vigencia_inicio: "2023-06-01"
// }
// Resultado: "renovacion_gmm"
// Log: ✅ Coincidencia encontrada en ramo: gastos médicos mayores → gmm
```

## 🔧 Mejoras Implementadas

### ✅ **Reducción de Falsos Positivos**
- Eliminada detección por número de póliza (muy propensa a errores)
- Aseguradora solo detecta palabras muy específicas
- Lógica de vida más restrictiva

### ✅ **Prioridades Claras**
- Tipo de tabla como prioridad máxima
- Campos específicos de autos como segunda prioridad
- Campo ramo como tercera prioridad

### ✅ **Logging Detallado**
- Cada paso de la detección se registra
- Fácil debugging de problemas
- Información clara sobre decisiones tomadas

### ✅ **Mapeo Específico**
- Mapeos separados para cada tipo de campo
- Coincidencias más precisas
- Menos ambigüedad

## 🎯 Beneficios

- ✅ **Precisión mejorada**: Menos falsos positivos
- ✅ **Debugging fácil**: Logging detallado
- ✅ **Flexibilidad**: Permite cambios manuales
- ✅ **UX mejorada**: Indicador visual claro
- ✅ **Adaptabilidad**: Se adapta al contexto de la tabla actual
- ✅ **Mantenibilidad**: Código más claro y organizado

## 🐛 Troubleshooting

Si la detección no funciona correctamente:

1. **Revisar logs en consola** para ver qué criterios se están evaluando
2. **Verificar el tipo de tabla** que se está pasando
3. **Comprobar los campos** disponibles en los datos
4. **Ajustar manualmente** el tipo si es necesario
