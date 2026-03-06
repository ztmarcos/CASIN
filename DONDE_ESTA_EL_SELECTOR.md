# 🎯 Dónde Está el Selector de Equipos

## 📍 Ubicación Exacta

El selector está en la **barra superior**, entre el **modo avión** y tu **avatar/foto de perfil**.

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] [Dashboard] [Tasks] [Data] ... [👥 CASIN ▼] [✈️] [👤] [⎆] │
│                                         ↑                         │
│                                    AQUÍ ESTÁ                      │
└─────────────────────────────────────────────────────────────────┘
```

## 🔍 Cómo Identificarlo

**Busca un botón que diga:**
- 👥 **CASIN** ▼  (si estás en CASIN)
- 👥 **Test Team** ▼  (si estás en Test Team)

**Tiene:**
- Un icono de personas (👥)
- El nombre del equipo actual
- Una flecha hacia abajo (▼)

## 📸 Referencia Visual

```
┌──────────────────────────────────────────────────────┐
│  🏢 CASIN  [Dashboard] [Tasks] [Data] [Reports]      │
│                                                       │
│  ... [Clientes] [👥 CASIN ▼] [✈️] [👤 Marcos] [⎆]   │
│                    ↑                                  │
│              CLICK AQUÍ                               │
└──────────────────────────────────────────────────────┘
```

## ✅ Pasos para Cambiar de Equipo

### 1. Encuentra el Selector
- Mira la esquina superior derecha
- Busca el icono 👥 con texto "CASIN"
- Está ANTES del botón de modo avión (✈️)

### 2. Haz Click
- Click en el botón [👥 CASIN ▼]
- Se abrirá un dropdown

### 3. Selecciona Test Team
```
┌─────────────────────────────────┐
│ Cambiar Equipo              × │
├─────────────────────────────────┤
│ 🏢 CASIN                    ✓ │
│    Equipo principal CASIN       │
│                                 │
│ 👥 Test Team                   │
│    Equipo de pruebas            │
└─────────────────────────────────┘
```

### 4. La Página Se Recarga
- Automáticamente se recarga
- Ahora verás [👥 Test Team ▼]
- Ve a "Data" para ver las tablas de Test Team

## 🚨 Si NO Ves el Selector

### Opción 1: Abre la Consola del Navegador

1. Presiona **F12** (o **Cmd+Option+I** en Mac)
2. Ve a la pestaña **Console**
3. Busca estos mensajes:

**✅ Si funciona, verás:**
```
✅ TeamSelector: User is CASIN admin: z.t.marcos@gmail.com
🔍 TeamSelector: Loading available teams...
📋 Found team: 4JlUqhAvfJMlCDhQ4vgH {...}
📋 Found team: test_team_001 {...}
✅ TeamSelector: Found 2 teams
📊 TeamSelector: Available teams: 2
```

**❌ Si hay problema, verás:**
```
🚫 TeamSelector: User is not CASIN admin
```
O
```
⚠️ TeamSelector: Only 1 team(s) found
```

### Opción 2: Verifica en Elementos (Inspector)

1. Presiona **F12**
2. Ve a la pestaña **Elements** (o **Inspector**)
3. Presiona **Ctrl+F** (o **Cmd+F**)
4. Busca: `team-selector`
5. Si lo encuentras, el componente está en el DOM

### Opción 3: Fuerza Recarga Sin Caché

1. Presiona **Ctrl+Shift+R** (Windows/Linux)
2. O **Cmd+Shift+R** (Mac)
3. Esto recarga sin usar caché

## 🎨 Cómo Se Ve el Selector

### Estado Normal (Cerrado)
```
┌──────────────────┐
│ 👥 CASIN      ▼ │
└──────────────────┘
```

### Estado Abierto (Dropdown)
```
┌──────────────────────────────┐
│ 👥 CASIN      ▼             │
└──────────────────────────────┘
  ┌────────────────────────────┐
  │ Cambiar Equipo         × │
  ├────────────────────────────┤
  │ 🏢 CASIN              ✓ │
  │    Equipo principal        │
  │                            │
  │ 👥 Test Team              │
  │    Equipo de pruebas       │
  └────────────────────────────┘
```

## 📱 En Pantallas Pequeñas

Si tu pantalla es pequeña, el selector podría estar:
- En el menú hamburguesa (☰)
- O en la segunda línea de la barra superior

## 🔧 Debug Rápido

### Comando en Consola del Navegador

Pega esto en la consola del navegador (F12 → Console):

```javascript
// Verificar si el selector existe en el DOM
console.log('Selector existe:', !!document.querySelector('.team-selector'));

// Verificar cuántos equipos hay
fetch('/api/data/teams')
  .then(r => r.json())
  .then(teams => console.log('Equipos encontrados:', teams.length, teams));
```

## ✅ Checklist de Verificación

- [ ] Script ejecutado exitosamente (16 tablas creadas)
- [ ] Página recargada (F5 o Ctrl+Shift+R)
- [ ] Login con z.t.marcos@gmail.com
- [ ] Consola del navegador abierta (F12)
- [ ] Buscando en la barra superior derecha
- [ ] Entre modo avión y avatar
- [ ] Icono 👥 visible

## 🆘 Si Aún No Lo Ves

**Toma una captura de pantalla de:**
1. La barra superior completa
2. La consola del navegador (F12 → Console)
3. Y dime qué ves en la consola

**O dime:**
- ¿Qué ves en la esquina superior derecha?
- ¿Ves el botón de modo avión (✈️)?
- ¿Ves tu avatar/foto?
- ¿Hay algo entre ellos?

---

## 🎯 Resumen Ultra Rápido

1. **Mira arriba a la derecha**
2. **Busca:** 👥 CASIN ▼
3. **Click ahí**
4. **Selecciona:** Test Team
5. **Listo!**
