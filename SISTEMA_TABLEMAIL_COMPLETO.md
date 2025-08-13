# 🎯 Sistema TableMail Completo - CASIN Seguros

## 📋 Resumen del Sistema

El sistema TableMail ha sido completamente actualizado para incluir **dos versiones de correo** para cada ramo: **Nueva Póliza** y **Renovación**, con templates específicos que jalan automáticamente los datos de la póliza.

## 🚀 Funcionalidades Implementadas

### 📧 Dos Versiones de Correo por Ramo

#### 🚗 **AUTOS**
- **🆕 Nueva Póliza Auto**: Template específico para nuevas pólizas
- **🔄 Renovación Auto**: Template específico para renovaciones

#### 💙 **VIDA**
- **🆕 Nueva Póliza Vida**: Template específico para nuevas pólizas
- **🔄 Renovación Vida**: Template específico para renovaciones

#### 🏥 **GMM (Gastos Médicos Mayores)**
- **🆕 Nueva Póliza GMM**: Template específico para nuevas pólizas
- **🔄 Renovación GMM**: Template específico para renovaciones

#### 🏠 **HOGAR**
- **🆕 Nueva Póliza Hogar**: Template específico para nuevas pólizas
- **🔄 Renovación Hogar**: Template específico para renovaciones

#### 📋 **GENERAL**
- **🆕 Nueva Póliza General**: Template genérico para nuevas pólizas
- **🔄 Renovación General**: Template genérico para renovaciones

### 🎨 Selector de Tipos de Email

El selector ahora incluye **optgroups** organizados por ramo:

```
🚗 Autos
  🆕 Nueva Póliza Auto
  🔄 Renovación Auto

💙 Vida
  🆕 Nueva Póliza Vida
  🔄 Renovación Vida

🏥 GMM
  🆕 Nueva Póliza GMM
  🔄 Renovación GMM

🏠 Hogar
  🆕 Nueva Póliza Hogar
  🔄 Renovación Hogar

📋 General
  🆕 Nueva Póliza General
  🔄 Renovación General

📧 Otros
  🎉 Bienvenida / Confirmación
  ⚠️ Recordatorio de Pago
  📋 Información General
```

## 📄 Templates Específicos

### 🚗 **Template Autos - Nueva Póliza**
```html
"De parte del Act. Marcos Zavala, me permito enviar su nueva póliza de seguro del auto..."
```

### 🚗 **Template Autos - Renovación**
```html
"De parte del Act. Marcos Zavala, me permito enviar su renovación del seguro del auto..."
```

### 💙 **Template Vida - Nueva Póliza**
```html
"De parte del Act. Marcos Zavala, me permito enviar su nueva póliza de seguro de vida..."
```

### 💙 **Template Vida - Renovación**
```html
"De parte del Act. Marcos Zavala, me permito enviar su renovación del seguro de vida..."
```

## 🔍 Detección Automática

### 🎯 **Detección de Ramo**
- **Autos**: Detecta por campos `descripcion_del_vehiculo`, `modelo`, `placas`
- **Vida**: Detecta por campo `contratante` y contexto de aseguradora
- **GMM**: Detecta por contexto de aseguradora
- **Hogar**: Detecta por contexto de aseguradora
- **General**: Fallback para otros casos

### 🎯 **Detección de Tipo**
- **Nueva**: Detecta por `emailType.includes('nueva')`
- **Renovación**: Detecta por `emailType.includes('renovacion')`

## 📧 Asuntos Automáticos

### 🆕 **Nuevas Pólizas**
- `Nueva Póliza Seguro Auto - [Cliente] - Póliza [Número]`
- `Nueva Póliza Seguro Vida - [Cliente] - Póliza [Número]`
- `Nueva Póliza GMM - [Cliente] - Póliza [Número]`
- `Nueva Póliza Seguro Hogar - [Cliente] - Póliza [Número]`

### 🔄 **Renovaciones**
- `Renovación Seguro Auto - [Cliente] - Póliza [Número]`
- `Renovación Seguro Vida - [Cliente] - Póliza [Número]`
- `Renovación GMM - [Cliente] - Póliza [Número]`
- `Renovación Seguro Hogar - [Cliente] - Póliza [Número]`

## 📄 Preview en Texto Plano

