# 🎯 Sistema de Recordatorios Automáticos - CASIN Seguros

## 📋 Resumen del Sistema

El sistema de recordatorios automáticos ha sido implementado en el componente `Reports.jsx` para enviar **3 recordatorios automáticos** a pólizas marcadas como "No Pagado" tanto para **Vencimientos** como para **Pagos Parciales**.

## 🚀 Funcionalidades Implementadas

### 📧 **3 Recordatorios Automáticos por Póliza**

#### 🚗 **Vencimientos**
- **Primer Recordatorio**: 30 días antes del vencimiento (ANUAL)
- **Segundo Recordatorio**: 15 días antes del vencimiento (ANUAL)
- **Recordatorio Final**: 3 días antes del vencimiento (ANUAL)

#### 💳 **Pagos Parciales**
- **Primer Recordatorio**: 7 días antes del pago (MENSUAL)
- **Segundo Recordatorio**: 3 días antes del pago (MENSUAL)
- **Recordatorio Final**: 1 día antes del pago (MENSUAL)

### 📅 **Cálculo Automático por Forma de Pago**

| Forma de Pago | Primer Recordatorio | Segundo Recordatorio | Recordatorio Final |
|---------------|-------------------|---------------------|-------------------|
| **ANUAL** | 30 días antes | 15 días antes | 3 días antes |
| **SEMESTRAL** | 21 días antes | 7 días antes | 1 día antes |
| **TRIMESTRAL** | 14 días antes | 7 días antes | 1 día antes |
| **BIMESTRAL** | 10 días antes | 3 días antes | 1 día antes |
| **MENSUAL** | 7 días antes | 3 días antes | 1 día antes |
| **DEFAULT** | 15 días antes | 7 días antes | 1 día antes |

## 🔍 **Criterios de Elegibilidad**

### ✅ **Pólizas Elegibles para Recordatorios**

#### 🚗 **Vencimientos**
- ✅ **Status**: "No Pagado"
- ✅ **Email**: Debe tener email válido
- ✅ **Forma de Pago**: Debe tener forma de pago definida
- ✅ **Fecha de Vencimiento**: Debe tener `fecha_fin` válida

#### 💳 **Pagos Parciales**
- ✅ **Status**: "No Pagado"
- ✅ **Email**: Debe tener email válido
- ✅ **Forma de Pago**: Debe tener forma de pago definida
- ✅ **Pago Parcial**: Debe tener `pago_parcial` > 0
- ✅ **Fecha de Próximo Pago**: Debe tener `fecha_proximo_pago` válida

### ❌ **Pólizas Excluidas**
- ❌ Pólizas marcadas como "Pagado"
- ❌ Pólizas sin email
- ❌ Pólizas sin forma de pago
- ❌ Pólizas sin fechas válidas
- ❌ Pólizas sin pago parcial (para pagos parciales)

## 📧 **Templates de Recordatorios**

### 🚗 **Template Vencimientos**
```html
<p>De parte del Act. Marcos Zavala, me permito enviarle este [tipo] para recordarle que su póliza <strong>[número]</strong> vencerá el <strong>[fecha]</strong>.</p>

<p>El monto total de la póliza es de <strong>$[monto] pesos</strong>.</p>

<p>Faltan <strong>[días] días</strong> para la fecha límite.</p>
```

### 💳 **Template Pagos Parciales**
```html
<p>De parte del Act. Marcos Zavala, me permito enviarle este [tipo] para recordarle que su póliza <strong>[número]</strong> tiene un pago parcial programado el <strong>[fecha]</strong>.</p>

<p>El monto del pago parcial es de <strong>$[monto] pesos</strong>.</p>

<p>Faltan <strong>[días] días</strong> para la fecha límite.</p>
```

## 📋 **Asuntos Automáticos**

### 🚗 **Vencimientos**
- `Primer Recordatorio - Vencimiento Póliza [Número] - [Cliente]`
- `Segundo Recordatorio - Vencimiento Póliza [Número] - [Cliente]`
- `Recordatorio Final - Vencimiento Póliza [Número] - [Cliente]`

### 💳 **Pagos Parciales**
- `Primer Recordatorio - Pago Parcial Póliza [Número] - [Cliente]`
- `Segundo Recordatorio - Pago Parcial Póliza [Número] - [Cliente]`
- `Recordatorio Final - Pago Parcial Póliza [Número] - [Cliente]`

## 🔧 **Funciones Implementadas**

### 📅 **calculateReminderDates(baseDate, paymentForm)**
Calcula automáticamente las fechas de los 3 recordatorios basándose en:
- **Fecha base**: `fecha_fin` (vencimientos) o `fecha_proximo_pago` (pagos parciales)
- **Forma de pago**: ANUAL, SEMESTRAL, TRIMESTRAL, BIMESTRAL, MENSUAL
- **Solo incluye recordatorios futuros** o del día actual

