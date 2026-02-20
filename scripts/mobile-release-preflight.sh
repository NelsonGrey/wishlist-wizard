#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/packages/mobile"
APK_RELEASE="$MOBILE_DIR/build/app/outputs/flutter-apk/app-release.apk"
IOS_APP="$MOBILE_DIR/build/ios/iphoneos/Runner.app"

HAS_RG=false
if command -v rg >/dev/null 2>&1; then
  HAS_RG=true
fi

echo "Running mobile release preflight..."

if [ ! -d "$MOBILE_DIR" ]; then
  echo "❌ Missing mobile workspace: $MOBILE_DIR"
  exit 1
fi

echo "1) Ensure sensitive local key files are not tracked"
if [ "$HAS_RG" = true ]; then
  if git -C "$ROOT_DIR" ls-files | rg -q 'service-account-key.*\.json$'; then
    echo "❌ Tracked service-account key file detected. Remove it from git index."
    git -C "$ROOT_DIR" ls-files | rg 'service-account-key.*\.json$'
    exit 1
  fi
else
  if git -C "$ROOT_DIR" ls-files | grep -Eq 'service-account-key.*\.json$'; then
    echo "❌ Tracked service-account key file detected. Remove it from git index."
    git -C "$ROOT_DIR" ls-files | grep -E 'service-account-key.*\.json$'
    exit 1
  fi
fi

echo "2) Ensure no placeholder 'coming soon' strings remain in app code"
if [ "$HAS_RG" = true ]; then
  if rg -n -i 'coming[ -]soon' "$MOBILE_DIR/lib" >/dev/null; then
    echo "❌ Found 'coming soon' in mobile app source."
    rg -n -i 'coming[ -]soon' "$MOBILE_DIR/lib"
    exit 1
  fi
else
  if grep -RInE 'coming[ -]soon' "$MOBILE_DIR/lib" >/dev/null; then
    echo "❌ Found 'coming soon' in mobile app source."
    grep -RInE 'coming[ -]soon' "$MOBILE_DIR/lib"
    exit 1
  fi
fi

echo "3) Validate Flutter version metadata is present"
if [ "$HAS_RG" = true ]; then
  if ! rg -q '^version:\s*[0-9]+\.[0-9]+\.[0-9]+\+[0-9]+' "$MOBILE_DIR/pubspec.yaml"; then
    echo "❌ pubspec.yaml version is missing or invalid."
    exit 1
  fi
else
  if ! grep -Eq '^version:[[:space:]]*[0-9]+\.[0-9]+\.[0-9]+\+[0-9]+' "$MOBILE_DIR/pubspec.yaml"; then
    echo "❌ pubspec.yaml version is missing or invalid."
    exit 1
  fi
fi

echo "4) Validate expected release artifacts exist"
if [ ! -f "$APK_RELEASE" ]; then
  echo "❌ Missing Android release artifact: $APK_RELEASE"
  exit 1
fi
if [ ! -d "$IOS_APP" ]; then
  echo "❌ Missing iOS build artifact: $IOS_APP"
  exit 1
fi

echo "✅ Mobile release preflight passed."
