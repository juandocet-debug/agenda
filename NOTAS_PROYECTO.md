# 📋 NOTAS VITALES DEL PROYECTO — Agenda Pro / Flowy

## 🏗️ Arquitectura General
- **Frontend:** React Native + Expo SDK 54 (Mobile + Web)
- **Backend:** Django REST → Railway (`https://agenda-production-ae37.up.railway.app`)
- **Web App:** Vercel → `https://agenda-pi-bice.vercel.app`
- **App Móvil (OTA):** Expo EAS Update → cuenta `juandocet` / proyecto `agenda-pro`
- **Repositorio:** `https://github.com/juandocet-debug/agenda`

---

## 🚀 FLUJO CORRECTO DE DESPLIEGUE

### Para la Web App (Vercel)
```
1. Hacer cambios en el código fuente (frontend/src/...)
2. git add . ; git commit -m "descripción" ; git push origin main
3. Vercel detecta el push y compila automáticamente (tarda ~3 min)
4. Los usuarios ven los cambios al refrescar la web
```
> ⚠️ **NUNCA** subir la carpeta `dist/` manualmente. Está en `.gitignore` con razón.
> Vercel tiene configurado `buildCommand: npm run build` y lo hace solo.

### Para la App Móvil (Android/iOS) — Actualizaciones OTA
```
cd frontend
npx eas-cli update --branch production --message "descripción del cambio"
```
- Tarda ~1-2 minutos en subir
- Los usuarios reciben el banner de actualización al abrir la app
- Al pulsar "Actualizar" → la app se recarga en ~2 segundos con los nuevos cambios
- NO requiere descargar ni reinstalar la app

---

## ⚠️ PROBLEMA CONOCIDO: Bundle Hash Inmutable en Expo Web

### ¿Qué es?
Expo/Metro genera el nombre del bundle JS con un hash: `index-XXXXXXXX.js`
Ese hash se basa en el **grafo de dependencias** (imports/exports), NO en el contenido del código.

### ¿Cuándo ocurre?
Cuando cambias código **dentro** de un archivo sin agregar/quitar imports, el grafo no cambia → mismo hash → Vercel/CDN sirve el JS viejo aunque el código cambió.

### ¿Cómo se detecta?
El bundle viejo sigue activo si el nombre del archivo JS en `dist/_expo/static/js/web/` es el mismo que el anterior.

### ✅ Solución permanente aplicada
En `frontend/index.ts` existe la línea:
```typescript
export const _BUILD = 'v2';
```
Cuando necesites forzar un nuevo hash, cambia el valor: `'v3'`, `'v4'`, etc., antes de hacer push.

### ✅ Solución ideal futura (pendiente de implementar)
Agregar en **Vercel Dashboard → Settings → Environment Variables**:
```
EXPO_PUBLIC_BUILD_ID = ${VERCEL_GIT_COMMIT_SHA}
```
Y en `index.ts`:
```typescript
export const _BUILD = process.env.EXPO_PUBLIC_BUILD_ID ?? 'dev';
```
Esto hace que cada deploy genere automáticamente un hash nuevo.

---

## 🗂️ Estructura del Proyecto
```
Agenda/
├── backend/          → Django REST API
├── frontend/         → React Native + Expo
│   ├── src/
│   │   ├── core/     → Arquitectura Hexagonal (casos de uso, adaptadores)
│   │   └── presentacion/
│   │       ├── screens/   → Pantallas de la app
│   │       ├── theme/     → colors.ts, typography.ts
│   │       └── navigation/
│   ├── App.tsx       → Raíz de la app + banner de actualizaciones OTA
│   ├── index.ts      → Entry point (contiene _BUILD para control de hash)
│   ├── app.json      → Config de Expo (EAS Project ID, runtimeVersion)
│   ├── eas.json      → Config de EAS Build (branches: development, preview, production)
│   └── vercel.json   → Config de despliegue web (buildCommand, outputDirectory)
├── iniciar.bat       → Script para levantar backend + frontend juntos
└── NOTAS_PROYECTO.md → Este archivo 📋
```

---

## 🔑 IDs y Claves Importantes
- **EAS Project ID:** `8c752b1c-9180-4b23-a67a-e27fed42f5f9`
- **EAS Owner:** `juandocet`
- **Android Package:** `com.juandocet.agendapro`
- **Runtime Version Policy:** `appVersion` (las OTA solo aplican a apps con la misma versión nativa)
- **Google OAuth Web Client ID:** Configurado vía `process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID`

---

## 📱 Cómo funciona el sistema de Actualizaciones OTA (expo-updates)
1. Al abrir la app, `expo-updates` consulta silenciosamente al servidor de Expo
2. Si hay una actualización disponible, la descarga en segundo plano
3. Aparece el **banner flotante** en la parte inferior con botón "Actualizar"
4. Al pulsar → `Updates.reloadAsync()` recarga el bundle JS en ~2 segundos
5. En modo `__DEV__` (desarrollo local) el sistema de OTA está desactivado automáticamente

---

## 🛠️ Caché de Metro (problema común en Windows)
Si el bundle web no refleja cambios después de limpiar `.expo/` y `dist/`:
```powershell
# Limpiar caché global de Metro en Windows
Remove-Item -Recurse -Force "$env:TEMP\metro-cache"
# Luego recompilar
npx cross-env NODE_ENV=production expo export -p web --clear
```

---

*Última actualización: Junio 2026*
