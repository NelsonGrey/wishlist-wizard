#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Ephemeral keychain helper for Fastlane (fixed/robust version)
# - Creates a temporary keychain
# - Optionally imports a P12 into that keychain
# - Sets MATCH_KEYCHAIN_NAME and MATCH_KEYCHAIN_PASSWORD env exports for Fastlane
# - Runs the provided command string
# - Restores the original keychain and deletes the temporary keychain on exit
################################################################################

if [ "$#" -lt 1 ]; then
  echo "Usage: CERT_P12_PATH=path CERT_P12_PASSWORD=pw $0 \"fastlane command\""
  exit 2
fi

FASTLANE_CMD="$1"

# Unique temporary keychain name and password
KC_NAME="fastlane_tmp_$(date +%s)_$$.keychain-db"
KC_PATH="$HOME/Library/Keychains/$KC_NAME"
KC_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24 || echo "fastlane-pass")

echo "[ephemeral-keychain] Creating temporary keychain: $KC_NAME"
security create-keychain -p "$KC_PASS" "$KC_PATH"

# Capture the original default keychain (best-effort) and sanitize it
# Remove surrounding quotes and trim whitespace
ORIG_DEFAULT_KC=$(security default-keychain -d user | tr -d '"' | xargs || true)
echo "[ephemeral-keychain] Original default keychain: $ORIG_DEFAULT_KC"
# Safety check: refuse to run if MATCH_KEYCHAIN_NAME explicitly points to login keychain
if [ -n "${MATCH_KEYCHAIN_NAME:-}" ]; then
  if [[ "${MATCH_KEYCHAIN_NAME}" == *login.keychain* ]]; then
    echo "[ephemeral-keychain] ERROR: MATCH_KEYCHAIN_NAME points to login keychain (${MATCH_KEYCHAIN_NAME}). Refusing to run to avoid modifying the login keychain."
    echo "If you intentionally want to reuse a non-ephemeral keychain, set MATCH_KEYCHAIN_REUSE=true and use a dedicated keychain name (not login.keychain-db)."
    exit 3
  fi
fi

# If ORIG_DEFAULT_KC is empty, refuse to run (we can't safely restore the default)
if [ -z "${ORIG_DEFAULT_KC:-}" ]; then
  echo "[ephemeral-keychain] ERROR: Unable to determine the original default keychain. Refusing to run to avoid accidental changes."
  exit 3
fi
echo "[ephemeral-keychain] Adding temporary keychain to keychain list and making default"
# Save original list of keychains in an array so we can restore it exactly (compatible with macOS Bash)
ORIG_KEYCHAIN_LIST_RAW=()
while IFS= read -r item; do
  ORIG_KEYCHAIN_LIST_RAW+=("$item")
done < <(security list-keychains -d user)
ORIG_KEYCHAIN_LIST=()
for item in "${ORIG_KEYCHAIN_LIST_RAW[@]}"; do
  trimmed=$(echo "$item" | tr -d '"' | xargs)
  if [ -n "$trimmed" ]; then
    # Normalize to $HOME/Library/Keychains/<basename> to avoid duplicate/malformed entries
    base=$(basename "$trimmed")
    # Only accept entries that look like keychain files
    if [[ "$base" == *.keychain || "$base" == *.keychain-db ]]; then
      norm="$HOME/Library/Keychains/$base"
      # Deduplicate
      skip=false
      for existing in "${ORIG_KEYCHAIN_LIST[@]:-}"; do
        if [[ "$existing" == "$norm" ]]; then
          skip=true
          break
        fi
      done
      if [[ "$skip" == "false" ]]; then
        ORIG_KEYCHAIN_LIST+=("$norm")
      fi
    fi
  fi
done
echo "[ephemeral-keychain] Original keychain list: ${ORIG_KEYCHAIN_LIST[*]}"