### ✅ **Características**
- **HTML removido** completamente del preview
- **Formato legible** con saltos de línea apropiados
- **Párrafos separados** correctamente
- **Enlaces convertidos** a texto plano
- **Estilos CSS removidos**
- **Espacios y formato limpios**

### 🔄 **Conversión Automática**
- **HTML → Texto Plano**: Para mostrar en el textarea
- **Texto Plano → HTML**: Para enviar el email
- **Preservación del formato**: Al editar y enviar

## 📊 Datos de Póliza Integrados

### 🚗 **Autos**
- `nombre_contratante`
- `descripcion_del_vehiculo`
- `modelo`
- `serie`
- `numero_poliza`
- `aseguradora`
- `pago_total_o_prima_total`
- `vigencia_inicio`
- `vigencia_fin`

### 💙 **Vida**
- `contratante` / `nombre_contratante`
- `numero_poliza`
- `aseguradora`
- `pago_total_o_prima_total` / `prima_neta`

### 🏥 **GMM**
- `nombre_contratante`
- `numero_poliza`
- `aseguradora`
- `pago_total_o_prima_total` / `prima_neta`

### 🏠 **Hogar**
- `nombre_contratante`
- `numero_poliza`
- `aseguradora`
- `pago_total_o_prima_total` / `prima_neta`

## 🎯 Remitentes Disponibles

### 📧 **Remitente Principal**
- **Email**: `casinseguros@gmail.com`
- **Nombre**: CASIN Seguros
- **Prioridad**: Primera opción (por defecto)

### 📧 **Remitentes Adicionales**
- `casindb46@gmail.com` - CASIN
- `lorenacasin5@gmail.com` - Lore
- `michelldiaz.casinseguros@gmail.com` - Mich

## 🧪 Scripts de Prueba

### 📝 **Scripts Disponibles**
1. `test-template-autos.js` - Prueba template de autos
2. `test-template-final.js` - Prueba completa del sistema
3. `test-preview-texto.js` - Prueba preview en texto plano
4. `test-preview-final.js` - Prueba completa del preview
5. `test-dos-versiones.js` - Prueba ambas versiones (nueva/renovación)

### ✅ **Resultados de Pruebas**
- ✅ **2 emails enviados exitosamente** (nueva y renovación)
- ✅ **Ambos tipos funcionando correctamente**
- ✅ **Templates específicos por tipo**
- ✅ **Sistema listo para producción**

## 🚀 Uso en Producción

### 📋 **Flujo de Trabajo**
1. **Seleccionar ramo y tipo** en el dropdown
2. **Sistema detecta automáticamente** el ramo basado en datos
3. **Genera template específico** según ramo y tipo
4. **Muestra preview en texto plano** para fácil edición
5. **Convierte automáticamente** a HTML al enviar
6. **Envía email profesional** con formato completo

### 🎯 **Casos de Uso**
- **Nuevas pólizas**: Usar templates "Nueva Póliza"
- **Renovaciones**: Usar templates "Renovación"
- **Detección automática**: Sistema detecta ramo automáticamente
- **Edición manual**: Preview en texto plano para modificaciones

## 📈 Beneficios del Sistema

### ✅ **Profesionalismo**
- Templates específicos por ramo y tipo
- Formato HTML profesional
- Asuntos automáticos descriptivos

### ✅ **Eficiencia**
- Detección automática de ramo
- Generación automática de contenido
- Preview en texto plano para edición fácil

### ✅ **Flexibilidad**
- Múltiples remitentes disponibles
- Templates personalizables
- Sistema extensible para nuevos ramos

### ✅ **Confiabilidad**
- Pruebas exhaustivas realizadas
- Manejo de errores robusto
- Sistema estable en producción

## 🎉 Estado del Sistema

### ✅ **Completado**
- ✅ Templates específicos por ramo y tipo
- ✅ Selector organizado con optgroups
- ✅ Detección automática de ramo y tipo
- ✅ Preview en texto plano
- ✅ Conversión automática HTML ↔ Texto
- ✅ Asuntos automáticos específicos
- ✅ Remitente principal configurado
- ✅ Scripts de prueba funcionales

### 🚀 **Listo para Producción**
El sistema está **100% funcional** y listo para uso en producción con todas las características implementadas y probadas exitosamente.

---

**Desarrollado para CASIN Seguros**  
**Fecha**: Agosto 2025  
**Versión**: 2.0 - Sistema Completo con Dos Versiones

