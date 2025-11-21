#!/usr/bin/env bash
set -euo pipefail
# Idempotent keychain setup for CI (per-run temporary keychain)
# Usage: export MATCH_KEYCHAIN_NAME and MATCH_KEYCHAIN_PASSWORD in the environment
KEYCHAIN_NAME="${MATCH_KEYCHAIN_NAME:-fastlane_tmp_keychain}"
KEYCHAIN_PASS="${MATCH_KEYCHAIN_PASSWORD:-password}"

echo "[setup_keychain] Using keychain: $KEYCHAIN_NAME"

security create-keychain -p "$KEYCHAIN_PASS" "$KEYCHAIN_NAME" >/dev/null 2>&1 || true
security set-keychain-settings -lut 7200 "$KEYCHAIN_NAME" >/dev/null 2>&1 || true

# Ensure the keychain is listed and placed first for the user domain
CURRENT_LIST=$(security list-keychains -d user | tr -d '"')
if ! echo "$CURRENT_LIST" | grep -q "$KEYCHAIN_NAME"; then
  # Prepend new keychain
  security list-keychains -d user -s "$KEYCHAIN_NAME" $CURRENT_LIST || true
fi

security default-keychain -s "$KEYCHAIN_NAME" || true
security unlock-keychain -p "$KEYCHAIN_PASS" "$KEYCHAIN_NAME" || true

# Allow codesign / Xcode tools to access private keys non-interactively
security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PASS" "$KEYCHAIN_NAME" || true

echo "[setup_keychain] Keychain setup complete. Listing identities:" 
security find-identity -v -p codesigning || true

echo "[setup_keychain] Done"
