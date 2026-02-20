#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/packages/browser-extension/dist"
MANIFEST="$DIST_DIR/manifest.json"

echo "Running extension release preflight..."

if [ ! -d "$DIST_DIR" ]; then
  echo "❌ Missing dist directory: $DIST_DIR"
  exit 1
fi

if [ ! -f "$MANIFEST" ]; then
  echo "❌ Missing manifest file: $MANIFEST"
  exit 1
fi

required_files=(
  "background.js"
  "content.js"
  "enhanced-product-extractor.js"
  "popup.html"
  "popup.js"
  "firebase-messaging-sw.js"
  "icons/icon16.png"
  "icons/icon32.png"
  "icons/icon48.png"
  "icons/icon128.png"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$DIST_DIR/$file" ]; then
    echo "❌ Missing required artifact: $file"
    exit 1
  fi
done

if ! rg -q '"manifest_version"\s*:\s*3' "$MANIFEST"; then
  echo "❌ Manifest is not MV3"
  exit 1
fi

if ! rg -q '"version"\s*:\s*"' "$MANIFEST"; then
  echo "❌ Manifest version is missing"
  exit 1
fi

if ! ls "$DIST_DIR"/wishlist-wizard-extension*.tgz >/dev/null 2>&1; then
  echo "❌ Missing packaged extension archive (*.tgz) in dist/"
  exit 1
fi

if ! ls "$DIST_DIR"/wishlist-wizard-extension*.zip >/dev/null 2>&1; then
  echo "❌ Missing packaged extension upload artifact (*.zip) in dist/"
  exit 1
fi

echo "✅ Extension release preflight passed."
