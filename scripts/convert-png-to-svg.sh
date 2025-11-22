#!/usr/bin/env bash
set -euo pipefail

# Best-effort conversion of a PNG into a vector SVG using ImageMagick and potrace.
# NOTE: This is lossy for complex, multi-color artwork and is intended as a rough
# vectorization helper only. For high-quality results, provide a vector source
# (Figma, Illustrator, or a true SVG).

SRC_PNG=${1:-}
OUT_SVG=${2:-icons/icon-wishlist-wizard.svg}

if [ -z "$SRC_PNG" ]; then
  echo "Usage: $0 /path/to/source.png [/path/to/output.svg]"
  exit 1
fi

if [ ! -f "$SRC_PNG" ]; then
  echo "Source PNG file not found: $SRC_PNG"
  exit 1
fi

if ! command -v convert >/dev/null 2>&1; then
  echo "ImageMagick 'convert' not found. Install it (apt-get install imagemagick)" >&2
  exit 1
fi

if ! command -v potrace >/dev/null 2>&1; then
  echo "'potrace' not found. Install it (apt-get install potrace)" >&2
  exit 1
fi

TMP_BMP=$(mktemp /tmp/icon.XXXXXX.bmp)
TMP_PNM=$(mktemp /tmp/icon.XXXXXX.pnm)

echo "Generating bitmap copy and tracing to vector..."
convert "$SRC_PNG" -colorspace Gray -threshold 50% -alpha off "$TMP_BMP"
 # Convert BMP to PNM for potrace
convert "$TMP_BMP" "$TMP_PNM"
potrace -s -o "$OUT_SVG" "$TMP_PNM"

rm -f "$TMP_BMP" "$TMP_PNM"

echo "Created $OUT_SVG (vectorized approximation). Verify and refine manually if needed."

exit 0
