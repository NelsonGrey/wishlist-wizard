#!/usr/bin/env bash
set -euo pipefail

# Apply a new icon across the repository deliverables with adaptive Android icon
# handling and master icon storage. Uses sips on macOS or ImageMagick (`convert`)
# on other platforms when available. Creates optional backup files (default)
# and will copy the provided PNG into an `icons/` folder for future automation.

SRC_PNG=${1:-}
BG_COLOR=${2:-"#FFFFFF"} # default background color for adaptive icons
NO_BACKUP=${NO_BACKUP:-false}
SAVE_MASTER=${SAVE_MASTER:-true}

if [ -z "$SRC_PNG" ]; then
  echo "Usage: $0 /path/to/icon.png [bg-color]"
  exit 1
fi

if [ ! -f "$SRC_PNG" ]; then
  echo "Source PNG does not exist: $SRC_PNG"
  exit 1
fi

echo "🔁 Applying new icon from: $SRC_PNG"
echo "🎯 Background color: $BG_COLOR"

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "$(pwd)")

mkdir -p "$ROOT/icons"
MASTER_PNG_DEST="$ROOT/icons/icon-wishlist-wizard.png"

# Save master PNG into icons/ if requested
if [ "$SAVE_MASTER" == "true" ]; then
  # Compare realpath to avoid copying a file onto itself
  src_real=$(realpath "$SRC_PNG" 2>/dev/null || echo "$SRC_PNG")
  dest_real=$(realpath "$MASTER_PNG_DEST" 2>/dev/null || echo "$MASTER_PNG_DEST")
  if [ "$src_real" != "$dest_real" ]; then
    cp -v "$SRC_PNG" "$MASTER_PNG_DEST"
    echo "Saved master icon to $MASTER_PNG_DEST"
  else
    echo "Master PNG already at $MASTER_PNG_DEST; skipping copy"
  fi
fi

# Find tool: prefer sips on macOS, else try convert (ImageMagick)
USE_SIPS=false
if command -v sips >/dev/null 2>&1; then
  USE_SIPS=true
fi
if ! $USE_SIPS && ! command -v convert >/dev/null 2>&1; then
  echo "Error: Neither 'sips' nor ImageMagick 'convert' is available. Install ImageMagick or run on macOS." 1>&2
  exit 1
fi

backup_and_mkdir() {
  dest="$1"
  if [ "$NO_BACKUP" == "false" ] && [ -f "$dest" ]; then
    cp -v "$dest" "$dest.bak"
  fi
  mkdir -p "$(dirname "$dest")" || true
}

resize_with_tool() {
  local size=$1
  local src=$2
  local dest=$3
  if $USE_SIPS; then
    sips -z "$size" "$size" "$src" --out "$dest" >/dev/null
  else
    convert "$src" -resize ${size}x${size} "$dest"
  fi
}

resize_copy() {
  local size=$1
  local dest=$2
  backup_and_mkdir "$dest"
  resize_with_tool "$size" "$SRC_PNG" "$dest"
  echo "Created $dest ($size x $size)"
}

# Create adaptive Android icons (foreground/background)
generate_android_adaptive() {
  # sizes per density (example) - foreground/background sizes are similar
  local densities=("mdpi:48" "hdpi:72" "xhdpi:96" "xxhdpi:144" "xxxhdpi:192")
  local fg_name="ic_launcher_foreground.png"
  local bg_name="ic_launcher_background.png"
  for d in "${densities[@]}"; do
    IFS=":" read -r density size <<< "$d"
    destfg="$ROOT/packages/mobile/android/app/src/main/res/mipmap-${density}/${fg_name}"
    destbg="$ROOT/packages/mobile/android/app/src/main/res/mipmap-${density}/${bg_name}"
    backup_and_mkdir "$destfg"
    backup_and_mkdir "$destbg"
    # For foreground, place a resized, transparent icon
    resize_with_tool "$size" "$SRC_PNG" "$destfg"
    # For background, generate a solid color png of size
    if $USE_SIPS; then
      # sips doesn't directly create a solid color png; use a small trick
      convert_cmd="$size x $size"
    fi
    # Use ImageMagick if available for background solid color
    if command -v convert >/dev/null 2>&1; then
      convert -size ${size}x${size} xc:"$BG_COLOR" "$destbg"
    else
      # fallback: just copy the src icon as background (not ideal)
      resize_with_tool "$size" "$SRC_PNG" "$destbg"
    fi
  done

  # Create mipmap-anydpi-v26 xml adaptive icon files
  dest_anydpi="$ROOT/packages/mobile/android/app/src/main/res/mipmap-anydpi-v26"
  mkdir -p "$dest_anydpi"
  cat > "$dest_anydpi/ic_launcher.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
EOF

  cat > "$dest_anydpi/ic_launcher_round.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/ic_launcher_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
EOF
  echo "Generated adaptive Android icons and XML files in $dest_anydpi"
}

echo "Repository root: $ROOT"

echo "Generating browser extension icons..."
resize_copy 16 "$ROOT/packages/browser-extension/src/icons/icon16.png"
resize_copy 32 "$ROOT/packages/browser-extension/src/icons/icon32.png"
resize_copy 48 "$ROOT/packages/browser-extension/src/icons/icon48.png"
resize_copy 128 "$ROOT/packages/browser-extension/src/icons/icon128.png"

# Update public copies for distribution
resize_copy 16 "$ROOT/packages/browser-extension/public/icons/icon16.png"
resize_copy 32 "$ROOT/packages/browser-extension/public/icons/icon32.png"
resize_copy 48 "$ROOT/packages/browser-extension/public/icons/icon48.png"
resize_copy 128 "$ROOT/packages/browser-extension/public/icons/icon128.png"

echo "Generating chrome-extension-package icons..."
resize_copy 16 "$ROOT/chrome-extension-package/icons/icon16.png"
resize_copy 32 "$ROOT/chrome-extension-package/icons/icon32.png"
resize_copy 48 "$ROOT/chrome-extension-package/icons/icon48.png"
resize_copy 128 "$ROOT/chrome-extension-package/icons/icon128.png"

echo "Generating web PWA icons..."
resize_copy 192 "$ROOT/packages/mobile/web/icons/Icon-192.png"
resize_copy 512 "$ROOT/packages/mobile/web/icons/Icon-512.png"
resize_copy 192 "$ROOT/packages/mobile/web/icons/Icon-maskable-192.png"
resize_copy 512 "$ROOT/packages/mobile/web/icons/Icon-maskable-512.png"
resize_copy 32 "$ROOT/packages/mobile/web/favicon.png"

echo "Generating Android mipmap launcher icons..."
resize_copy 48 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher.png"
resize_copy 72 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.png"
resize_copy 96 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png"
resize_copy 144 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png"
resize_copy 192 "$ROOT/packages/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"

echo "Generating iOS icon appset..."
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

echo "Generating adaptive Android foreground/background icons..."
generate_android_adaptive

echo "✅ All icons generated/updated. If the repo is clean, you can commit the updated images."

exit 0