# Build new list with ephemeral keychain first and then existing ones (avoid duplicates)
NEW_KEYCHAIN_LIST=("$KC_PATH")
  if [ ${#ORIG_KEYCHAIN_LIST[@]:-0} -gt 0 ]; then
  for k in "${ORIG_KEYCHAIN_LIST[@]}"; do
    if [[ "$k" != "$KC_NAME" ]]; then
      NEW_KEYCHAIN_LIST+=("$k")
    fi
  done
fi
echo "[ephemeral-keychain] Setting keychain list: ${NEW_KEYCHAIN_LIST[*]}"
security list-keychains -d user -s "${NEW_KEYCHAIN_LIST[@]}"
security default-keychain -s "$KC_PATH"
echo "[ephemeral-keychain] Current default keychain after change: $(security default-keychain -d user | tr -d '"' | xargs || true)"
security unlock-keychain -p "$KC_PASS" "$KC_PATH"
security set-keychain-settings -lut 7200 "$KC_PATH"

cleanup() {
  set +e
  echo "[ephemeral-keychain] Cleaning up: deleting temporary keychain $KC_NAME"
  # Restore original default keychain (best-effort)
  if [ -n "${ORIG_DEFAULT_KC:-}" ]; then
    echo "[ephemeral-keychain] Restoring default keychain to $ORIG_DEFAULT_KC"
    security default-keychain -s "$ORIG_DEFAULT_KC" || true
    echo "[ephemeral-keychain] Default keychain after restore: $(security default-keychain -d user | tr -d '"' | xargs || true)"
  elif [ -f "$HOME/Library/Keychains/login.keychain-db" ]; then
    security default-keychain -s "$HOME/Library/Keychains/login.keychain-db" || true
  fi
  # Restore original list of keychains to avoid leaving ephemeral keychains in the list
  if [ ${#ORIG_KEYCHAIN_LIST[@]:-0} -gt 0 ]; then
    echo "[ephemeral-keychain] Restoring keychain list: ${ORIG_KEYCHAIN_LIST[*]}"
    security list-keychains -d user -s "${ORIG_KEYCHAIN_LIST[@]}" || true
  fi
  # Delete the ephemeral keychain if it exists
  if [ -n "${KC_NAME:-}" ]; then
    # Prevent accidental deletion if the keychain path might be the login keychain
    short_kc=$(basename "$KC_NAME")
    if [[ "$short_kc" == "login.keychain-db" || "$short_kc" == "login.keychain" || "$KC_NAME" == "$HOME/Library/Keychains/login.keychain-db" ]]; then
      echo "[ephemeral-keychain] Skipping delete: KC_NAME ($KC_NAME) looks like login keychain. Not deleting to avoid data loss."
    else
      security delete-keychain "$KC_PATH" || true
    fi
  fi
}
trap cleanup EXIT

# If a P12 is specified, import it into the ephemeral keychain
if [ -n "${CERT_P12_PATH:-}" ]; then
  if [ ! -f "$CERT_P12_PATH" ]; then
    echo "[ephemeral-keychain] CERT_P12_PATH set but file not found: $CERT_P12_PATH"
    exit 3
  fi
  echo "[ephemeral-keychain] Importing P12 into temporary keychain"
  security import "$CERT_P12_PATH" -k "$KC_NAME" -P "${CERT_P12_PASSWORD:-}" -T /usr/bin/codesign -T /usr/bin/security || true
  security set-key-partition-list -S apple-tool:,apple: -s -k "$KC_PASS" "$KC_NAME" 2>/dev/null || true
  echo "[ephemeral-keychain] Listing codesigning identities (ephemeral keychain):"
  security -v find-identity -p codesigning "$KC_NAME" || true
fi

# Export MATCH_* env variables so that Fastlane/match uses this keychain
export MATCH_KEYCHAIN_NAME="$KC_NAME"
export MATCH_KEYCHAIN_PASSWORD="$KC_PASS"
echo "[ephemeral-keychain] Exported MATCH_KEYCHAIN_NAME and MATCH_KEYCHAIN_PASSWORD for Fastlane"

# If running inside GitHub Actions, push the ephemeral keychain info into the Actions
# environment so subsequent workflow steps (cleanup) can pick it up.
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "MATCH_KEYCHAIN_NAME=$KC_NAME" >> "$GITHUB_ENV"
  echo "MATCH_KEYCHAIN_PASSWORD=$KC_PASS" >> "$GITHUB_ENV"
  echo "MATCH_KEYCHAIN_PATH=$KC_PATH" >> "$GITHUB_ENV"
  echo "[ephemeral-keychain] Exported ephemeral keychain to GITHUB_ENV: $GITHUB_ENV"
fi

echo "[ephemeral-keychain] Running command: $FASTLANE_CMD"
set -x
eval "$FASTLANE_CMD"
set +x

echo "[ephemeral-keychain] Command finished, cleanup will run now via EXIT trap"

exit 0
