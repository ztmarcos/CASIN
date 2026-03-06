# Implementación de Persistencia de Imágenes en TableMail

## 📋 Resumen

Se implementó un sistema completo de persistencia para las imágenes de pie de página en el componente TableMail, con integración a Firestore y mejoras en la experiencia de usuario.

## ✨ Cambios Implementados

### 1. **Persistencia en Firestore**
- ✅ Las imágenes personalizadas ahora se guardan en la colección `email_footers` de Firestore
- ✅ Las imágenes persisten entre sesiones y están disponibles para todos los usuarios
- ✅ Se cargan automáticamente al montar el componente

### 2. **Logo CASIN Siempre Incluido**
- ✅ El logo de CASIN (`/footers/casin-logo.png`) se incluye **automáticamente** en todos los correos
- ✅ No es seleccionable/deseleccionable - siempre aparece
- ✅ Se muestra primero en el pie de página

### 3. **Imagen Adicional Opcional**
- ✅ Los usuarios pueden elegir una imagen adicional que se mostrará **después del logo**
- ✅ Opciones disponibles:
  - **Felices Fiestas** (imagen navideña) - seleccionada por defecto
  - **Sin imagen adicional** - solo muestra el logo
  - **Imágenes personalizadas** - subidas por el usuario

### 4. **Gestión de Imágenes Personalizadas**
- ✅ **Subir**: Las imágenes se convierten a base64 y se guardan en Firestore
- ✅ **Eliminar**: Se pueden eliminar permanentemente de Firestore
- ✅ **Persistencia**: Las imágenes están disponibles para futuros correos
- ✅ **Validación**: Máximo 5MB por imagen, solo formatos de imagen

### 5. **Mejoras en la UI**
- ✅ Banner informativo explicando que el logo siempre se incluye
- ✅ Indicador de carga mientras se suben/eliminan imágenes
- ✅ Confirmación antes de eliminar imágenes personalizadas
- ✅ Mensajes de éxito/error claros
- ✅ Botón de eliminar visible en cada imagen personalizada

## 🔧 Cambios Técnicos

### Archivos Modificados

#### `TableMail.jsx`
```javascript
// Nuevas importaciones
import firebaseService from '../../services/firebaseService.js';

// Logo de CASIN (siempre incluido)
const CASIN_LOGO = {
  id: 'logo',
  name: 'Logo CASIN',
  path: '/footers/casin-logo.png'
};

// Opciones de footer actualizadas
const DEFAULT_FOOTERS = [
  { id: 'navidad', name: 'Felices Fiestas', path: '/footers/casinnavidad.jpeg' },
  { id: 'none', name: 'Sin imagen adicional', path: null }
];
```

**Nuevas funciones:**
- `loadCustomFooters()`: Carga imágenes desde Firestore al montar
- `handleFooterUpload()`: Guarda nuevas imágenes en Firestore
- `getFooterHTML()`: Genera HTML con logo + imagen adicional

#### `TableMail.css`
```css
/* Nuevos estilos */
.footer-info-banner { /* Banner informativo */ }
.footer-loading { /* Indicador de carga */ }
.footer-loading-spinner { /* Spinner animado */ }
```

## 📊 Estructura de Datos en Firestore

### Colección: `email_footers`

```javascript
{
  name: "nombre_imagen.jpg",
  base64: "data:image/jpeg;base64,...",
  type: "image/jpeg",
  createdAt: "2026-01-22T...",
  updatedAt: "2026-01-22T..."
}
```

## 🎨 Estructura del HTML del Footer

```html
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
  <!-- Logo CASIN (SIEMPRE) -->
  <img src="https://casin-crm.web.app/footers/casin-logo.png" alt="CASIN Seguros - Logo" />
  
  <!-- Imagen adicional (OPCIONAL) -->
  <div style="margin-top: 20px;">
    <img src="..." alt="Felices Fiestas" />
  </div>
</div>
```

## 🚀 Deployment

### Build y Deploy Completado
```bash
✓ Frontend build: 2.81s
✓ Firebase hosting deploy: 5.02s
✓ Firestore rules deploy: 3.32s
✓ Hosting URL: https://casin-crm.web.app
✓ Hosting URL: https://casin-crm.web.app
```

### Reglas de Firestore Actualizadas

Se agregaron reglas de seguridad para la colección `email_footers`:

```javascript
// Email footers - Usuarios autenticados pueden leer, solo admins pueden escribir
match /email_footers/{document} {
  allow read: if isAuthenticated();
  allow write: if isCASINAdmin();
}
```

**Permisos:**
- ✅ **Lectura**: Todos los usuarios autenticados
- ✅ **Escritura**: Solo administradores CASIN

## 📝 Flujo de Usuario

1. **Al abrir el modal de email:**
   - Se cargan automáticamente las imágenes personalizadas desde Firestore
   - La imagen "Felices Fiestas" está seleccionada por defecto
   - El logo de CASIN siempre se incluye (no es seleccionable)

2. **Al subir una nueva imagen:**
   - Se valida el formato y tamaño
   - Se convierte a base64
   - Se guarda en Firestore
   - Se agrega a la lista de opciones
   - Se selecciona automáticamente

3. **Al enviar el correo:**
   - El logo de CASIN se incluye siempre
   - La imagen seleccionada se agrega después del logo
   - Si se selecciona "Sin imagen adicional", solo aparece el logo

4. **Al eliminar una imagen:**
   - Se pide confirmación
   - Se elimina de Firestore
   - Se elimina de la lista local
   - Si estaba seleccionada, se cambia a "Felices Fiestas"

## ✅ Beneficios

1. **Persistencia**: Las imágenes no se pierden al cerrar el modal o recargar la página
2. **Consistencia**: El logo de CASIN siempre aparece en todos los correos
3. **Flexibilidad**: Los usuarios pueden agregar imágenes personalizadas
4. **Simplicidad**: Interfaz clara y fácil de usar
5. **Seguridad**: Validación de formatos y tamaños

## 🔮 Posibles Mejoras Futuras

- [ ] Comprimir imágenes automáticamente antes de guardar
- [ ] Permitir editar el nombre de las imágenes personalizadas
- [ ] Agregar categorías o etiquetas a las imágenes
- [ ] Implementar un límite de imágenes por usuario/equipo
- [ ] Agregar vista previa del email completo antes de enviar
- [ ] Permitir reordenar imágenes (drag & drop)

## 📞 Soporte

Para cualquier problema o sugerencia, contactar al equipo de desarrollo.

---

**Fecha de implementación**: 22 de Enero, 2026  
**Versión**: 2.0.0  
**Estado**: ✅ Desplegado en producción
