# 🔐 Configuración de GitHub Actions para Firebase Deploy

## 📋 Setup del Secret en GitHub

Para que los workflows automáticos funcionen, necesitas agregar el service account de Firebase como secret en GitHub.

### Pasos:

1. **Ve a tu repositorio en GitHub**
   ```
   https://github.com/TU_USUARIO/TU_REPO
   ```

2. **Navega a Settings**
   ```
   Settings → Secrets and variables → Actions
   ```

3. **Crea un nuevo Repository Secret**
   - Click en "New repository secret"
   - Name: `FIREBASE_SERVICE_ACCOUNT_CASINBBDD`
   - Value: El contenido completo del archivo `casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json`

4. **Copia el contenido del service account**
   ```bash
   cat casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json
   ```
   
   Copia TODO el contenido JSON (desde `{` hasta `}`)

5. **Pega el contenido en el campo Value**
   - Asegúrate de copiar TODO el JSON
   - No modifiques nada
   - Click en "Add secret"

---

## ✅ Verificación

Una vez agregado el secret:

1. **Verifica que aparece en la lista**
   - Deberías ver: `FIREBASE_SERVICE_ACCOUNT_CASINBBDD`
   - Estado: ✓ (check verde)

2. **Haz un commit de prueba**
   ```bash
   git add .
   git commit -m "test: Firebase deploy setup"
   git push origin main
   ```

3. **Verifica el workflow**
   - Ve a: Actions tab en GitHub
   - Deberías ver el workflow ejecutándose
   - Espera a que termine (tarda ~2-3 minutos)

---

## 🔄 Workflows Configurados

### 1. Deploy en Producción
- **Archivo**: `.github/workflows/firebase-hosting-merge.yml`
- **Trigger**: Push a `main` o `master`
- **Acción**: Build y deploy automático

### 2. Preview en Pull Requests
- **Archivo**: `.github/workflows/firebase-hosting-pull-request.yml`
- **Trigger**: Creación de Pull Request
- **Acción**: Deploy a canal preview temporal

---

## 🐛 Troubleshooting

### Error: "Secret not found"
- Verifica que el nombre del secret sea exactamente: `FIREBASE_SERVICE_ACCOUNT_CASINBBDD`
- Verifica que el secret esté en el repositorio correcto

### Error: "Invalid service account"
- Verifica que copiaste TODO el contenido del JSON
- Verifica que no haya espacios extra al inicio o final
- Verifica que el JSON sea válido

### Error: "Permission denied"
- Verifica que el service account tenga permisos en Firebase
- Verifica que el proyecto Firebase sea el correcto

---

## 📝 Notas Importantes

⚠️ **Seguridad**
- NUNCA hagas commit del archivo `casinbbdd-firebase-adminsdk-hnwk0-d3e04afbfd.json`
- El archivo ya está en `.gitignore`
- Solo usa el secret en GitHub Actions

✅ **Best Practices**
- Usa secrets para todas las credenciales
- No expongas credenciales en logs
- Revisa los workflows antes de hacer merge

---

## 🎯 Resultado Esperado

Una vez configurado correctamente:

1. **Push a main/master**
   - ✅ Workflow se ejecuta automáticamente
   - ✅ Build del frontend
   - ✅ Deploy a Firebase Hosting
   - ✅ App disponible en https://casin.web.app

2. **Pull Request**
   - ✅ Workflow se ejecuta automáticamente
   - ✅ Build del frontend
   - ✅ Deploy a URL preview temporal
   - ✅ Comentario en PR con URL preview

---

## 📞 Ayuda

Si tienes problemas:
1. Revisa los logs en GitHub Actions
2. Verifica el secret en Settings
3. Consulta la documentación de Firebase

---

**Última actualización**: Enero 2025

