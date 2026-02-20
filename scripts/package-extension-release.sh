#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/packages/browser-extension/dist"
STAMP="$(date +%Y%m%d)"
ZIP_NAME="wishlist-wizard-extension-${STAMP}.zip"
TGZ_NAME="wishlist-wizard-extension-${STAMP}.tgz"
ZIP_PATH="$DIST_DIR/$ZIP_NAME"
TGZ_PATH="$DIST_DIR/$TGZ_NAME"

echo "Packaging browser extension release artifacts..."

cd "$ROOT_DIR"
npm run build --workspace=@wishlist-wizard/browser-extension

if [ ! -d "$DIST_DIR" ]; then
  echo "❌ Missing dist directory after build: $DIST_DIR"
  exit 1
fi

tmp_dir="$(mktemp -d "/tmp/wishlist-wizard-extension-${STAMP}.XXXXXX")"
tmp_zip="$tmp_dir/$ZIP_NAME"
tmp_tgz="$tmp_dir/$TGZ_NAME"

(
  cd "$DIST_DIR"
  zip -qr "$tmp_zip" . -x "*.zip" "*.tgz"
  tar --exclude='*.zip' --exclude='*.tgz' -czf "$tmp_tgz" .
)

mv -f "$tmp_zip" "$ZIP_PATH"
mv -f "$tmp_tgz" "$TGZ_PATH"
rm -rf "$tmp_dir"

echo "✅ Extension artifacts created:"
echo "   - $ZIP_PATH"
echo "   - $TGZ_PATH"