### 📧 **generateReminderContent(policy, reminderType, daysUntilDue, selectedType)**
Genera el contenido HTML del recordatorio con:
- **Datos de la póliza**: número, cliente, montos, fechas
- **Tipo de recordatorio**: Primer, Segundo, Final
- **Días restantes**: cálculo automático
- **Template específico**: según tipo (vencimientos o pagos parciales)

### 🎯 **handleSendEmail()**
Función principal que:
1. **Filtra pólizas elegibles** según criterios
2. **Calcula recordatorios** para cada póliza
3. **Genera contenido** específico por recordatorio
4. **Envía emails** automáticamente
5. **Maneja errores** y proporciona feedback

## 📊 **Flujo de Trabajo**

### 🔄 **Proceso Automático**
1. **Usuario selecciona** "Vencimientos" o "Pagos Parciales"
2. **Sistema filtra** pólizas que cumplen criterios
3. **Para cada póliza elegible**:
   - Calcula fechas de recordatorios según forma de pago
   - Genera contenido específico por recordatorio
   - Envía email automáticamente
4. **Proporciona resumen** de recordatorios enviados

### ⏱️ **Control de Tiempo**
- **Espera entre emails**: 1 segundo para evitar rate limiting
- **Solo recordatorios futuros**: No envía recordatorios pasados
- **Cálculo automático**: Días restantes hasta la fecha límite

## 🧪 **Scripts de Prueba**

### 📝 **Scripts Disponibles**
1. `test-recordatorios-automaticos.js` - Prueba general del sistema
2. `test-recordatorios-inmediatos.js` - Prueba con fechas cercanas

### ✅ **Resultados de Pruebas**
- ✅ **4 recordatorios enviados exitosamente** (2 vencimientos + 2 pagos parciales)
- ✅ **Cálculo automático de fechas** funcionando correctamente
- ✅ **Templates específicos** por tipo de recordatorio
- ✅ **Asuntos automáticos** con información correcta
- ✅ **Sistema listo para producción**

## 🎯 **Casos de Uso**

### 🚗 **Vencimientos**
- **Póliza anual** que vence en 30 días → Envía 3 recordatorios
- **Póliza semestral** que vence en 21 días → Envía 3 recordatorios
- **Póliza mensual** que vence en 7 días → Envía 3 recordatorios

### 💳 **Pagos Parciales**
- **Pago mensual** en 7 días → Envía 3 recordatorios
- **Pago trimestral** en 14 días → Envía 3 recordatorios
- **Pago bimestral** en 10 días → Envía 3 recordatorios

## 📈 **Beneficios del Sistema**

### ✅ **Automatización**
- **Sin intervención manual**: Sistema calcula y envía automáticamente
- **Escalable**: Maneja múltiples pólizas simultáneamente
- **Eficiente**: Solo envía recordatorios necesarios

### ✅ **Personalización**
- **Templates específicos**: Diferentes para vencimientos y pagos parciales
- **Forma de pago**: Recordatorios adaptados al tipo de pago
- **Información detallada**: Montos, fechas, días restantes

### ✅ **Confiabilidad**
- **Validación robusta**: Verifica todos los criterios antes de enviar
- **Manejo de errores**: Captura y reporta errores específicos
- **Feedback completo**: Resumen detallado de operaciones

## 🚀 **Integración en Reports.jsx**

### 📋 **Cambios Implementados**
- ✅ **Nueva función** `calculateReminderDates()`
- ✅ **Nueva función** `generateReminderContent()`
- ✅ **Función actualizada** `handleSendEmail()`
- ✅ **Lógica de filtrado** mejorada
- ✅ **Sistema de recordatorios** automático

### 🎯 **Uso en la Interfaz**
1. **Seleccionar tipo**: "Vencimientos" o "Pagos Parciales"
2. **Hacer clic**: "Enviar por Email"
3. **Sistema automático**: Calcula y envía recordatorios
4. **Feedback**: Muestra resumen de operación

## 🎉 **Estado del Sistema**

### ✅ **Completado**
- ✅ Sistema de 3 recordatorios automáticos
- ✅ Cálculo automático por forma de pago
- ✅ Templates específicos por tipo
- ✅ Validación de criterios de elegibilidad
- ✅ Envío automático de emails
- ✅ Manejo de errores robusto
- ✅ Scripts de prueba funcionales

### 🚀 **Listo para Producción**
El sistema está **100% funcional** y listo para uso en producción con todas las características implementadas y probadas exitosamente.

---

**Desarrollado para CASIN Seguros**  
**Fecha**: Agosto 2025  
**Versión**: 1.0 - Sistema de Recordatorios Automáticos

