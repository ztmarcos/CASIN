# 🏢 Generación de IDs de Equipos Personalizados

## 📝 Descripción

Se ha implementado un sistema de generación de IDs personalizados para equipos, que reemplaza los IDs automáticos de Firebase por nombres más legibles basados en el nombre del equipo.

## 🔄 Cambios Realizados

### Antes:
- **ID automático**: `Lq67Ch0aNAwA17RdAOJQ`
- **Colecciones**: `team_Lq67Ch0aNAwA17RdAOJQ_autos`, `team_Lq67Ch0aNAwA17RdAOJQ_directorio_contactos`

### Después:
- **ID personalizado**: `team_mi_empresa`
- **Colecciones**: `team_team_mi_empresa_autos`, `team_team_mi_empresa_directorio_contactos`

## 🛠️ Implementación

### Función de Generación de ID

```javascript
const generateTeamId = (name) => {
  // Convertir a minúsculas, quitar espacios y caracteres especiales
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Quitar caracteres especiales
    .replace(/\s+/g, '_') // Reemplazar espacios por guiones bajos
    .replace(/_+/g, '_') // Reemplazar múltiples guiones bajos por uno solo
    .replace(/^_|_$/g, ''); // Quitar guiones bajos al inicio y final
  
  // Si el nombre queda vacío, usar un fallback
  const finalName = cleanName || 'equipo';
  
  return `team_${finalName}`;
};
```

### 📋 Ejemplos de Transformación

| Nombre del Equipo | ID Generado |
|------------------|-------------|
| "Mi Empresa" | `team_mi_empresa` |
| "CASIN Insurance" | `team_casin_insurance` |
| "Seguros-México 2024" | `team_segurosmxico_2024` |
| "ABC Corp." | `team_abc_corp` |
| "José & Asociados" | `team_jos_asociados` |
| "æøå" (caracteres especiales) | `team_equipo` (fallback) |

## 🔄 Flujo de Creación

1. **Usuario ingresa nombre**: Ej. "Mi Empresa de Seguros"
2. **Generación de ID**: Se convierte a `team_mi_empresa_de_seguros`
3. **Verificación de unicidad**: Se verifica que no exista en Firebase
4. **Manejo de duplicados**: Si existe, se agrega timestamp: `team_mi_empresa_de_seguros_123456`
5. **Creación del equipo**: Se usa `setDoc()` con el ID personalizado
6. **Configuración de colecciones**: Se crean con el patrón `team_{teamId}_{collectionType}`

## 🔧 Cambios Técnicos

### `TeamContext.jsx`
- ✅ Reemplazado `addDoc()` por `setDoc()` para IDs personalizados
- ✅ Agregada función `generateTeamId()`
- ✅ Implementada verificación de unicidad con `getDoc()`
- ✅ Manejo de duplicados con timestamp

### `firebaseTeamService.js`
- ✅ Ya soporta el patrón de naming con `getNamespacedCollection()`
- ✅ Genera nombres de colecciones: `team_{teamId}_{collectionName}`

## 🎯 Beneficios

1. **🔍 Legibilidad**: IDs más fáciles de identificar en Firebase Console
2. **🐛 Debug**: Más fácil debuggear problemas con nombres descriptivos
3. **📊 Organización**: Mejor organización visual en la base de datos
4. **🔧 Mantenimiento**: Facilita tareas de administración y migración

## ⚠️ Consideraciones

- **Caracteres especiales**: Se eliminan automáticamente
- **Espacios**: Se convierten a guiones bajos (`_`)
- **Duplicados**: Se manejan con timestamp automático
- **Fallback**: Si el nombre queda vacío, se usa "equipo"
- **Compatibilidad**: Mantiene compatibilidad con equipos existentes

## 🧪 Testing

Se ha probado con diversos casos edge:
- Nombres con caracteres especiales
- Nombres solo con símbolos
- Nombres con múltiples espacios
- Nombres duplicados

## 🚀 Próximos Pasos

- [ ] Migrar equipos existentes (opcional)
- [ ] Implementar validación en el frontend para nombres de equipos
- [ ] Considerar internacionalización para caracteres Unicode 