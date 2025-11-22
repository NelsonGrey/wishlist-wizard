#!/usr/bin/env bash
set -euo pipefail

# Ephemeral keychain helper for Fastlane
# Creates a temporary keychain, optionally imports a .p12 cert, runs the specified Fastlane (or other) command,
# then removes the temporary keychain to avoid touching the user's login keychain.
#
# Usage examples:
#   CERT_P12_PATH=./certs/distribution.p12 CERT_P12_PASSWORD=pass123 ./scripts/ephemeral_keychain_fastlane.sh "bundle exec fastlane beta"
#   ./scripts/ephemeral_keychain_fastlane.sh "fastlane sync_signing"

if [ "$#" -lt 1 ]; then
  echo "Usage: CERT_P12_PATH=path CERT_P12_PASSWORD=pw $0 \"fastlane command\""
  exit 2
fi

FASTLANE_CMD="$1"

# Create a unique temporary keychain name
KC_NAME="fastlane_tmp_$(date +%s)_$$.keychain-db"
KC_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24 || echo "fastlane-pass")

echo "[ephemeral-keychain] Creating temporary keychain: $KC_NAME"
security create-keychain -p "$KC_PASS" "$KC_NAME"

echo "[ephemeral-keychain] Adding temporary keychain to keychain list and making default"
CURRENT_LIST=$(security list-keychains -d user | sed 's/^[[:space:]]*//g' | paste -s -d ' ' -)
security list-keychains -d user -s "$KC_NAME" $CURRENT_LIST
security default-keychain -s "$KC_NAME"
security unlock-keychain -p "$KC_PASS" "$KC_NAME"
security set-keychain-settings -lut 7200 "$KC_NAME"

# If a p12 is provided, import it into the temporary keychain
if [ -n "${CERT_P12_PATH:-}" ]; then
  if [ ! -f "$CERT_P12_PATH" ]; then
    echo "[ephemeral-keychain] CERT_P12_PATH set but file not found: $CERT_P12_PATH"
    exit 3
  fi
  echo "[ephemeral-keychain] Importing P12 into temporary keychain"
  security import "$CERT_P12_PATH" -k "$KC_NAME" -P "${CERT_P12_PASSWORD:-}" -T /usr/bin/codesign -T /usr/bin/security || true
  # Allow codesign to access the key without prompt
  security set-key-partition-list -S apple-tool:,apple: -s -k "$KC_PASS" "$KC_NAME" 2>/dev/null || true
fi

echo "[ephemeral-keychain] Running command: $FASTLANE_CMD"
set -x
eval "$FASTLANE_CMD"
set +x

echo "[ephemeral-keychain] Cleaning up: deleting temporary keychain $KC_NAME"
# Restore original default keychain (best-effort)
if [ -f "$HOME/Library/Keychains/login.keychain-db" ]; then
  security default-keychain -s "$HOME/Library/Keychains/login.keychain-db" || true
fi
security delete-keychain "$KC_NAME" || true

echo "[ephemeral-keychain] Done. Your login keychain was not modified."
