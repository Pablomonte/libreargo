# Requirements — build local del APK Android

Este documento lista todo lo necesario para compilar el APK release de la
LibreAgro App localmente en una máquina Linux (Ubuntu/Debian). El objetivo
es **reproducible y sin EAS**: bajar dependencias una sola vez y compilar.

## Pre-requisitos del sistema (apt, requiere `sudo`)

- `openjdk-17-jdk-headless` — Java 17 (Gradle/AGP no soporta Java ≥ 22).
- `unzip`, `wget`, `git` — utilidades para descargar y descomprimir el SDK.
- `nodejs` ≥ 18 + `npm` (este repo usa Node 20).

## Toolchain Android (no requiere `sudo`, vive en `~/Android/Sdk`)

- `cmdline-tools/latest` — `sdkmanager` y compañía.
  Versión: `commandlinetools-linux-13114758_latest`.
- `platform-tools` — `adb`, `fastboot`.
- `platforms;android-35` — Expo SDK 54 / RN 0.81 compila contra `compileSdk = 35`.
- `build-tools;35.0.0` — `aapt2`, `zipalign`, `apksigner`.
- `ndk;27.1.12297006` — requerido por React Native 0.81.

## Variables de entorno

Agregar al final de `~/.bashrc` (o `~/.zshrc`):

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
```

## Instalación en una sola línea

```bash
bash scripts/install-android-toolchain.sh
```

El script es idempotente: detecta lo que ya está instalado y no re-descarga.
Pide `sudo` solo para los paquetes apt; el resto baja a tu `$HOME`.

## Compilar el APK

Una vez instalado el toolchain (y reabierta la shell para tomar los `export`):

```bash
cd "/ruta/al/repo/libreargo"
npm install
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
# APK queda en android/app/build/outputs/apk/release/app-release.apk
```

Para una build de debug (firmada con la debug.keystore que genera Gradle
automáticamente, instalable directo sin pasos extra):

```bash
cd android && ./gradlew assembleDebug
# APK en android/app/build/outputs/apk/debug/app-debug.apk
```

## Tamaño en disco

- Java 17 headless: ~250 MB
- cmdline-tools: ~150 MB
- platforms;android-35 + build-tools: ~400 MB
- ndk;27.1.12297006: ~3.5 GB
- Build output (`android/build`, `node_modules`): ~3 GB
- Total: **~7 GB**.
