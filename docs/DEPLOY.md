# 🚂 Deploy en Railway - Directorio CRM

## 📋 **Prerrequisitos**

1. Cuenta en [Railway](https://railway.app/)
2. Repositorio en GitHub con tu código
3. Base de datos MySQL (Railway puede proveer una)

## 🚀 **Pasos para Deploy**

### **1. Preparar el Repositorio**

Asegúrate de tener estos archivos en tu repositorio:
- `railway.toml` ✅
- `backend/package.json` ✅
- `env.example` ✅
- `package.json` (con script start) ✅

### **2. Crear Proyecto en Railway**

1. Ve a [Railway.app](https://railway.app/)
2. Clic en "Start a New Project"
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu repositorio

### **3. Configurar Base de Datos**

#### Opción A: Usar MySQL de Railway
1. En tu proyecto Railway, clic en "Add Service"
2. Selecciona "Database" > "MySQL"
3. Railway generará las credenciales automáticamente

#### Opción B: Usar base de datos externa
1. Configura las variables de entorno manualmente

### **4. Configurar Variables de Entorno**

En Railway, ve a tu servicio backend y agrega estas variables:

```env
# Base de datos (Railway las genera automáticamente si usas su MySQL)
DB_HOST=tu_host_mysql
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=crud_db
DB_PORT=3306

# Puerto (Railway lo maneja automáticamente)
PORT=$PORT

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-password
```

Para el frontend, agrega:
```env
VITE_API_URL=https://tu-backend-url.railway.app/api
```

### **5. Deploy Automático**

Railway detectará automáticamente:
- **Backend**: `backend/` como servicio Node.js
- **Frontend**: Raíz del proyecto como aplicación Vite

### **6. Obtener URLs**

Una vez deployado:
1. **Backend**: `https://tu-backend-hash.railway.app`
2. **Frontend**: `https://tu-frontend-hash.railway.app`

### **7. Configurar Dominio Personalizado (Opcional)**

1. En Railway, ve a Settings > Domains
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones

## 🔗 **URLs Finales**

- **Directorio ABC**: `https://tu-dominio.com/directorio-standalone`
- **API**: `https://tu-backend.com/api/directorio`

## ⚙️ **Comandos Útiles**

```bash
# Desarrollo local
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview

# Backend local
cd backend && npm start
```

## 🐛 **Troubleshooting**

### Error de CORS
Asegúrate de que el backend tenga configurado CORS correctamente:
```js
app.use(cors({
  origin: ['https://tu-frontend.railway.app', 'http://localhost:5173'],
  credentials: true
}));
```

### Error de Base de Datos
1. Verifica las variables de entorno
2. Asegúrate de que la base de datos esté corriendo
3. Revisa los logs en Railway

### Error de Build
1. Verifica que todas las dependencias estén en `package.json`
2. Revisa los logs de build en Railway
3. Asegúrate de que el script `start` esté configurado

## 📱 **Acceso Remoto**

Una vez deployado, puedes compartir el link:
`https://tu-dominio.railway.app/directorio-standalone`

Los usuarios remotos podrán:
- ✅ Ver el directorio con navegación ABC
- ✅ Buscar contactos por nombre
- ✅ Filtrar por letras
- ✅ Ver información completa de contactos
- ✅ Crear y editar contactos (si tienen permisos)

## 💰 **Costos Railway**

- **Plan Hobby**: $5/mes por servicio
- **Base de datos MySQL**: ~$5/mes
- **Total estimado**: $15-20/mes para proyecto completo

## 🔒 **Seguridad**

Railway automáticamente:
- ✅ Provee HTTPS
- ✅ Variables de entorno seguras
- ✅ Logs de aplicación
- ✅ Monitoreo básico 