#!/usr/bin/env bash
# install-android-toolchain.sh
#
# Idempotent installer for the Android toolchain needed to build the
# LibreAgro APK locally on Ubuntu/Debian. See REQUIREMENTS.md.
#
# Usage: bash scripts/install-android-toolchain.sh
set -euo pipefail

ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
JAVA_HOME_PATH="/usr/lib/jvm/java-17-openjdk-amd64"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip"
PLATFORM="android-35"
BUILD_TOOLS="35.0.0"
NDK_VERSION="27.1.12297006"

log() { printf '\033[1;32m[install]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[install]\033[0m %s\n' "$*" >&2; }

# 1. apt packages (Java 17 + utilities) ----------------------------------
need_apt=()
dpkg -s openjdk-17-jdk-headless >/dev/null 2>&1 || need_apt+=(openjdk-17-jdk-headless)
command -v unzip >/dev/null || need_apt+=(unzip)
command -v wget  >/dev/null || need_apt+=(wget)
command -v git   >/dev/null || need_apt+=(git)

if (( ${#need_apt[@]} )); then
  log "Installing apt packages: ${need_apt[*]}"
  sudo apt update
  sudo apt install -y "${need_apt[@]}"
else
  log "apt packages already present"
fi

if [ ! -d "$JAVA_HOME_PATH" ]; then
  warn "Java 17 not found at $JAVA_HOME_PATH after apt install. Aborting."
  exit 1
fi

# 2. Android cmdline-tools -----------------------------------------------
mkdir -p "$ANDROID_HOME/cmdline-tools"
if [ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  log "Downloading Android cmdline-tools to $ANDROID_HOME"
  tmpzip="$(mktemp -t cmdline-tools.XXXXXX.zip)"
  trap 'rm -f "$tmpzip"' EXIT
  wget -q --show-progress "$CMDLINE_TOOLS_URL" -O "$tmpzip"
  unzip -q "$tmpzip" -d "$ANDROID_HOME/cmdline-tools"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  rm -f "$tmpzip"
  trap - EXIT
else
  log "cmdline-tools already installed"
fi

export JAVA_HOME="$JAVA_HOME_PATH"
export ANDROID_HOME ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"

# 3. SDK packages --------------------------------------------------------
log "Accepting SDK licenses"
yes | "$SDKMANAGER" --licenses >/dev/null 2>&1 || true

log "Installing SDK packages (platform-tools, platforms;$PLATFORM, build-tools;$BUILD_TOOLS, ndk;$NDK_VERSION)"
"$SDKMANAGER" \
  "platform-tools" \
  "platforms;${PLATFORM}" \
  "build-tools;${BUILD_TOOLS}" \
  "ndk;${NDK_VERSION}"

# 4. Persist env vars ----------------------------------------------------
RC_FILE="$HOME/.bashrc"
[ -n "${ZSH_VERSION-}" ] && RC_FILE="$HOME/.zshrc"
MARK="# >>> libreagro android toolchain >>>"

if ! grep -qF "$MARK" "$RC_FILE" 2>/dev/null; then
  log "Appending env vars to $RC_FILE"
  cat >> "$RC_FILE" <<EOF

$MARK
export JAVA_HOME=$JAVA_HOME_PATH
export ANDROID_HOME="\$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="\$ANDROID_HOME"
export PATH="\$JAVA_HOME/bin:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH"
# <<< libreagro android toolchain <<<
EOF
else
  log "env vars already present in $RC_FILE"
fi

log "Done. Reload your shell ('source $RC_FILE') and run:"
echo
echo "  npm install"
echo "  npx expo prebuild --platform android --clean"
echo "  cd android && ./gradlew assembleRelease"
echo
echo "APK output: android/app/build/outputs/apk/release/app-release.apk"
