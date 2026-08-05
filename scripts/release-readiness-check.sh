#!/usr/bin/env bash
set -euo pipefail

HAS_RG=false
if command -v rg >/dev/null 2>&1; then
  HAS_RG=true
fi

echo "Running release-readiness checks..."

echo "1) Ensure sensitive local key files are not tracked"
if [ "$HAS_RG" = true ]; then
  if git ls-files | rg -q 'service-account-key.*\.json$'; then
    echo "❌ Tracked service-account key file detected. Remove it from git index."
    git ls-files | rg 'service-account-key.*\.json$'
    exit 1
  fi
else
  if git ls-files | grep -Eq 'service-account-key.*\.json$'; then
    echo "❌ Tracked service-account key file detected. Remove it from git index."
    git ls-files | grep -E 'service-account-key.*\.json$'
    exit 1
  fi
fi

echo "2) Ensure no invalid nested interactive/link markup in web client"
if [ "$HAS_RG" = true ]; then
  if rg -nUP '<Link[^>]*>\s*<(a|button|Button)\b' packages/web/client-src >/dev/null; then
    echo "❌ Found nested interactive/link markup patterns in web client."
    rg -nUP '<Link[^>]*>\s*<(a|button|Button)\b' packages/web/client-src
    exit 1
  fi
else
  if grep -RInE '<Link[^>]*>[[:space:]]*<(a|button|Button)' packages/web/client-src >/dev/null; then
    echo "❌ Found nested interactive/link markup patterns in web client."
    grep -RInE '<Link[^>]*>[[:space:]]*<(a|button|Button)' packages/web/client-src
    exit 1
  fi
fi

echo "3) Generate extension release artifacts"
npm run package:extension:release

echo "4) Run extension release preflight"
./scripts/extension-release-preflight.sh

echo "5) Run mobile release preflight"
./scripts/mobile-release-preflight.sh

echo "6) Run browser extension automated tests"
npm run test --workspace=@wishlist-wizard/browser-extension -- --run

echo "✅ Release-readiness checks passed."
