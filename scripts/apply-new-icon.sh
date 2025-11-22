#!/usr/bin/env bash
set -euo pipefail

# Apply a new PNG icon across the repository deliverables by resizing and placing
# the given PNG into all target locations used by browser-extension, Chrome
# extension package, web PWA, and mobile platforms (iOS/Android). The script
# creates a .bak backup for existing files before replacing them.

SRC_PNG=${1:-}
if [ -z "$SRC_PNG" ]; then
  echo "Usage: $0 /path/to/icon.png"
  exit 1
fi

if [ ! -f "$SRC_PNG" ]; then
  echo "Source PNG does not exist: $SRC_PNG"
  exit 1
fi

echo "🔁 Applying new icon from: $SRC_PNG"

# Helper to backup and create destination directory
backup_and_mkdir() {
  dest="$1"
  if [ -f "$dest" ]; then
    cp -v "$dest" "$dest.bak"
  else
    mkdir -p "$(dirname "$dest")" || true
  fi
}

# Helper to resize using sips
resize_copy() {
  local size=$1
  local dest=$2
  backup_and_mkdir "$dest"
  sips -z "$size" "$size" "$SRC_PNG" --out "$dest" >/dev/null
  echo "Created $dest ($size x $size)"
}

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")

echo "Repository root: $ROOT"

# Targets: Browser extension icons
resize_copy 16 "$ROOT/packages/browser-extension/src/icons/icon16.png"
resize_copy 32 "$ROOT/packages/browser-extension/src/icons/icon32.png"
resize_copy 48 "$ROOT/packages/browser-extension/src/icons/icon48.png"
resize_copy 128 "$ROOT/packages/browser-extension/src/icons/icon128.png"

# Also update public copies for distribution
resize_copy 16 "$ROOT/packages/browser-extension/public/icons/icon16.png"
resize_copy 32 "$ROOT/packages/browser-extension/public/icons/icon32.png"
resize_copy 48 "$ROOT/packages/browser-extension/public/icons/icon48.png"
resize_copy 128 "$ROOT/packages/browser-extension/public/icons/icon128.png"

# Chrome extension package icons
resize_copy 16 "$ROOT/chrome-extension-package/icons/icon16.png"
resize_copy 32 "$ROOT/chrome-extension-package/icons/icon32.png"
resize_copy 48 "$ROOT/chrome-extension-package/icons/icon48.png"
resize_copy 128 "$ROOT/chrome-extension-package/icons/icon128.png"

# Web PWA icons
resize_copy 192 "$ROOT/packages/mobile/web/icons/Icon-192.png"
resize_copy 512 "$ROOT/packages/mobile/web/icons/Icon-512.png"
resize_copy 192 "$ROOT/packages/mobile/web/icons/Icon-maskable-192.png"
resize_copy 512 "$ROOT/packages/mobile/web/icons/Icon-maskable-512.png"
# Favicon (32x32)
resize_copy 32 "$ROOT/packages/mobile/web/favicon.png"

# Android mipmap densities
resize_copy 48 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher.png"
resize_copy 72 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.png"
resize_copy 96 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png"
resize_copy 144 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png"
resize_copy 192 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"

# iOS icon appset
resize_copy 40 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@2x.png"
resize_copy 60 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@3x.png"
resize_copy 29 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@1x.png"
resize_copy 58 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@2x.png"
resize_copy 87 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@3x.png"
resize_copy 80 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@2x.png"
resize_copy 120 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@3x.png"
resize_copy 120 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@2x.png"
resize_copy 180 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@3x.png"
resize_copy 20 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@1x.png"
resize_copy 40 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@2x.png"
resize_copy 29 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@1x.png"
resize_copy 58 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@2x.png"
resize_copy 40 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@1x.png"
resize_copy 80 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@2x.png"
resize_copy 76 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-76x76@1x.png"
resize_copy 152 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-76x76@2x.png"
resize_copy 167 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-83.5x83.5@2x.png"
resize_copy 1024 "$ROOT/packages/mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png"

echo "✅ All icons generated/updated. If the repo is clean, you can commit the updated images."

exit 0
