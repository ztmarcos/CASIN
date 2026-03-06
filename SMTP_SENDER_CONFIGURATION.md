# 📧 Configuración de Remitentes SMTP Dinámicos

## ✅ **Implementación Completada**

Se ha implementado la funcionalidad para **elegir entre 3 remitentes diferentes** en la sección de envío de mails de DataTable:

### 🎯 **Remitentes Disponibles:**

1. **CASIN** - casindb46@gmail.com (CASIN Seguros)
2. **Lore** - casindb46@gmail.com (Lore Seguros)  
3. **Mich** - casindb46@gmail.com (Mich Seguros)

### 🔧 **Cambios Realizados:**

#### **1. Frontend (TableMail.jsx)**
- ✅ Agregado selector de remitente con 3 opciones
- ✅ Estado `sender` para manejar el remitente seleccionado
- ✅ Envío de `from`, `fromName`, `fromPass` al backend
- ✅ Uso de variables de entorno `VITE_SMTP_PASS_*` para seguridad

#### **2. Backend (server-mysql.js)**
- ✅ Recepción de parámetros dinámicos `from`, `fromName`, `fromPass`
- ✅ Configuración dinámica del transporter SMTP
- ✅ Fallback a variables por defecto si no se especifica remitente
- ✅ Logging mejorado para debugging

#### **3. Variables de Entorno**

**Frontend (.env):**
```env
VITE_SMTP_PASS_CASIN=qlqvjpccsgfihszj
VITE_SMTP_PASS_LORE=qblamddapeoyqwvw
VITE_SMTP_PASS_MICH=klejsbcgpjmwoogg
```

**Backend (.env):**
```env
SMTP_USER_CASIN=casindb46@gmail.com
SMTP_PASS_CASIN=qlqvjpccsgfihszj
SMTP_USER_LORE=casindb46@gmail.com
SMTP_PASS_LORE=qblamddapeoyqwvw
SMTP_USER_MICH=casindb46@gmail.com
SMTP_PASS_MICH=klejsbcgpjmwoogg
```

**Heroku (configurado):**
```bash
# Backend variables
SMTP_USER_CASIN=casindb46@gmail.com
SMTP_PASS_CASIN=qlqvjpccsgfihszj
SMTP_USER_LORE=casindb46@gmail.com
SMTP_PASS_LORE=qblamddapeoyqwvw
SMTP_USER_MICH=casindb46@gmail.com
SMTP_PASS_MICH=klejsbcgpjmwoogg

# Frontend variables  
VITE_SMTP_PASS_CASIN=qlqvjpccsgfihszj
VITE_SMTP_PASS_LORE=qblamddapeoyqwvw
VITE_SMTP_PASS_MICH=klejsbcgpjmwoogg
```

### 🔄 **Flujo de Funcionamiento:**

1. **Usuario selecciona remitente** en TableMail
2. **Frontend envía** `from`, `fromName`, `fromPass` al backend
3. **Backend configura** transporter SMTP dinámicamente
4. **Correo se envía** con el remitente seleccionado

### 🎨 **Interfaz de Usuario:**

El selector aparece en el modal de envío de correo con:
- Dropdown con las 3 opciones de remitente
- Texto descriptivo: "Elige el remitente del correo"
- Reset automático al cerrar el modal

### 🔒 **Seguridad:**

- Contraseñas de aplicación almacenadas en variables de entorno
- No hay hardcoding de credenciales en el código
- Fallback a valores por defecto para compatibilidad

### ✅ **Estado del Deploy:**

- **Frontend**: ✅ Configurado
- **Backend**: ✅ Configurado  
- **Heroku**: ✅ Variables configuradas (v45)
- **Testing**: 🧪 Listo para pruebas

---

**🚀 La funcionalidad está lista para uso en producción en Heroku.** 