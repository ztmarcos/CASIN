# 🚀 Instrucciones para Crear Test Team

## ⚠️ Problema Actual

Has hecho login con `z.t.marcos@gmail.com` pero **no ves el selector de equipos** porque **Test Team aún no ha sido creado**.

El selector solo aparece cuando hay más de 1 equipo disponible. Actualmente solo existe el equipo CASIN.

---

## ✅ Solución: Crear Test Team (2 pasos)

### **Paso 1: Ejecutar el Script**

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm run create:test-team
```

O directamente:

```bash
node create-test-team.js
```

**Salida esperada:**
```
🚀 Iniciando creación de Test Team...

🔧 Firebase Config:
   Project ID: casinbbdd
   Auth Domain: casinbbdd.firebaseapp.com
   API Key: ✅ Configured

📋 Paso 1: Creando equipo en colección "teams"...
✅ Equipo "Test Team" creado con ID: test_team_001

👥 Paso 2: Agregando owner como miembro del equipo...
✅ Owner agregado: z.t.marcos@gmail.com

📊 Paso 3: Creando 16 tablas con documentos de ejemplo...

   ✅ autos                     → team_test_team_001_autos
   ✅ vida                      → team_test_team_001_vida
   ✅ gmm                       → team_test_team_001_gmm
   ✅ hogar                     → team_test_team_001_hogar
   ✅ rc                        → team_test_team_001_rc
   ✅ transporte                → team_test_team_001_transporte
   ✅ mascotas                  → team_test_team_001_mascotas
   ✅ diversos                  → team_test_team_001_diversos
   ✅ negocio                   → team_test_team_001_negocio
   ✅ emant_caratula            → team_test_team_001_emant_caratula
   ✅ emant_listado             → team_test_team_001_emant_listado
   ✅ gruposvida                → team_test_team_001_gruposvida
   ✅ listadovida               → team_test_team_001_listadovida
   ✅ gruposautos               → team_test_team_001_gruposautos
   ✅ listadoautos              → team_test_team_001_listadoautos
   ✅ directorio_contactos      → team_test_team_001_directorio_contactos

📊 Resumen de creación de tablas:
   ✅ Exitosas: 16/16
   ❌ Errores: 0/16

🎉 ¡Test Team creado exitosamente!

📝 Detalles del equipo:
   ID: test_team_001
   Nombre: Test Team
   Owner: z.t.marcos@gmail.com
   Email remitente: ztmarcos@gmail.com
   Tablas creadas: 16

✅ Próximos pasos:
   1. Recarga la página en el navegador (F5)
   2. Busca el selector de equipos en la barra superior
   3. Cambia a "Test Team"
   4. Verifica que aparezcan las tablas con documentos de ejemplo

✅ Script completado exitosamente
```

### **Paso 2: Recargar la Página**

1. Ve al navegador donde tienes abierta la aplicación
2. Presiona **F5** o **Ctrl+R** (Cmd+R en Mac) para recargar
3. Busca el selector de equipos en la barra superior (icono 👥)
4. Deberías ver un dropdown con 2 opciones:
   - 🏢 CASIN (actual)
   - 👥 Test Team

---

## 🔍 Verificar en la Consola del Navegador

Abre la consola del navegador (F12 → Console) y busca estos logs:

```
✅ TeamSelector: User is CASIN admin: z.t.marcos@gmail.com
📊 TeamSelector: Available teams: 2
🔍 TeamSelector: Loading available teams...
📋 Found team: 4JlUqhAvfJMlCDhQ4vgH {...}
📋 Found team: test_team_001 {...}
✅ TeamSelector: Found 2 teams
```

Si ves estos logs, significa que:
- ✅ Eres reconocido como admin CASIN
- ✅ El selector está cargando equipos
- ✅ Se encontraron ambos equipos (CASIN y Test Team)

---

## 🎯 Cómo Usar el Selector de Equipos

### **Ubicación**
Barra superior, entre el modo avión y tu avatar:

```
[Logo CASIN] [Nav] ... [👥 CASIN ▼] [✈️] [👤 Avatar]
                        ↑ Aquí
