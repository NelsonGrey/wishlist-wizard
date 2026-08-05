#!/usr/bin/env bash
set -euo pipefail

SRC_PNG=${1:-}
OUT_SVG=${2:-icons/icon-wishlist-wizard.svg}
TEMP_PNM="/tmp/icon-$$.pbm"

if [ -z "$SRC_PNG" ]; then
  echo "Usage: $0 /path/to/icon.png [out.svg]"
  exit 1
fi

if [ ! -f "$SRC_PNG" ]; then
  echo "Source PNG does not exist: $SRC_PNG"
  exit 1
fi

echo "🔁 Attempting to convert $SRC_PNG → $OUT_SVG"

if command -v potrace >/dev/null 2>&1; then
  echo "Found potrace; using potrace for vectorization."
  # Convert png to PBM/PGM, then run potrace
  convert "$SRC_PNG" -resize 1024x1024 -threshold 50% -flatten PBM:- > "$TEMP_PNM"
  potrace -s -o "$OUT_SVG" "$TEMP_PNM"
  echo "✅ Vectorization complete: $OUT_SVG"
else
  echo "⚠️ potrace not found. Falling back to embedding PNG into SVG as raster."
  mkdir -p "$(dirname "$OUT_SVG")"
  # embed PNG data as base64 in SVG wrapper
  b64=$(base64 < "$SRC_PNG" | tr -d '\n')
  w=$(identify -format "%w" "$SRC_PNG" 2>/dev/null || echo 512)
  h=$(identify -format "%h" "$SRC_PNG" 2>/dev/null || echo 512)
  cat > "$OUT_SVG" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="$w" height="$h" viewBox="0 0 $w $h" preserveAspectRatio="xMidYMid meet">
  <image href="data:image/png;base64,$b64" width="$w" height="$h" />
</svg>
EOF
  echo "✅ Created embedded PNG SVG at $OUT_SVG. Note: this is not a true vector conversion."
fi

rm -f "$TEMP_PNM" || true

exit 0
