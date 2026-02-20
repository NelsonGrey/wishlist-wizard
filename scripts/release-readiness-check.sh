#!/usr/bin/env bash
set -euo pipefail

echo "Running release-readiness checks..."

echo "1) Ensure sensitive local key files are not tracked"
if git ls-files | rg -q 'service-account-key.*\.json$'; then
  echo "❌ Tracked service-account key file detected. Remove it from git index."
  git ls-files | rg 'service-account-key.*\.json$'
  exit 1
fi

echo "2) Ensure web production UI contains no coming-soon copy"
if rg -n -i 'coming[ -]soon' packages/web/client-src packages/web/index.html >/dev/null; then
  echo "❌ Found 'coming soon' content in web production paths."
  rg -n -i 'coming[ -]soon' packages/web/client-src packages/web/index.html
  exit 1
fi

echo "3) Ensure no invalid nested interactive/link markup in web client"
if rg -nUP '<Link[^>]*>\s*<(a|button|Button)\b' packages/web/client-src >/dev/null; then
  echo "❌ Found nested interactive/link markup patterns in web client."
  rg -nUP '<Link[^>]*>\s*<(a|button|Button)\b' packages/web/client-src
  exit 1
fi

echo "4) Generate extension release artifacts"
npm run package:extension:release

echo "5) Run extension release preflight"
./scripts/extension-release-preflight.sh

echo "6) Run mobile release preflight"
./scripts/mobile-release-preflight.sh

echo "7) Run browser extension automated tests"
npm run test --workspace=@wishlist-wizard/browser-extension -- --run

echo "✅ Release-readiness checks passed."