```

### **Cambiar a Test Team**

1. Click en el selector (👥 CASIN ▼)
2. Se abre un dropdown con:
   ```
   Cambiar Equipo                    ×
   ─────────────────────────────────
   🏢 CASIN                         ✓
      Equipo principal CASIN
   
   👥 Test Team
      Equipo de pruebas
   ```
3. Click en "Test Team"
4. La página se recarga automáticamente
5. Ahora verás "👥 Test Team ▼" en el selector
6. Ve a "Data" y verás las tablas de Test Team

### **Volver a CASIN**

1. Click en el selector (👥 Test Team ▼)
2. Click en "CASIN"
3. La página se recarga
4. Vuelves a ver los datos de CASIN

---

## ❓ Troubleshooting

### No veo el selector después de ejecutar el script

**Solución:**
1. Verifica que el script terminó exitosamente (debe decir "✅ Script completado exitosamente")
2. Recarga la página con **Ctrl+Shift+R** (fuerza recarga sin caché)
3. Abre la consola del navegador (F12) y busca los logs de TeamSelector
4. Si dice "Only 1 team(s) found", verifica en Firebase Console que exista la colección `teams` con 2 documentos

### El script da error de Firebase

**Solución:**
1. Verifica que el archivo `.env` tenga las variables de Firebase:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_PROJECT_ID=casinbbdd
   VITE_FIREBASE_AUTH_DOMAIN=casinbbdd.firebaseapp.com
   VITE_FIREBASE_STORAGE_BUCKET=...
   ```
2. Si faltan, cópialas del archivo `frontend/.env`

### Veo el selector pero solo muestra CASIN

**Solución:**
1. Abre Firebase Console: https://console.firebase.google.com/
2. Ve a Firestore Database
3. Busca la colección `teams`
4. Verifica que existan 2 documentos:
   - `4JlUqhAvfJMlCDhQ4vgH` (CASIN)
   - `test_team_001` (Test Team)
5. Si solo hay uno, ejecuta el script nuevamente

---

## 📊 Verificar en Firebase Console

### Colección `teams`

Debe tener 2 documentos:

1. **4JlUqhAvfJMlCDhQ4vgH** (CASIN)
   ```json
   {
     "name": "CASIN",
     "isMainTeam": true,
     "owner": "z.t.marcos@gmail.com",
     ...
   }
   ```

2. **test_team_001** (Test Team)
   ```json
   {
     "name": "Test Team",
     "isMainTeam": false,
     "owner": "z.t.marcos@gmail.com",
     "description": "Equipo de pruebas...",
     ...
   }
   ```

### Colección `team_members`

Debe tener un documento para Test Team:

**test_team_001_z_t_marcos_gmail_com**
```json
{
  "email": "z.t.marcos@gmail.com",
  "teamId": "test_team_001",
  "role": "admin",
  "status": "active",
  ...
}
```

### Colecciones de Test Team

Deben existir 16 colecciones con prefijo `team_test_team_001_`:

- `team_test_team_001_autos`
- `team_test_team_001_vida`
- `team_test_team_001_gmm`
- ... (16 en total)

Cada una con 1 documento: `ejemplo_001`

---

## 🎉 Una Vez que Funcione

### Probar Funcionalidad

1. **Cambiar a Test Team**
   - Usa el selector para cambiar
   - Verifica que el nombre cambie en la barra superior

2. **Ver Datos de Test Team**
   - Ve a "Data"
   - Deberías ver las 16 tablas
   - Cada tabla tiene 1 documento de ejemplo

3. **Crear un Registro**
   - Abre "Autos"
   - Crea una nueva póliza
   - Verifica que se guarde correctamente

4. **Volver a CASIN**
   - Usa el selector para volver a CASIN
   - Verifica que los datos de CASIN estén intactos
   - Verifica que el registro que creaste en Test Team NO aparezca aquí

5. **Verificar Aislamiento**
   - Los datos de CASIN y Test Team están completamente separados
   - Cambios en uno NO afectan al otro

---

## 📞 Si Necesitas Ayuda

1. **Logs del Script**
   - Copia la salida completa del script
   - Busca mensajes de error

2. **Logs del Navegador**
   - Abre consola (F12)
   - Busca logs de TeamSelector
   - Busca errores en rojo

3. **Firebase Console**
   - Verifica que las colecciones existan
   - Verifica que los documentos tengan los datos correctos

---

## ✅ Resumen

**Para ver el selector de equipos:**
1. ✅ Ejecuta: `npm run create:test-team`
2. ✅ Espera a que termine (debe decir "Script completado exitosamente")
3. ✅ Recarga la página (F5)
4. ✅ Busca el selector en la barra superior (👥)
5. ✅ Cambia entre CASIN y Test Team

**¡Eso es todo!** 🎉
