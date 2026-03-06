# 🔐 Configurar Dominio Autorizado en Firebase Auth

## ⚠️ Error Actual

```
Firebase: Error (auth/requests-from-referer-https://casin-crm.web.app-are-blocked.)
```

**Causa**: El dominio `casin-crm.web.app` no está autorizado en Firebase Authentication.

---

## 🔧 Solución (5 pasos)

### 1️⃣ Abre Firebase Console

**Link directo**: [https://console.firebase.google.com/project/casinbbdd/authentication/settings](https://console.firebase.google.com/project/casinbbdd/authentication/settings)

O manualmente:
- Ve a: https://console.firebase.google.com
- Selecciona el proyecto: **casinbbdd**
- En el menú lateral: **Authentication**
- Pestaña: **Settings**

---

### 2️⃣ Encuentra "Authorized domains"

En la página de Settings, busca la sección:
```
Authorized domains
```

Deberías ver una lista con dominios como:
- `localhost`
- `casinbbdd.web.app`
- `casinbbdd.firebaseapp.com`

---

### 3️⃣ Agrega el nuevo dominio

1. Click en el botón **"Add domain"**
2. En el campo de texto, escribe: `casin-crm.web.app`
3. Click en **"Add"** o presiona Enter

---

### 4️⃣ Verifica que se agregó

La lista de dominios autorizados ahora debe incluir:
- ✅ `localhost`
- ✅ `casinbbdd.web.app`
- ✅ `casinbbdd.firebaseapp.com`
- ✅ `casin-crm.web.app` ← **NUEVO**

---

### 5️⃣ Recarga la aplicación

1. Ve a: https://casin-crm.web.app
2. Recarga la página (Cmd+R o F5)
3. Intenta hacer login de nuevo
4. ✅ Debería funcionar correctamente

---

## 📋 Checklist

- [ ] Abrí Firebase Console
- [ ] Fui a Authentication → Settings
- [ ] Encontré "Authorized domains"
- [ ] Agregué `casin-crm.web.app`
- [ ] Verifiqué que aparece en la lista
- [ ] Recargué https://casin-crm.web.app
- [ ] Login funciona ✅

---

## 🔗 Links Útiles

- **Firebase Console**: https://console.firebase.google.com/project/casinbbdd
- **Authentication Settings**: https://console.firebase.google.com/project/casinbbdd/authentication/settings
- **Tu aplicación**: https://casin-crm.web.app

---

## 💡 Nota

Este es un paso de seguridad de Firebase. Solo los dominios autorizados pueden usar Firebase Authentication. Es normal tener que agregar cada nuevo dominio manualmente.

---

## 🐛 Si sigue sin funcionar

1. **Limpia caché del navegador**: Cmd+Shift+R
2. **Espera 1-2 minutos**: Los cambios pueden tardar en propagar
3. **Verifica en modo incógnito**: Abre ventana privada
4. **Revisa la consola**: F12 → Console para ver errores

---

**Última actualización**: Enero 2025

