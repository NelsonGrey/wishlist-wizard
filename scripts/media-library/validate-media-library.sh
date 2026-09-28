#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
library="$repo_root/media-library"

failures=0
checked=0

check_size() {
  local path="$1" expected="$2" actual
  actual="$(magick identify -format '%wx%h' "$library/$path")"
  checked=$((checked + 1))
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL $path expected=$expected actual=$actual"
    failures=$((failures + 1))
  fi
}

for size in 400 800 1024; do
  check_size "generated/profiles/profile-${size}x${size}.png" "${size}x${size}"
done

check_size "generated/headers/youtube-banner-2560x1440.png" "2560x1440"
check_size "generated/headers/x-header-1500x500.png" "1500x500"
check_size "generated/headers/facebook-cover-1640x624.png" "1640x624"

while IFS= read -r file; do
  case "$file" in
    *-square-1080x1080.png) check_size "${file#$library/}" "1080x1080" ;;
    *-portrait-1080x1350.png) check_size "${file#$library/}" "1080x1350" ;;
    *-story-1080x1920.png) check_size "${file#$library/}" "1080x1920" ;;
    *-landscape-1600x900.png) check_size "${file#$library/}" "1600x900" ;;
    *-1280x720.png) check_size "${file#$library/}" "1280x720" ;;
  esac
done < <(find "$library/generated/campaigns" "$library/generated/thumbnails" -type f -name '*.png' | sort)

png_count="$(find "$library/generated" -type f -name '*.png' | wc -l | tr -d ' ')"
svg_count="$(find "$library/generated" -type f -name '*.svg' | wc -l | tr -d ' ')"
if [[ "$png_count" != "33" ]]; then
  echo "FAIL generated PNG count expected=33 actual=$png_count"
  failures=$((failures + 1))
fi

if ! (cd "$library" && shasum -a 256 -c "_inventory/source-sha256.txt" >/dev/null); then
  echo "FAIL source checksum validation"
  failures=$((failures + 1))
fi

if ! (cd "$library" && shasum -a 256 -c "_inventory/library-sha256.txt" >/dev/null); then
  echo "FAIL generated-library checksum validation"
  failures=$((failures + 1))
fi

if [[ "$failures" -ne 0 ]]; then
  echo "Media-library validation failed: $failures issue(s), $checked dimensions checked."
  exit 1
fi

python3 "$repo_root/scripts/media-library/validate-unified-media-library.py"

echo "Media-library validation passed: $png_count PNGs, $svg_count editable SVG render sources, $checked dimensions checked."
