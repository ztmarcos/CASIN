# Actualizaciones del Sistema de Footers

## Fecha: 22 de Enero, 2026

## Cambios Implementados

### 1. ✅ Logo Reducido
**Problema**: El logo llegaba muy grande en los emails.

**Solución**: Reducido el tamaño máximo del logo de `100%` a `150px`.

```javascript
// Antes
<img src="${logoSrc}" alt="CASIN Seguros - Logo" style="max-width: 100%; height: auto;" />

// Después
<img src="${logoSrc}" alt="CASIN Seguros - Logo" style="max-width: 150px; height: auto;" />
```

### 2. ✅ Selección Múltiple de Imágenes
**Problema**: Solo se podía seleccionar una imagen a la vez.

**Solución**: Implementada selección múltiple con checkboxes.

#### Cambios en el Estado
```javascript
// Antes
const [selectedFooter, setSelectedFooter] = useState('navidad');

// Después
const [selectedFooters, setSelectedFooters] = useState(['navidad']);
```

#### Cambios en la UI
- **Radio buttons** → **Checkboxes**
- Permite seleccionar múltiples imágenes simultáneamente
- Todas las imágenes seleccionadas aparecen en el email

#### Cambios en el Backend
```javascript
// Antes - Una sola imagen
footerData: {
  selectedFooterId: 'navidad',
  footerImage: { ... }
}

// Después - Múltiples imágenes
footerData: {
  selectedFooterIds: ['navidad', 'custom1', 'custom2'],
  footerImages: [
    { id: 'navidad', path: '/footers/casinnavidad.jpeg', ... },
    { id: 'custom1', base64: 'data:image/...', ... },
    { id: 'custom2', base64: 'data:image/...', ... }
  ]
}
```

## Arquitectura Actualizada

### Frontend: TableMail.jsx

**Estado**:
```javascript
const [selectedFooters, setSelectedFooters] = useState(['navidad']);
```

**Función de Generación de HTML**:
```javascript
const getFooterHTML = () => {
  // Logo (siempre incluido, 150px)
  let footerHTML = `<img src="${logoSrc}" style="max-width: 150px;" />`;
  
  // Todas las imágenes seleccionadas
  selectedFooters.filter(id => id !== 'none').forEach(footerId => {
    const footer = findFooter(footerId);
    footerHTML += `<img src="${footer.src}" style="max-width: 100%;" />`;
  });
  
  return footerHTML;
};
```

**Helper Function**:
```javascript
const getSelectedFootersData = () => {
  return selectedFooters
    .filter(id => id !== 'none')
    .map(footerId => findFooter(footerId))
    .filter(f => f !== null);
};
```

**Checkboxes en JSX**:
```javascript
<input
  type="checkbox"
  checked={selectedFooters.includes(footer.id)}
  onChange={(e) => {
    setSelectedFooters(prev => 
      prev.includes(footer.id)
        ? prev.filter(id => id !== footer.id)  // Remover
        : [...prev, footer.id]                  // Agregar
    );
  }}
/>
```

### Backend: functions/index.js

**Procesamiento de Múltiples Imágenes**:
```javascript
if (footerData.footerImages && Array.isArray(footerData.footerImages)) {
  footerData.footerImages.forEach((footer, index) => {
    const cidName = `footer${index}@casin`;
    
    // Agregar cada imagen como CID attachment
    cidAttachments.push({
      filename: `footer${index}.jpg`,
      content: footer.base64 || footer.path,
      cid: cidName
    });
    
    // Reemplazar en HTML
    emailBody = emailBody.replace(footer.src, `cid:${cidName}`);
  });
}
```

**CID Naming Convention**:
- Logo: `cid:logo@casin`
- Footer 1: `cid:footer0@casin`
- Footer 2: `cid:footer1@casin`
- Footer 3: `cid:footer2@casin`
- etc.

## Flujo de Usuario

### Seleccionar Múltiples Imágenes
1. Abre modal de email
2. Ve lista de imágenes con **checkboxes**
3. Marca las imágenes que desea incluir (puede ser 0, 1, 2, 3+)
4. El contenido del email se regenera automáticamente
5. Vista previa muestra todas las imágenes seleccionadas

### Subir Nueva Imagen
1. Clic en "📤 Subir Nueva Imagen Personalizada"
2. Selecciona archivo
3. Ve modal de confirmación
4. Clic en "✅ Confirmar y Guardar"
5. **La nueva imagen se agrega automáticamente a la selección**
6. Aparece en el email junto con las otras seleccionadas

### Enviar Email
1. Logo (150px) siempre aparece primero
2. Todas las imágenes seleccionadas aparecen después
3. Cada imagen usa CID attachment
4. Email llega con todas las imágenes visibles

## Ejemplos de Uso

### Caso 1: Solo Logo
```javascript
selectedFooters = ['none']
// Email muestra solo el logo de CASIN
```

### Caso 2: Logo + Navidad
```javascript
selectedFooters = ['navidad']
// Email muestra logo + imagen navideña
```

### Caso 3: Logo + Múltiples Imágenes
```javascript
selectedFooters = ['navidad', 'custom1', 'custom2']
// Email muestra:
// - Logo (150px)
// - Imagen navideña
// - Custom 1
// - Custom 2
```

### Caso 4: Solo Imágenes Personalizadas
```javascript
selectedFooters = ['custom1', 'custom2']
// Email muestra:
// - Logo (150px)
// - Custom 1
// - Custom 2
```

## Archivos Modificados

### Frontend
- `frontend/src/components/DataDisplay/TableMail.jsx`
  - Estado: `selectedFooter` → `selectedFooters` (array)
  - UI: Radio buttons → Checkboxes
  - Función: `getSelectedFooterData()` → `getSelectedFootersData()` (array)
  - Logo: `max-width: 100%` → `max-width: 150px`
  - useEffect: Escucha cambios en `selectedFooters`

### Backend
- `functions/index.js`
  - Procesamiento: `footerImage` → `footerImages` (array)
  - CID naming: `footer@casin` → `footer0@casin`, `footer1@casin`, etc.
  - Loop para procesar múltiples imágenes

## Testing

### Verificar
1. **Recarga la página** (Cmd+R)
2. **Abre modal de email** en cualquier tabla
3. **Verifica checkboxes** en lugar de radio buttons
4. **Selecciona múltiples imágenes**
5. **Envía email de prueba**
6. **Verifica en tu correo**:
   - Logo aparece pequeño (150px)
   - Todas las imágenes seleccionadas aparecen
   - No necesitas hacer clic en "Mostrar imágenes"

## Deployment

```bash
✓ Frontend build: 2.73s
✓ Hosting desplegado: https://casin-crm.web.app
✓ Function sendEmail actualizada
✓ Deploy completo
```

## Beneficios

1. **Flexibilidad**: Puedes incluir 0, 1, 2, 3+ imágenes
2. **Logo Apropiado**: 150px es un tamaño profesional
3. **UX Mejorada**: Checkboxes son más intuitivos para selección múltiple
4. **Persistencia**: Las selecciones se mantienen entre regeneraciones
5. **CID Attachments**: Todas las imágenes llegan incrustadas

## Notas Técnicas

- El logo SIEMPRE se incluye (no es opcional)
- El logo es el primero en aparecer
- Las imágenes adicionales aparecen en el orden seleccionado
- Cada imagen usa un CID único
- El backend maneja arrays de imágenes
- Frontend y backend están sincronizados

---

**Estado**: ✅ Implementado y Desplegado
**Fecha**: 22 de Enero, 2026
